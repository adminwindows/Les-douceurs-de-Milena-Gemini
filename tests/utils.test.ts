import { describe, expect, it } from 'vitest';
import { calculateProductMetrics, calculateRecipeMaterialCost } from '../utils';
import { GlobalSettings, Ingredient, Product, Recipe, Unit } from '../types';

describe('utils calculations', () => {
  it('applies recipe loss percentage to material cost', () => {
    const ingredients: Ingredient[] = [
      { id: 'i1', name: 'Farine', unit: Unit.G, price: 1, quantity: 1, costPerBaseUnit: 0.01 }
    ];
    const recipe: Recipe = {
      id: 'r1',
      name: 'Test',
      ingredients: [{ ingredientId: 'i1', quantity: 100 }],
      batchYield: 10,
      lossPercentage: 10
    };

    expect(calculateRecipeMaterialCost(recipe, ingredients)).toBeCloseTo(1.1, 6);
  });

  it('does not clamp invalid loss rates in product metrics', () => {
    const ingredients: Ingredient[] = [
      { id: 'i1', name: 'Farine', unit: Unit.G, price: 1, quantity: 1, costPerBaseUnit: 0.01 }
    ];
    const recipe: Recipe = {
      id: 'r1',
      name: 'Test',
      ingredients: [{ ingredientId: 'i1', quantity: 100 }],
      batchYield: 10,
      lossPercentage: 0
    };
    const product: Product = {
      id: 'p1',
      name: 'Produit',
      recipeId: 'r1',
      laborTimeMinutes: 0,
      packagingCost: 0,
      variableDeliveryCost: 0,
      lossRate: 100,
      unsoldEstimate: 0,
      packagingUsedOnUnsold: true,
      targetMargin: 0,
      estimatedMonthlySales: 10,
      category: 'test'
    };
    const settings: GlobalSettings = {
      currency: 'EUR',
      hourlyRate: 0,
      fixedCostItems: [],
      taxRate: 0,
      isTvaSubject: false,
      defaultTvaRate: 0
    };

    const metrics = calculateProductMetrics(product, recipe, ingredients, settings, [product]);
    expect(Number.isFinite(metrics.totalVariableCosts)).toBe(false);
  });
});
