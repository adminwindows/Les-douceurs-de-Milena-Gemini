import { GlobalSettings, Ingredient, Product, Purchase, Recipe, Unit } from './types';

export type IngredientPriceMode = 'standard' | 'average' | 'last';

export const convertToCostPerBaseUnit = (price: number, quantity: number, unit: Unit): number => {
  if (!Number.isFinite(price) || !Number.isFinite(quantity) || quantity <= 0) return 0;
  let multiplier = 1;
  if (unit === Unit.KG || unit === Unit.L) multiplier = 1000;
  return price / (quantity * multiplier);
};

export const formatCurrency = (_amount: number, _currency = '€') => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(_amount);
};

export const ttcToHt = (priceTTC: number, vatRate: number): number => {
  if (vatRate <= 0) return priceTTC;
  return priceTTC / (1 + vatRate / 100);
};

export const rebuildIngredientCost = (ingredient: Ingredient): Ingredient => ({
  ...ingredient,
  costPerBaseUnit: convertToCostPerBaseUnit(ingredient.price, 1, ingredient.unit)
});

export const applyIngredientPriceMode = (
  ingredients: Ingredient[],
  purchases: Purchase[],
  mode: IngredientPriceMode
): Ingredient[] => {
  if (mode === 'standard') {
    return ingredients.map(ingredient => rebuildIngredientCost(ingredient));
  }

  return ingredients.map((ingredient) => {
    const ingredientPurchases = purchases
      .filter(purchase => purchase.ingredientId === ingredient.id)
      .filter(purchase => purchase.quantity > 0);

    if (ingredientPurchases.length === 0) {
      return rebuildIngredientCost(ingredient);
    }

    let price = ingredient.price;

    if (mode === 'average') {
      const totalQuantity = ingredientPurchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
      const totalSpent = ingredientPurchases.reduce((sum, purchase) => sum + purchase.price, 0);
      if (totalQuantity > 0) {
        price = totalSpent / totalQuantity;
      }
    } else if (mode === 'last') {
      const lastPurchase = [...ingredientPurchases]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      price = lastPurchase.price / lastPurchase.quantity;
    }

    return rebuildIngredientCost({
      ...ingredient,
      price
    });
  });
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
  const tvaRate = isTvaSubject ? (settings.defaultTvaRate ?? 0) : 0;

  const batchMaterialCost = calculateRecipeMaterialCost(recipe, ingredients);
  const unitMaterialCost = batchMaterialCost / (recipe.batchYield ?? 1);

  const totalEstimatedVolume = allProducts.reduce((sum, candidate) => sum + (candidate.estimatedMonthlySales || 0), 0);
  const totalFixedCosts = settings.fixedCostItems.reduce((sum, item) => sum + item.amount, 0);

  const allocatedFixedCost = totalEstimatedVolume > 0
    ? totalFixedCosts / totalEstimatedVolume
    : 0;

  const manufacturingLossMultiplier = 1 / (1 - (product.lossRate / 100));
  const sales = product.estimatedMonthlySales || 1;
  const unsold = product.unsoldEstimate || 0;

  const materialProductionRatio = (sales + unsold) / sales;
  const packagingQuantity = sales + (product.packagingUsedOnUnsold ? unsold : 0);
  const packagingRatio = packagingQuantity / sales;

  const finalMaterialCost = unitMaterialCost * manufacturingLossMultiplier * materialProductionRatio;
  const packagingLossMultiplier = product.applyLossToPackaging ? manufacturingLossMultiplier : 1;
  const finalPackagingCost = product.packagingCost * packagingLossMultiplier * packagingRatio;
  const totalVariableCosts = finalMaterialCost + finalPackagingCost;
  const fullCost = totalVariableCosts + allocatedFixedCost;

  const socialRateDecimal = settings.taxRate / 100;
  const divisor = 1 - socialRateDecimal;
  const safeDivisor = divisor > 0 ? divisor : 1;

  const minPriceBreakevenHT = fullCost / safeDivisor;
  const priceWithMarginHT = (fullCost + product.targetMargin) / safeDivisor;

  const allocatedSalaryPerUnit = totalEstimatedVolume > 0
    ? settings.targetMonthlySalary / totalEstimatedVolume
    : 0;
  const priceWithSalaryHT = (fullCost + allocatedSalaryPerUnit) / safeDivisor;

  const minPriceBreakevenTTC = isTvaSubject ? minPriceBreakevenHT * (1 + tvaRate / 100) : minPriceBreakevenHT;
  const priceWithMarginTTC = isTvaSubject ? priceWithMarginHT * (1 + tvaRate / 100) : priceWithMarginHT;
  const priceWithSalaryTTC = isTvaSubject ? priceWithSalaryHT * (1 + tvaRate / 100) : priceWithSalaryHT;

  const recommendedPriceHT = settings.pricingStrategy === 'salary' ? priceWithSalaryHT : priceWithMarginHT;
  const recommendedPriceTTC = settings.pricingStrategy === 'salary' ? priceWithSalaryTTC : priceWithMarginTTC;

  return {
    unitMaterialCost,
    finalMaterialCost,
    finalPackagingCost,
    allocatedFixedCost,
    fullCost,
    minPriceBreakeven: minPriceBreakevenHT,
    minPriceBreakevenTTC,
    priceWithMargin: priceWithMarginHT,
    priceWithMarginTTC,
    priceWithSalary: priceWithSalaryHT,
    priceWithSalaryTTC,
    recommendedPriceHT,
    recommendedPriceTTC,
    totalVariableCosts,
    tvaRate
  };
};

export interface SalaryTargetPlanRow {
  productId: string;
  productName: string;
  weight: number;
  netPerUnit: number;
  estimatedUnits: number;
}

export interface SalaryTargetPlan {
  feasible: boolean;
  totalUnitsNeeded: number;
  estimatedNetResult: number;
  message?: string;
  rows: SalaryTargetPlanRow[];
}

export const estimateUnitsForTargetSalary = (args: {
  targetSalary: number;
  products: Product[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  settings: GlobalSettings;
  useStandardPrice: boolean;
}): SalaryTargetPlan => {
  const { targetSalary, products, recipes, ingredients, settings, useStandardPrice } = args;
  const candidateProducts = products
    .map((product) => {
      const recipe = recipes.find(entry => entry.id === product.recipeId);
      if (!recipe) return undefined;

      const metrics = calculateProductMetrics(product, recipe, ingredients, settings, products);
      const salePrice = useStandardPrice
        ? (product.standardPrice ?? metrics.priceWithMarginTTC)
        : metrics.priceWithMarginTTC;
      const revenueHT = settings.isTvaSubject ? (salePrice / (1 + metrics.tvaRate / 100)) : salePrice;
      const socialCharges = revenueHT * (settings.taxRate / 100);
      const netPerUnit = revenueHT - metrics.fullCost - socialCharges;

      return {
        productId: product.id,
        productName: product.name,
        estimatedMonthlySales: product.estimatedMonthlySales,
        netPerUnit,
        salePrice
      };
    })
    .filter((product): product is NonNullable<typeof product> => Boolean(product));

  if (candidateProducts.length === 0) {
    return {
      feasible: false,
      totalUnitsNeeded: 0,
      estimatedNetResult: 0,
      message: 'Aucun produit avec recette valide.',
      rows: []
    };
  }

  const totalWeight = candidateProducts.reduce((sum, product) => sum + Math.max(product.estimatedMonthlySales, 0), 0);
  const fallbackWeight = totalWeight > 0 ? 0 : candidateProducts.length;

  const rows = candidateProducts.map((product) => {
    const weight = totalWeight > 0
      ? Math.max(product.estimatedMonthlySales, 0) / totalWeight
      : 1 / fallbackWeight;

    return {
      productId: product.productId,
      productName: product.productName,
      weight,
      netPerUnit: product.netPerUnit,
      estimatedUnits: 0
    };
  });

  const weightedNetPerUnit = rows.reduce((sum, row) => sum + (row.weight * row.netPerUnit), 0);
  if (weightedNetPerUnit <= 0) {
    return {
      feasible: false,
      totalUnitsNeeded: 0,
      estimatedNetResult: 0,
      message: 'Le mix de prix actuel ne génère pas de gain net positif.',
      rows
    };
  }

  const safeTarget = Math.max(targetSalary, 0);
  const totalUnitsNeeded = safeTarget / weightedNetPerUnit;
  const finalRows = rows.map((row) => ({
    ...row,
    estimatedUnits: totalUnitsNeeded * row.weight
  }));

  return {
    feasible: true,
    totalUnitsNeeded,
    estimatedNetResult: totalUnitsNeeded * weightedNetPerUnit,
    rows: finalRows
  };
};

export const INITIAL_SETTINGS: GlobalSettings = {
  currency: 'EUR',
  fixedCostItems: [
    { id: 'fc1', name: 'Electricité / Eau (quote-part)', amount: 40 },
    { id: 'fc2', name: 'Assurance', amount: 30 },
    { id: 'fc3', name: 'Abonnement Site Web', amount: 20 },
    { id: 'fc4', name: 'Banque', amount: 10 },
  ],
  taxRate: 22,
  isTvaSubject: false,
  defaultTvaRate: 5.5,
  pricingStrategy: 'margin',
  targetMonthlySalary: 0,
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
    packagingCost: 0.10,
    lossRate: 5,
    unsoldEstimate: 2,
    packagingUsedOnUnsold: false,
    applyLossToPackaging: false,
    targetMargin: 1.0,
    standardPrice: 0,
    estimatedMonthlySales: 50,
    category: 'biscuit'
  },
  {
    id: 'p2',
    name: 'Royal Chocolat',
    recipeId: 'r2',
    packagingCost: 1.50,
    lossRate: 0,
    unsoldEstimate: 0,
    packagingUsedOnUnsold: true,
    applyLossToPackaging: false,
    targetMargin: 10.0,
    standardPrice: 0,
    estimatedMonthlySales: 10,
    category: 'entremet'
  }
];
