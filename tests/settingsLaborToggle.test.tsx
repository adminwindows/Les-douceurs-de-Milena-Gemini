import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from '../components/views/Settings';
import { GlobalSettings } from '../types';

describe('Settings labor toggle', () => {
  it('toggles includeLaborInCost and updates helper text', async () => {
    const user = userEvent.setup();
    let currentSettings: GlobalSettings = {
      currency: 'EUR',
      hourlyRate: 15,
      includeLaborInCost: true,
      fixedCostItems: [],
      taxRate: 22,
      isTvaSubject: false,
      defaultTvaRate: 5.5,
      defaultIngredientVatRate: 5.5,
      includePendingOrdersInMonthlyReport: false
    };

    const setSettings = (updater: any) => {
      currentSettings = typeof updater === 'function' ? updater(currentSettings) : updater;
    };

    const { rerender, container } = render(<Settings settings={currentSettings} setSettings={setSettings} />);

    expect(screen.getByText(/La MO est comptée comme un coût/i)).toBeInTheDocument();

    const laborToggle = container.querySelector('#toggle-labor') as HTMLInputElement;
    await user.click(laborToggle);
    rerender(<Settings settings={currentSettings} setSettings={setSettings} />);

    expect(currentSettings.includeLaborInCost).toBe(false);
    expect(screen.getByText(/La MO est ignorée dans le coût de revient/i)).toBeInTheDocument();
    expect(screen.getByText(/Utilisé uniquement à titre indicatif/i)).toBeInTheDocument();
  });
});
