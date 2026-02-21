import { describe, expect, it } from 'vitest';
import { computeMonthlyTotals, shouldIncludeOrder } from '../monthlyReportMath';
import { GlobalSettings, Ingredient, Order, Product, Recipe, Unit } from '../types';

const settings: GlobalSettings = {
  currency: 'EUR',
  fixedCostItems: [],
  taxRate: 20,
  isTvaSubject: true,
  defaultTvaRate: 10,
  pricingStrategy: 'margin',
  targetMonthlySalary: 0,
  includePendingOrdersInMonthlyReport: false
};

const product: Product = {
  id: 'p1',
  name: 'P1',
  recipeId: 'r1',
  packagingCost: 1,
  lossRate: 10,
  unsoldEstimate: 0,
  packagingUsedOnUnsold: true,
  applyLossToPackaging: false,
  targetMargin: 0,
  standardPrice: 0,
  estimatedMonthlySales: 10,
  category: 'c'
};

const recipe: Recipe = {
  id: 'r1',
  name: 'R1',
  ingredients: [{ ingredientId: 'i1', quantity: 100 }],
  batchYield: 10,
  lossPercentage: 0
};

const ingredient: Ingredient = { id: 'i1', name: 'I1', unit: Unit.G, price: 1, quantity: 1, costPerBaseUnit: 0.01 };

describe('shouldIncludeOrder', () => {
  const baseOrder: Order = {
    id: '1',
    customerName: 'A',
    date: '2026-01-01',
    items: [],
    tvaRate: 0,
    status: 'pending'
  };

  it('includes completed orders', () => {
    expect(shouldIncludeOrder({ ...baseOrder, status: 'completed' }, false)).toBe(true);
  });

  it('excludes cancelled orders', () => {
    expect(shouldIncludeOrder({ ...baseOrder, status: 'cancelled' }, true)).toBe(false);
  });

  it('includes pending only when enabled', () => {
    expect(shouldIncludeOrder(baseOrder, false)).toBe(false);
    expect(shouldIncludeOrder(baseOrder, true)).toBe(true);
  });
});

describe('computeMonthlyTotals', () => {
  it('uses per-line tvaRate for HT/TVA split', () => {
    const totals = computeMonthlyTotals({
      sales: [{ id: 's1', productId: 'p1', quantitySold: 10, actualPrice: 11, tvaRate: 10 }],
      unsold: [],
      products: [product],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 0,
      actualIngredientSpend: 0,
      inventoryVariationCost: 0,
      actualFixedCosts: 0
    });

    expect(totals.totalRevenueTTC).toBe(110);
    expect(totals.totalRevenueHT).toBeCloseTo(100);
    expect(totals.totalTvaCollected).toBeCloseTo(10);
  });

  it('includes unsold in food cost and packaging (when enabled)', () => {
    const totals = computeMonthlyTotals({
      sales: [{ id: 's1', productId: 'p1', quantitySold: 10, actualPrice: 11, tvaRate: 0 }],
      unsold: [{ productId: 'p1', quantityUnsold: 2 }],
      products: [product],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 0,
      actualIngredientSpend: 0,
      inventoryVariationCost: 0,
      actualFixedCosts: 0
    });

    expect(totals.finalFoodCost).toBeGreaterThan(0);
    expect(totals.totalPackagingCost).toBeCloseTo(12);
  });

  it('switches food cost by mode', () => {
    const mode1 = computeMonthlyTotals({
      sales: [],
      unsold: [],
      products: [product],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 1,
      actualIngredientSpend: 42,
      inventoryVariationCost: 0,
      actualFixedCosts: 0
    });
    const mode2 = computeMonthlyTotals({
      sales: [],
      unsold: [],
      products: [product],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 2,
      actualIngredientSpend: 0,
      inventoryVariationCost: 55,
      actualFixedCosts: 0
    });

    expect(mode1.finalFoodCost).toBe(42);
    expect(mode2.finalFoodCost).toBe(55);
  });
});
