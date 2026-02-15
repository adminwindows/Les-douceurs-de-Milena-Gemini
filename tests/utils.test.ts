import { describe, expect, it } from 'vitest';
import { calculateProductMetrics, calculateRecipeMaterialCost, computeIngredientPrices, convertToCostPerBaseUnit, rebuildIngredientCost } from '../utils';
import { GlobalSettings, Ingredient, Product, Recipe, Unit } from '../types';
import { normalizeIngredient } from '../dataMigrations';

const settingsOff: GlobalSettings = { currency: 'EUR', hourlyRate: 0, includeLaborInCost: true, fixedCostItems: [], taxRate: 0, isTvaSubject: false, defaultTvaRate: 5.5, defaultIngredientVatRate: 5.5, includePendingOrdersInMonthlyReport: false };
const settingsOn: GlobalSettings = { ...settingsOff, isTvaSubject: true };

// ---------------------------------------------------------------------------
// Unit conversion & costPerBaseUnit
// ---------------------------------------------------------------------------
describe('convertToCostPerBaseUnit', () => {
  it('converts kg price to per-gram cost', () => {
    // 2€ for 1 kg = 0.002 €/g
    expect(convertToCostPerBaseUnit(2, 1, Unit.KG)).toBeCloseTo(0.002, 8);
  });

  it('converts L price to per-ml cost', () => {
    // 3€ for 2 L = 3/(2*1000) = 0.0015 €/ml
    expect(convertToCostPerBaseUnit(3, 2, Unit.L)).toBeCloseTo(0.0015, 8);
  });

  it('g unit uses multiplier 1', () => {
    // 5€ for 500g = 0.01 €/g
    expect(convertToCostPerBaseUnit(5, 500, Unit.G)).toBeCloseTo(0.01, 8);
  });

  it('ml unit uses multiplier 1', () => {
    // 2€ for 100ml = 0.02 €/ml
    expect(convertToCostPerBaseUnit(2, 100, Unit.ML)).toBeCloseTo(0.02, 8);
  });

  it('pièce unit uses multiplier 1', () => {
    // 6€ for 12 pieces = 0.50 €/piece
    expect(convertToCostPerBaseUnit(6, 12, Unit.PIECE)).toBeCloseTo(0.5, 8);
  });

  it('non-1 purchase quantities', () => {
    // 10€ for 5 kg = 10/(5*1000) = 0.002 €/g
    expect(convertToCostPerBaseUnit(10, 5, Unit.KG)).toBeCloseTo(0.002, 8);
    // 7.50€ for 3 L = 7.50/(3*1000) = 0.0025 €/ml
    expect(convertToCostPerBaseUnit(7.50, 3, Unit.L)).toBeCloseTo(0.0025, 8);
  });

  it('returns 0 for zero quantity', () => {
    expect(convertToCostPerBaseUnit(3, 0, Unit.G)).toBe(0);
  });

  it('returns 0 for negative quantity', () => {
    expect(convertToCostPerBaseUnit(3, -1, Unit.KG)).toBe(0);
  });

  it('returns 0 for NaN price', () => {
    expect(convertToCostPerBaseUnit(NaN, 1, Unit.G)).toBe(0);
  });

  it('returns 0 for Infinity quantity', () => {
    expect(convertToCostPerBaseUnit(1, Infinity, Unit.G)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Ingredient price conversion (HT/TTC)
// ---------------------------------------------------------------------------
describe('computeIngredientPrices', () => {
  it('converts TTC to HT with vat rate', () => {
    expect(computeIngredientPrices({ priceAmount: 1.2, priceBasis: 'TTC', vatRate: 20 }).priceHT).toBeCloseTo(1, 6);
  });

  it('converts HT to TTC with vat rate', () => {
    expect(computeIngredientPrices({ priceAmount: 1, priceBasis: 'HT', vatRate: 20 }).priceTTC).toBeCloseTo(1.2, 6);
  });

  it('TTC basis returns priceAmount as TTC', () => {
    const result = computeIngredientPrices({ priceAmount: 10, priceBasis: 'TTC', vatRate: 10 });
    expect(result.priceTTC).toBeCloseTo(10, 6);
    expect(result.priceHT).toBeCloseTo(10 / 1.1, 6);
  });

  it('HT basis returns priceAmount as HT', () => {
    const result = computeIngredientPrices({ priceAmount: 10, priceBasis: 'HT', vatRate: 10 });
    expect(result.priceHT).toBeCloseTo(10, 6);
    expect(result.priceTTC).toBeCloseTo(11, 6);
  });

  it('0% vat rate means HT = TTC', () => {
    const result = computeIngredientPrices({ priceAmount: 5, priceBasis: 'TTC', vatRate: 0 });
    expect(result.priceHT).toBeCloseTo(5, 6);
    expect(result.priceTTC).toBeCloseTo(5, 6);
  });
});

// ---------------------------------------------------------------------------
// rebuildIngredientCost (TVA ON/OFF)
// ---------------------------------------------------------------------------
describe('rebuildIngredientCost', () => {
  const ingredient: Ingredient = { id: 'i1', name: 'Farine', unit: Unit.KG, quantity: 1, price: 1.2, priceAmount: 1.2, priceBasis: 'TTC', vatRate: 20, costPerBaseUnit: 0 };

  it('uses priceAmount as-is when TVA OFF', () => {
    // 1.2€ for 1kg → 0.0012 €/g
    expect(rebuildIngredientCost(ingredient, settingsOff).costPerBaseUnit).toBeCloseTo(0.0012, 8);
  });

  it('uses priceHT when TVA ON', () => {
    // 1.2 TTC / 1.2 (vatMultiplier) = 1.0 HT → 0.001 €/g
    expect(rebuildIngredientCost(ingredient, settingsOn).costPerBaseUnit).toBeCloseTo(0.001, 8);
  });
});

// ---------------------------------------------------------------------------
// Recipe material cost
// ---------------------------------------------------------------------------
describe('calculateRecipeMaterialCost', () => {
  it('sums ingredient costs for a multi-ingredient recipe', () => {
    const ingredients: Ingredient[] = [
      { id: 'i1', name: 'A', unit: Unit.G, price: 1, priceAmount: 1, priceBasis: 'HT', vatRate: 0, quantity: 1, costPerBaseUnit: 0.01 },
      { id: 'i2', name: 'B', unit: Unit.G, price: 1, priceAmount: 1, priceBasis: 'HT', vatRate: 0, quantity: 1, costPerBaseUnit: 0.02 },
    ];
    const recipe: Recipe = {
      id: 'r1', name: 'Multi', batchYield: 1, lossPercentage: 0,
      ingredients: [{ ingredientId: 'i1', quantity: 100 }, { ingredientId: 'i2', quantity: 50 }]
    };
    // 100*0.01 + 50*0.02 = 1 + 1 = 2
    expect(calculateRecipeMaterialCost(recipe, ingredients)).toBeCloseTo(2, 6);
  });

  it('applies recipe lossPercentage', () => {
    const ingredients: Ingredient[] = [
      { id: 'i1', name: 'A', unit: Unit.G, price: 1, priceAmount: 1, priceBasis: 'HT', vatRate: 0, quantity: 1, costPerBaseUnit: 0.01 }
    ];
    const recipe: Recipe = {
      id: 'r1', name: 'Test', batchYield: 10, lossPercentage: 10,
      ingredients: [{ ingredientId: 'i1', quantity: 100 }]
    };
    // batchCost = 100*0.01 = 1.0; with 10% loss: 1.0 * 1.1 = 1.1
    expect(calculateRecipeMaterialCost(recipe, ingredients)).toBeCloseTo(1.1, 6);
  });

  it('handles missing ingredient gracefully (skips it)', () => {
    const ingredients: Ingredient[] = [
      { id: 'i1', name: 'A', unit: Unit.G, price: 1, priceAmount: 1, priceBasis: 'HT', vatRate: 0, quantity: 1, costPerBaseUnit: 0.01 }
    ];
    const recipe: Recipe = {
      id: 'r1', name: 'Test', batchYield: 1, lossPercentage: 0,
      ingredients: [{ ingredientId: 'i1', quantity: 100 }, { ingredientId: 'missing', quantity: 10 }]
    };
    // Only i1 counted: 100*0.01 = 1.0
    expect(calculateRecipeMaterialCost(recipe, ingredients)).toBeCloseTo(1.0, 6);
  });

  it('returns 0 for empty recipe', () => {
    const recipe: Recipe = { id: 'r1', name: 'Empty', ingredients: [], batchYield: 1, lossPercentage: 0 };
    expect(calculateRecipeMaterialCost(recipe, [])).toBe(0);
  });

  it('0% lossPercentage does not change cost', () => {
    const ingredients: Ingredient[] = [
      { id: 'i1', name: 'A', unit: Unit.G, price: 1, priceAmount: 1, priceBasis: 'HT', vatRate: 0, quantity: 1, costPerBaseUnit: 0.01 }
    ];
    const recipe: Recipe = {
      id: 'r1', name: 'Test', batchYield: 1, lossPercentage: 0,
      ingredients: [{ ingredientId: 'i1', quantity: 100 }]
    };
    expect(calculateRecipeMaterialCost(recipe, ingredients)).toBeCloseTo(1.0, 6);
  });
});

// ---------------------------------------------------------------------------
// Product metrics
// ---------------------------------------------------------------------------
describe('calculateProductMetrics', () => {
  const ing: Ingredient[] = [{ id: 'i1', name: 'F', unit: Unit.G, price: 1, priceAmount: 1, priceBasis: 'HT', vatRate: 0, quantity: 1, costPerBaseUnit: 0.01 }];
  const recipe: Recipe = { id: 'r1', name: 'R', ingredients: [{ ingredientId: 'i1', quantity: 100 }], batchYield: 10, lossPercentage: 0 };
  const base: Product = { id: 'p', name: 'P', recipeId: 'r1', laborTimeMinutes: 0, packagingCost: 0, lossRate: 0, unsoldEstimate: 0, packagingUsedOnUnsold: false, applyLossToPackaging: false, targetMargin: 0, estimatedMonthlySales: 10, category: 'c' };

  it('computes basic unitMaterialCost', () => {
    // batchCost = 100*0.01 = 1.0; unitCost = 1.0/10 = 0.1
    const m = calculateProductMetrics(base, recipe, ing, settingsOff, [base]);
    expect(m.unitMaterialCost).toBeCloseTo(0.1, 6);
  });

  describe('includeLaborInCost toggle', () => {
    const settingsWithLabor: GlobalSettings = { ...settingsOff, hourlyRate: 60, includeLaborInCost: true };
    const settingsWithoutLabor: GlobalSettings = { ...settingsOff, hourlyRate: 60, includeLaborInCost: false };
    const product = { ...base, laborTimeMinutes: 30 };

    it('ON: laborCost is included in fullCost', () => {
      const m = calculateProductMetrics(product, recipe, ing, settingsWithLabor, [product]);
      // labor = (30/60)*60 = 30
      expect(m.laborCost).toBeCloseTo(30, 6);
      expect(m.fullCost).toBeGreaterThan(m.totalVariableCosts);
    });

    it('OFF: laborCost is 0, fullCost equals variable costs + fixed', () => {
      const m = calculateProductMetrics(product, recipe, ing, settingsWithoutLabor, [product]);
      expect(m.laborCost).toBe(0);
    });
  });

  describe('lossRate (manufacturing loss multiplier)', () => {
    it('lossRate 10% increases material cost by 1/(1-0.1) ≈ 1.1111', () => {
      const product = { ...base, lossRate: 10 };
      const m = calculateProductMetrics(product, recipe, ing, settingsOff, [product]);
      const noLoss = calculateProductMetrics(base, recipe, ing, settingsOff, [base]);
      const expectedMultiplier = 1 / (1 - 0.1);
      expect(m.unitMaterialCost).toBeCloseTo(noLoss.unitMaterialCost, 6); // unitMaterialCost is before loss
      // fullCost includes the loss multiplier via totalVariableCosts
      expect(m.fullCost).toBeCloseTo(noLoss.unitMaterialCost * expectedMultiplier, 4);
    });
  });

  describe('unsoldEstimate', () => {
    it('unsold units increase material production ratio', () => {
      const product = { ...base, unsoldEstimate: 5 };
      const m = calculateProductMetrics(product, recipe, ing, settingsOff, [product]);
      const noUnsold = calculateProductMetrics(base, recipe, ing, settingsOff, [base]);
      // materialProductionRatio = (10+5)/10 = 1.5 vs 10/10 = 1.0
      expect(m.fullCost).toBeGreaterThan(noUnsold.fullCost);
    });
  });

  describe('packagingUsedOnUnsold ON/OFF', () => {
    const product = { ...base, packagingCost: 1, unsoldEstimate: 2, estimatedMonthlySales: 10 };

    it('OFF: packaging only for sold units', () => {
      const m = calculateProductMetrics({ ...product, packagingUsedOnUnsold: false }, recipe, ing, settingsOff, [{ ...product, packagingUsedOnUnsold: false }]);
      // packagingQuantity = 10 (sold only), packagingRatio = 10/10 = 1.0
      // finalPackagingCost = 1 * 1 * 1 = 1
      // totalVariableCosts = material + packaging = (0.1 * 12/10) + 1.0
      const expectedPackaging = 1 * (10 / 10); // = 1.0
      expect(m.totalVariableCosts - m.unitMaterialCost * ((10 + 2) / 10)).toBeCloseTo(expectedPackaging, 4);
    });

    it('ON: packaging includes unsold units', () => {
      const m = calculateProductMetrics({ ...product, packagingUsedOnUnsold: true }, recipe, ing, settingsOff, [{ ...product, packagingUsedOnUnsold: true }]);
      const mOff = calculateProductMetrics({ ...product, packagingUsedOnUnsold: false }, recipe, ing, settingsOff, [{ ...product, packagingUsedOnUnsold: false }]);
      // ON = 12/10 = 1.2 ratio, OFF = 10/10 = 1.0 ratio → 0.2 more packaging cost
      expect(m.totalVariableCosts).toBeGreaterThan(mOff.totalVariableCosts);
      expect(m.totalVariableCosts - mOff.totalVariableCosts).toBeCloseTo(0.2, 4);
    });
  });

  describe('applyLossToPackaging ON/OFF', () => {
    const product = { ...base, packagingCost: 1, lossRate: 10, estimatedMonthlySales: 10 };

    it('OFF: packaging cost is not multiplied by loss multiplier', () => {
      const m = calculateProductMetrics({ ...product, applyLossToPackaging: false }, recipe, ing, settingsOff, [{ ...product, applyLossToPackaging: false }]);
      const mOn = calculateProductMetrics({ ...product, applyLossToPackaging: true }, recipe, ing, settingsOff, [{ ...product, applyLossToPackaging: true }]);
      expect(mOn.totalVariableCosts).toBeGreaterThan(m.totalVariableCosts);
    });

    it('ON: packaging multiplied by 1/(1-lossRate/100)', () => {
      const mOn = calculateProductMetrics({ ...product, applyLossToPackaging: true }, recipe, ing, settingsOff, [{ ...product, applyLossToPackaging: true }]);
      const mOff = calculateProductMetrics({ ...product, applyLossToPackaging: false }, recipe, ing, settingsOff, [{ ...product, applyLossToPackaging: false }]);
      const expectedMultiplier = 1 / (1 - 0.1);
      // Packaging diff = 1 * expectedMultiplier - 1 * 1 ≈ 0.1111
      expect(mOn.totalVariableCosts - mOff.totalVariableCosts).toBeCloseTo(expectedMultiplier - 1, 3);
    });
  });

  describe('fixed cost allocation', () => {
    it('distributes across total estimated monthly sales', () => {
      const settingsFC: GlobalSettings = { ...settingsOff, fixedCostItems: [{ id: 'f1', name: 'Rent', amount: 100 }] };
      const p1 = { ...base, estimatedMonthlySales: 20 };
      const p2 = { ...base, id: 'p2', estimatedMonthlySales: 30 };
      const m = calculateProductMetrics(p1, recipe, ing, settingsFC, [p1, p2]);
      // totalVolume = 20+30=50, allocatedFixedCost = 100/50 = 2
      expect(m.allocatedFixedCost).toBeCloseTo(2, 6);
    });

    it('returns 0 when no products have estimated sales', () => {
      const settingsFC: GlobalSettings = { ...settingsOff, fixedCostItems: [{ id: 'f1', name: 'Rent', amount: 100 }] };
      const p = { ...base, estimatedMonthlySales: 0 };
      const m = calculateProductMetrics(p, recipe, ing, settingsFC, [p]);
      expect(m.allocatedFixedCost).toBe(0);
    });
  });

  describe('VAT ON/OFF for minimum price', () => {
    it('TVA OFF: minPriceBreakevenTTC equals minPriceBreakeven (HT)', () => {
      const m = calculateProductMetrics(base, recipe, ing, settingsOff, [base]);
      expect(m.minPriceBreakevenTTC).toBeCloseTo(m.minPriceBreakeven, 6);
    });

    it('TVA ON: minPriceBreakevenTTC = HT * (1 + tvaRate/100)', () => {
      const settingsTva: GlobalSettings = { ...settingsOff, isTvaSubject: true, defaultTvaRate: 10 };
      const m = calculateProductMetrics(base, recipe, ing, settingsTva, [base]);
      expect(m.minPriceBreakevenTTC).toBeCloseTo(m.minPriceBreakeven * 1.1, 6);
    });

    it('product-specific tvaRate overrides default', () => {
      const settingsTva: GlobalSettings = { ...settingsOff, isTvaSubject: true, defaultTvaRate: 10 };
      const product = { ...base, tvaRate: 20 };
      const m = calculateProductMetrics(product, recipe, ing, settingsTva, [product]);
      expect(m.minPriceBreakevenTTC).toBeCloseTo(m.minPriceBreakeven * 1.2, 6);
      expect(m.tvaRate).toBe(20);
    });
  });

  describe('social charges in minimum price', () => {
    it('divisor = 1 - taxRate/100 affects breakeven price', () => {
      const settingsTax: GlobalSettings = { ...settingsOff, taxRate: 20 };
      const m = calculateProductMetrics(base, recipe, ing, settingsTax, [base]);
      // fullCost / (1 - 0.2) = fullCost / 0.8
      expect(m.minPriceBreakeven).toBeCloseTo(m.fullCost / 0.8, 6);
    });
  });

  describe('monotonicity', () => {
    it('increasing ingredient price must not decrease fullCost', () => {
      const lowIng: Ingredient[] = [{ id: 'i1', name: 'F', unit: Unit.G, price: 1, priceAmount: 1, priceBasis: 'HT', vatRate: 0, quantity: 1, costPerBaseUnit: 0.01 }];
      const highIng: Ingredient[] = [{ ...lowIng[0], price: 2, priceAmount: 2, costPerBaseUnit: 0.02 }];
      const low = calculateProductMetrics(base, recipe, lowIng, settingsOff, [base]).fullCost;
      const high = calculateProductMetrics(base, recipe, highIng, settingsOff, [base]).fullCost;
      expect(high).toBeGreaterThanOrEqual(low);
    });

    it('increasing packagingCost must not decrease fullCost', () => {
      const p1 = { ...base, packagingCost: 0.5 };
      const p2 = { ...base, packagingCost: 1.5 };
      const low = calculateProductMetrics(p1, recipe, ing, settingsOff, [p1]).fullCost;
      const high = calculateProductMetrics(p2, recipe, ing, settingsOff, [p2]).fullCost;
      expect(high).toBeGreaterThanOrEqual(low);
    });

    it('increasing lossRate must not decrease fullCost', () => {
      const p1 = { ...base, lossRate: 5 };
      const p2 = { ...base, lossRate: 15 };
      const low = calculateProductMetrics(p1, recipe, ing, settingsOff, [p1]).fullCost;
      const high = calculateProductMetrics(p2, recipe, ing, settingsOff, [p2]).fullCost;
      expect(high).toBeGreaterThanOrEqual(low);
    });

    it('increasing unsoldEstimate must not decrease fullCost', () => {
      const p1 = { ...base, unsoldEstimate: 0 };
      const p2 = { ...base, unsoldEstimate: 5 };
      const low = calculateProductMetrics(p1, recipe, ing, settingsOff, [p1]).fullCost;
      const high = calculateProductMetrics(p2, recipe, ing, settingsOff, [p2]).fullCost;
      expect(high).toBeGreaterThanOrEqual(low);
    });
  });

  describe('migration', () => {
    it('sets VAT defaults and needs review under TVA ON', () => {
      const legacy = { id: 'i1', name: 'Sucre', unit: Unit.KG, price: 2, quantity: 1, costPerBaseUnit: 0.002 } as Ingredient;
      const migrated = normalizeIngredient(legacy, settingsOn);
      expect(migrated.priceBasis).toBe('HT');
      expect(migrated.vatRate).toBe(5.5);
      expect(migrated.needsVatReview).toBe(true);
    });
  });
});
