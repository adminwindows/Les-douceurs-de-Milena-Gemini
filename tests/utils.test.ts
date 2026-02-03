import { describe, expect, it } from 'vitest';
import {
  calculateDefaultActualPrice,
  calculateFixedCostPerUnit,
  calculateProductMetrics,
  calculateUnitCostWithLoss,
  clampLossRate,
  getLossMultiplier,
  toNumber
} from '../utils';
import { GlobalSettings, Ingredient, Product, Recipe, Unit } from '../types';

const baseSettings: GlobalSettings = {
  currency: 'EUR',
  hourlyRate: 20,
  fixedCostItems: [
    { id: 'fc1', name: 'Rent', amount: 100 }
  ],
  taxRate: 20
};

const baseIngredients: Ingredient[] = [
  { id: 'ing1', name: 'Sugar', unit: Unit.KG, price: 1, quantity: 1, costPerBaseUnit: 0.001 }
];

const baseRecipe: Recipe = {
  id: 'r1',
  name: 'Recipe',
  ingredients: [{ ingredientId: 'ing1', quantity: 100 }],
  batchYield: 10,
  lossPercentage: 0
};

describe('loss helpers', () => {
  it('clamps loss rates into a safe range', () => {
    expect(clampLossRate(-10)).toBe(0);
    expect(clampLossRate(150)).toBe(99.9);
  });

  it('normalizes invalid loss rates to zero', () => {
    expect(clampLossRate(Number.NaN)).toBe(0);
    expect(clampLossRate(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('returns a finite multiplier for extreme loss rates', () => {
    const multiplier = getLossMultiplier(100);
    expect(Number.isFinite(multiplier)).toBe(true);
  });

  it('applies loss multiplier without producing infinity', () => {
    const cost = calculateUnitCostWithLoss(10, 100);
    expect(Number.isFinite(cost)).toBe(true);
    expect(cost).toBeGreaterThan(0);
  });
});

describe('product calculations', () => {
  it('avoids infinite totals when loss rate is 100%', () => {
    const product: Product = {
      id: 'p1',
      name: 'Test',
      recipeId: 'r1',
      laborTimeMinutes: 10,
      packagingCost: 1,
      variableDeliveryCost: 0.5,
      lossRate: 100,
      targetMargin: 2,
      estimatedMonthlySales: 10,
      category: 'biscuit'
    };

    const metrics = calculateProductMetrics(
      product,
      baseRecipe,
      baseIngredients,
      baseSettings,
      [product]
    );

    expect(Number.isFinite(metrics.fullCost)).toBe(true);
    expect(Number.isFinite(metrics.minPriceBreakeven)).toBe(true);
    expect(Number.isFinite(metrics.priceWithMargin)).toBe(true);
  });
});

describe('report defaults', () => {
  it('returns zero when the recipe is missing', () => {
    const product: Product = {
      id: 'p1',
      name: 'No Recipe',
      recipeId: 'missing',
      laborTimeMinutes: 0,
      packagingCost: 0,
      variableDeliveryCost: 0,
      lossRate: 0,
      targetMargin: 0,
      estimatedMonthlySales: 0,
      category: 'autre'
    };

    const price = calculateDefaultActualPrice(product, undefined, baseIngredients, baseSettings, [product]);
    expect(price).toBe(0);
  });

  it('handles zero estimated sales without dividing by one', () => {
    const product: Product = {
      id: 'p1',
      name: 'Zero Sales',
      recipeId: 'r1',
      laborTimeMinutes: 0,
      packagingCost: 0,
      variableDeliveryCost: 0,
      lossRate: 0,
      targetMargin: 0,
      estimatedMonthlySales: 0,
      category: 'gateau'
    };

    expect(calculateFixedCostPerUnit([product], baseSettings)).toBe(0);
  });

  it('calculates fixed-cost allocation across multiple products', () => {
    const products: Product[] = [
      { id: 'p1', name: 'A', recipeId: 'r1', laborTimeMinutes: 0, packagingCost: 0, variableDeliveryCost: 0, lossRate: 0, targetMargin: 0, estimatedMonthlySales: 10, category: 'gateau' },
      { id: 'p2', name: 'B', recipeId: 'r1', laborTimeMinutes: 0, packagingCost: 0, variableDeliveryCost: 0, lossRate: 0, targetMargin: 0, estimatedMonthlySales: 30, category: 'biscuit' }
    ];
    expect(calculateFixedCostPerUnit(products, baseSettings)).toBe(2.5);
  });

  it('handles excessive tax rates without returning infinity', () => {
    const product: Product = {
      id: 'p1',
      name: 'High Tax',
      recipeId: 'r1',
      laborTimeMinutes: 0,
      packagingCost: 0,
      variableDeliveryCost: 0,
      lossRate: 0,
      targetMargin: 0,
      estimatedMonthlySales: 10,
      category: 'biscuit'
    };
    const price = calculateDefaultActualPrice(
      product,
      baseRecipe,
      baseIngredients,
      { ...baseSettings, taxRate: 150 },
      [product]
    );
    expect(Number.isFinite(price)).toBe(true);
  });
});

describe('number parsing', () => {
  it('coerces finite values and falls back on invalid values', () => {
    expect(toNumber('12.5')).toBe(12.5);
    expect(toNumber('')).toBe(0);
    expect(toNumber('nope', 3)).toBe(3);
  });
});
