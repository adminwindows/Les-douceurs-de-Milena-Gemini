
import { Ingredient, Product, Recipe, Unit, GlobalSettings, FixedCostItem } from './types';

// Conversion helpers
export const convertToCostPerBaseUnit = (price: number, quantity: number, unit: Unit): number => {
  if (quantity === 0) return 0;
  let multiplier = 1;
  if (unit === Unit.KG || unit === Unit.L) multiplier = 1000;
  return price / (quantity * multiplier);
};

export const formatCurrency = (amount: number, currency = '€') => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
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
  allProducts: Product[] 
) => {
  // TVA Logic
  const isTvaSubject = settings.isTvaSubject;
  const tvaRate = product.tvaRate ?? settings.defaultTvaRate ?? 0;

  // 1. Material Cost per Produced Unit
  // NOTE: If isTvaSubject is true, we assume ingredient prices in DB are HT (because business recovers VAT).
  // If false, ingredient prices are TTC (final cost for artisan).
  const batchMaterialCost = calculateRecipeMaterialCost(recipe, ingredients);
  const unitMaterialCost = batchMaterialCost / (recipe.batchYield || 1);

  // 2. Labor Cost per Unit
  const laborCost = (product.laborTimeMinutes / 60) * settings.hourlyRate;

  // 3. Allocated Fixed Costs
  const totalEstimatedVolume = allProducts.reduce((sum, p) => sum + (p.estimatedMonthlySales || 0), 0);
  const totalFixedCosts = settings.fixedCostItems.reduce((sum, item) => sum + item.amount, 0);
  
  const allocatedFixedCost = totalEstimatedVolume > 0 
    ? totalFixedCosts / totalEstimatedVolume
    : 0;

  // 4. Manufacturing Loss (Waste during creation)
  let safeLossRate = product.lossRate;
  if (safeLossRate >= 100) safeLossRate = 99.9;
  if (safeLossRate < 0) safeLossRate = 0;
  
  const manufacturingLossMultiplier = 1 / (1 - (safeLossRate / 100));

  // 5. Unsold Items Impact (Finished goods thrown away)
  const sales = product.estimatedMonthlySales || 1;
  const unsold = product.unsoldEstimate || 0;
  
  // Ratios for cost attribution
  const materialProductionRatio = (sales + unsold) / sales;
  const packagingQuantity = sales + (product.packagingUsedOnUnsold ? unsold : 0);
  const packagingRatio = packagingQuantity / sales;

  // Variable Costs per Sold Unit calculation
  const finalMaterialCost = unitMaterialCost * manufacturingLossMultiplier * materialProductionRatio;
  const finalPackagingCost = product.packagingCost * manufacturingLossMultiplier * packagingRatio;
  const finalDeliveryCost = product.variableDeliveryCost;

  const totalVariableCosts = finalMaterialCost + finalPackagingCost + finalDeliveryCost;

  // 6. Full Cost
  // If isTvaSubject, this is Full Cost HT.
  const fullCost = totalVariableCosts + laborCost + allocatedFixedCost;

  // 7. Minimum Price (Breakeven)
  // Social contributions (settings.taxRate) are deducted from Revenue.
  // Revenue Base:
  // - If isTvaSubject: Contributions are usually on CA HT (or Net). We'll assume CA HT.
  // - If !isTvaSubject: Contributions are on CA Total.
  
  const socialRateDecimal = settings.taxRate / 100;
  const divisor = 1 - socialRateDecimal > 0 ? 1 - socialRateDecimal : 1;
  
  // Price required to cover Full Cost after paying social charges
  const minPriceBreakevenHT = fullCost / divisor;

  // 8. Target Price
  const priceWithMarginHT = (fullCost + product.targetMargin) / divisor;

  // 9. TTC Conversions
  const minPriceBreakevenTTC = isTvaSubject ? minPriceBreakevenHT * (1 + tvaRate / 100) : minPriceBreakevenHT;
  const priceWithMarginTTC = isTvaSubject ? priceWithMarginHT * (1 + tvaRate / 100) : priceWithMarginHT;

  return {
    unitMaterialCost,
    laborCost,
    allocatedFixedCost,
    fullCost, // This is HT if isTvaSubject, else TTC (cost to artisan)
    minPriceBreakeven: minPriceBreakevenHT, // HT if subject
    minPriceBreakevenTTC,
    priceWithMargin: priceWithMarginHT, // HT if subject
    priceWithMarginTTC,
    totalVariableCosts,
    tvaRate: isTvaSubject ? tvaRate : 0
  };
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
  isTvaSubject: false,
  defaultTvaRate: 5.5,
};

export const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: '1', name: 'Farine T55', unit: Unit.KG, price: 1.20, quantity: 1, costPerBaseUnit: 0.0012 },
  { id: '2', name: 'Sucre Blanc', unit: Unit.KG, price: 1.50, quantity: 1, costPerBaseUnit: 0.0015 },
  // Fix: Butter price per KG is 16.00 if costPerBaseUnit is 0.016. Quantity 0.5 is current stock.
  { id: '3', name: 'Beurre Doux', unit: Unit.KG, price: 16.00, quantity: 0.5, costPerBaseUnit: 0.016 },
  { id: '4', name: 'Oeufs', unit: Unit.PIECE, price: 0.42, quantity: 6, costPerBaseUnit: 0.42 }, // Fix Price per unit
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
    unsoldEstimate: 2,
    packagingUsedOnUnsold: false, 
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
    unsoldEstimate: 0,
    packagingUsedOnUnsold: true, 
    targetMargin: 10.0,
    estimatedMonthlySales: 10,
    category: 'entremet'
  }
];
