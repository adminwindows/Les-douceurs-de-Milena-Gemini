import { describe, expect, it } from 'vitest';
import { calculateProductMetrics, calculateRecipeMaterialCost, convertToCostPerBaseUnit, formatCurrency, getManufacturingLossMultiplier } from '../utils';
import { GlobalSettings, Ingredient, Product, Recipe, Unit } from '../types';

const baseIngredients: Ingredient[] = [
  {
    id: 'i1',
    name: 'Sucre',
    unit: Unit.KG,
    price: 1,
    quantity: 1,
    costPerBaseUnit: 0.001,
  },
];

const baseRecipe: Recipe = {
  id: 'r1',
  name: 'Test',
  ingredients: [{ ingredientId: 'i1', quantity: 100 }],
  batchYield: 10,
  lossPercentage: 0,
};

const baseProduct: Product = {
  id: 'p1',
  name: 'Produit',
  recipeId: 'r1',
  laborTimeMinutes: 60,
  packagingCost: 1,
  variableDeliveryCost: 0,
  lossRate: 10,
  unsoldEstimate: 0,
  packagingUsedOnUnsold: false,
  targetMargin: 0,
  estimatedMonthlySales: 10,
  category: 'Test',
};

const baseSettings: GlobalSettings = {
  currency: 'EUR',
  hourlyRate: 10,
  fixedCostItems: [],
  taxRate: 10,
  isTvaSubject: false,
  defaultTvaRate: 5.5,
};

describe('utils', () => {
  it('returns NaN when conversion inputs are invalid', () => {
    expect(Number.isNaN(convertToCostPerBaseUnit(0, 1, Unit.KG))).toBe(true);
    expect(Number.isNaN(convertToCostPerBaseUnit(1, 0, Unit.KG))).toBe(true);
  });

  it('returns a multiplier only for valid loss rates', () => {
    expect(getManufacturingLossMultiplier(10)).toBeCloseTo(1 / 0.9);
    expect(Number.isNaN(getManufacturingLossMultiplier(100))).toBe(true);
    expect(Number.isNaN(getManufacturingLossMultiplier(-1))).toBe(true);
  });

  it('calculates recipe material costs and rejects invalid loss percentages', () => {
    const validCost = calculateRecipeMaterialCost(baseRecipe, baseIngredients);
    expect(validCost).toBeCloseTo(0.1);

    const invalidCost = calculateRecipeMaterialCost(
      { ...baseRecipe, lossPercentage: 100 },
      baseIngredients
    );
    expect(Number.isNaN(invalidCost)).toBe(true);
  });

  it('returns NaN metrics for invalid loss rates', () => {
    const metrics = calculateProductMetrics(
      { ...baseProduct, lossRate: 120 },
      baseRecipe,
      baseIngredients,
      baseSettings,
      [baseProduct]
    );

    expect(Number.isNaN(metrics.fullCost)).toBe(true);
  });

  it('formats invalid currency values as placeholders', () => {
    expect(formatCurrency(NaN)).toBe('—');
  });
});
