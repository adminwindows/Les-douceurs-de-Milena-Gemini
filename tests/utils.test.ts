import { describe, expect, it } from 'vitest';
import {
  applyIngredientPriceMode,
  calculateProductMetrics,
  calculateRecipeMaterialCost,
  convertToCostPerBaseUnit,
  estimateUnitsForTargetSalary,
  rebuildIngredientCost,
  ttcToHt
} from '../utils';
import { GlobalSettings, Ingredient, Product, Recipe, Unit } from '../types';

const settingsBase: GlobalSettings = {
  currency: 'EUR',
  fixedCostItems: [],
  taxRate: 20,
  isTvaSubject: true,
  defaultTvaRate: 10,
  pricingStrategy: 'margin',
  targetMonthlySalary: 1000,
  includePendingOrdersInMonthlyReport: false
};

describe('convertToCostPerBaseUnit', () => {
  it('converts kg to gram base cost', () => {
    expect(convertToCostPerBaseUnit(2, 1, Unit.KG)).toBe(0.002);
  });

  it('returns 0 for invalid quantity', () => {
    expect(convertToCostPerBaseUnit(2, 0, Unit.KG)).toBe(0);
  });
});

describe('ttcToHt', () => {
  it('converts with VAT rate', () => {
    expect(ttcToHt(12, 20)).toBe(10);
  });

  it('returns unchanged value when VAT <= 0', () => {
    expect(ttcToHt(12, 0)).toBe(12);
  });
});

describe('rebuildIngredientCost', () => {
  it('recomputes costPerBaseUnit from price', () => {
    const ingredient: Ingredient = { id: 'i1', name: 'Farine', unit: Unit.KG, price: 1.2, quantity: 1, costPerBaseUnit: 0 };
    expect(rebuildIngredientCost(ingredient).costPerBaseUnit).toBe(0.0012);
  });
});

describe('applyIngredientPriceMode', () => {
  const ingredients: Ingredient[] = [
    { id: 'i1', name: 'Farine', unit: Unit.KG, price: 2, quantity: 1, costPerBaseUnit: 0.002 }
  ];
  const purchases = [
    { id: 'p1', date: '2026-01-01', ingredientId: 'i1', quantity: 2, price: 8 }, // 4 / kg
    { id: 'p2', date: '2026-02-01', ingredientId: 'i1', quantity: 1, price: 3 } // 3 / kg
  ];

  it('uses average purchase price in average mode', () => {
    const result = applyIngredientPriceMode(ingredients, purchases, 'average');
    expect(result[0].price).toBeCloseTo((8 + 3) / (2 + 1));
  });

  it('uses latest purchase price in last mode', () => {
    const result = applyIngredientPriceMode(ingredients, purchases, 'last');
    expect(result[0].price).toBe(3);
  });
});

describe('calculateRecipeMaterialCost', () => {
  it('sums recipe ingredients and applies recipe loss', () => {
    const ingredients: Ingredient[] = [
      { id: 'i1', name: 'A', unit: Unit.G, price: 1, quantity: 1, costPerBaseUnit: 0.01 }
    ];
    const recipe: Recipe = {
      id: 'r1',
      name: 'R',
      ingredients: [{ ingredientId: 'i1', quantity: 100 }],
      batchYield: 1,
      lossPercentage: 10
    };
    expect(calculateRecipeMaterialCost(recipe, ingredients)).toBe(1.1);
  });
});

describe('calculateProductMetrics', () => {
  const ingredients: Ingredient[] = [
    { id: 'i1', name: 'A', unit: Unit.G, price: 1, quantity: 1, costPerBaseUnit: 0.01 }
  ];
  const recipe: Recipe = {
    id: 'r1',
    name: 'R',
    ingredients: [{ ingredientId: 'i1', quantity: 100 }],
    batchYield: 10,
    lossPercentage: 0
  };
  const product: Product = {
    id: 'p1',
    name: 'P',
    recipeId: 'r1',
    packagingCost: 1,
    lossRate: 10,
    unsoldEstimate: 2,
    packagingUsedOnUnsold: true,
    applyLossToPackaging: false,
    targetMargin: 2,
    standardPrice: 0,
    estimatedMonthlySales: 10,
    category: 'c'
  };

  it('computes minimum and margin recommendation', () => {
    const metrics = calculateProductMetrics(product, recipe, ingredients, settingsBase, [product]);
    expect(metrics.minPriceBreakevenTTC).toBeGreaterThan(0);
    expect(metrics.priceWithMarginTTC).toBeGreaterThan(metrics.minPriceBreakevenTTC);
  });

  it('computes salary recommendation when salary target exists', () => {
    const metrics = calculateProductMetrics(product, recipe, ingredients, settingsBase, [product]);
    expect(metrics.priceWithSalaryTTC).toBeGreaterThanOrEqual(metrics.minPriceBreakevenTTC);
  });
});

describe('estimateUnitsForTargetSalary', () => {
  it('returns feasible plan when net per unit is positive', () => {
    const ingredients: Ingredient[] = [
      { id: 'i1', name: 'A', unit: Unit.G, price: 1, quantity: 1, costPerBaseUnit: 0.001 }
    ];
    const recipes: Recipe[] = [
      { id: 'r1', name: 'R1', ingredients: [{ ingredientId: 'i1', quantity: 100 }], batchYield: 10, lossPercentage: 0 }
    ];
    const products: Product[] = [
      {
        id: 'p1',
        name: 'P1',
        recipeId: 'r1',
        packagingCost: 0.1,
        lossRate: 0,
        unsoldEstimate: 0,
        packagingUsedOnUnsold: false,
        applyLossToPackaging: false,
        targetMargin: 1,
        standardPrice: 3,
        estimatedMonthlySales: 100,
        category: 'c'
      }
    ];

    const plan = estimateUnitsForTargetSalary({
      targetSalary: 1000,
      products,
      recipes,
      ingredients,
      settings: settingsBase,
      useStandardPrice: true
    });

    expect(plan.feasible).toBe(true);
    expect(plan.totalUnitsNeeded).toBeGreaterThan(0);
  });
});
