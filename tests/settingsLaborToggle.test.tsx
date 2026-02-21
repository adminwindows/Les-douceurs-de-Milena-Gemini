import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Settings } from '../components/views/Settings';
import { GlobalSettings } from '../types';

describe('Settings salary field', () => {
  it('updates targetMonthlySalary from input', async () => {
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
    fireEvent.change(input, { target: { value: '1500' } });
    rerender(<Settings settings={currentSettings} setSettings={setSettings} />);

    expect(currentSettings.targetMonthlySalary).toBe(1500);
  });

  it('normalizes comma decimals in target salary input', () => {
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

    render(<Settings settings={currentSettings} setSettings={setSettings} />);
    const input = screen.getByLabelText(/salaire net mensuel cible/i);
    fireEvent.change(input, { target: { value: '1500,5' } });

    expect(currentSettings.targetMonthlySalary).toBe(1500.5);
  });

  it('toggles TVA subject switch', () => {
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

    render(<Settings settings={currentSettings} setSettings={setSettings} />);
    const toggle = screen.getByLabelText(/assujetti à la tva/i);
    fireEvent.click(toggle);

    expect(currentSettings.isTvaSubject).toBe(true);
  });
});
