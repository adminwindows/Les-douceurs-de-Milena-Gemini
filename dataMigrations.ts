import { AppData } from './dataSchema';
import { GlobalSettings, Ingredient, Product } from './types';
import { rebuildIngredientCost } from './utils';

export const normalizeSettings = (settings: GlobalSettings): GlobalSettings => ({
  ...settings,
  defaultIngredientVatRate: settings.defaultIngredientVatRate ?? settings.defaultTvaRate ?? 5.5,
  includePendingOrdersInMonthlyReport: settings.includePendingOrdersInMonthlyReport ?? false
});

export const normalizeIngredient = (ingredient: Ingredient, settings: GlobalSettings): Ingredient => {
  const hasLegacyVatShape = ingredient.priceAmount === undefined || ingredient.priceBasis === undefined || ingredient.vatRate === undefined;
  const normalized: Ingredient = {
    ...ingredient,
    priceAmount: ingredient.priceAmount ?? ingredient.price ?? 0,
    price: ingredient.priceAmount ?? ingredient.price ?? 0,
    priceBasis: ingredient.priceBasis ?? (settings.isTvaSubject ? 'HT' : 'TTC'),
    vatRate: ingredient.vatRate ?? settings.defaultIngredientVatRate ?? 5.5,
    needsVatReview: ingredient.needsVatReview ?? (settings.isTvaSubject && hasLegacyVatShape)
  };

  return rebuildIngredientCost(normalized, settings);
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
    products: data.products.map(normalizeProduct)
  };
};
