import { describe, expect, it } from 'vitest';
import { computeMonthlyTotals, shouldIncludeOrder, MonthlyTotalsInput } from '../monthlyReportMath';
import { GlobalSettings, Ingredient, MonthlyEntry, Order, Product, Recipe, Unit } from '../types';
import { expectEqual } from './assertHelpers';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const baseSettings: GlobalSettings = {
  currency: 'EUR', hourlyRate: 15, includeLaborInCost: true, fixedCostItems: [], taxRate: 20,
  isTvaSubject: true, defaultTvaRate: 10, includePendingOrdersInMonthlyReport: false
};

const product: Product = {
  id: 'p1', name: 'P', recipeId: 'r1', laborTimeMinutes: 0, packagingCost: 1,
  lossRate: 10, unsoldEstimate: 0, packagingUsedOnUnsold: true, applyLossToPackaging: false,
  targetMargin: 0, estimatedMonthlySales: 10, category: 'c', tvaRate: 10
};
const recipe: Recipe = { id: 'r1', name: 'R', ingredients: [{ ingredientId: 'i1', quantity: 100 }], batchYield: 10, lossPercentage: 0 };
const ingredient: Ingredient = { id: 'i1', name: 'I', unit: Unit.G, price: 1, quantity: 1, costPerBaseUnit: 0.01 };

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
    expectEqual(totals.totalRevenueTTC, 10 * 11);
    // HT = 110 / (1 + 10/100) = 110 / 1.1
    expectEqual(totals.totalRevenueHT, 10 * 11 / (1 + 10 / 100));
    // TVA collected = TTC - HT
    expectEqual(totals.totalTvaCollected, 10 * 11 - 10 * 11 / (1 + 10 / 100));
    // Social charges = HT × 20%
    expectEqual(totals.totalSocialCharges, 10 * 11 / (1 + 10 / 100) * (20 / 100));
  });

  it('TVA OFF: HT = TTC = total revenue, no TVA collected', () => {
    const noTva = { ...baseSettings, isTvaSubject: false };
    const totals = computeMonthlyTotals(makeInput({ settings: noTva }));
    expectEqual(totals.totalRevenueTTC, 10 * 11);
    expectEqual(totals.totalRevenueHT, 10 * 11);
    expectEqual(totals.totalTvaCollected, 0);
    // Social charges on full revenue: 110 × 20%
    expectEqual(totals.totalSocialCharges, 10 * 11 * (20 / 100));
  });

  it('per-product tvaRate is used for HT conversion', () => {
    // product has tvaRate=10 but let's use 20
    const prod20 = { ...product, tvaRate: 20 };
    const totals = computeMonthlyTotals(makeInput({ products: [prod20] }));
    // 110 TTC / (1 + 20/100)
    expectEqual(totals.totalRevenueHT, 10 * 11 / (1 + 20 / 100));
  });
});

// ---------------------------------------------------------------------------
// Per-entry TVA snapshot
// ---------------------------------------------------------------------------
describe('computeMonthlyTotals – per-entry TVA snapshot', () => {
  it('entry saved with isTvaSubject=true is treated as TTC even when global setting is OFF', () => {
    const noTvaSettings = { ...baseSettings, isTvaSubject: false };
    const sales: MonthlyEntry[] = [{ productId: 'p1', quantitySold: 10, quantityUnsold: 0, actualPrice: 11, isTvaSubject: true }];
    const totals = computeMonthlyTotals(makeInput({ settings: noTvaSettings, sales }));
    // Entry was saved as TTC → should still extract TVA
    expectEqual(totals.totalRevenueHT, 10 * 11 / (1 + 10 / 100));
    expectEqual(totals.totalTvaCollected, 10 * 11 - 10 * 11 / (1 + 10 / 100));
  });

  it('entry saved with isTvaSubject=false is treated as net even when global setting is ON', () => {
    const tvaSettings = { ...baseSettings, isTvaSubject: true };
    const sales: MonthlyEntry[] = [{ productId: 'p1', quantitySold: 10, quantityUnsold: 0, actualPrice: 11, isTvaSubject: false }];
    const totals = computeMonthlyTotals(makeInput({ settings: tvaSettings, sales }));
    // Entry was saved as net → no TVA extraction
    expectEqual(totals.totalRevenueHT, 10 * 11);
    expectEqual(totals.totalTvaCollected, 0);
  });

  it('legacy entry without snapshot falls back to current global setting (TVA ON)', () => {
    const tvaSettings = { ...baseSettings, isTvaSubject: true };
    const sales: MonthlyEntry[] = [{ productId: 'p1', quantitySold: 10, quantityUnsold: 0, actualPrice: 11 }];
    const totals = computeMonthlyTotals(makeInput({ settings: tvaSettings, sales }));
    // No snapshot → uses current isTva=true → extracts TVA
    expectEqual(totals.totalRevenueHT, 10 * 11 / (1 + 10 / 100));
  });

  it('legacy entry without snapshot falls back to current global setting (TVA OFF)', () => {
    const noTvaSettings = { ...baseSettings, isTvaSubject: false };
    const sales: MonthlyEntry[] = [{ productId: 'p1', quantitySold: 10, quantityUnsold: 0, actualPrice: 11 }];
    const totals = computeMonthlyTotals(makeInput({ settings: noTvaSettings, sales }));
    // No snapshot → uses current isTva=false → no extraction
    expectEqual(totals.totalRevenueHT, 10 * 11);
    expectEqual(totals.totalTvaCollected, 0);
  });

  it('mixed entries: some TTC, some net in the same report', () => {
    const tvaSettings = { ...baseSettings, isTvaSubject: true };
    const sales: MonthlyEntry[] = [
      { productId: 'p1', quantitySold: 10, quantityUnsold: 0, actualPrice: 11, isTvaSubject: true },
      { productId: 'p1', quantitySold: 5, quantityUnsold: 0, actualPrice: 11, isTvaSubject: false }
    ];
    const totals = computeMonthlyTotals(makeInput({ settings: tvaSettings, sales }));
    // First entry: TTC → HT = 110/1.1 = 100
    // Second entry: net → HT = 55
    expectEqual(totals.totalRevenueHT, 10 * 11 / (1 + 10 / 100) + 5 * 11);
    // TVA only from first entry
    expectEqual(totals.totalTvaCollected, 10 * 11 - 10 * 11 / (1 + 10 / 100));
  });
});

// ---------------------------------------------------------------------------
// Social contributions base
// ---------------------------------------------------------------------------
describe('computeMonthlyTotals – social contributions base', () => {
  it('base is HT when TVA ON', () => {
    const totals = computeMonthlyTotals(makeInput());
    // HT = 110/1.1, taxRate=20%
    expectEqual(totals.totalSocialCharges, 10 * 11 / (1 + 10 / 100) * (20 / 100));
  });

  it('base is total revenue when TVA OFF', () => {
    const noTva = { ...baseSettings, isTvaSubject: false };
    const totals = computeMonthlyTotals(makeInput({ settings: noTva }));
    // Revenue = 110, taxRate=20%
    expectEqual(totals.totalSocialCharges, 10 * 11 * (20 / 100));
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
    // packagingCost=1, sold=10, unsold not counted → 1 * 10 * 1 = 10
    expectEqual(totals.totalPackagingCost, 1 * 10 * 1);
  });

  it('packagingUsedOnUnsold ON: packaging on sold + unsold', () => {
    const prod = { ...product, packagingUsedOnUnsold: true };
    const totals = computeMonthlyTotals(makeInput({ sales: salesWithUnsold, products: [prod] }));
    // packagingCost=1, sold=10+unsold=2 → 1 * 12 * 1 = 12
    expectEqual(totals.totalPackagingCost, 1 * (10 + 2) * 1);
  });

  it('ON → OFF reduces packaging cost', () => {
    const off = computeMonthlyTotals(makeInput({ sales: salesWithUnsold, products: [{ ...product, packagingUsedOnUnsold: false }] }));
    const on = computeMonthlyTotals(makeInput({ sales: salesWithUnsold, products: [{ ...product, packagingUsedOnUnsold: true }] }));
    expect(on.totalPackagingCost).toBeGreaterThan(off.totalPackagingCost);
    // Exact diff = unsold * packagingCost = 2 * 1 = 2
    expectEqual(on.totalPackagingCost - off.totalPackagingCost, 1 * (10 + 2) - 1 * 10);
  });

  it('applyLossToPackaging OFF: no loss multiplier on packaging', () => {
    const prod = { ...product, packagingUsedOnUnsold: false, applyLossToPackaging: false };
    const totals = computeMonthlyTotals(makeInput({ sales: salesWithUnsold, products: [prod] }));
    // 1 * 10 * 1 = 10
    expectEqual(totals.totalPackagingCost, 1 * 10 * 1);
  });

  it('applyLossToPackaging ON: packaging multiplied by mfg loss multiplier', () => {
    const prod = { ...product, packagingUsedOnUnsold: false, applyLossToPackaging: true, lossRate: 10 };
    const totals = computeMonthlyTotals(makeInput({ sales: salesWithUnsold, products: [prod] }));
    // mfgLossMultiplier = 1/(1 - 10/100)
    // 1 * 10 * mfgLossMultiplier
    expectEqual(totals.totalPackagingCost, 1 * 10 * (1 / (1 - 10 / 100)));
  });

  it('combined: packagingUsedOnUnsold ON + applyLossToPackaging ON', () => {
    const prod = { ...product, packagingUsedOnUnsold: true, applyLossToPackaging: true, lossRate: 10 };
    const totals = computeMonthlyTotals(makeInput({ sales: salesWithUnsold, products: [prod] }));
    // units = 10+2 = 12; multiplier = 1/(1 - 10/100)
    // 1 * 12 * multiplier
    expectEqual(totals.totalPackagingCost, 1 * (10 + 2) * (1 / (1 - 10 / 100)));
  });
});

// ---------------------------------------------------------------------------
// Cost modes (0=calculated, 1=actual spend, 2=inventory variation)
// ---------------------------------------------------------------------------
describe('computeMonthlyTotals – cost modes', () => {
  it('mode 0: uses calculated recipe-based food cost', () => {
    const totals = computeMonthlyTotals(makeInput({ costMode: 0, actualIngredientSpend: 999, inventoryVariationCost: 888 }));
    // batchCost = 100*0.01 = 1.0, unitCost = 0.1, sold=10, unsold=0
    // mfgLoss = 1/(1-0.1)
    // calculatedFoodCost = 0.1 * mfgLoss * 10
    expectEqual(totals.finalFoodCost, (100 * 0.01 / 10) * (1 / (1 - 10 / 100)) * 10);
  });

  it('mode 1: uses actualIngredientSpend', () => {
    const totals = computeMonthlyTotals(makeInput({ costMode: 1, actualIngredientSpend: 42 }));
    expectEqual(totals.finalFoodCost, 42);
  });

  it('mode 2: uses inventoryVariationCost', () => {
    const totals = computeMonthlyTotals(makeInput({ costMode: 2, inventoryVariationCost: 55 }));
    expectEqual(totals.finalFoodCost, 55);
  });
});

// ---------------------------------------------------------------------------
// Net result calculation
// ---------------------------------------------------------------------------
describe('computeMonthlyTotals – net result', () => {
  it('netResult = grossMargin - actualFixedCosts', () => {
    const totals = computeMonthlyTotals(makeInput({ actualFixedCosts: 30 }));
    const expectedGross = totals.totalRevenueHT - (totals.finalFoodCost + totals.totalPackagingCost + totals.totalSocialCharges);
    expectEqual(totals.netResult, expectedGross - 30);
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
    expectEqual(totals.totalRevenueTTC, 10 * 11 + 5 * 24);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe('computeMonthlyTotals – edge cases', () => {
  it('empty sales array returns all zeros', () => {
    const totals = computeMonthlyTotals(makeInput({ sales: [] }));
    expectEqual(totals.totalRevenueTTC, 0);
    expectEqual(totals.totalRevenueHT, 0);
    expectEqual(totals.totalTvaCollected, 0);
    expectEqual(totals.finalFoodCost, 0);
    expectEqual(totals.totalPackagingCost, 0);
    expectEqual(totals.totalSocialCharges, 0);
    expectEqual(totals.netResult, 0);
  });

  it('missing product in sales is skipped for packaging/food cost', () => {
    const sales: MonthlyEntry[] = [{ productId: 'nonexistent', quantitySold: 10, quantityUnsold: 0, actualPrice: 11 }];
    const totals = computeMonthlyTotals(makeInput({ sales, products: [] }));
    expectEqual(totals.totalRevenueTTC, 10 * 11);
    expectEqual(totals.finalFoodCost, 0);
    expectEqual(totals.totalPackagingCost, 0);
  });
});
