import { AppData } from './dataSchema';
import { GlobalSettings, Ingredient, Product, Purchase, SaleLine, UnsoldLine, MonthlyReportData } from './types';
import { rebuildIngredientCost } from './utils';

/**
 * Normalize settings from any legacy format to current model.
 * - Converts includeLaborInCost → pricingMode
 * - Ensures all new fields have defaults
 */
export const normalizeSettings = (settings: any): GlobalSettings => {
  const raw = settings as any;

  // Determine pricingMode: prefer explicit value, else derive from legacy
  let pricingMode: 'margin' | 'salary' = raw.pricingMode ?? 'margin';
  if (raw.pricingMode === undefined && raw.includeLaborInCost !== undefined) {
    // Legacy migration: both cases default to 'margin' (safer)
    pricingMode = 'margin';
  }

  return {
    currency: raw.currency ?? 'EUR',
    hourlyRate: raw.hourlyRate ?? 0,
    pricingMode,
    salaryTarget: raw.salaryTarget ?? 0,
    fixedCostItems: raw.fixedCostItems ?? [],
    taxRate: raw.taxRate ?? 0,
    isTvaSubject: raw.isTvaSubject ?? false,
    defaultTvaRate: raw.defaultTvaRate ?? raw.defaultIngredientVatRate ?? 5.5,
    includePendingOrdersInMonthlyReport: raw.includePendingOrdersInMonthlyReport ?? false
  };
};

/**
 * Migrate ingredient from legacy TVA-per-ingredient format to HT-only.
 *
 * Legacy fields that may exist on raw data:
 *   priceAmount, priceBasis ('TTC'|'HT'), vatRate, needsVatReview
 *
 * Migration rule:
 *   - If priceBasis === 'TTC' and vatRate > 0 and isTvaSubject:
 *       convert price to HT, flag needsPriceReview, preserve vatRate as helperVatRate
 *   - Otherwise: price is already usable as-is
 *   - Strip all legacy fields from result
 */
export const normalizeIngredient = (ingredient: Ingredient, settings: GlobalSettings): Ingredient => {
  // Access legacy fields via any-cast (they may or may not exist on raw data)
  const raw = ingredient as any;
  const legacyPriceAmount: number | undefined = raw.priceAmount;
  const legacyPriceBasis: string | undefined = raw.priceBasis;
  const legacyVatRate: number | undefined = raw.vatRate;

  // Determine the source price
  let price = legacyPriceAmount ?? ingredient.price ?? 0;
  let needsPriceReview = ingredient.needsPriceReview ?? false;
  let helperVatRate = ingredient.helperVatRate;

  // Migration: convert TTC→HT if needed
  if (settings.isTvaSubject && legacyPriceBasis === 'TTC' && legacyVatRate && legacyVatRate > 0) {
    const vatMultiplier = 1 + legacyVatRate / 100;
    price = price / vatMultiplier;
    needsPriceReview = true;
    helperVatRate = helperVatRate ?? legacyVatRate;
  }

  const normalized: Ingredient = {
    id: ingredient.id,
    name: ingredient.name,
    unit: ingredient.unit,
    price,
    quantity: ingredient.quantity,
    costPerBaseUnit: ingredient.costPerBaseUnit,
    helperVatRate,
    needsPriceReview: needsPriceReview || undefined
  };

  return rebuildIngredientCost(normalized);
};

/**
 * Migrate purchase from legacy format (vatRateSnapshot/priceBasisSnapshot) to HT-only price.
 */
export const normalizePurchase = (purchase: Purchase, settings: GlobalSettings): Purchase => {
  const raw = purchase as any;
  const legacyBasis: string | undefined = raw.priceBasisSnapshot;
  const legacyVatRate: number | undefined = raw.vatRateSnapshot;

  let price = purchase.price;

  if (settings.isTvaSubject && legacyBasis === 'TTC' && legacyVatRate && legacyVatRate > 0) {
    price = purchase.price / (1 + legacyVatRate / 100);
  }

  return {
    id: purchase.id,
    date: purchase.date,
    ingredientId: purchase.ingredientId,
    quantity: purchase.quantity,
    price
  };
};

/**
 * Normalize a product from legacy format.
 * - Drops per-product tvaRate (now global)
 * - Preserves standardPrice if present
 */
export const normalizeProduct = (product: any): Product => {
  const p: Product = {
    id: product.id,
    name: product.name,
    recipeId: product.recipeId,
    laborTimeMinutes: product.laborTimeMinutes ?? 0,
    packagingCost: product.packagingCost ?? 0,
    lossRate: product.lossRate ?? 0,
    unsoldEstimate: product.unsoldEstimate ?? 0,
    packagingUsedOnUnsold: product.packagingUsedOnUnsold ?? true,
    applyLossToPackaging: product.applyLossToPackaging ?? false,
    targetMargin: product.targetMargin ?? 0,
    estimatedMonthlySales: product.estimatedMonthlySales ?? 0,
    category: product.category ?? 'Autre'
  };

  if (product.standardPrice !== undefined) p.standardPrice = product.standardPrice;

  return p;
};

/**
 * Normalize a saved report from legacy format.
 * - Converts legacy `sales: MonthlyEntry[]` to `saleLines` + `unsoldLines`
 * - Preserves frozenTotals and ingredientPriceMode if present
 */
export const normalizeReport = (report: any): MonthlyReportData => {
  let saleLines: SaleLine[] = report.saleLines ?? [];
  let unsoldLines: UnsoldLine[] = report.unsoldLines ?? [];

  // Legacy migration: convert combined MonthlyEntry[] to separated lines
  if (saleLines.length === 0 && report.sales && report.sales.length > 0) {
    saleLines = report.sales.map((entry: any) => {
      const sl: SaleLine = {
        productId: entry.productId,
        quantity: entry.quantitySold ?? 0,
        unitPrice: entry.actualPrice ?? 0
      };
      if (entry.isTvaSubject !== undefined) sl.isTvaSubject = entry.isTvaSubject;
      return sl;
    });
    unsoldLines = report.sales
      .filter((entry: any) => (entry.quantityUnsold ?? 0) > 0)
      .map((entry: any) => ({
        productId: entry.productId,
        quantity: entry.quantityUnsold
      }));
  }

  return {
    id: report.id,
    monthStr: report.monthStr,
    saleLines,
    unsoldLines,
    actualFixedCostItems: report.actualFixedCostItems ?? [],
    actualIngredientSpend: report.actualIngredientSpend ?? 0,
    inventory: report.inventory ?? [],
    ingredientPriceMode: report.ingredientPriceMode,
    frozenTotals: report.frozenTotals,
    totalRevenue: report.totalRevenue ?? 0,
    netResult: report.netResult ?? 0,
    isLocked: report.isLocked ?? false
  };
};

export const normalizeAppData = (data: any): AppData => {
  const settings = normalizeSettings(data.settings ?? {});

  return {
    settings,
    ingredients: (data.ingredients ?? []).map((ingredient: any) => normalizeIngredient(ingredient as Ingredient, settings)),
    recipes: data.recipes ?? [],
    products: (data.products ?? []).map((p: any) => normalizeProduct(p)),
    orders: data.orders ?? [],
    savedReports: (data.savedReports ?? []).map((r: any) => normalizeReport(r)),
    purchases: (data.purchases ?? []).map((purchase: any) => normalizePurchase(purchase as Purchase, settings)),
    productionBatches: data.productionBatches ?? []
  } as AppData;
};
