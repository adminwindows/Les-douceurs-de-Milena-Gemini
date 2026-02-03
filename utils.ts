import { Ingredient, Product, Recipe, Unit, GlobalSettings, FixedCostItem } from './types';

// Conversion helpers
export const convertToCostPerBaseUnit = (price: number, quantity: number, unit: Unit): number => {
  if (quantity === 0) return 0;
  let multiplier = 1;
  if (unit === Unit.KG || unit === Unit.L) multiplier = 1000;
  return price / (quantity * multiplier);
};

export const formatCurrency = (amount: number, currency = '€') => {
  if (!Number.isFinite(amount)) {
    return '-';
  }
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
};

export const toNumber = (value: string | number, fallback = Number.NaN): number => {
  if (typeof value === 'string' && value.trim() === '') {
    return fallback;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const toInputValue = (value: number): number | '' => {
  return Number.isFinite(value) ? value : '';
};

export const getLossMultiplier = (lossRate: number): number => {
  if (!Number.isFinite(lossRate)) return Number.NaN;
  if (lossRate < 0 || lossRate >= 100) return Number.NaN;
  return 1 / (1 - lossRate / 100);
};

export const calculateUnitCostWithLoss = (unitCost: number, lossRate: number): number => {
  return unitCost * getLossMultiplier(lossRate);
};

export const calculateFixedCostPerUnit = (products: Product[], settings: GlobalSettings): number => {
  const totalEstimatedVolume = products.reduce((sum, p) => {
    if (!Number.isFinite(p.estimatedMonthlySales)) {
      return Number.NaN;
    }
    return sum + (p.estimatedMonthlySales ?? 0);
  }, 0);
  const totalFixedCosts = settings.fixedCostItems.reduce((sum, item) => sum + item.amount, 0);
  if (!Number.isFinite(totalEstimatedVolume)) {
    return Number.NaN;
  }
  return totalEstimatedVolume > 0 ? totalFixedCosts / totalEstimatedVolume : 0;
};

// Core Calculation Logic
export const calculateRecipeMaterialCost = (recipe: Recipe, ingredients: Ingredient[]): number => {
  const batchCost = recipe.ingredients.reduce((total, item) => {
    const ingredient = ingredients.find(i => i.id === item.ingredientId);
    if (!ingredient) return total;
    return total + (item.quantity * ingredient.costPerBaseUnit);
  }, 0);
  return batchCost * (1 + (recipe.lossPercentage / 100));
};

export const calculateProductMetrics = (
  product: Product,
  recipe: Recipe,
  ingredients: Ingredient[],
  settings: GlobalSettings,
  allProducts: Product[] // Needed to calculate total volume
) => {
  // 1. Material Cost
  const batchMaterialCost = calculateRecipeMaterialCost(recipe, ingredients);
  const unitMaterialCost = batchMaterialCost / (recipe.batchYield || 1);

  // 2. Labor Cost
  const laborCost = (product.laborTimeMinutes / 60) * settings.hourlyRate;

  // 3. Allocated Fixed Costs
  // Sum of all estimated sales to get total volume
  const allocatedFixedCost = calculateFixedCostPerUnit(allProducts, settings);

  // 4. Product Loss Adjustment
  const baseVariableCosts = unitMaterialCost + product.packagingCost + product.variableDeliveryCost;
  const totalVariableCostsWithLoss = calculateUnitCostWithLoss(baseVariableCosts, product.lossRate);

  // 5. Full Cost
  const fullCost = totalVariableCostsWithLoss + laborCost + allocatedFixedCost;

  // 6. Minimum Price (Rentability 0 profit)
  const taxRateDecimal = settings.taxRate / 100;
  const divisor = 1 - taxRateDecimal;
  const hasValidTaxRate = Number.isFinite(divisor) && divisor > 0;
  
  const minPriceBreakeven = hasValidTaxRate ? fullCost / divisor : Number.NaN;

  // 7. Target Price
  const priceWithMargin = hasValidTaxRate ? (fullCost + product.targetMargin) / divisor : Number.NaN;

  return {
    unitMaterialCost,
    laborCost,
    allocatedFixedCost,
    fullCost,
    minPriceBreakeven,
    priceWithMargin,
    totalVariableCosts: totalVariableCostsWithLoss
  };
};

export const calculateDefaultActualPrice = (
  product: Product,
  recipe: Recipe | undefined,
  ingredients: Ingredient[],
  settings: GlobalSettings,
  allProducts: Product[]
): number => {
  if (!recipe) return 0;
  const batchCost = calculateRecipeMaterialCost(recipe, ingredients);
  const unitCost = batchCost / (recipe.batchYield || 1);
  const unitCostWithLoss = calculateUnitCostWithLoss(unitCost, product.lossRate);
  const laborCost = (product.laborTimeMinutes / 60) * settings.hourlyRate;
  const fixedCostPerUnit = calculateFixedCostPerUnit(allProducts, settings);
  const baseCost = unitCostWithLoss + product.packagingCost + product.variableDeliveryCost + laborCost + fixedCostPerUnit;
  const divisor = 1 - settings.taxRate / 100;
  if (!Number.isFinite(divisor) || divisor <= 0) {
    return Number.NaN;
  }
  return baseCost / divisor + product.targetMargin;
};

// Initial Sample Data
export const INITIAL_SETTINGS: GlobalSettings = {
  currency: 'EUR',
  hourlyRate: 15,
  fixedCostItems: [
    { id: 'fc1', name: 'Electricité / Eau (quote-part)', amount: 40 },
    { id: 'fc2', name: 'Assurance', amount: 30 },
    { id: 'fc3', name: 'Abonnement Site Web', amount: 20 },
    { id: 'fc4', name: 'Banque', amount: 10 },
  ],
  taxRate: 22,
};

export const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: '1', name: 'Farine T55', unit: Unit.KG, price: 1.20, quantity: 1, costPerBaseUnit: 0.0012 },
  { id: '2', name: 'Sucre Blanc', unit: Unit.KG, price: 1.50, quantity: 1, costPerBaseUnit: 0.0015 },
  { id: '3', name: 'Beurre Doux', unit: Unit.KG, price: 8.00, quantity: 0.5, costPerBaseUnit: 0.016 },
  { id: '4', name: 'Oeufs', unit: Unit.PIECE, price: 2.50, quantity: 6, costPerBaseUnit: 0.416 },
  { id: '5', name: 'Chocolat Noir 70%', unit: Unit.KG, price: 15.00, quantity: 1, costPerBaseUnit: 0.015 },
  { id: '6', name: 'Crème Liquide 35%', unit: Unit.L, price: 4.00, quantity: 1, costPerBaseUnit: 0.004 },
];

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'r1',
    name: 'Base Cookie',
    ingredients: [
      { ingredientId: '1', quantity: 250 },
      { ingredientId: '2', quantity: 150 },
      { ingredientId: '3', quantity: 125 },
      { ingredientId: '4', quantity: 1 },
      { ingredientId: '5', quantity: 200 },
    ],
    batchYield: 12,
    lossPercentage: 0
  },
  {
    id: 'r2',
    name: 'Entremet Chocolat 6 pers',
    ingredients: [
       { ingredientId: '5', quantity: 200 },
       { ingredientId: '6', quantity: 300 },
       { ingredientId: '3', quantity: 50 },
       { ingredientId: '2', quantity: 50 },
       { ingredientId: '4', quantity: 3 },
    ],
    batchYield: 1,
    lossPercentage: 5
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Cookie Choco Intense',
    recipeId: 'r1',
    laborTimeMinutes: 5,
    packagingCost: 0.10,
    variableDeliveryCost: 0,
    lossRate: 5,
    targetMargin: 1.0,
    estimatedMonthlySales: 50,
    category: 'biscuit'
  },
  {
    id: 'p2',
    name: 'Royal Chocolat',
    recipeId: 'r2',
    laborTimeMinutes: 45,
    packagingCost: 1.50,
    variableDeliveryCost: 0,
    lossRate: 0,
    targetMargin: 10.0,
    estimatedMonthlySales: 10,
    category: 'entremet'
  }
];
