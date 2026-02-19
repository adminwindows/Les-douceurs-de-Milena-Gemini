import { describe, expect, it } from 'vitest';
import { computeMonthlyTotals, shouldIncludeOrder, MonthlyTotalsInput } from '../monthlyReportMath';
import { GlobalSettings, Ingredient, MonthlyEntry, Order, Product, Recipe, Unit, UnsoldEntry } from '../types';
import { expectEqual } from './assertHelpers';

const baseSettings: GlobalSettings = {
  currency: 'EUR',
  hourlyRate: 15,
  includeLaborInCost: true,
  fixedCostItems: [],
  taxRate: 20,
  isTvaSubject: true,
  defaultTvaRate: 10,
  includePendingOrdersInMonthlyReport: false
};

const product: Product = {
  id: 'p1',
  name: 'P',
  recipeId: 'r1',
  laborTimeMinutes: 0,
  packagingCost: 1,
  lossRate: 10,
  unsoldEstimate: 0,
  packagingUsedOnUnsold: true,
  applyLossToPackaging: false,
  targetMargin: 0,
  estimatedMonthlySales: 10,
  category: 'c'
};
const recipe: Recipe = { id: 'r1', name: 'R', ingredients: [{ ingredientId: 'i1', quantity: 100 }], batchYield: 10, lossPercentage: 0 };
const ingredient: Ingredient = { id: 'i1', name: 'I', unit: Unit.G, price: 1, quantity: 1, costPerBaseUnit: 0.01 };

const makeInput = (overrides: Partial<MonthlyTotalsInput> = {}): MonthlyTotalsInput => ({
  sales: [{ id: 's1', productId: 'p1', quantitySold: 10, actualPrice: 11, tvaRate: 10 }],
  unsold: [{ id: 'u1', productId: 'p1', quantityUnsold: 0 }],
  products: [product],
  recipes: [recipe],
  ingredients: [ingredient],
  settings: baseSettings,
  costMode: 0,
  actualIngredientSpend: 0,
  inventoryVariationCost: 0,
  actualFixedCosts: 0,
  selectedMonth: '2026-01',
  orders: [],
  ...overrides
});

describe('shouldIncludeOrder', () => {
  const pending: Order = { id: '1', customerName: 'A', date: '2026-01-01', items: [], status: 'pending', tvaRate: 0 };
  const completed: Order = { ...pending, id: '2', status: 'completed' };
  const cancelled: Order = { ...pending, id: '3', status: 'cancelled' };

  it('completed orders are always included', () => {
    expect(shouldIncludeOrder(completed, false)).toBe(true);
    expect(shouldIncludeOrder(completed, true)).toBe(true);
  });

  it('cancelled orders are always excluded', () => {
    expect(shouldIncludeOrder(cancelled, false)).toBe(false);
    expect(shouldIncludeOrder(cancelled, true)).toBe(false);
  });

  it('pending orders excluded by default and included when toggle on', () => {
    expect(shouldIncludeOrder(pending, false)).toBe(false);
    expect(shouldIncludeOrder(pending, true)).toBe(true);
  });
});

describe('computeMonthlyTotals', () => {
  it('uses line-level tvaRate for HT/TTC split', () => {
    const totals = computeMonthlyTotals(makeInput());
    expectEqual(totals.totalRevenueTTC, 110);
    expect(totals.totalRevenueHT).toBeCloseTo(100, 10);
    expect(totals.totalTvaCollected).toBeCloseTo(10, 10);
    expectEqual(totals.totalSocialCharges, 20);
  });

  it('handles mixed VAT rates across lines', () => {
    const sales: MonthlyEntry[] = [
      { id: 's1', productId: 'p1', quantitySold: 10, actualPrice: 11, tvaRate: 10 },
      { id: 's2', productId: 'p1', quantitySold: 5, actualPrice: 10, tvaRate: 0 }
    ];
    const totals = computeMonthlyTotals(makeInput({ sales }));
    expectEqual(totals.totalRevenueTTC, 160);
    expect(totals.totalRevenueHT).toBeCloseTo(150, 10);
    expect(totals.totalTvaCollected).toBeCloseTo(10, 10);
  });

  it('packaging includes unsold only when packagingUsedOnUnsold is true', () => {
    const unsold: UnsoldEntry[] = [{ id: 'u1', productId: 'p1', quantityUnsold: 2 }];
    const on = computeMonthlyTotals(makeInput({ unsold, products: [{ ...product, packagingUsedOnUnsold: true }] }));
    const off = computeMonthlyTotals(makeInput({ unsold, products: [{ ...product, packagingUsedOnUnsold: false }] }));
    expect(on.totalPackagingCost).toBeGreaterThan(off.totalPackagingCost);
  });

  it('applyLossToPackaging multiplies packaging by production loss factor', () => {
    const pLoss = { ...product, applyLossToPackaging: true, packagingUsedOnUnsold: true, lossRate: 20 };
    const pNoLoss = { ...product, applyLossToPackaging: false, packagingUsedOnUnsold: true, lossRate: 20 };
    const unsold: UnsoldEntry[] = [{ id: 'u1', productId: 'p1', quantityUnsold: 2 }];
    const a = computeMonthlyTotals(makeInput({ products: [pLoss], unsold }));
    const b = computeMonthlyTotals(makeInput({ products: [pNoLoss], unsold }));
    expect(a.totalPackagingCost).toBeGreaterThan(b.totalPackagingCost);
  });

  it('unsold units increase calculated food cost in mode 0', () => {
    const noUnsold = computeMonthlyTotals(makeInput({ unsold: [] }));
    const withUnsold = computeMonthlyTotals(makeInput({ unsold: [{ id: 'u1', productId: 'p1', quantityUnsold: 5 }] }));
    expect(withUnsold.finalFoodCost).toBeGreaterThan(noUnsold.finalFoodCost);
  });

  it('cost modes 1 and 2 bypass theoretical cost', () => {
    const mode1 = computeMonthlyTotals(makeInput({ costMode: 1, actualIngredientSpend: 123 }));
    const mode2 = computeMonthlyTotals(makeInput({ costMode: 2, inventoryVariationCost: 77 }));
    expectEqual(mode1.finalFoodCost, 123);
    expectEqual(mode2.finalFoodCost, 77);
  });
});
