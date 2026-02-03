export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const isValidNonNegativeNumber = (value: number): boolean =>
  isFiniteNumber(value) && value >= 0;

export const isValidPositiveNumber = (value: number): boolean =>
  isFiniteNumber(value) && value > 0;

export const isValidPercentage = (value: number): boolean =>
  isFiniteNumber(value) && value >= 0 && value < 100;

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
