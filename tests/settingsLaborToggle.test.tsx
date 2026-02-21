import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from '../components/views/Settings';
import { GlobalSettings } from '../types';

describe('Settings salary field', () => {
  it('updates targetMonthlySalary from input', async () => {
    const user = userEvent.setup();
    let currentSettings: GlobalSettings = {
      currency: 'EUR',
      fixedCostItems: [],
      taxRate: 22,
      isTvaSubject: false,
      defaultTvaRate: 5.5,
      pricingStrategy: 'margin',
      targetMonthlySalary: 0,
      includePendingOrdersInMonthlyReport: false
    };

    const setSettings = (updater: any) => {
      currentSettings = typeof updater === 'function' ? updater(currentSettings) : updater;
    };

    const { rerender } = render(<Settings settings={currentSettings} setSettings={setSettings} />);
    const input = screen.getByLabelText(/salaire net mensuel cible/i);

    await user.clear(input);
    await user.type(input, '1500');
    rerender(<Settings settings={currentSettings} setSettings={setSettings} />);

    expect(currentSettings.targetMonthlySalary).toBe(1500);
  });
});
