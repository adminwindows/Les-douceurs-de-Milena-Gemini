import { describe, expect, it } from 'vitest';
import { importDataSchema } from '../dataSchema';
import fs from 'node:fs';
import path from 'node:path';

describe('import schema compatibility', () => {
  it('accepts legacy/coerced payload values', () => {
    const payload = {
      ingredients: [
        { id: 1, name: 'Farine', unit: 'KG', price: '2.4', quantity: '1', costPerBaseUnit: '0.0024', legacyField: true }
      ],
      products: [
        {
          id: 10,
          name: 'Cookie',
          recipeId: 20,
          packagingCost: '0.3',
          lossRate: '3',
          unsoldEstimate: '0',
          packagingUsedOnUnsold: 'true',
          targetMargin: '1',
          standardPrice: '3.5',
          estimatedMonthlySales: '100',
          category: 'Biscuit'
        }
      ]
    };

    const parsed = importDataSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.ingredients?.[0].id).toBe('1');
    expect(parsed.data.ingredients?.[0].unit).toBe('kg');
    expect(parsed.data.products?.[0].recipeId).toBe('20');
    expect(parsed.data.products?.[0].estimatedMonthlySales).toBe(100);
  });

  it('loads the provided bakery save payload', () => {
    const fixturePath = path.resolve('tests/fixtures/proof-save.json');
    const payload = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    const parsed = importDataSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.settings?.fixedCostItems).toHaveLength(7);
    expect(parsed.data.ingredients).toHaveLength(20);
    expect(parsed.data.recipes).toHaveLength(5);
    expect(parsed.data.products).toHaveLength(5);
    expect(parsed.data.settings?.fixedCostItems[0].name).toBe('Assurance Camion & RC Pro');
  });

  it('coerces legacy unit aliases and unknown units fallback', () => {
    const parsed = importDataSchema.safeParse({
      ingredients: [
        { id: 1, name: 'Oeufs', unit: 'pieces', price: 1, quantity: 1, costPerBaseUnit: 1 },
        { id: 2, name: 'X', unit: 'mystery', price: 1, quantity: 1, costPerBaseUnit: 1 }
      ]
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.ingredients?.[0].unit).toBe('pièce');
    expect(parsed.data.ingredients?.[1].unit).toBe('g');
  });

  it('normalizes unknown order status to pending', () => {
    const parsed = importDataSchema.safeParse({
      orders: [
        {
          id: 1,
          customerName: 'Client',
          date: '2026-01-01',
          items: [{ productId: 1, quantity: 1, price: 2 }],
          status: 'unknown'
        }
      ]
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.orders?.[0].status).toBe('pending');
  });

  it('applies boolean coercions on product flags', () => {
    const parsed = importDataSchema.safeParse({
      products: [
        {
          id: '1',
          name: 'P',
          recipeId: 'r1',
          packagingCost: '1',
          lossRate: '0',
          unsoldEstimate: '0',
          packagingUsedOnUnsold: 'false',
          applyLossToPackaging: 'true',
          targetMargin: '1',
          standardPrice: '2',
          estimatedMonthlySales: '1',
          category: 'C'
        }
      ]
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.products?.[0].packagingUsedOnUnsold).toBe(false);
    expect(parsed.data.products?.[0].applyLossToPackaging).toBe(true);
  });

  it('coerces report sales numeric fields', () => {
    const parsed = importDataSchema.safeParse({
      savedReports: [
        {
          id: 'm1',
          monthStr: '2026-01',
          sales: [{ productId: 'p1', quantitySold: '3', actualPrice: '4.5' }],
          actualFixedCostItems: [],
          actualIngredientSpend: '12',
          inventory: [],
          netResult: '-2',
          isLocked: 'true'
        }
      ]
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.savedReports?.[0].sales[0].quantitySold).toBe(3);
    expect(parsed.data.savedReports?.[0].sales[0].actualPrice).toBe(4.5);
    expect(parsed.data.savedReports?.[0].actualIngredientSpend).toBe(12);
    expect(parsed.data.savedReports?.[0].isLocked).toBe(true);
  });
});
