import { describe, expect, it } from 'vitest';
import {
  canSaveMonthlyReportDraft,
  isValidMonthlySaleEntry,
  isValidMonthlyUnsoldEntry
} from '../monthlyReportValidation';

describe('monthlyReportValidation', () => {
  it('accepts valid sale and unsold lines', () => {
    expect(isValidMonthlySaleEntry({
      id: 's1',
      productId: 'p1',
      quantitySold: 2,
      actualPrice: 3.5,
      tvaRate: 5.5
    })).toBe(true);

    expect(isValidMonthlyUnsoldEntry({
      productId: 'p1',
      quantityUnsold: 0
    })).toBe(true);
  });

  it('rejects invalid sale values (negative/NaN/TVA >= 100)', () => {
    expect(isValidMonthlySaleEntry({
      id: 's1',
      productId: 'p1',
      quantitySold: -1,
      actualPrice: 3,
      tvaRate: 5
    })).toBe(false);

    expect(isValidMonthlySaleEntry({
      id: 's1',
      productId: 'p1',
      quantitySold: Number.NaN,
      actualPrice: 3,
      tvaRate: 5
    })).toBe(false);

    expect(isValidMonthlySaleEntry({
      id: 's1',
      productId: 'p1',
      quantitySold: 1,
      actualPrice: 3,
      tvaRate: 100
    })).toBe(false);
  });

  it('rejects invalid unsold values and blocks save', () => {
    expect(isValidMonthlyUnsoldEntry({
      productId: 'p1',
      quantityUnsold: -1
    })).toBe(false);

    expect(canSaveMonthlyReportDraft(
      [{ id: 's1', productId: 'p1', quantitySold: 1, actualPrice: 3, tvaRate: 5 }],
      [{ productId: 'p1', quantityUnsold: Number.NaN }]
    )).toBe(false);
  });
});

