export const parseOptionalNumber = (value: string): number | undefined => {
  if (value.trim() === '') {
    return undefined;
  }

  const normalized = value.replace(/,/g, ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export const isPercentage = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 100;

export const sanitizeTvaRate = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (isPercentage(parsed)) return parsed;
  return isPercentage(fallback) ? fallback : 0;
};

/**
 * Tolerance for price-drift detection (standard vs purchase price).
 * 0 = strict equality (any difference triggers the update suggestion).
 * Set to a positive value (e.g. 0.01) to ignore sub-centime differences.
 */
export const PRICE_DRIFT_TOLERANCE = 0;

/**
 * Returns true when `newPrice` differs from `currentPrice` beyond PRICE_DRIFT_TOLERANCE.
 */
export const hasPriceDrift = (currentPrice: number, newPrice: number): boolean =>
  Math.abs(newPrice - currentPrice) > PRICE_DRIFT_TOLERANCE;
