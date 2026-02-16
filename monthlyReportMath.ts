import { GlobalSettings, Ingredient, MonthlyEntry, Order, Product, Recipe } from './types';
import { calculateRecipeMaterialCost } from './utils';

export interface MonthlyTotalsInput {
  sales: MonthlyEntry[];
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
  const { sales, products, recipes, ingredients, settings, costMode, actualIngredientSpend, inventoryVariationCost, actualFixedCosts } = input;
  const isTva = settings.isTvaSubject;

  const totalRevenueTTC = sales.reduce((sum, s) => sum + (s.quantitySold * s.actualPrice), 0);
  let totalRevenueHT = 0;
  let totalTvaCollected = 0;

  // Per-entry TVA interpretation: use the snapshot stored on each entry,
  // falling back to the current global setting for legacy entries without snapshot.
  sales.forEach((s) => {
    const entryWasTva = s.isTvaSubject ?? isTva;
    const lineTotal = s.quantitySold * s.actualPrice;
    if (entryWasTva) {
      const p = products.find(prod => prod.id === s.productId);
      const tvaRate = p?.tvaRate ?? settings.defaultTvaRate ?? 0;
      const lineHT = lineTotal / (1 + tvaRate / 100);
      totalRevenueHT += lineHT;
      totalTvaCollected += (lineTotal - lineHT);
    } else {
      totalRevenueHT += lineTotal;
    }
  });

  const calculatedFoodCost = sales.reduce((sum, s) => {
    const product = products.find(p => p.id === s.productId);
    const recipe = recipes.find(r => r.id === product?.recipeId);
    if (!product || !recipe) return sum;
    const batchCost = calculateRecipeMaterialCost(recipe, ingredients);
    const unitCost = batchCost / (recipe.batchYield ?? 1);
    const mfgLossMultiplier = 1 / (1 - product.lossRate / 100);
    return sum + (unitCost * mfgLossMultiplier * (s.quantitySold + (s.quantityUnsold || 0)));
  }, 0);

  const finalFoodCost = costMode === 0 ? calculatedFoodCost : (costMode === 1 ? actualIngredientSpend : inventoryVariationCost);

  const totalPackagingCost = sales.reduce((sum, s) => {
    const product = products.find(p => p.id === s.productId);
    if (!product) return sum;
    const packagingUnits = s.quantitySold + (product.packagingUsedOnUnsold ? (s.quantityUnsold || 0) : 0);
    const mfgLossMultiplier = 1 / (1 - product.lossRate / 100);
    const packagingLossMultiplier = product.applyLossToPackaging ? mfgLossMultiplier : 1;
    return sum + (product.packagingCost * packagingUnits * packagingLossMultiplier);
  }, 0);

  const baseForSocialCharges = totalRevenueHT;
  const totalSocialCharges = baseForSocialCharges * (settings.taxRate / 100);
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
