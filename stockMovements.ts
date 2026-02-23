import { Ingredient, Product, Recipe, Unit } from './types';

export interface ProductionRequest {
  productId: string;
  quantity: number;
}

export interface IngredientUsage {
  ingredientId: string;
  quantity: number;
}

export interface StockShortage {
  ingredientId: string;
  ingredientName: string;
  unit: Unit;
  required: number;
  available: number;
  missing: number;
}

export interface ProductionUsageResult {
  usages: IngredientUsage[];
  missingProductIds: string[];
  missingRecipeProductIds: string[];
  missingIngredientIds: string[];
}

const roundQuantity = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;

const toIngredientStockUnit = (quantityInRecipeUnits: number, unit: Unit): number => {
  if (unit === Unit.KG || unit === Unit.L) {
    return quantityInRecipeUnits / 1000;
  }
  return quantityInRecipeUnits;
};

export const computeProductionIngredientUsage = (
  requests: ProductionRequest[],
  products: Product[],
  recipes: Recipe[],
  ingredients: Ingredient[]
): ProductionUsageResult => {
  const usageMap = new Map<string, number>();
  const missingProductIds: string[] = [];
  const missingRecipeProductIds: string[] = [];
  const missingIngredientIds: string[] = [];

  requests.forEach((request) => {
    if (!Number.isFinite(request.quantity) || request.quantity <= 0) return;

    const product = products.find(entry => entry.id === request.productId);
    if (!product) {
      missingProductIds.push(request.productId);
      return;
    }

    const recipe = recipes.find(entry => entry.id === product.recipeId);
    if (!recipe) {
      missingRecipeProductIds.push(product.id);
      return;
    }

    const batchYield = recipe.batchYield > 0 ? recipe.batchYield : 1;
    const ratio = request.quantity / batchYield;
    const manufacturingLossMultiplier = 1 / (1 - product.lossRate / 100);

    recipe.ingredients.forEach((recipeIngredient) => {
      const ingredient = ingredients.find(entry => entry.id === recipeIngredient.ingredientId);
      if (!ingredient) {
        missingIngredientIds.push(recipeIngredient.ingredientId);
        return;
      }

      const quantityInRecipeUnits = recipeIngredient.quantity * ratio * manufacturingLossMultiplier;
      const usageInStockUnits = toIngredientStockUnit(quantityInRecipeUnits, ingredient.unit);
      const previous = usageMap.get(ingredient.id) ?? 0;
      usageMap.set(ingredient.id, roundQuantity(previous + usageInStockUnits));
    });
  });

  return {
    usages: Array.from(usageMap.entries()).map(([ingredientId, quantity]) => ({ ingredientId, quantity })),
    missingProductIds: Array.from(new Set(missingProductIds)),
    missingRecipeProductIds: Array.from(new Set(missingRecipeProductIds)),
    missingIngredientIds: Array.from(new Set(missingIngredientIds))
  };
};

export const getStockShortages = (
  ingredients: Ingredient[],
  usages: IngredientUsage[]
): StockShortage[] => usages
  .map((usage) => {
    const ingredient = ingredients.find(entry => entry.id === usage.ingredientId);
    if (!ingredient) return undefined;

    const available = Number.isFinite(ingredient.quantity) ? ingredient.quantity : 0;
    if (available + 1e-9 >= usage.quantity) return undefined;

    return {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      unit: ingredient.unit,
      required: usage.quantity,
      available,
      missing: roundQuantity(usage.quantity - available)
    } satisfies StockShortage;
  })
  .filter((entry): entry is StockShortage => Boolean(entry));

export const applyIngredientUsage = (
  ingredients: Ingredient[],
  usages: IngredientUsage[],
  mode: 'consume' | 'restore'
): Ingredient[] => {
  const usageMap = new Map<string, number>();
  usages.forEach((usage) => {
    if (!Number.isFinite(usage.quantity) || usage.quantity <= 0) return;
    usageMap.set(usage.ingredientId, (usageMap.get(usage.ingredientId) ?? 0) + usage.quantity);
  });

  return ingredients.map((ingredient) => {
    const delta = usageMap.get(ingredient.id);
    if (!delta) return ingredient;

    const baseQuantity = Number.isFinite(ingredient.quantity) ? ingredient.quantity : 0;
    const nextQuantity = mode === 'consume'
      ? Math.max(0, baseQuantity - delta)
      : baseQuantity + delta;

    return {
      ...ingredient,
      quantity: roundQuantity(nextQuantity)
    };
  });
};
