import { describe, expect, it } from 'vitest';
import { calculateProductMetrics, calculateRecipeMaterialCost, computeIngredientPrices, convertToCostPerBaseUnit, rebuildIngredientCost } from '../utils';
import { GlobalSettings, Ingredient, Product, Recipe, Unit } from '../types';
import { normalizeIngredient } from '../dataMigrations';

const settingsOff: GlobalSettings = { currency: 'EUR', hourlyRate: 0, includeLaborInCost: true, fixedCostItems: [], taxRate: 0, isTvaSubject: false, defaultTvaRate: 5.5, defaultIngredientVatRate: 5.5, includePendingOrdersInMonthlyReport: false };
const settingsOn: GlobalSettings = { ...settingsOff, isTvaSubject: true };

describe('utils calculations', () => {
  it('converts TTC/HT with ingredient vat rate', () => {
    expect(computeIngredientPrices({ priceAmount: 1.2, priceBasis: 'TTC', vatRate: 20 }).priceHT).toBeCloseTo(1, 6);
    expect(computeIngredientPrices({ priceAmount: 1, priceBasis: 'HT', vatRate: 20 }).priceTTC).toBeCloseTo(1.2, 6);
  });

  it('handles unit conversion and invalid inputs', () => {
    expect(convertToCostPerBaseUnit(2, 1, Unit.KG)).toBeCloseTo(0.002, 8);
    expect(convertToCostPerBaseUnit(3, 2, Unit.L)).toBeCloseTo(0.0015, 8);
    expect(convertToCostPerBaseUnit(3, 0, Unit.G)).toBe(0);
  });

  it('uses VAT OFF as-is and VAT ON as HT for costPerBaseUnit', () => {
    const ingredient: Ingredient = { id: 'i1', name: 'Farine', unit: Unit.KG, quantity: 1, price: 1.2, priceAmount: 1.2, priceBasis: 'TTC', vatRate: 20, costPerBaseUnit: 0 };
    expect(rebuildIngredientCost(ingredient, settingsOff).costPerBaseUnit).toBeCloseTo(0.0012, 8);
    expect(rebuildIngredientCost(ingredient, settingsOn).costPerBaseUnit).toBeCloseTo(0.001, 8);
  });

  it('applies recipe loss and handles missing ingredient', () => {
    const ingredients: Ingredient[] = [{ id: 'i1', name: 'Farine', unit: Unit.G, price: 1, priceAmount: 1, priceBasis: 'HT', vatRate: 0, quantity: 1, costPerBaseUnit: 0.01 }];
    const recipe: Recipe = { id: 'r1', name: 'Test', ingredients: [{ ingredientId: 'i1', quantity: 100 }, { ingredientId: 'missing', quantity: 10 }], batchYield: 10, lossPercentage: 10 };
    expect(calculateRecipeMaterialCost(recipe, ingredients)).toBeCloseTo(1.1, 6);
  });

  it('migration sets VAT defaults and needs review under TVA ON', () => {
    const legacy = { id: 'i1', name: 'Sucre', unit: Unit.KG, price: 2, quantity: 1, costPerBaseUnit: 0.002 } as Ingredient;
    const migrated = normalizeIngredient(legacy, settingsOn);
    expect(migrated.priceBasis).toBe('HT');
    expect(migrated.vatRate).toBe(5.5);
    expect(migrated.needsVatReview).toBe(true);
  });

  it('product metrics include packaging unsold and optional packaging loss multiplier', () => {
    const ingredients: Ingredient[] = [{ id: 'i1', name: 'Farine', unit: Unit.G, price: 1, priceAmount: 1, priceBasis: 'HT', vatRate: 0, quantity: 1, costPerBaseUnit: 0.01 }];
    const recipe: Recipe = { id: 'r1', name: 'R', ingredients: [{ ingredientId: 'i1', quantity: 100 }], batchYield: 10, lossPercentage: 0 };
    const base: Product = { id: 'p', name: 'P', recipeId: 'r1', laborTimeMinutes: 0, packagingCost: 1, variableDeliveryCost: 10, lossRate: 10, unsoldEstimate: 2, packagingUsedOnUnsold: false, applyLossToPackaging: false, targetMargin: 0, estimatedMonthlySales: 10, category: 'c' };
    const noUnsoldPackaging = calculateProductMetrics(base, recipe, ingredients, settingsOff, [base]);
    const withUnsoldPackaging = calculateProductMetrics({ ...base, packagingUsedOnUnsold: true }, recipe, ingredients, settingsOff, [{ ...base, packagingUsedOnUnsold: true }]);
    const withLossPackaging = calculateProductMetrics({ ...base, packagingUsedOnUnsold: true, applyLossToPackaging: true }, recipe, ingredients, settingsOff, [{ ...base, packagingUsedOnUnsold: true, applyLossToPackaging: true }]);
    expect(withUnsoldPackaging.totalVariableCosts).toBeGreaterThan(noUnsoldPackaging.totalVariableCosts);
    expect(withLossPackaging.totalVariableCosts).toBeGreaterThan(withUnsoldPackaging.totalVariableCosts);
  });

  it('monotonicity: increasing ingredient price does not reduce fullCost', () => {
    const recipe: Recipe = { id: 'r1', name: 'R', ingredients: [{ ingredientId: 'i1', quantity: 100 }], batchYield: 10, lossPercentage: 0 };
    const product: Product = { id: 'p', name: 'P', recipeId: 'r1', laborTimeMinutes: 0, packagingCost: 0, variableDeliveryCost: 0, lossRate: 0, unsoldEstimate: 0, packagingUsedOnUnsold: false, applyLossToPackaging: false, targetMargin: 0, estimatedMonthlySales: 10, category: 'c' };
    const lowIng: Ingredient[] = [{ id: 'i1', name: 'F', unit: Unit.G, price: 1, priceAmount: 1, priceBasis: 'HT', vatRate: 0, quantity: 1, costPerBaseUnit: 0.01 }];
    const highIng: Ingredient[] = [{ ...lowIng[0], price: 2, priceAmount: 2, costPerBaseUnit: 0.02 }];
    expect(calculateProductMetrics(highIng ? product : product, recipe, highIng, settingsOff, [product]).fullCost).toBeGreaterThanOrEqual(calculateProductMetrics(product, recipe, lowIng, settingsOff, [product]).fullCost);
  });
});
