import { describe, expect, it } from 'vitest';
import { computeMonthlyTotals, shouldIncludeOrder } from '../monthlyReportMath';
import { GlobalSettings, Ingredient, MonthlyEntry, Order, Product, Recipe, Unit } from '../types';

const settings: GlobalSettings = {
  currency: 'EUR', hourlyRate: 15, includeLaborInCost: true, fixedCostItems: [], taxRate: 20,
  isTvaSubject: true, defaultTvaRate: 10, defaultIngredientVatRate: 5.5, includePendingOrdersInMonthlyReport: false
};

const product: Product = {
  id: 'p1', name: 'P', recipeId: 'r1', laborTimeMinutes: 0, packagingCost: 1, variableDeliveryCost: 9,
  lossRate: 10, unsoldEstimate: 0, packagingUsedOnUnsold: true, applyLossToPackaging: false,
  targetMargin: 0, estimatedMonthlySales: 10, category: 'c', tvaRate: 10
};
const recipe: Recipe = { id: 'r1', name: 'R', ingredients: [{ ingredientId: 'i1', quantity: 100 }], batchYield: 10, lossPercentage: 0 };
const ingredient: Ingredient = { id: 'i1', name: 'I', unit: Unit.G, price: 1, priceAmount: 1, priceBasis: 'HT', vatRate: 0, quantity: 1, costPerBaseUnit: 0.01 };

describe('monthly report math', () => {
  it('filters statuses (cancelled excluded, pending optional)', () => {
    const pending: Order = { id: '1', customerName: 'A', date: '2026-01-01', items: [], status: 'pending' };
    const completed: Order = { ...pending, id: '2', status: 'completed' };
    const cancelled: Order = { ...pending, id: '3', status: 'cancelled' };
    expect(shouldIncludeOrder(completed, false)).toBe(true);
    expect(shouldIncludeOrder(pending, false)).toBe(false);
    expect(shouldIncludeOrder(pending, true)).toBe(true);
    expect(shouldIncludeOrder(cancelled, true)).toBe(false);
  });

  it('computes HT/TTC split and social base on HT with TVA ON', () => {
    const sales: MonthlyEntry[] = [{ productId: 'p1', quantitySold: 10, quantityUnsold: 0, actualPrice: 11 }];
    const totals = computeMonthlyTotals({ sales, products: [product], recipes: [recipe], ingredients: [ingredient], settings, costMode: 0, actualIngredientSpend: 0, inventoryVariationCost: 0, actualFixedCosts: 0, selectedMonth: '2026-01', orders: [] });
    expect(totals.totalRevenueTTC).toBeCloseTo(110, 6);
    expect(totals.totalRevenueHT).toBeCloseTo(100, 6);
    expect(totals.totalSocialCharges).toBeCloseTo(20, 6);
  });

  it('respects packaging unsold and applyLossToPackaging', () => {
    const sales: MonthlyEntry[] = [{ productId: 'p1', quantitySold: 10, quantityUnsold: 2, actualPrice: 11 }];
    const off = computeMonthlyTotals({ sales, products: [{ ...product, packagingUsedOnUnsold: false }], recipes: [recipe], ingredients: [ingredient], settings, costMode: 0, actualIngredientSpend: 0, inventoryVariationCost: 0, actualFixedCosts: 0, selectedMonth: '2026-01', orders: [] });
    const on = computeMonthlyTotals({ sales, products: [{ ...product, packagingUsedOnUnsold: true }], recipes: [recipe], ingredients: [ingredient], settings, costMode: 0, actualIngredientSpend: 0, inventoryVariationCost: 0, actualFixedCosts: 0, selectedMonth: '2026-01', orders: [] });
    const onLoss = computeMonthlyTotals({ sales, products: [{ ...product, packagingUsedOnUnsold: true, applyLossToPackaging: true }], recipes: [recipe], ingredients: [ingredient], settings, costMode: 0, actualIngredientSpend: 0, inventoryVariationCost: 0, actualFixedCosts: 0, selectedMonth: '2026-01', orders: [] });
    expect(on.totalPackagingCost).toBeGreaterThan(off.totalPackagingCost);
    expect(onLoss.totalPackagingCost).toBeGreaterThan(on.totalPackagingCost);
  });

  it('delivery path 1: variable delivery is ignored in monthly totals', () => {
    const sales: MonthlyEntry[] = [{ productId: 'p1', quantitySold: 10, quantityUnsold: 0, actualPrice: 11 }];
    const withDelivery = computeMonthlyTotals({ sales, products: [{ ...product, variableDeliveryCost: 99 }], recipes: [recipe], ingredients: [ingredient], settings, costMode: 0, actualIngredientSpend: 0, inventoryVariationCost: 0, actualFixedCosts: 0, selectedMonth: '2026-01', orders: [] });
    const withoutDelivery = computeMonthlyTotals({ sales, products: [{ ...product, variableDeliveryCost: 0 }], recipes: [recipe], ingredients: [ingredient], settings, costMode: 0, actualIngredientSpend: 0, inventoryVariationCost: 0, actualFixedCosts: 0, selectedMonth: '2026-01', orders: [] });
    expect(withDelivery.netResult).toBeCloseTo(withoutDelivery.netResult, 6);
  });
});
