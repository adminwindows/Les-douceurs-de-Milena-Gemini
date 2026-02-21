import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductsContent } from '../components/views/Products';
import { GlobalSettings, Ingredient, Product, Recipe, Unit } from '../types';

const settings: GlobalSettings = {
  currency: 'EUR',
  fixedCostItems: [],
  taxRate: 0,
  isTvaSubject: false,
  defaultTvaRate: 5.5,
  pricingStrategy: 'margin',
  targetMonthlySalary: 0,
  includePendingOrdersInMonthlyReport: false
};

const ingredients: Ingredient[] = [
  { id: 'i1', name: 'Farine', unit: Unit.G, price: 1, quantity: 1, costPerBaseUnit: 0.01 }
];

describe('Products form behavior', () => {
  it('enables submit when required fields are valid', async () => {
    const user = userEvent.setup();
    const recipes: Recipe[] = [{ id: 'r1', name: 'Test', ingredients: [{ ingredientId: 'i1', quantity: 100 }], batchYield: 1, lossPercentage: 0 }];
    const products: Product[] = [];

    render(
      <ProductsContent
        products={products}
        setProducts={() => {}}
        recipes={recipes}
        ingredients={ingredients}
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

  it('keeps submit disabled when estimated sales is zero', async () => {
    const user = userEvent.setup();
    const recipes: Recipe[] = [{ id: 'r1', name: 'Test', ingredients: [{ ingredientId: 'i1', quantity: 100 }], batchYield: 1, lossPercentage: 0 }];

    render(
      <ProductsContent
        products={[]}
        setProducts={() => {}}
        recipes={recipes}
        ingredients={ingredients}
        settings={settings}
      />
    );

    const submitButton = screen.getByRole('button', { name: /ajouter au catalogue/i });
    await user.type(screen.getByTestId('product-name-input'), 'Cookie test');
    await user.selectOptions(screen.getByTestId('product-recipe-select'), 'r1');
    await user.clear(screen.getByTestId('product-sales-input'));
    await user.type(screen.getByTestId('product-sales-input'), '0');

    expect(submitButton).toBeDisabled();
  });

  it('keeps submit disabled when loss rate is 100', async () => {
    const user = userEvent.setup();
    const recipes: Recipe[] = [{ id: 'r1', name: 'Test', ingredients: [{ ingredientId: 'i1', quantity: 100 }], batchYield: 1, lossPercentage: 0 }];

    render(
      <ProductsContent
        products={[]}
        setProducts={() => {}}
        recipes={recipes}
        ingredients={ingredients}
        settings={settings}
      />
    );

    const submitButton = screen.getByRole('button', { name: /ajouter au catalogue/i });
    await user.type(screen.getByTestId('product-name-input'), 'Cookie test');
    await user.selectOptions(screen.getByTestId('product-recipe-select'), 'r1');
    await user.clear(screen.getByTestId('product-sales-input'));
    await user.type(screen.getByTestId('product-sales-input'), '10');
    await user.clear(screen.getByTestId('product-loss-input'));
    await user.type(screen.getByTestId('product-loss-input'), '100');

    expect(submitButton).toBeDisabled();
  });
});
