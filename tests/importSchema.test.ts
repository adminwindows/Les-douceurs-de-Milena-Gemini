import { describe, expect, it } from 'vitest';
import { importDataSchema } from '../dataSchema';

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
          laborTimeMinutes: '12',
          packagingCost: '0.3',
          variableDeliveryCost: '0',
          lossRate: '3',
          unsoldEstimate: '0',
          packagingUsedOnUnsold: 'true',
          targetMargin: '1',
          estimatedMonthlySales: '100',
          category: 'Biscuit',
          tvaRate: '5.5'
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
});
