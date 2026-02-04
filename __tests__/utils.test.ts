import { describe, expect, it } from 'vitest';
import { calculateProductMetrics, calculateRecipeMaterialCost, formatCurrency } from '../utils';
import { GlobalSettings, Ingredient, Product, Recipe, Unit } from '../types';

const ingredient: Ingredient = {
  id: 'ing-1',
  name: 'Test',
  unit: Unit.G,
  price: 1,
  quantity: 0,
  costPerBaseUnit: 1
};

const baseRecipe: Recipe = {
  id: 'r1',
  name: 'Test Recipe',
  ingredients: [{ ingredientId: 'ing-1', quantity: 2 }],
  batchYield: 1,
  lossPercentage: 0
};

const baseProduct: Product = {
  id: 'p1',
  name: 'Test Product',
  recipeId: 'r1',
  laborTimeMinutes: 0,
  packagingCost: 0,
  variableDeliveryCost: 0,
  lossRate: 0,
  unsoldEstimate: 0,
  packagingUsedOnUnsold: false,
  targetMargin: 0,
  estimatedMonthlySales: 10,
  category: 'test'
};

const baseSettings: GlobalSettings = {
  currency: 'EUR',
  hourlyRate: 0,
  fixedCostItems: [],
  taxRate: 0,
  isTvaSubject: false,
  defaultTvaRate: 5.5
};

describe('utils', () => {
  it('formats currency safely', () => {
    expect(formatCurrency(10)).toContain('€');
    expect(formatCurrency(Number.NaN)).toBe('-');
  });

  it('calculates recipe material cost', () => {
    const cost = calculateRecipeMaterialCost(baseRecipe, [ingredient]);
    expect(cost).toBe(2);
  });

  it('returns NaN for invalid recipe loss percentage', () => {
    const badRecipe = { ...baseRecipe, lossPercentage: 100 };
    const cost = calculateRecipeMaterialCost(badRecipe, [ingredient]);
    expect(cost).toBeNaN();
  });

  it('calculates product metrics for valid input', () => {
    const metrics = calculateProductMetrics(baseProduct, baseRecipe, [ingredient], baseSettings, [baseProduct]);
    expect(metrics.fullCost).toBe(2);
    expect(metrics.minPriceBreakeven).toBe(2);
    expect(metrics.priceWithMargin).toBe(2);
  });

  it('returns NaN metrics when loss rate is invalid', () => {
    const badProduct = { ...baseProduct, lossRate: 100 };
    const metrics = calculateProductMetrics(badProduct, baseRecipe, [ingredient], baseSettings, [badProduct]);
    expect(metrics.fullCost).toBeNaN();
  });

  it('returns NaN metrics when tax rate is invalid', () => {
    const badSettings = { ...baseSettings, taxRate: 100 };
    const metrics = calculateProductMetrics(baseProduct, baseRecipe, [ingredient], badSettings, [baseProduct]);
    expect(metrics.fullCost).toBeNaN();
  });

  it('returns NaN metrics when estimated sales are invalid', () => {
    const badProduct = { ...baseProduct, estimatedMonthlySales: 0 };
    const metrics = calculateProductMetrics(badProduct, baseRecipe, [ingredient], baseSettings, [badProduct]);
    expect(metrics.fullCost).toBeNaN();
  });
});
