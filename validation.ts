export const isFiniteNumber = (value: number): boolean => Number.isFinite(value);

export const isPositiveNumber = (value: number): boolean =>
  isFiniteNumber(value) && value > 0;

export const isNonNegativeNumber = (value: number): boolean =>
  isFiniteNumber(value) && value >= 0;

export const isPercentage = (value: number): boolean =>
  isFiniteNumber(value) && value >= 0 && value < 100;

export const getLossMultiplier = (lossRate: number): number => {
  if (!isPercentage(lossRate)) return Number.NaN;
  return 1 / (1 - lossRate / 100);
};
