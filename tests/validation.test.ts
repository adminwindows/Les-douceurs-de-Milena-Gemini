import { describe, expect, it } from 'vitest';
import { isNonNegativeNumber, isPercentage, isPositiveNumber, parseOptionalNumber, hasPriceDrift } from '../validation';

describe('validation helpers', () => {
  it('parses optional numbers safely', () => {
    expect(parseOptionalNumber('')).toBeUndefined();
    expect(parseOptionalNumber('   ')).toBeUndefined();
    expect(parseOptionalNumber('12.5')).toBe(12.5);
    expect(parseOptionalNumber('12,5')).toBe(12.5);
    expect(parseOptionalNumber(' 42 ')).toBe(42);
    expect(parseOptionalNumber('0')).toBe(0);
    expect(parseOptionalNumber('1e2')).toBe(100);
    expect(parseOptionalNumber('1e309')).toBeUndefined();
    expect(parseOptionalNumber('nope')).toBeUndefined();
  });

  it('validates non-negative numbers', () => {
    expect(isNonNegativeNumber(0)).toBe(true);
    expect(isNonNegativeNumber(2.3)).toBe(true);
    expect(isNonNegativeNumber(-1)).toBe(false);
    expect(isNonNegativeNumber(Number.NaN)).toBe(false);
    expect(isNonNegativeNumber(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('validates positive numbers', () => {
    expect(isPositiveNumber(1)).toBe(true);
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(-5)).toBe(false);
  });

  it('validates percentage ranges', () => {
    expect(isPercentage(0)).toBe(true);
    expect(isPercentage(99.99)).toBe(true);
    expect(isPercentage(100)).toBe(false);
    expect(isPercentage(-1)).toBe(false);
  });

  it('detects price drift with strict tolerance (0)', () => {
    expect(hasPriceDrift(1.20, 1.20)).toBe(false);
    expect(hasPriceDrift(1.20, 1.21)).toBe(true);
    expect(hasPriceDrift(1.20, 1.19)).toBe(true);
    expect(hasPriceDrift(0, 0)).toBe(false);
    expect(hasPriceDrift(0, 0.001)).toBe(true);
  });

  it('treats NaN price drift comparisons as no drift', () => {
    expect(hasPriceDrift(Number.NaN, 1)).toBe(false);
    expect(hasPriceDrift(1, Number.NaN)).toBe(false);
  });
});
