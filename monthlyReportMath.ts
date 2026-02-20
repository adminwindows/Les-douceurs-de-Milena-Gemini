import { GlobalSettings, Ingredient, Order, Product, Recipe, SaleLine, UnsoldLine, FrozenReportTotals } from './types';
import { calculateRecipeMaterialCost } from './utils';

export interface MonthlyTotalsInput {
  saleLines: SaleLine[];
  unsoldLines: UnsoldLine[];
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

export interface MonthlyTotals {
  totalRevenueTTC: number;
  totalRevenueHT: number;
  totalTvaCollected: number;
  finalFoodCost: number;
  totalPackagingCost: number;
  totalSocialCharges: number;
  grossMargin: number;
  netResult: number;
}

export const shouldIncludeOrder = (
  order: Order,
  includePending: boolean
): boolean => {
  if (order.status === 'cancelled') return false;
  if (order.status === 'completed') return true;
  return includePending;
};

/**
 * Pure monthly computation function.
 * Works with separated SaleLines and UnsoldLines.
 * Each SaleLine may carry its own isTvaSubject snapshot (fallback to global setting).
 */
export const computeMonthlyTotals = (input: MonthlyTotalsInput): MonthlyTotals => {
  const { saleLines, unsoldLines, products, recipes, ingredients, settings, costMode, actualIngredientSpend, inventoryVariationCost, actualFixedCosts } = input;
  const globalIsTva = settings.isTvaSubject;
  const defaultTvaRate = settings.defaultTvaRate ?? 0;

  // ---- Revenue ----
  let totalRevenueTTC = 0;
  let totalRevenueHT = 0;
  let totalTvaCollected = 0;

  for (const sl of saleLines) {
    const lineTTC = sl.quantity * sl.unitPrice;
    totalRevenueTTC += lineTTC;

    // Determine TVA mode for this line: per-line snapshot or global fallback
    const lineIsTva = sl.isTvaSubject !== undefined ? sl.isTvaSubject : globalIsTva;

    if (lineIsTva) {
      const tvaRate = defaultTvaRate;
      const lineHT = lineTTC / (1 + tvaRate / 100);
      totalRevenueHT += lineHT;
      totalTvaCollected += lineTTC - lineHT;
    } else {
      totalRevenueHT += lineTTC;
    }
  }

  // ---- Food cost ----
  // Build aggregated quantities per product from separated lines
  const productSoldMap = new Map<string, number>();
  const productUnsoldMap = new Map<string, number>();

  for (const sl of saleLines) {
    productSoldMap.set(sl.productId, (productSoldMap.get(sl.productId) ?? 0) + sl.quantity);
  }
  for (const ul of unsoldLines) {
    productUnsoldMap.set(ul.productId, (productUnsoldMap.get(ul.productId) ?? 0) + ul.quantity);
  }

  // All product IDs that appear in either sales or unsold
  const allProductIds = new Set([...productSoldMap.keys(), ...productUnsoldMap.keys()]);

  let calculatedFoodCost = 0;
  let totalPackagingCost = 0;

  for (const pid of allProductIds) {
    const p = products.find(pr => pr.id === pid);
    if (!p) continue;

    const recipe = recipes.find(r => r.id === p.recipeId);
    if (!recipe) continue;

    const batchCost = calculateRecipeMaterialCost(recipe, ingredients);
    const unitCost = batchCost / (recipe.batchYield || 1);
    const lossRate = p.lossRate || 0;
    const mfgLossMultiplier = lossRate < 100 ? 1 / (1 - lossRate / 100) : 1;

    const soldQty = productSoldMap.get(pid) ?? 0;
    const unsoldQty = productUnsoldMap.get(pid) ?? 0;
    const totalProduced = soldQty + unsoldQty;

    calculatedFoodCost += unitCost * mfgLossMultiplier * totalProduced;

    // Packaging
    const packagingUnits = soldQty + (p.packagingUsedOnUnsold ? unsoldQty : 0);
    const packagingLossMultiplier = p.applyLossToPackaging ? mfgLossMultiplier : 1;
    totalPackagingCost += p.packagingCost * packagingUnits * packagingLossMultiplier;
  }

  // Select food cost based on mode
  let finalFoodCost: number;
  if (costMode === 1) {
    finalFoodCost = actualIngredientSpend;
  } else if (costMode === 2) {
    finalFoodCost = inventoryVariationCost;
  } else {
    finalFoodCost = calculatedFoodCost;
  }

  // ---- Social charges ----
  const totalSocialCharges = totalRevenueHT * (settings.taxRate / 100);

  // ---- Result ----
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
    grossMargin,
    netResult
  };
};

/**
 * Freeze all totals into a snapshot for permanent storage in a saved report.
 */
export const freezeTotals = (
  totals: MonthlyTotals,
  actualFixedCosts: number,
  costMode: 0 | 1 | 2
): FrozenReportTotals => ({
  totalRevenueTTC: totals.totalRevenueTTC,
  totalRevenueHT: totals.totalRevenueHT,
  totalTvaCollected: totals.totalTvaCollected,
  foodCost: totals.finalFoodCost,
  packagingCost: totals.totalPackagingCost,
  socialCharges: totals.totalSocialCharges,
  fixedCosts: actualFixedCosts,
  grossMargin: totals.grossMargin,
  netResult: totals.netResult,
  costMode
});
