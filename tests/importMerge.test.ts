import { describe, expect, it } from 'vitest';
import { mergeImportedAppData } from '../importMerge';
import { AppData } from '../dataSchema';
import { GlobalSettings, Product } from '../types';

const makeSettings = (overrides: Partial<GlobalSettings> = {}): GlobalSettings => ({
  currency: 'EUR',
  fixedCostItems: [],
  taxRate: 22,
  isTvaSubject: true,
  defaultTvaRate: 20,
  pricingStrategy: 'margin',
  targetMonthlySalary: 0,
  includePendingOrdersInMonthlyReport: false,
  ...overrides
});

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'P1',
  recipeId: 'r1',
  packagingCost: 0,
  lossRate: 0,
  unsoldEstimate: 0,
  packagingUsedOnUnsold: true,
  applyLossToPackaging: false,
  targetMargin: 0,
  standardPrice: 5,
  estimatedMonthlySales: 10,
  category: 'Cat',
  ...overrides
});

const makeBaseData = (): AppData => ({
  ingredients: [],
  recipes: [],
  products: [makeProduct()],
  settings: makeSettings(),
  orders: [],
  savedReports: [],
  purchases: [],
  productionBatches: []
});

describe('mergeImportedAppData', () => {
  it('normalizes imported orders with imported settings context', () => {
    const currentData = makeBaseData();
    const importedSettings = makeSettings({ defaultTvaRate: 5.5 });

    const { mergedData, importedSections } = mergeImportedAppData(
      currentData,
      {
        settings: importedSettings,
        orders: [
          {
            id: 'o1',
            customerName: 'Client',
            date: '2026-02-01',
            items: [{ productId: 'p1', quantity: 2, price: 5 }],
            tvaRate: undefined,
            status: 'pending'
          }
        ]
      },
      {
        settings: true,
        catalog: false,
        operations: true,
        reports: false
      }
    );

    expect(mergedData.settings.defaultTvaRate).toBe(5.5);
    expect(mergedData.orders[0].tvaRate).toBe(5.5);
    expect(importedSections).toContain('Paramètres');
    expect(importedSections).toContain('Commandes');
  });

  it('normalizes imported reports with imported settings context', () => {
    const currentData = makeBaseData();
    const importedSettings = makeSettings({ defaultTvaRate: 10 });

    const { mergedData } = mergeImportedAppData(
      currentData,
      {
        settings: importedSettings,
        savedReports: [
          {
            id: 'm1',
            monthStr: '2026-02',
            sales: [{ id: 's1', productId: 'p1', quantitySold: 1, actualPrice: 11, tvaRate: 150 }],
            actualFixedCostItems: [],
            actualIngredientSpend: 0,
            inventory: [],
            netResult: 0,
            isLocked: false
          }
        ]
      },
      {
        settings: true,
        catalog: false,
        operations: false,
        reports: true
      }
    );

    expect(mergedData.savedReports[0].sales[0].tvaRate).toBe(10);
  });

  it('keeps unselected sections unchanged', () => {
    const currentData = makeBaseData();
    currentData.orders = [
      {
        id: 'o-current',
        customerName: 'Current',
        date: '2026-01-01',
        items: [{ productId: 'p1', quantity: 1, price: 5 }],
        tvaRate: 20,
        status: 'pending'
      }
    ];

    const { mergedData } = mergeImportedAppData(
      currentData,
      {
        orders: [
          {
            id: 'o-import',
            customerName: 'Imported',
            date: '2026-02-01',
            items: [{ productId: 'p1', quantity: 3, price: 5 }],
            tvaRate: 7,
            status: 'pending'
          }
        ]
      },
      {
        settings: false,
        catalog: false,
        operations: false,
        reports: false
      }
    );

    expect(mergedData.orders).toHaveLength(1);
    expect(mergedData.orders[0].id).toBe('o-current');
  });
});
