import React, { useState } from 'react';
import { ttcToHt, formatCurrency } from '../../utils';
import { parseOptionalNumber } from '../../validation';

interface Props {
  /** Default VAT rate to prefill (from ingredient.helperVatRate or settings.defaultTvaRate) */
  defaultVatRate: number;
  /** Called when the user clicks "Appliquer" with the computed HT price */
  onApply: (priceHT: number, vatRateUsed: number) => void;
}

export const TtcToHtHelper: React.FC<Props> = ({ defaultVatRate, onApply }) => {
  const [open, setOpen] = useState(false);
  const [ttcPrice, setTtcPrice] = useState<number | undefined>();
  const [vatRate, setVatRate] = useState<number>(defaultVatRate);

  const computedHT = ttcPrice !== undefined && ttcPrice > 0
    ? ttcToHt(ttcPrice, vatRate)
    : undefined;

  const handleApply = () => {
    if (computedHT === undefined) return;
    onApply(computedHT, vatRate);
    setTtcPrice(undefined);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
      >
        Convertir un prix TTC &rarr; HT
      </button>
    );
  }

  return (
    <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Convertisseur TTC &rarr; HT</span>
        <button type="button" onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-600 text-xs">&times;</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400">Prix TTC</label>
          <input
            type="text"
            lang="en"
            inputMode="decimal"
            className="px-2 py-1.5 rounded border border-stone-300 dark:border-stone-600 text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            value={ttcPrice ?? ''}
            onChange={e => setTtcPrice(parseOptionalNumber(e.target.value))}
            placeholder="0.00"
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400">Taux TVA (%)</label>
          <input
            type="text"
            lang="en"
            inputMode="decimal"
            className="px-2 py-1.5 rounded border border-stone-300 dark:border-stone-600 text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            value={vatRate}
            onChange={e => setVatRate(parseOptionalNumber(e.target.value) ?? 0)}
          />
        </div>
      </div>
      {computedHT !== undefined && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-600 dark:text-stone-400">
            = <strong className="text-stone-900 dark:text-stone-100">{formatCurrency(computedHT)} HT</strong>
          </span>
          <button
            type="button"
            onClick={handleApply}
            className="text-xs font-bold bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition-colors"
          >
            Appliquer
          </button>
        </div>
      )}
    </div>
  );
};
