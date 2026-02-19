import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductsContent } from '../components/views/Products';
import { GlobalSettings, Product, Recipe } from '../types';

describe('ProductsContent (new simplified UI)', () => {
  const recipes: Recipe[] = [
    { id: 'r1', name: 'Test', ingredients: [], batchYield: 1, lossPercentage: 0 }
  ];
  const settings: GlobalSettings = {
    currency: 'EUR',
    hourlyRate: 10,
    includeLaborInCost: true,
    fixedCostItems: [],
    taxRate: 0,
    isTvaSubject: false,
    defaultTvaRate: 5.5,
    includePendingOrdersInMonthlyReport: false,
    pricingMode: 'margin',
    targetMonthlySalary: 0
  };

  it('adds a product when required fields are filled', async () => {
    const user = userEvent.setup();
    const setProducts = vi.fn();

    render(
      <ProductsContent
        products={[]}
        setProducts={setProducts}
        recipes={recipes}
        settings={settings}
      />
    );

    const textboxes = screen.getAllByRole('textbox');
    await user.type(textboxes[0], 'Cookie test');
    await user.clear(textboxes[1]);
    await user.type(textboxes[1], '1.2');
    await user.click(screen.getByRole('button', { name: 'Ajouter produit' }));

    expect(setProducts).toHaveBeenCalledOnce();
  });

  it('renders existing products with standard price input', () => {
    const products: Product[] = [{
      id: 'p1',
      name: 'Cookie existant',
      recipeId: 'r1',
      laborTimeMinutes: 10,
      packagingCost: 0.2,
      lossRate: 2,
      unsoldEstimate: 0,
      packagingUsedOnUnsold: true,
      applyLossToPackaging: false,
      targetMargin: 1,
      estimatedMonthlySales: 20,
      category: 'Biscuit',
      standardPrice: 3
    }];

    render(
      <ProductsContent
        products={products}
        setProducts={() => {}}
        recipes={recipes}
        settings={settings}
      />
    );

    expect(screen.getByText('Cookie existant')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
  });
});
