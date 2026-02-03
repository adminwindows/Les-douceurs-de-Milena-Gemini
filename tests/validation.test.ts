import { describe, expect, it } from 'vitest';
import { isFiniteNumber, isNonEmptyString, isValidNonNegativeNumber, isValidPercentage, isValidPositiveNumber } from '../validation';

describe('validation helpers', () => {
  it('validates finite numbers', () => {
    expect(isFiniteNumber(0)).toBe(true);
    expect(isFiniteNumber(1.5)).toBe(true);
    expect(isFiniteNumber(NaN)).toBe(false);
    expect(isFiniteNumber(Infinity)).toBe(false);
  });

  it('validates positive and non-negative numbers', () => {
    expect(isValidPositiveNumber(1)).toBe(true);
    expect(isValidPositiveNumber(0)).toBe(false);
    expect(isValidNonNegativeNumber(0)).toBe(true);
    expect(isValidNonNegativeNumber(-1)).toBe(false);
  });

  it('validates percentages strictly below 100', () => {
    expect(isValidPercentage(0)).toBe(true);
    expect(isValidPercentage(99.9)).toBe(true);
    expect(isValidPercentage(100)).toBe(false);
    expect(isValidPercentage(-1)).toBe(false);
  });

  it('validates non-empty strings', () => {
    expect(isNonEmptyString('a')).toBe(true);
    expect(isNonEmptyString('   ')).toBe(false);
    expect(isNonEmptyString('')).toBe(false);
  });
});
