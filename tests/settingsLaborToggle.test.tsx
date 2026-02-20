import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from '../components/views/Settings';
import { GlobalSettings } from '../types';

describe('Settings pricing mode', () => {
  it('switches between margin and salary mode and updates helper text', async () => {
    const user = userEvent.setup();
    let currentSettings: GlobalSettings = {
      currency: 'EUR',
      hourlyRate: 15,
      pricingMode: 'margin',
      salaryTarget: 0,
      fixedCostItems: [],
      taxRate: 22,
      isTvaSubject: false,
      defaultTvaRate: 5.5,
      includePendingOrdersInMonthlyReport: false
    };

    const setSettings = (updater: any) => {
      currentSettings = typeof updater === 'function' ? updater(currentSettings) : updater;
    };

    const { rerender } = render(<Settings settings={currentSettings} setSettings={setSettings} />);

    // Should start in margin mode
    expect(screen.getByText(/La MO est comptée comme un coût de production/i)).toBeInTheDocument();

    // Click on salary mode radio
    const salaryLabel = screen.getByText(/Objectif Salaire/i);
    await user.click(salaryLabel);
    rerender(<Settings settings={currentSettings} setSettings={setSettings} />);

    expect(currentSettings.pricingMode).toBe('salary');
    expect(screen.getByText(/La MO n'entre pas dans le coût de revient/i)).toBeInTheDocument();
  });

  it('updates hourly rate via input', () => {
    let currentSettings: GlobalSettings = {
      currency: 'EUR',
      hourlyRate: 15,
      pricingMode: 'margin',
      salaryTarget: 0,
      fixedCostItems: [],
      taxRate: 22,
      isTvaSubject: false,
      defaultTvaRate: 5.5,
      includePendingOrdersInMonthlyReport: false
    };

    const setSettings = (updater: any) => {
      currentSettings = typeof updater === 'function' ? updater(currentSettings) : updater;
    };

    render(<Settings settings={currentSettings} setSettings={setSettings} />);

    const hourlyInput = screen.getByTestId('settings-hourly-rate');
    fireEvent.change(hourlyInput, { target: { value: '25' } });

    expect(currentSettings.hourlyRate).toBe(25);
  });
});
