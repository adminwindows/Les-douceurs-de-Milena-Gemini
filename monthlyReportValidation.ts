import { MonthlyEntry, UnsoldEntry } from './types';
import { isNonNegativeNumber, isPercentage } from './validation';

export const isValidMonthlySaleEntry = (line: MonthlyEntry): boolean => (
  isNonNegativeNumber(line.quantitySold) &&
  isNonNegativeNumber(line.actualPrice) &&
  (line.tvaRate === undefined || isPercentage(line.tvaRate))
);

export const isValidMonthlyUnsoldEntry = (line: UnsoldEntry): boolean => (
  isNonNegativeNumber(line.quantityUnsold)
);

export const canSaveMonthlyReportDraft = (
  sales: MonthlyEntry[],
  unsold: UnsoldEntry[]
): boolean => sales.every(isValidMonthlySaleEntry) && unsold.every(isValidMonthlyUnsoldEntry);
