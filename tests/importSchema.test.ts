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
});
