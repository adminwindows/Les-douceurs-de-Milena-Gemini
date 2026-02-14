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
      includeLaborInCost: true,
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

  it('switches form to edit mode from product card', async () => {
    const user = userEvent.setup();
    const recipes: Recipe[] = [
      { id: 'r1', name: 'Test', ingredients: [], batchYield: 1, lossPercentage: 0 }
    ];
    const products: Product[] = [{
      id: 'p1',
      name: 'Cookie existant',
      recipeId: 'r1',
      laborTimeMinutes: 10,
      packagingCost: 0.2,
      variableDeliveryCost: 0,
      lossRate: 2,
      unsoldEstimate: 0,
      packagingUsedOnUnsold: true,
      targetMargin: 1,
      estimatedMonthlySales: 20,
      category: 'Biscuit',
      tvaRate: 5.5
    }];
    const settings: GlobalSettings = {
      currency: 'EUR',
      hourlyRate: 10,
      includeLaborInCost: true,
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

    await user.click(screen.getByRole('button', { name: '✏️' }));
    expect(screen.getByText(/modifier le produit/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument();
  });
});
