import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductsContent } from '../components/views/Products';
import { GlobalSettings, Product, Recipe } from '../types';

describe('Products form behavior', () => {
  it('enables save only when required fields are valid', async () => {
    const user = userEvent.setup();
    const recipes: Recipe[] = [
      { id: 'r1', name: 'Test', ingredients: [], batchYield: 1, lossPercentage: 0 }
    ];
    const products: Product[] = [];
    const settings: GlobalSettings = {
      currency: 'EUR',
      hourlyRate: 10,
      fixedCostItems: [],
      taxRate: 0,
      isTvaSubject: false,
      defaultTvaRate: 5.5
    };

    render(
      <ProductsContent
        products={products}
        setProducts={() => {}}
        recipes={recipes}
        settings={settings}
      />
    );

    const submitButton = screen.getByRole('button', { name: /ajouter au catalogue/i });
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByTestId('product-name-input'), 'Cookie test');
    await user.selectOptions(screen.getByTestId('product-recipe-select'), 'r1');
    await user.clear(screen.getByTestId('product-sales-input'));
    await user.type(screen.getByTestId('product-sales-input'), '10');
    await user.clear(screen.getByTestId('product-loss-input'));
    await user.type(screen.getByTestId('product-loss-input'), '5');

    expect(submitButton).toBeEnabled();
  });
});
