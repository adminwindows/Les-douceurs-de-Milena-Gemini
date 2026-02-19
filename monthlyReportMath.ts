import { GlobalSettings, Ingredient, MonthlyEntry, Order, Product, Recipe, UnsoldEntry } from './types';
import { calculateRecipeMaterialCost } from './utils';

export interface MonthlyTotalsInput {
  sales: MonthlyEntry[];
  unsold?: UnsoldEntry[];
  products: Product[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  settings: GlobalSettings;
  costMode: 0 | 1 | 2;
  actualIngredientSpend: number;
  inventoryVariationCost: number;
  actualFixedCosts: number;
  selectedMonth: string;
  orders: Order[];
}

export const shouldIncludeOrder = (order: Order, includePending: boolean): boolean => {
  if (order.status === 'cancelled') return false;
  if (order.status === 'pending' && !includePending) return false;
  return true;
};

export const computeMonthlyTotals = (input: MonthlyTotalsInput) => {
  const { sales, unsold = [], products, recipes, ingredients, settings, costMode, actualIngredientSpend, inventoryVariationCost, actualFixedCosts } = input;

  const totalRevenueTTC = sales.reduce((sum, s) => sum + (s.quantitySold * s.actualPrice), 0);
  let totalRevenueHT = 0;
  let totalTvaCollected = 0;

  sales.forEach((s) => {
    const lineTotal = s.quantitySold * s.actualPrice;
    const rate = s.tvaRate ?? 0;
    if (rate > 0) {
      const lineHT = lineTotal / (1 + rate / 100);
      totalRevenueHT += lineHT;
      totalTvaCollected += (lineTotal - lineHT);
    } else {
      totalRevenueHT += lineTotal;
    }
  });

  const unsoldByProduct = unsold.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.productId] = (acc[entry.productId] ?? 0) + entry.quantityUnsold;
    return acc;
  }, {});

  const calculatedFoodCost = products.reduce((sum, product) => {
    const recipe = recipes.find(r => r.id === product.recipeId);
    if (!recipe) return sum;

    const soldQty = sales
      .filter(s => s.productId === product.id)
      .reduce((qty, s) => qty + s.quantitySold, 0);
    const unsoldQty = unsoldByProduct[product.id] ?? 0;

    const producedQty = soldQty + unsoldQty;
    if (producedQty <= 0) return sum;

    const batchCost = calculateRecipeMaterialCost(recipe, ingredients);
    const unitCost = batchCost / (recipe.batchYield ?? 1);
    const mfgLossMultiplier = 1 / (1 - product.lossRate / 100);
    return sum + (unitCost * mfgLossMultiplier * producedQty);
  }, 0);

  const finalFoodCost = costMode === 0 ? calculatedFoodCost : (costMode === 1 ? actualIngredientSpend : inventoryVariationCost);

  const totalPackagingCost = products.reduce((sum, product) => {
    const soldQty = sales
      .filter(s => s.productId === product.id)
      .reduce((qty, s) => qty + s.quantitySold, 0);
    const unsoldQty = unsoldByProduct[product.id] ?? 0;
    const packagingUnits = soldQty + (product.packagingUsedOnUnsold ? unsoldQty : 0);
    const mfgLossMultiplier = 1 / (1 - product.lossRate / 100);
    const packagingLossMultiplier = product.applyLossToPackaging ? mfgLossMultiplier : 1;
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
