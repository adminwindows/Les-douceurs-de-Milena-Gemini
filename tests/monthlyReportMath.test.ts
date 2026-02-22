import { describe, expect, it } from 'vitest';
import { computeMonthlyTotals, shouldIncludeOrder } from '../monthlyReportMath';
import { GlobalSettings, Ingredient, Order, Product, Recipe, Unit } from '../types';
import { expectEqual } from './assertHelpers';

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

const ingredient: Ingredient = {
  id: 'i1',
  name: 'I1',
  unit: Unit.G,
  price: 1,
  quantity: 1,
  costPerBaseUnit: 1
};

const recipe: Recipe = {
  id: 'r1',
  name: 'R1',
  ingredients: [{ ingredientId: 'i1', quantity: 10 }],
  batchYield: 10,
  lossPercentage: 0
};

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'P1',
  recipeId: 'r1',
  packagingCost: 2,
  lossRate: 0,
  unsoldEstimate: 0,
  packagingUsedOnUnsold: true,
  applyLossToPackaging: false,
  targetMargin: 0,
  standardPrice: 0,
  estimatedMonthlySales: 10,
  category: 'c',
  ...overrides
});

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
  it('returns zero totals with no sales and no production', () => {
    const totals = computeMonthlyTotals({
      sales: [],
      unsold: [],
      products: [makeProduct()],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 0,
      actualIngredientSpend: 0,
      inventoryVariationCost: 0,
      actualFixedCosts: 0
    });

    expectEqual(totals.totalRevenueTTC, 0);
    expectEqual(totals.totalRevenueHT, 0);
    expectEqual(totals.totalTvaCollected, 0);
    expectEqual(totals.finalFoodCost, 0);
    expectEqual(totals.totalPackagingCost, 0);
    expectEqual(totals.totalSocialCharges, 0);
    expectEqual(totals.netResult, 0);
  });

  it('uses per-line tvaRate for HT/TVA split', () => {
    const totals = computeMonthlyTotals({
      sales: [{ id: 's1', productId: 'p1', quantitySold: 10, actualPrice: 11, tvaRate: 10 }],
      unsold: [],
      products: [makeProduct()],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 0,
      actualIngredientSpend: 0,
      inventoryVariationCost: 0,
      actualFixedCosts: 0
    });

    const revenueHT = 110 / (1 + 10 / 100);
    expectEqual(totals.totalRevenueTTC, 110);
    expectEqual(totals.totalRevenueHT, revenueHT);
    expectEqual(totals.totalTvaCollected, 110 - revenueHT);
  });

  it('supports mixed TVA rates line-by-line', () => {
    const totals = computeMonthlyTotals({
      sales: [
        { id: 's1', productId: 'p1', quantitySold: 2, actualPrice: 12, tvaRate: 20 },
        { id: 's2', productId: 'p1', quantitySold: 1, actualPrice: 10, tvaRate: 0 },
        { id: 's3', productId: 'p1', quantitySold: 1, actualPrice: 8 }
      ],
      unsold: [],
      products: [makeProduct()],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 0,
      actualIngredientSpend: 0,
      inventoryVariationCost: 0,
      actualFixedCosts: 0
    });

    expectEqual(totals.totalRevenueTTC, 42);
    expectEqual(totals.totalRevenueHT, (24 / 1.2) + 10 + 8);
    expectEqual(totals.totalTvaCollected, 4);
  });

  it('aggregates duplicate sales lines for production costs', () => {
    const totals = computeMonthlyTotals({
      sales: [
        { id: 's1', productId: 'p1', quantitySold: 3, actualPrice: 10, tvaRate: 0 },
        { id: 's2', productId: 'p1', quantitySold: 2, actualPrice: 10, tvaRate: 0 }
      ],
      unsold: [],
      products: [makeProduct()],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 0,
      actualIngredientSpend: 0,
      inventoryVariationCost: 0,
      actualFixedCosts: 0
    });

    expectEqual(totals.finalFoodCost, 5);
    expectEqual(totals.totalPackagingCost, 10);
  });

  it('includes unsold quantities in food cost', () => {
    const totals = computeMonthlyTotals({
      sales: [{ id: 's1', productId: 'p1', quantitySold: 10, actualPrice: 11, tvaRate: 0 }],
      unsold: [{ productId: 'p1', quantityUnsold: 2 }],
      products: [makeProduct()],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 0,
      actualIngredientSpend: 0,
      inventoryVariationCost: 0,
      actualFixedCosts: 0
    });

    expectEqual(totals.finalFoodCost, 12);
  });

  it('excludes unsold from packaging when packagingUsedOnUnsold is false', () => {
    const totals = computeMonthlyTotals({
      sales: [{ id: 's1', productId: 'p1', quantitySold: 10, actualPrice: 11, tvaRate: 0 }],
      unsold: [{ productId: 'p1', quantityUnsold: 2 }],
      products: [makeProduct({ packagingUsedOnUnsold: false })],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 0,
      actualIngredientSpend: 0,
      inventoryVariationCost: 0,
      actualFixedCosts: 0
    });

    expectEqual(totals.totalPackagingCost, 20);
  });

  it('includes unsold in packaging when packagingUsedOnUnsold is true', () => {
    const totals = computeMonthlyTotals({
      sales: [{ id: 's1', productId: 'p1', quantitySold: 10, actualPrice: 11, tvaRate: 0 }],
      unsold: [{ productId: 'p1', quantityUnsold: 2 }],
      products: [makeProduct({ packagingUsedOnUnsold: true })],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 0,
      actualIngredientSpend: 0,
      inventoryVariationCost: 0,
      actualFixedCosts: 0
    });

    expectEqual(totals.totalPackagingCost, 24);
  });

  it('applies manufacturing loss to packaging when enabled', () => {
    const totals = computeMonthlyTotals({
      sales: [{ id: 's1', productId: 'p1', quantitySold: 1, actualPrice: 10, tvaRate: 0 }],
      unsold: [{ productId: 'p1', quantityUnsold: 1 }],
      products: [makeProduct({ lossRate: 50, applyLossToPackaging: true, packagingUsedOnUnsold: true })],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 0,
      actualIngredientSpend: 0,
      inventoryVariationCost: 0,
      actualFixedCosts: 0
    });

    expectEqual(totals.totalPackagingCost, 2 * 2 * 2);
  });

  it('applies manufacturing loss to food cost', () => {
    const totals = computeMonthlyTotals({
      sales: [{ id: 's1', productId: 'p1', quantitySold: 4, actualPrice: 10, tvaRate: 0 }],
      unsold: [],
      products: [makeProduct({ lossRate: 20 })],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 0,
      actualIngredientSpend: 0,
      inventoryVariationCost: 0,
      actualFixedCosts: 0
    });

    expectEqual(totals.finalFoodCost, 4 * (1 / 0.8));
  });

  it('switches food cost by mode', () => {
    const mode1 = computeMonthlyTotals({
      sales: [],
      unsold: [],
      products: [makeProduct()],
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
      products: [makeProduct()],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 2,
      actualIngredientSpend: 0,
      inventoryVariationCost: 55,
      actualFixedCosts: 0
    });

    expectEqual(mode1.finalFoodCost, 42);
    expectEqual(mode2.finalFoodCost, 55);
  });

  it('ignores actual spend and inventory variation in calculated mode', () => {
    const totals = computeMonthlyTotals({
      sales: [{ id: 's1', productId: 'p1', quantitySold: 3, actualPrice: 10, tvaRate: 0 }],
      unsold: [],
      products: [makeProduct()],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 0,
      actualIngredientSpend: 999,
      inventoryVariationCost: 888,
      actualFixedCosts: 0
    });

    expectEqual(totals.finalFoodCost, 3);
  });

  it('computes social charges from revenue HT', () => {
    const totals = computeMonthlyTotals({
      sales: [{ id: 's1', productId: 'p1', quantitySold: 10, actualPrice: 11, tvaRate: 10 }],
      unsold: [],
      products: [makeProduct()],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 0,
      actualIngredientSpend: 0,
      inventoryVariationCost: 0,
      actualFixedCosts: 0
    });

    expectEqual(totals.totalSocialCharges, 100 * 0.2);
  });

  it('subtracts fixed costs to compute net result', () => {
    const totals = computeMonthlyTotals({
      sales: [{ id: 's1', productId: 'p1', quantitySold: 10, actualPrice: 11, tvaRate: 10 }],
      unsold: [],
      products: [makeProduct()],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 0,
      actualIngredientSpend: 0,
      inventoryVariationCost: 0,
      actualFixedCosts: 15
    });

    const revenueHT = 110 / (1 + 10 / 100);
    const socialCharges = revenueHT * 0.2;
    const grossMargin = revenueHT - (10 + 20 + socialCharges);
    expectEqual(totals.netResult, grossMargin - 15);
  });

  it('skips food cost when recipe is missing but still counts packaging', () => {
    const productNoRecipe = makeProduct({ recipeId: 'missing' });
    const totals = computeMonthlyTotals({
      sales: [{ id: 's1', productId: 'p1', quantitySold: 4, actualPrice: 10, tvaRate: 0 }],
      unsold: [],
      products: [productNoRecipe],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 0,
      actualIngredientSpend: 0,
      inventoryVariationCost: 0,
      actualFixedCosts: 0
    });

    expectEqual(totals.finalFoodCost, 0);
    expectEqual(totals.totalPackagingCost, 8);
  });

  it('does not add costs for products with zero produced quantity', () => {
    const totals = computeMonthlyTotals({
      sales: [],
      unsold: [],
      products: [makeProduct()],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 0,
      actualIngredientSpend: 0,
      inventoryVariationCost: 0,
      actualFixedCosts: 0
    });

    expectEqual(totals.finalFoodCost, 0);
    expectEqual(totals.totalPackagingCost, 0);
  });

  it('aggregates duplicate unsold lines by product', () => {
    const totals = computeMonthlyTotals({
      sales: [{ id: 's1', productId: 'p1', quantitySold: 1, actualPrice: 10, tvaRate: 0 }],
      unsold: [
        { productId: 'p1', quantityUnsold: 2 },
        { productId: 'p1', quantityUnsold: 3 }
      ],
      products: [makeProduct()],
      recipes: [recipe],
      ingredients: [ingredient],
      settings,
      costMode: 0,
      actualIngredientSpend: 0,
      inventoryVariationCost: 0,
      actualFixedCosts: 0
    });

    expectEqual(totals.finalFoodCost, 6);
    expectEqual(totals.totalPackagingCost, 12);
  });
});
