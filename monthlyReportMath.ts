import { GlobalSettings, Ingredient, MonthlyEntry, Order, Product, Recipe, UnsoldEntry } from './types';
import { calculateRecipeMaterialCost } from './utils';

export interface MonthlyTotalsInput {
  sales: MonthlyEntry[];
  unsold: UnsoldEntry[];
  products: Product[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  settings: GlobalSettings;
  costMode: 0 | 1 | 2;
  actualIngredientSpend: number;
  inventoryVariationCost: number;
  actualFixedCosts: number;
}

export const shouldIncludeOrder = (order: Order, includePending: boolean): boolean => {
  if (order.status === 'cancelled') return false;
  if (order.status === 'pending' && !includePending) return false;
  return true;
};

export const computeMonthlyTotals = (input: MonthlyTotalsInput) => {
  const {
    sales,
    unsold,
    products,
    recipes,
    ingredients,
    settings,
    costMode,
    actualIngredientSpend,
    inventoryVariationCost,
    actualFixedCosts
  } = input;

  const totalRevenueTTC = sales.reduce((sum, line) => sum + (line.quantitySold * line.actualPrice), 0);

  let totalRevenueHT = 0;
  let totalTvaCollected = 0;

  sales.forEach((line) => {
    const lineTotal = line.quantitySold * line.actualPrice;
    const lineTvaRate = line.tvaRate ?? 0;
    if (lineTvaRate > 0) {
      const lineHT = lineTotal / (1 + lineTvaRate / 100);
      totalRevenueHT += lineHT;
      totalTvaCollected += lineTotal - lineHT;
    } else {
      totalRevenueHT += lineTotal;
    }
  });

  const soldByProduct = new Map<string, number>();
  sales.forEach((line) => {
    soldByProduct.set(line.productId, (soldByProduct.get(line.productId) ?? 0) + line.quantitySold);
  });

  const unsoldByProduct = new Map<string, number>();
  unsold.forEach((line) => {
    unsoldByProduct.set(line.productId, (unsoldByProduct.get(line.productId) ?? 0) + line.quantityUnsold);
  });

  const calculatedFoodCost = products.reduce((sum, product) => {
    const recipe = recipes.find(entry => entry.id === product.recipeId);
    if (!recipe) return sum;

    const soldQuantity = soldByProduct.get(product.id) ?? 0;
    const unsoldQuantity = unsoldByProduct.get(product.id) ?? 0;
    const producedQuantity = soldQuantity + unsoldQuantity;
    if (producedQuantity <= 0) return sum;

    const batchCost = calculateRecipeMaterialCost(recipe, ingredients);
    const unitCost = batchCost / (recipe.batchYield ?? 1);
    const manufacturingLossMultiplier = 1 / (1 - product.lossRate / 100);
    return sum + (unitCost * manufacturingLossMultiplier * producedQuantity);
  }, 0);

  const finalFoodCost = costMode === 0
    ? calculatedFoodCost
    : (costMode === 1 ? actualIngredientSpend : inventoryVariationCost);

  const totalPackagingCost = products.reduce((sum, product) => {
    const soldQuantity = soldByProduct.get(product.id) ?? 0;
    const unsoldQuantity = unsoldByProduct.get(product.id) ?? 0;
    const packagingUnits = soldQuantity + (product.packagingUsedOnUnsold ? unsoldQuantity : 0);
    if (packagingUnits <= 0) return sum;

    const manufacturingLossMultiplier = 1 / (1 - product.lossRate / 100);
    const packagingLossMultiplier = product.applyLossToPackaging ? manufacturingLossMultiplier : 1;
    return sum + (product.packagingCost * packagingUnits * packagingLossMultiplier);
  }, 0);

  const totalSocialCharges = totalRevenueHT * (settings.taxRate / 100);
  const totalVariableCosts = finalFoodCost + totalPackagingCost + totalSocialCharges;
  const grossMargin = totalRevenueHT - totalVariableCosts;
  const netResult = grossMargin - actualFixedCosts;

  return {
    totalRevenueTTC,
    totalRevenueHT,
    totalTvaCollected,
    finalFoodCost,
    totalPackagingCost,
    totalSocialCharges,
    netResult
  };
};
