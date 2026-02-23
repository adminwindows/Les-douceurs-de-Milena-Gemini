import { describe, expect, it } from 'vitest';
import {
  applyIngredientUsage,
  computeProductionIngredientUsage,
  getStockShortages
} from '../stockMovements';
import { Ingredient, Product, Recipe, Unit } from '../types';
import { expectEqual } from './assertHelpers';

const ingredients: Ingredient[] = [
  { id: 'i1', name: 'Farine', unit: Unit.KG, price: 2, quantity: 1, costPerBaseUnit: 0.002 },
  { id: 'i2', name: 'Sucre', unit: Unit.G, price: 0.01, quantity: 200, costPerBaseUnit: 0.01 }
];

const recipes: Recipe[] = [
  {
    id: 'r1',
    name: 'Base',
    batchYield: 10,
    lossPercentage: 0,
    ingredients: [
      { ingredientId: 'i1', quantity: 500 },
      { ingredientId: 'i2', quantity: 100 }
    ]
  },
  {
    id: 'r-missing-ingredient',
    name: 'Missing Ingredient',
    batchYield: 10,
    lossPercentage: 0,
    ingredients: [{ ingredientId: 'missing-ing', quantity: 1 }]
  }
];

const products: Product[] = [
  {
    id: 'p1',
    name: 'Produit',
    recipeId: 'r1',
    packagingCost: 0,
    lossRate: 20,
    unsoldEstimate: 0,
    packagingUsedOnUnsold: true,
    applyLossToPackaging: false,
    targetMargin: 0,
    standardPrice: 0,
    estimatedMonthlySales: 10,
    category: 'Cat'
  },
  {
    id: 'p-no-recipe',
    name: 'Sans recette',
    recipeId: 'missing-recipe',
    packagingCost: 0,
    lossRate: 0,
    unsoldEstimate: 0,
    packagingUsedOnUnsold: true,
    applyLossToPackaging: false,
    targetMargin: 0,
    standardPrice: 0,
    estimatedMonthlySales: 10,
    category: 'Cat'
  },
  {
    id: 'p-missing-ingredient',
    name: 'Recette incomplete',
    recipeId: 'r-missing-ingredient',
    packagingCost: 0,
    lossRate: 0,
    unsoldEstimate: 0,
    packagingUsedOnUnsold: true,
    applyLossToPackaging: false,
    targetMargin: 0,
    standardPrice: 0,
    estimatedMonthlySales: 10,
    category: 'Cat'
  }
];

describe('computeProductionIngredientUsage', () => {
  it('computes ingredient usage with batch ratio, loss and unit conversion', () => {
    const result = computeProductionIngredientUsage(
      [{ productId: 'p1', quantity: 20 }],
      products,
      recipes,
      ingredients
    );

    const flourUsage = result.usages.find(entry => entry.ingredientId === 'i1');
    const sugarUsage = result.usages.find(entry => entry.ingredientId === 'i2');

    expectEqual(flourUsage?.quantity ?? 0, 1.25);
    expectEqual(sugarUsage?.quantity ?? 0, 250);
    expect(result.missingProductIds).toEqual([]);
    expect(result.missingRecipeProductIds).toEqual([]);
    expect(result.missingIngredientIds).toEqual([]);
  });

  it('tracks missing products, recipes and ingredients once each', () => {
    const result = computeProductionIngredientUsage(
      [
        { productId: 'missing-product', quantity: 2 },
        { productId: 'missing-product', quantity: 1 },
        { productId: 'p-no-recipe', quantity: 2 },
        { productId: 'p-missing-ingredient', quantity: 2 }
      ],
      products,
      recipes,
      ingredients
    );

    expect(result.missingProductIds).toEqual(['missing-product']);
    expect(result.missingRecipeProductIds).toEqual(['p-no-recipe']);
    expect(result.missingIngredientIds).toEqual(['missing-ing']);
  });
});

describe('getStockShortages + applyIngredientUsage', () => {
  it('reports shortages and applies consume/restore updates', () => {
    const usages = [
      { ingredientId: 'i1', quantity: 1.25 },
      { ingredientId: 'i2', quantity: 250 }
    ];

    const shortages = getStockShortages(ingredients, usages);
    expect(shortages).toHaveLength(2);
    expectEqual(shortages[0].missing, 0.25);
    expectEqual(shortages[1].missing, 50);

    const consumed = applyIngredientUsage(ingredients, usages, 'consume');
    expectEqual(consumed.find(i => i.id === 'i1')?.quantity ?? 0, 0);
    expectEqual(consumed.find(i => i.id === 'i2')?.quantity ?? 0, 0);

    const restored = applyIngredientUsage(consumed, usages, 'restore');
    expectEqual(restored.find(i => i.id === 'i1')?.quantity ?? 0, 1.25);
    expectEqual(restored.find(i => i.id === 'i2')?.quantity ?? 0, 250);
  });
});

