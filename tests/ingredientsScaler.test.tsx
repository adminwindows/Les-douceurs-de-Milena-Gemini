import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IngredientsRecettes } from '../components/views/IngredientsRecettes';
import { Ingredient, Recipe, Unit } from '../types';

describe('IngredientsRecettes scaler', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('applies a zero scale ratio when target quantity is 0', () => {
    const ingredients: Ingredient[] = [
      {
        id: 'i1',
        name: 'Farine',
        unit: Unit.G,
        price: 1,
        quantity: 1,
        costPerBaseUnit: 1
      }
    ];

    const recipes: Recipe[] = [
      {
        id: 'r1',
        name: 'Base',
        ingredients: [{ ingredientId: 'i1', quantity: 10 }],
        batchYield: 10,
        lossPercentage: 0
      }
    ];

    const setRecipes = vi.fn() as unknown as React.Dispatch<React.SetStateAction<Recipe[]>>;

    render(
      <IngredientsRecettes
        ingredients={ingredients}
        recipes={recipes}
        setRecipes={setRecipes}
      />
    );

    fireEvent.click(screen.getByTitle('Ouvrir le calculateur'));
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '0' } });

    expect(screen.getByText('0.0 g')).toBeInTheDocument();
  });
});
