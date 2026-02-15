
import { Ingredient, Product, Recipe, Unit, GlobalSettings } from './types';

export const convertToCostPerBaseUnit = (price: number, quantity: number, unit: Unit): number => {
  if (!Number.isFinite(price) || !Number.isFinite(quantity) || quantity <= 0) return 0;
  let multiplier = 1;
  if (unit === Unit.KG || unit === Unit.L) multiplier = 1000;
  return price / (quantity * multiplier);
};

export const formatCurrency = (amount: number, currency = '€') => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount);
};

/** Convert a TTC price to HT given a TVA rate. Pure helper for UI converters. */
export const ttcToHt = (priceTTC: number, vatRate: number): number => {
  if (vatRate <= 0) return priceTTC;
  return priceTTC / (1 + vatRate / 100);
};

/** Ingredient prices are always HT. Simply recomputes costPerBaseUnit from price. */
export const rebuildIngredientCost = (ingredient: Ingredient): Ingredient => {
  const costPerBaseUnit = convertToCostPerBaseUnit(ingredient.price, 1, ingredient.unit);
  return { ...ingredient, costPerBaseUnit };
};

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
  const isTvaSubject = settings.isTvaSubject;
  const tvaRate = product.tvaRate ?? settings.defaultTvaRate ?? 0;

  const batchMaterialCost = calculateRecipeMaterialCost(recipe, ingredients);
  const unitMaterialCost = batchMaterialCost / (recipe.batchYield ?? 1);

  const calculatedLaborCost = (product.laborTimeMinutes / 60) * settings.hourlyRate;
  const laborCost = settings.includeLaborInCost ? calculatedLaborCost : 0;

  const totalEstimatedVolume = allProducts.reduce((sum, p) => sum + (p.estimatedMonthlySales || 0), 0);
  const totalFixedCosts = settings.fixedCostItems.reduce((sum, item) => sum + item.amount, 0);

  const allocatedFixedCost = totalEstimatedVolume > 0
    ? totalFixedCosts / totalEstimatedVolume
    : 0;

  const manufacturingLossMultiplier = 1 / (1 - (product.lossRate / 100));

  const sales = product.estimatedMonthlySales ?? 1;
  const unsold = product.unsoldEstimate || 0;

  const materialProductionRatio = (sales + unsold) / sales;
  const packagingQuantity = sales + (product.packagingUsedOnUnsold ? unsold : 0);
  const packagingRatio = packagingQuantity / sales;

  const finalMaterialCost = unitMaterialCost * manufacturingLossMultiplier * materialProductionRatio;
  const packagingLossMultiplier = product.applyLossToPackaging ? manufacturingLossMultiplier : 1;
  const finalPackagingCost = product.packagingCost * packagingLossMultiplier * packagingRatio;

  const totalVariableCosts = finalMaterialCost + finalPackagingCost;

  const fullCost = totalVariableCosts + laborCost + allocatedFixedCost;

  const socialRateDecimal = settings.taxRate / 100;
  const divisor = 1 - socialRateDecimal;

  const minPriceBreakevenHT = fullCost / divisor;

  const priceWithMarginHT = (fullCost + product.targetMargin) / divisor;

  const minPriceBreakevenTTC = isTvaSubject ? minPriceBreakevenHT * (1 + tvaRate / 100) : minPriceBreakevenHT;
  const priceWithMarginTTC = isTvaSubject ? priceWithMarginHT * (1 + tvaRate / 100) : priceWithMarginHT;

  return {
    unitMaterialCost,
    laborCost,
    allocatedFixedCost,
    fullCost,
    minPriceBreakeven: minPriceBreakevenHT,
    minPriceBreakevenTTC,
    priceWithMargin: priceWithMarginHT,
    priceWithMarginTTC,
    totalVariableCosts,
    tvaRate: isTvaSubject ? tvaRate : 0
  };
};

export const INITIAL_SETTINGS: GlobalSettings = {
  currency: 'EUR',
  hourlyRate: 15,
  includeLaborInCost: true,
  fixedCostItems: [
    { id: 'fc1', name: 'Electricité / Eau (quote-part)', amount: 40 },
    { id: 'fc2', name: 'Assurance', amount: 30 },
    { id: 'fc3', name: 'Abonnement Site Web', amount: 20 },
    { id: 'fc4', name: 'Banque', amount: 10 },
  ],
  taxRate: 22,
  isTvaSubject: false,
  defaultTvaRate: 5.5,
  includePendingOrdersInMonthlyReport: false
};

export const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: '1', name: 'Farine T55', unit: Unit.KG, price: 1.20, quantity: 1, costPerBaseUnit: 0.0012 },
  { id: '2', name: 'Sucre Blanc', unit: Unit.KG, price: 1.50, quantity: 1, costPerBaseUnit: 0.0015 },
  { id: '3', name: 'Beurre Doux', unit: Unit.KG, price: 16.00, quantity: 0.5, costPerBaseUnit: 0.016 },
  { id: '4', name: 'Oeufs', unit: Unit.PIECE, price: 0.42, quantity: 6, costPerBaseUnit: 0.42 },
  { id: '5', name: 'Chocolat Noir 70%', unit: Unit.KG, price: 15.00, quantity: 1, costPerBaseUnit: 0.015 },
  { id: '6', name: 'Crème Liquide 35%', unit: Unit.L, price: 4.00, quantity: 1, costPerBaseUnit: 0.004 },
];

export const INITIAL_RECIPES = [
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

    lossRate: 5,
    unsoldEstimate: 2,
    packagingUsedOnUnsold: false,
    applyLossToPackaging: false,
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

    lossRate: 0,
    unsoldEstimate: 0,
    packagingUsedOnUnsold: true,
    applyLossToPackaging: false,
    targetMargin: 10.0,
    estimatedMonthlySales: 10,
    category: 'entremet'
  }
];
