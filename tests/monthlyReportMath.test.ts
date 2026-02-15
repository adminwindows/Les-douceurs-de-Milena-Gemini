import { describe, expect, it } from 'vitest';
import { computeMonthlyTotals, shouldIncludeOrder, MonthlyTotalsInput } from '../monthlyReportMath';
import { GlobalSettings, Ingredient, MonthlyEntry, Order, Product, Recipe, Unit } from '../types';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const baseSettings: GlobalSettings = {
  currency: 'EUR', hourlyRate: 15, includeLaborInCost: true, fixedCostItems: [], taxRate: 20,
  isTvaSubject: true, defaultTvaRate: 10, defaultIngredientVatRate: 5.5, includePendingOrdersInMonthlyReport: false
};

const product: Product = {
  id: 'p1', name: 'P', recipeId: 'r1', laborTimeMinutes: 0, packagingCost: 1,
  lossRate: 10, unsoldEstimate: 0, packagingUsedOnUnsold: true, applyLossToPackaging: false,
  targetMargin: 0, estimatedMonthlySales: 10, category: 'c', tvaRate: 10
};
const recipe: Recipe = { id: 'r1', name: 'R', ingredients: [{ ingredientId: 'i1', quantity: 100 }], batchYield: 10, lossPercentage: 0 };
const ingredient: Ingredient = { id: 'i1', name: 'I', unit: Unit.G, price: 1, priceAmount: 1, priceBasis: 'HT', vatRate: 0, quantity: 1, costPerBaseUnit: 0.01 };

const makeInput = (overrides: Partial<MonthlyTotalsInput> = {}): MonthlyTotalsInput => ({
  sales: [{ productId: 'p1', quantitySold: 10, quantityUnsold: 0, actualPrice: 11 }],
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

// ---------------------------------------------------------------------------
// Order status filtering
// ---------------------------------------------------------------------------
describe('shouldIncludeOrder', () => {
  const pending: Order = { id: '1', customerName: 'A', date: '2026-01-01', items: [], status: 'pending' };
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

  it('pending orders excluded by default (includePending=false)', () => {
    expect(shouldIncludeOrder(pending, false)).toBe(false);
  });

  it('pending orders included when toggle is ON', () => {
    expect(shouldIncludeOrder(pending, true)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// VAT ON/OFF for revenue split
// ---------------------------------------------------------------------------
describe('computeMonthlyTotals – VAT handling', () => {
  it('TVA ON: splits revenue into HT and TTC, social charges on HT', () => {
    const totals = computeMonthlyTotals(makeInput());
    // 10 units × 11€ TTC = 110 TTC
    expect(totals.totalRevenueTTC).toBeCloseTo(110, 6);
    // HT = 110 / 1.10 = 100
    expect(totals.totalRevenueHT).toBeCloseTo(100, 6);
    // TVA collected = 110 - 100 = 10
    expect(totals.totalTvaCollected).toBeCloseTo(10, 6);
    // Social charges = 100 × 20% = 20
    expect(totals.totalSocialCharges).toBeCloseTo(20, 6);
  });

  it('TVA OFF: HT = TTC = total revenue, no TVA collected', () => {
    const noTva = { ...baseSettings, isTvaSubject: false };
    const totals = computeMonthlyTotals(makeInput({ settings: noTva }));
    expect(totals.totalRevenueTTC).toBeCloseTo(110, 6);
    expect(totals.totalRevenueHT).toBeCloseTo(110, 6);
    expect(totals.totalTvaCollected).toBeCloseTo(0, 6);
    // Social charges on full revenue: 110 × 20% = 22
    expect(totals.totalSocialCharges).toBeCloseTo(22, 6);
  });

  it('per-product tvaRate is used for HT conversion', () => {
    // product has tvaRate=10 but default is also 10, let's use 20
    const prod20 = { ...product, tvaRate: 20 };
    const totals = computeMonthlyTotals(makeInput({ products: [prod20] }));
    // 110 TTC / 1.20 = 91.6667 HT
    expect(totals.totalRevenueHT).toBeCloseTo(110 / 1.2, 4);
  });
});

// ---------------------------------------------------------------------------
// Social contributions base
// ---------------------------------------------------------------------------
describe('computeMonthlyTotals – social contributions base', () => {
  it('base is HT when TVA ON', () => {
    const totals = computeMonthlyTotals(makeInput());
    // HT=100, taxRate=20% → 20
    expect(totals.totalSocialCharges).toBeCloseTo(100 * 0.2, 6);
  });

  it('base is total revenue when TVA OFF', () => {
    const noTva = { ...baseSettings, isTvaSubject: false };
    const totals = computeMonthlyTotals(makeInput({ settings: noTva }));
    // Revenue = 110, taxRate=20% → 22
    expect(totals.totalSocialCharges).toBeCloseTo(110 * 0.2, 6);
  });
});

// ---------------------------------------------------------------------------
// Packaging logic (unsold + loss rule) in monthly report
// ---------------------------------------------------------------------------
describe('computeMonthlyTotals – packaging', () => {
  const salesWithUnsold: MonthlyEntry[] = [{ productId: 'p1', quantitySold: 10, quantityUnsold: 2, actualPrice: 11 }];

  it('packagingUsedOnUnsold OFF: packaging only on sold units', () => {
    const prod = { ...product, packagingUsedOnUnsold: false };
    const totals = computeMonthlyTotals(makeInput({ sales: salesWithUnsold, products: [prod] }));
    // packagingCost=1, sold=10, unsold not counted → 10
    expect(totals.totalPackagingCost).toBeCloseTo(10, 6);
  });

  it('packagingUsedOnUnsold ON: packaging on sold + unsold', () => {
    const prod = { ...product, packagingUsedOnUnsold: true };
    const totals = computeMonthlyTotals(makeInput({ sales: salesWithUnsold, products: [prod] }));
    // packagingCost=1, sold=10+unsold=2 → 12
    expect(totals.totalPackagingCost).toBeCloseTo(12, 6);
  });

  it('ON → OFF reduces packaging cost', () => {
    const off = computeMonthlyTotals(makeInput({ sales: salesWithUnsold, products: [{ ...product, packagingUsedOnUnsold: false }] }));
    const on = computeMonthlyTotals(makeInput({ sales: salesWithUnsold, products: [{ ...product, packagingUsedOnUnsold: true }] }));
    expect(on.totalPackagingCost).toBeGreaterThan(off.totalPackagingCost);
    // Exact diff = 2 (unsold * packagingCost)
    expect(on.totalPackagingCost - off.totalPackagingCost).toBeCloseTo(2, 6);
  });

  it('applyLossToPackaging OFF: no loss multiplier on packaging', () => {
    const prod = { ...product, packagingUsedOnUnsold: false, applyLossToPackaging: false };
    const totals = computeMonthlyTotals(makeInput({ sales: salesWithUnsold, products: [prod] }));
    // 1 * 10 * 1 = 10
    expect(totals.totalPackagingCost).toBeCloseTo(10, 6);
  });

  it('applyLossToPackaging ON: packaging multiplied by mfg loss multiplier', () => {
    const prod = { ...product, packagingUsedOnUnsold: false, applyLossToPackaging: true, lossRate: 10 };
    const totals = computeMonthlyTotals(makeInput({ sales: salesWithUnsold, products: [prod] }));
    // mfgLossMultiplier = 1/(1-0.1) ≈ 1.1111
    // 1 * 10 * 1.1111 ≈ 11.1111
    expect(totals.totalPackagingCost).toBeCloseTo(10 / 0.9, 3);
  });

  it('combined: packagingUsedOnUnsold ON + applyLossToPackaging ON', () => {
    const prod = { ...product, packagingUsedOnUnsold: true, applyLossToPackaging: true, lossRate: 10 };
    const totals = computeMonthlyTotals(makeInput({ sales: salesWithUnsold, products: [prod] }));
    // units = 10+2 = 12; multiplier = 1/0.9 ≈ 1.1111
    // 1 * 12 * 1.1111 ≈ 13.3333
    expect(totals.totalPackagingCost).toBeCloseTo(12 / 0.9, 3);
  });
});

// ---------------------------------------------------------------------------
// Cost modes (0=calculated, 1=actual spend, 2=inventory variation)
// ---------------------------------------------------------------------------
describe('computeMonthlyTotals – cost modes', () => {
  it('mode 0: uses calculated recipe-based food cost', () => {
    const totals = computeMonthlyTotals(makeInput({ costMode: 0, actualIngredientSpend: 999, inventoryVariationCost: 888 }));
    // batchCost = 100*0.01 = 1.0, unitCost = 0.1, sold=10, unsold=0
    // mfgLoss = 1/(1-0.1) ≈ 1.1111
    // calculatedFoodCost = 0.1 * 1.1111 * 10 ≈ 1.1111
    expect(totals.finalFoodCost).toBeCloseTo(10 * 0.1 / 0.9, 3);
  });

  it('mode 1: uses actualIngredientSpend', () => {
    const totals = computeMonthlyTotals(makeInput({ costMode: 1, actualIngredientSpend: 42 }));
    expect(totals.finalFoodCost).toBeCloseTo(42, 6);
  });

  it('mode 2: uses inventoryVariationCost', () => {
    const totals = computeMonthlyTotals(makeInput({ costMode: 2, inventoryVariationCost: 55 }));
    expect(totals.finalFoodCost).toBeCloseTo(55, 6);
  });
});

// ---------------------------------------------------------------------------
// Net result calculation
// ---------------------------------------------------------------------------
describe('computeMonthlyTotals – net result', () => {
  it('netResult = grossMargin - actualFixedCosts', () => {
    const totals = computeMonthlyTotals(makeInput({ actualFixedCosts: 30 }));
    const expectedGross = totals.totalRevenueHT - (totals.finalFoodCost + totals.totalPackagingCost + totals.totalSocialCharges);
    expect(totals.netResult).toBeCloseTo(expectedGross - 30, 4);
  });

  it('netResult can be negative when costs exceed revenue', () => {
    const totals = computeMonthlyTotals(makeInput({ actualFixedCosts: 9999 }));
    expect(totals.netResult).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// Food cost with unsold in mode 0
// ---------------------------------------------------------------------------
describe('computeMonthlyTotals – food cost includes unsold', () => {
  it('unsold units increase calculated food cost in mode 0', () => {
    const noUnsold = computeMonthlyTotals(makeInput({
      sales: [{ productId: 'p1', quantitySold: 10, quantityUnsold: 0, actualPrice: 11 }]
    }));
    const withUnsold = computeMonthlyTotals(makeInput({
      sales: [{ productId: 'p1', quantitySold: 10, quantityUnsold: 5, actualPrice: 11 }]
    }));
    expect(withUnsold.finalFoodCost).toBeGreaterThan(noUnsold.finalFoodCost);
  });
});

// ---------------------------------------------------------------------------
// Multi-product reports
// ---------------------------------------------------------------------------
describe('computeMonthlyTotals – multi-product', () => {
  it('aggregates revenue and costs across products', () => {
    const p2: Product = { ...product, id: 'p2', packagingCost: 2, lossRate: 0, tvaRate: 20 };
    const r2: Recipe = { id: 'r2', name: 'R2', ingredients: [{ ingredientId: 'i1', quantity: 200 }], batchYield: 5, lossPercentage: 0 };
    const sales: MonthlyEntry[] = [
      { productId: 'p1', quantitySold: 10, quantityUnsold: 0, actualPrice: 11 },
      { productId: 'p2', quantitySold: 5, quantityUnsold: 1, actualPrice: 24 }
    ];
    const totals = computeMonthlyTotals(makeInput({
      sales,
      products: [product, { ...p2, recipeId: 'r2' }],
      recipes: [recipe, r2]
    }));
    // Total TTC = 10*11 + 5*24 = 110 + 120 = 230
    expect(totals.totalRevenueTTC).toBeCloseTo(230, 6);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe('computeMonthlyTotals – edge cases', () => {
  it('empty sales array returns all zeros', () => {
    const totals = computeMonthlyTotals(makeInput({ sales: [] }));
    expect(totals.totalRevenueTTC).toBe(0);
    expect(totals.totalRevenueHT).toBe(0);
    expect(totals.totalTvaCollected).toBe(0);
    expect(totals.finalFoodCost).toBe(0);
    expect(totals.totalPackagingCost).toBe(0);
    expect(totals.totalSocialCharges).toBe(0);
    expect(totals.netResult).toBe(0);
  });

  it('missing product in sales is skipped for packaging/food cost', () => {
    const sales: MonthlyEntry[] = [{ productId: 'nonexistent', quantitySold: 10, quantityUnsold: 0, actualPrice: 11 }];
    const totals = computeMonthlyTotals(makeInput({ sales, products: [] }));
    expect(totals.totalRevenueTTC).toBeCloseTo(110, 6);
    expect(totals.finalFoodCost).toBe(0);
    expect(totals.totalPackagingCost).toBe(0);
  });
});
