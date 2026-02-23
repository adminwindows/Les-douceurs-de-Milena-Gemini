import { describe, expect, it } from 'vitest';
import {
  normalizeAppData,
  normalizeIngredient,
  normalizeMonthlyReport,
  normalizeOrder,
  normalizeProduct,
  normalizePurchase,
  normalizeSettings
} from '../dataMigrations';
import { GlobalSettings, Ingredient, MonthlyReportData, Order, Product, Unit } from '../types';
import { expectEqual } from './assertHelpers';

const baseSettings: GlobalSettings = {
  currency: 'EUR',
  fixedCostItems: [],
  taxRate: 22,
  isTvaSubject: true,
  defaultTvaRate: 10,
  pricingStrategy: 'margin',
  targetMonthlySalary: 0,
  includePendingOrdersInMonthlyReport: false
};

describe('normalizeSettings', () => {
  it('sanitizes percentages and fallbacks', () => {
    const normalized = normalizeSettings({
      ...baseSettings,
      taxRate: 150,
      defaultTvaRate: -2,
      pricingStrategy: 'margin',
      targetMonthlySalary: -50,
      includePendingOrdersInMonthlyReport: undefined
    });

    expectEqual(normalized.taxRate, 0);
    expectEqual(normalized.defaultTvaRate, 5.5);
    expectEqual(normalized.targetMonthlySalary, 0);
    expect(normalized.includePendingOrdersInMonthlyReport).toBe(false);
  });

  it('keeps salary strategy when present', () => {
    const normalized = normalizeSettings({
      ...baseSettings,
      pricingStrategy: 'salary',
      targetMonthlySalary: 1200
    });

    expect(normalized.pricingStrategy).toBe('salary');
    expectEqual(normalized.targetMonthlySalary, 1200);
  });
});

describe('normalizeIngredient', () => {
  it('rebuilds base cost from normalized price', () => {
    const ingredient = normalizeIngredient({
      id: 'i1',
      name: 'Farine',
      unit: Unit.KG,
      price: 2,
      quantity: 1,
      costPerBaseUnit: 999
    });

    expectEqual(ingredient.costPerBaseUnit, 2 / 1000);
  });

  it('sanitizes negative values and removes invalid helperVatRate', () => {
    const ingredient = normalizeIngredient({
      id: 'i1',
      name: 'Farine',
      unit: Unit.G,
      price: -5,
      quantity: -1,
      costPerBaseUnit: -3,
      helperVatRate: Number.NaN
    } as unknown as Ingredient);

    expectEqual(ingredient.price, 0);
    expectEqual(ingredient.quantity, 0);
    expectEqual(ingredient.costPerBaseUnit, 0);
    expect(ingredient.helperVatRate).toBeUndefined();
  });
});

describe('normalizePurchase', () => {
  it('forces non-negative quantity and price', () => {
    const purchase = normalizePurchase({
      id: 'p1',
      date: '2026-01-01',
      ingredientId: 'i1',
      quantity: -3,
      price: -9
    });

    expectEqual(purchase.quantity, 0);
    expectEqual(purchase.price, 0);
  });
});

describe('normalizeProduct', () => {
  it('sanitizes numeric values and applies boolean/category defaults', () => {
    const product = normalizeProduct({
      id: 'p1',
      name: 'Cookie',
      recipeId: 'r1',
      packagingCost: -1,
      lossRate: 120,
      unsoldEstimate: -4,
      packagingUsedOnUnsold: undefined,
      applyLossToPackaging: undefined,
      targetMargin: -3,
      standardPrice: Number.NaN,
      estimatedMonthlySales: -20,
      category: ''
    } as unknown as Product);

    expectEqual(product.packagingCost, 0);
    expectEqual(product.lossRate, 0);
    expectEqual(product.unsoldEstimate, 0);
    expect(product.packagingUsedOnUnsold).toBe(true);
    expect(product.applyLossToPackaging).toBe(false);
    expectEqual(product.targetMargin, 0);
    expect(product.standardPrice).toBeUndefined();
    expectEqual(product.estimatedMonthlySales, 0);
    expect(product.category).toBe('Autre');
  });

  it('keeps finite standard price', () => {
    const product = normalizeProduct({
      id: 'p1',
      name: 'Cookie',
      recipeId: 'r1',
      packagingCost: 1,
      lossRate: 5,
      unsoldEstimate: 1,
      packagingUsedOnUnsold: false,
      applyLossToPackaging: true,
      targetMargin: 2,
      standardPrice: 7.5,
      estimatedMonthlySales: 10,
      category: 'Biscuit'
    });

    expectEqual(product.standardPrice ?? 0, 7.5);
  });
});

describe('normalizeOrder', () => {
  const productsById = new Map<string, Product>([
    ['p1', normalizeProduct({
      id: 'p1',
      name: 'Cookie',
      recipeId: 'r1',
      packagingCost: 0,
      lossRate: 0,
      unsoldEstimate: 0,
      packagingUsedOnUnsold: true,
      applyLossToPackaging: false,
      targetMargin: 0,
      standardPrice: 6,
      estimatedMonthlySales: 10,
      category: 'Biscuit'
    })]
  ]);

  it('fills missing customer and item price from product standard price', () => {
    const normalized = normalizeOrder(
      {
        id: 'o1',
        customerName: '',
        date: '2026-02-01',
        items: [{ productId: 'p1', quantity: 2, price: -1 }],
        tvaRate: undefined,
        status: 'pending'
      } as unknown as Order,
      { ...baseSettings, isTvaSubject: true, defaultTvaRate: 8 },
      productsById
    );

    expect(normalized.customerName).toBe('Client');
    expectEqual(normalized.items[0].price, 6);
    expectEqual(normalized.tvaRate, 8);
  });

  it('falls back TVA to zero when not assujetti', () => {
    const normalized = normalizeOrder(
      {
        id: 'o1',
        customerName: 'A',
        date: '2026-02-01',
        items: [{ productId: 'p1', quantity: 2, price: 3 }],
        tvaRate: undefined,
        status: 'pending'
      } as unknown as Order,
      { ...baseSettings, isTvaSubject: false },
      productsById
    );

    expectEqual(normalized.tvaRate, 0);
  });
});

describe('normalizeMonthlyReport', () => {
  it('migrates legacy sales ids, tva snapshots and unsold aggregation', () => {
    const report = normalizeMonthlyReport(
      {
        id: 'm1',
        monthStr: '2026-01',
        sales: [
          { productId: 'p1', quantitySold: 2, actualPrice: 10, isTvaSubject: true, quantityUnsold: 3 },
          { id: 'line-2', productId: 'p2', quantitySold: 1, actualPrice: 5, isTvaSubject: false, quantityUnsold: 2 },
          { productId: 'p1', quantitySold: 1, actualPrice: 8, quantityUnsold: 1 }
        ],
        actualFixedCostItems: [],
        actualIngredientSpend: 0,
        inventory: [],
        netResult: 0,
        isLocked: false
      } as unknown as MonthlyReportData,
      { ...baseSettings, defaultTvaRate: 5.5 }
    );

    expect(report.sales[0].id).toBe('legacy-sale-0');
    expect(report.sales[1].id).toBe('line-2');
    expectEqual(report.sales[0].tvaRate ?? 0, 5.5);
    expectEqual(report.sales[1].tvaRate ?? 0, 0);
    expect(report.sales[2].tvaRate).toBeUndefined();
    expect(report.unsold).toEqual([
      { productId: 'p1', quantityUnsold: 4 },
      { productId: 'p2', quantityUnsold: 2 }
    ]);
  });

  it('keeps explicit unsold array and sanitizes inventory values', () => {
    const report = normalizeMonthlyReport(
      {
        id: 'm1',
        monthStr: '2026-01',
        sales: [{ id: 's1', productId: 'p1', quantitySold: 1, actualPrice: 10 }],
        unsold: [{ productId: 'p1', quantityUnsold: -2 }],
        actualFixedCostItems: [],
        actualIngredientSpend: 0,
        inventory: [{ ingredientId: 'i1', startStock: -1, purchasedQuantity: 3, endStock: -2 }],
        netResult: 0,
        isLocked: false
      } as unknown as MonthlyReportData,
      baseSettings
    );

    expect(report.unsold).toEqual([{ productId: 'p1', quantityUnsold: 0 }]);
    expect(report.inventory).toEqual([{ ingredientId: 'i1', startStock: 0, purchasedQuantity: 3, endStock: 0 }]);
  });

  it('sanitizes report sales tvaRate above 100 using settings fallback', () => {
    const report = normalizeMonthlyReport(
      {
        id: 'm1',
        monthStr: '2026-01',
        sales: [{ id: 's1', productId: 'p1', quantitySold: 1, actualPrice: 10, tvaRate: 150 }],
        unsold: [],
        actualFixedCostItems: [],
        actualIngredientSpend: 0,
        inventory: [],
        netResult: 0,
        isLocked: false
      } as unknown as MonthlyReportData,
      { ...baseSettings, defaultTvaRate: 8 }
    );

    expectEqual(report.sales[0].tvaRate ?? 0, 8);
  });

  it('falls back totals from legacy fields and defaults report modes', () => {
    const report = normalizeMonthlyReport(
      {
        id: 'm1',
        monthStr: '2026-01',
        sales: [],
        actualFixedCostItems: [
          { id: 'f1', name: 'A', amount: 7 },
          { id: 'f2', name: 'B', amount: 8 }
        ],
        actualIngredientSpend: 0,
        inventory: [],
        costMode: 999,
        ingredientPriceMode: 'unknown',
        totalRevenue: 120,
        netResult: -3,
        isLocked: undefined
      } as unknown as MonthlyReportData,
      baseSettings
    );

    expectEqual(report.totalRevenueTTC, 120);
    expectEqual(report.totalRevenueHT, 120);
    expectEqual(report.actualFixedCosts, 15);
    expectEqual(report.costMode, 0);
    expect(report.ingredientPriceMode).toBe('average');
    expectEqual(report.netResult, -3);
    expect(report.isLocked).toBe(false);
  });
});

describe('normalizeAppData', () => {
  it('normalizes nested app data structures', () => {
    const normalized = normalizeAppData({
      settings: {
        ...baseSettings,
        taxRate: 150,
        defaultTvaRate: 8
      } as unknown as GlobalSettings,
      ingredients: [
        {
          id: 'i1',
          name: 'Farine',
          unit: Unit.KG,
          price: 4,
          quantity: 1,
          costPerBaseUnit: 0
        }
      ],
      recipes: [
        {
          id: 'r1',
          name: 'R1',
          ingredients: [{ ingredientId: 'i1', quantity: 10 }],
          batchYield: 10,
          lossPercentage: 0
        }
      ],
      products: [
        {
          id: 'p1',
          name: 'P1',
          recipeId: 'r1',
          packagingCost: 1,
          lossRate: 0,
          unsoldEstimate: 0,
          packagingUsedOnUnsold: true,
          applyLossToPackaging: false,
          targetMargin: 0,
          standardPrice: 7,
          estimatedMonthlySales: 10,
          category: 'Cat'
        }
      ],
      orders: [
        {
          id: 'o1',
          customerName: '',
          date: '2026-01-01',
          items: [{ productId: 'p1', quantity: -3, price: -2 }],
          tvaRate: undefined,
          status: 'pending'
        } as unknown as Order
      ],
      savedReports: [
        {
          id: 'm1',
          monthStr: '2026-01',
          sales: [{ productId: 'p1', quantitySold: 2, actualPrice: 10, quantityUnsold: 1 }],
          actualFixedCostItems: [],
          actualIngredientSpend: 0,
          inventory: [],
          netResult: 0,
          isLocked: false
        } as unknown as MonthlyReportData
      ],
      purchases: [{ id: 'pu1', date: '2026-01-01', ingredientId: 'i1', quantity: -2, price: -9 }],
      productionBatches: []
    });

    expectEqual(normalized.settings.taxRate, 0);
    expectEqual(normalized.ingredients[0].costPerBaseUnit, 4 / 1000);
    expectEqual(normalized.orders[0].items[0].quantity, 0);
    expectEqual(normalized.orders[0].items[0].price, 7);
    expectEqual(normalized.orders[0].tvaRate, 8);
    expectEqual(normalized.purchases[0].quantity, 0);
    expectEqual(normalized.savedReports[0].unsold[0].quantityUnsold, 1);
  });
});
