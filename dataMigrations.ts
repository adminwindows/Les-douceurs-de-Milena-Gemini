import { AppData } from './dataSchema';
import { GlobalSettings, Ingredient, Product, Purchase } from './types';
import { rebuildIngredientCost } from './utils';

export const normalizeSettings = (settings: GlobalSettings): GlobalSettings => ({
  ...settings,
  includePendingOrdersInMonthlyReport: settings.includePendingOrdersInMonthlyReport ?? false
});

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

export const normalizeProduct = (product: Product): Product => ({
  ...product,
  applyLossToPackaging: product.applyLossToPackaging ?? false
});

export const normalizeAppData = (data: AppData): AppData => {
  const settings = normalizeSettings(data.settings as GlobalSettings);

  return {
    ...data,
    settings,
    ingredients: data.ingredients.map((ingredient) => normalizeIngredient(ingredient as Ingredient, settings)),
    products: data.products.map(normalizeProduct),
    purchases: data.purchases.map((purchase) => normalizePurchase(purchase as Purchase, settings))
  };
};
