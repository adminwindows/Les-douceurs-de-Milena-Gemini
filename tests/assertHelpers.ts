import { expect } from 'vitest';

/**
 * Numeric tolerance for test assertions.
 * 0 = strict equality (===).
 * Any positive value = maximum allowed absolute difference.
 */
export const NUMERIC_TOLERANCE = 0;

/**
 * Assert that `actual` equals `expected` within the configured tolerance.
 * When NUMERIC_TOLERANCE is 0, enforces strict equality (===).
 * When > 0, asserts |actual - expected| <= tolerance.
 */
export function expectEqual(actual: number, expected: number, tolerance: number = NUMERIC_TOLERANCE): void {
  if (tolerance === 0) {
    expect(actual).toBe(expected);
  } else {
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
  }
}
