import { describe, expect, it } from 'vitest';
import { getLossMultiplier, isFiniteNumber, isNonNegativeNumber, isPercentage, isPositiveNumber } from '../validation';

describe('validation helpers', () => {
  it('validates finite numbers', () => {
    expect(isFiniteNumber(10)).toBe(true);
    expect(isFiniteNumber(Number.NaN)).toBe(false);
    expect(isFiniteNumber(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('validates positive numbers', () => {
    expect(isPositiveNumber(1)).toBe(true);
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(-1)).toBe(false);
    expect(isPositiveNumber(Number.NaN)).toBe(false);
  });

  it('validates non-negative numbers', () => {
    expect(isNonNegativeNumber(0)).toBe(true);
    expect(isNonNegativeNumber(2.5)).toBe(true);
    expect(isNonNegativeNumber(-0.1)).toBe(false);
    expect(isNonNegativeNumber(Number.NaN)).toBe(false);
  });

  it('validates percentages', () => {
    expect(isPercentage(0)).toBe(true);
    expect(isPercentage(99.9)).toBe(true);
    expect(isPercentage(100)).toBe(false);
    expect(isPercentage(-1)).toBe(false);
    expect(isPercentage(Number.NaN)).toBe(false);
  });

  it('calculates loss multiplier without clamping', () => {
    expect(getLossMultiplier(0)).toBe(1);
    expect(getLossMultiplier(10)).toBeCloseTo(1 / 0.9, 6);
    expect(getLossMultiplier(100)).toBeNaN();
    expect(getLossMultiplier(-5)).toBeNaN();
  });
});
