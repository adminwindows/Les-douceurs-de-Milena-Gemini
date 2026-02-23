import { describe, expect, it } from 'vitest';
import {
  applyIngredientPriceMode,
  calculateProductMetrics,
  calculateRecipeMaterialCost,
  convertToCostPerBaseUnit,
  estimateUnitsForTargetSalary,
  formatCurrency,
  rebuildIngredientCost,
  ttcToHt
} from '../utils';
import { GlobalSettings, Ingredient, Product, Purchase, Recipe, Unit } from '../types';
import { expectEqual } from './assertHelpers';

const baseSettings: GlobalSettings = {
  currency: 'EUR',
  fixedCostItems: [],
  taxRate: 20,
  isTvaSubject: true,
  defaultTvaRate: 10,
  pricingStrategy: 'margin',
  targetMonthlySalary: 300,
  includePendingOrdersInMonthlyReport: false
};

const makeIngredient = (overrides: Partial<Ingredient> = {}): Ingredient => ({
  id: 'i1',
  name: 'Ingredient',
  unit: Unit.G,
  price: 1,
  quantity: 1,
  costPerBaseUnit: 1,
  ...overrides
});

const makeRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: 'r1',
  name: 'Recipe',
  ingredients: [{ ingredientId: 'i1', quantity: 20 }],
  batchYield: 10,
  lossPercentage: 0,
  ...overrides
});

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Product',
  recipeId: 'r1',
  packagingCost: 0,
  lossRate: 0,
  unsoldEstimate: 0,
  packagingUsedOnUnsold: true,
  applyLossToPackaging: false,
  targetMargin: 1,
  standardPrice: 5,
  estimatedMonthlySales: 10,
  category: 'Cat',
  ...overrides
});

describe('convertToCostPerBaseUnit', () => {
  it('converts kg to gram base cost', () => {
    expectEqual(convertToCostPerBaseUnit(2, 1, Unit.KG), 2 / 1000);
  });

  it('converts liter to milliliter base cost', () => {
    expectEqual(convertToCostPerBaseUnit(4, 2, Unit.L), 4 / 2000);
  });

  it('keeps unit quantity for gram', () => {
    expectEqual(convertToCostPerBaseUnit(9, 3, Unit.G), 3);
  });

  it('keeps unit quantity for piece', () => {
    expectEqual(convertToCostPerBaseUnit(12, 6, Unit.PIECE), 2);
  });

  it('returns 0 when quantity is zero', () => {
    expectEqual(convertToCostPerBaseUnit(2, 0, Unit.KG), 0);
  });

  it('returns 0 when price is not finite', () => {
    expectEqual(convertToCostPerBaseUnit(Number.NaN, 1, Unit.KG), 0);
  });

  it('returns 0 when quantity is not finite', () => {
    expectEqual(convertToCostPerBaseUnit(2, Number.POSITIVE_INFINITY, Unit.KG), 0);
  });
});

describe('ttcToHt', () => {
  it('converts with VAT rate', () => {
    expectEqual(ttcToHt(12, 20), 10);
  });

  it('returns unchanged value when VAT is zero', () => {
    expectEqual(ttcToHt(12, 0), 12);
  });

  it('returns unchanged value when VAT is negative', () => {
    expectEqual(ttcToHt(12, -10), 12);
  });
});

describe('formatCurrency', () => {
  it('uses provided currency when valid', () => {
    const formatted = formatCurrency(12.5, 'usd');
    expect(formatted).toContain('$');
  });

  it('falls back to EUR when currency is invalid', () => {
    const formatted = formatCurrency(12.5, 'not-a-currency');
    expect(formatted).toContain('€');
  });
});

describe('rebuildIngredientCost', () => {
  it('recomputes costPerBaseUnit from price and unit', () => {
    const ingredient = makeIngredient({ unit: Unit.KG, price: 1.2, costPerBaseUnit: 99 });
    expectEqual(rebuildIngredientCost(ingredient).costPerBaseUnit, 1.2 / 1000);
  });

  it('does not depend on ingredient stock quantity field', () => {
    const ingredient = makeIngredient({ unit: Unit.G, price: 5, quantity: 999, costPerBaseUnit: 0 });
    expectEqual(rebuildIngredientCost(ingredient).costPerBaseUnit, 5);
  });
});

describe('applyIngredientPriceMode', () => {
  const ingredients: Ingredient[] = [
    makeIngredient({ id: 'i1', name: 'Farine', unit: Unit.KG, price: 2, costPerBaseUnit: 0 }),
    makeIngredient({ id: 'i2', name: 'Sucre', unit: Unit.KG, price: 4, costPerBaseUnit: 0 })
  ];

  const purchases: Purchase[] = [
    { id: 'p1', date: '2026-01-01', ingredientId: 'i1', quantity: 2, price: 8 }, // 4 / kg
    { id: 'p2', date: '2026-02-01', ingredientId: 'i1', quantity: 1, price: 3 }, // 3 / kg
    { id: 'p3', date: '2026-03-01', ingredientId: 'i1', quantity: 0, price: 100 }, // ignored
    { id: 'p4', date: '2026-01-15', ingredientId: 'i2', quantity: 2, price: 6 } // 3 / kg
  ];

  it('returns rebuilt standard prices in standard mode', () => {
    const result = applyIngredientPriceMode(ingredients, purchases, 'standard');
    expectEqual(result[0].price, 2);
    expectEqual(result[0].costPerBaseUnit, 2 / 1000);
    expectEqual(result[1].price, 4);
    expectEqual(result[1].costPerBaseUnit, 4 / 1000);
  });

  it('uses weighted average purchase price in average mode', () => {
    const result = applyIngredientPriceMode(ingredients, purchases, 'average');
    expectEqual(result[0].price, (8 + 3) / (2 + 1));
    expectEqual(result[0].costPerBaseUnit, ((8 + 3) / 3) / 1000);
  });

  it('ignores zero-quantity purchases in average mode', () => {
    const result = applyIngredientPriceMode(ingredients, purchases, 'average');
    expectEqual(result[0].price, 11 / 3);
  });

  it('falls back to standard price when no purchases exist', () => {
    const result = applyIngredientPriceMode([makeIngredient({ id: 'iX', unit: Unit.KG, price: 9, costPerBaseUnit: 0 })], purchases, 'average');
    expectEqual(result[0].price, 9);
    expectEqual(result[0].costPerBaseUnit, 9 / 1000);
  });

  it('uses most recent purchase in last mode', () => {
    const result = applyIngredientPriceMode(ingredients, purchases, 'last');
    expectEqual(result[0].price, 3 / 1);
  });

  it('applies mode independently per ingredient', () => {
    const result = applyIngredientPriceMode(ingredients, purchases, 'last');
    expectEqual(result[1].price, 6 / 2);
  });
});

describe('calculateRecipeMaterialCost', () => {
  it('sums known ingredient costs', () => {
    const ingredients = [
      makeIngredient({ id: 'i1', costPerBaseUnit: 2 }),
      makeIngredient({ id: 'i2', costPerBaseUnit: 3 })
    ];
    const recipe = makeRecipe({
      ingredients: [
        { ingredientId: 'i1', quantity: 2 },
        { ingredientId: 'i2', quantity: 3 }
      ]
    });

    expectEqual(calculateRecipeMaterialCost(recipe, ingredients), (2 * 2) + (3 * 3));
  });

  it('ignores missing ingredients', () => {
    const ingredients = [makeIngredient({ id: 'i1', costPerBaseUnit: 2 })];
    const recipe = makeRecipe({
      ingredients: [
        { ingredientId: 'i1', quantity: 2 },
        { ingredientId: 'missing', quantity: 999 }
      ]
    });

    expectEqual(calculateRecipeMaterialCost(recipe, ingredients), 4);
  });

  it('applies recipe loss percentage', () => {
    const ingredients = [makeIngredient({ id: 'i1', costPerBaseUnit: 2 })];
    const recipe = makeRecipe({
      ingredients: [{ ingredientId: 'i1', quantity: 5 }],
      lossPercentage: 10
    });

    expectEqual(calculateRecipeMaterialCost(recipe, ingredients), (2 * 5) * 1.1);
  });
});

describe('calculateProductMetrics', () => {
  const ingredients = [makeIngredient({ id: 'i1', costPerBaseUnit: 1 })];
  const recipe = makeRecipe({ ingredients: [{ ingredientId: 'i1', quantity: 20 }], batchYield: 10 });
  const product = makeProduct({ id: 'p1', estimatedMonthlySales: 10 });
  const sibling = makeProduct({ id: 'p2', estimatedMonthlySales: 30, targetMargin: 0, standardPrice: 0 });

  it('keeps TTC equal to HT when TVA is disabled', () => {
    const settings: GlobalSettings = { ...baseSettings, isTvaSubject: false };
    const metrics = calculateProductMetrics(product, recipe, ingredients, settings, [product, sibling]);

    expectEqual(metrics.tvaRate, 0);
    expectEqual(metrics.minPriceBreakevenTTC, metrics.minPriceBreakeven);
    expectEqual(metrics.priceWithMarginTTC, metrics.priceWithMargin);
  });

  it('applies global TVA when enabled', () => {
    const metrics = calculateProductMetrics(product, recipe, ingredients, baseSettings, [product, sibling]);
    expectEqual(metrics.tvaRate, 10);
    expectEqual(metrics.priceWithMarginTTC, metrics.priceWithMargin * 1.1);
  });

  it('uses salary mode for recommended price when configured', () => {
    const settings: GlobalSettings = { ...baseSettings, pricingStrategy: 'salary' };
    const metrics = calculateProductMetrics(product, recipe, ingredients, settings, [product, sibling]);
    expectEqual(metrics.recommendedPriceHT, metrics.priceWithSalary);
    expectEqual(metrics.recommendedPriceTTC, metrics.priceWithSalaryTTC);
  });

  it('allocates fixed costs across total estimated volume', () => {
    const settings: GlobalSettings = { ...baseSettings, fixedCostItems: [{ id: 'fc1', name: 'Fixe', amount: 100 }] };
    const metrics = calculateProductMetrics(product, recipe, ingredients, settings, [product, sibling]);

    expectEqual(metrics.allocatedFixedCost, 100 / 40);
    expectEqual(metrics.fullCost, 2 + (100 / 40));
  });

  it('excludes unsold units from packaging when packagingUsedOnUnsold is false', () => {
    const p = makeProduct({ packagingCost: 2, estimatedMonthlySales: 10, unsoldEstimate: 5, packagingUsedOnUnsold: false });
    const metrics = calculateProductMetrics(p, recipe, ingredients, { ...baseSettings, fixedCostItems: [] }, [p]);
    expectEqual(metrics.finalPackagingCost, 2);
  });

  it('applies manufacturing loss to packaging when applyLossToPackaging is true', () => {
    const p = makeProduct({
      packagingCost: 2,
      estimatedMonthlySales: 10,
      unsoldEstimate: 5,
      packagingUsedOnUnsold: true,
      lossRate: 50,
      applyLossToPackaging: true
    });
    const metrics = calculateProductMetrics(p, recipe, ingredients, { ...baseSettings, fixedCostItems: [] }, [p]);
    expectEqual(metrics.finalPackagingCost, 2 * 2 * (15 / 10));
  });

  it('uses safe divisor when social charges rate is 100 or more', () => {
    const settings: GlobalSettings = { ...baseSettings, taxRate: 100, fixedCostItems: [] };
    const metrics = calculateProductMetrics(product, recipe, ingredients, settings, [product]);

    expectEqual(metrics.minPriceBreakeven, metrics.fullCost);
    expectEqual(metrics.priceWithMargin, metrics.fullCost + product.targetMargin);
  });

  it('keeps calculations finite when estimatedMonthlySales is zero', () => {
    const p = makeProduct({ estimatedMonthlySales: 0, unsoldEstimate: 2, packagingCost: 1 });
    const metrics = calculateProductMetrics(p, recipe, ingredients, { ...baseSettings, fixedCostItems: [] }, [p]);

    expect(Number.isFinite(metrics.fullCost)).toBe(true);
    expect(Number.isFinite(metrics.recommendedPriceTTC)).toBe(true);
  });
});

describe('estimateUnitsForTargetSalary', () => {
  const settings: GlobalSettings = {
    ...baseSettings,
    isTvaSubject: false,
    taxRate: 0,
    fixedCostItems: [],
    targetMonthlySalary: 0
  };

  const ingredients = [makeIngredient({ id: 'i1', costPerBaseUnit: 1 })];
  const recipes = [makeRecipe({ id: 'r1', ingredients: [{ ingredientId: 'i1', quantity: 10 }], batchYield: 10 })];

  const productA = makeProduct({
    id: 'p1',
    name: 'A',
    recipeId: 'r1',
    standardPrice: 5,
    estimatedMonthlySales: 80
  });
  const productB = makeProduct({
    id: 'p2',
    name: 'B',
    recipeId: 'r1',
    standardPrice: 3,
    estimatedMonthlySales: 20
  });

  it('returns infeasible when no product has a valid recipe', () => {
    const plan = estimateUnitsForTargetSalary({
      targetSalary: 1000,
      products: [makeProduct({ recipeId: 'missing' })],
      recipes,
      ingredients,
      settings,
      useStandardPrice: true
    });

    expect(plan.feasible).toBe(false);
    expect(plan.totalUnitsNeeded).toBe(0);
    expect(plan.message).toBe('Aucun produit avec recette valide.');
    expect(plan.rows).toHaveLength(0);
  });

  it('returns infeasible when weighted net per unit is not positive', () => {
    const plan = estimateUnitsForTargetSalary({
      targetSalary: 100,
      products: [
        makeProduct({ id: 'p1', recipeId: 'r1', standardPrice: 0.5, estimatedMonthlySales: 10 }),
        makeProduct({ id: 'p2', recipeId: 'r1', standardPrice: 0.2, estimatedMonthlySales: 10 })
      ],
      recipes,
      ingredients,
      settings,
      useStandardPrice: true
    });

    expect(plan.feasible).toBe(false);
    expect(plan.totalUnitsNeeded).toBe(0);
    expect(plan.message).toMatch(/gain net positif/i);
    expect(plan.rows).toHaveLength(2);
  });

  it('uses sales volumes as row weights when available', () => {
    const plan = estimateUnitsForTargetSalary({
      targetSalary: 360,
      products: [productA, productB],
      recipes,
      ingredients,
      settings,
      useStandardPrice: true
    });

    expect(plan.feasible).toBe(true);
    expectEqual(plan.totalUnitsNeeded, 100);
    expectEqual(plan.estimatedNetResult, 360);
    expectEqual(plan.rows[0].weight, 0.8);
    expectEqual(plan.rows[1].weight, 0.2);
    expectEqual(plan.rows[0].estimatedUnits, 80);
    expectEqual(plan.rows[1].estimatedUnits, 20);
  });

  it('falls back to equal weights when all estimated sales are zero', () => {
    const plan = estimateUnitsForTargetSalary({
      targetSalary: 300,
      products: [
        { ...productA, estimatedMonthlySales: 0 },
        { ...productB, estimatedMonthlySales: 0 }
      ],
      recipes,
      ingredients,
      settings,
      useStandardPrice: true
    });

    expect(plan.feasible).toBe(true);
    expectEqual(plan.rows[0].weight, 0.5);
    expectEqual(plan.rows[1].weight, 0.5);
    expectEqual(plan.totalUnitsNeeded, 100);
  });

  it('clamps negative target salary to zero', () => {
    const plan = estimateUnitsForTargetSalary({
      targetSalary: -500,
      products: [productA],
      recipes,
      ingredients,
      settings,
      useStandardPrice: true
    });

    expect(plan.feasible).toBe(true);
    expectEqual(plan.totalUnitsNeeded, 0);
    expectEqual(plan.estimatedNetResult, 0);
  });

  it('uses recommended margin price when useStandardPrice is false', () => {
    const plan = estimateUnitsForTargetSalary({
      targetSalary: 100,
      products: [makeProduct({ id: 'p1', recipeId: 'r1', targetMargin: 1, standardPrice: 999 })],
      recipes,
      ingredients,
      settings,
      useStandardPrice: false
    });

    expect(plan.feasible).toBe(true);
    expectEqual(plan.totalUnitsNeeded, 100);
  });

  it('falls back to recommended price when standardPrice is undefined', () => {
    const plan = estimateUnitsForTargetSalary({
      targetSalary: 100,
      products: [makeProduct({ id: 'p1', recipeId: 'r1', standardPrice: undefined })],
      recipes,
      ingredients,
      settings,
      useStandardPrice: true
    });

    expect(plan.feasible).toBe(true);
    expectEqual(plan.totalUnitsNeeded, 100);
  });
});
