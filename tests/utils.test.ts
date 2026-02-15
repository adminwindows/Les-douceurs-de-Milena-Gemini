import { describe, expect, it } from 'vitest';
import { calculateProductMetrics, calculateRecipeMaterialCost, convertToCostPerBaseUnit, rebuildIngredientCost, ttcToHt } from '../utils';
import { GlobalSettings, Ingredient, Product, Recipe, Unit } from '../types';
import { normalizeIngredient } from '../dataMigrations';
import { expectEqual } from './assertHelpers';

const settingsOff: GlobalSettings = { currency: 'EUR', hourlyRate: 0, includeLaborInCost: true, fixedCostItems: [], taxRate: 0, isTvaSubject: false, defaultTvaRate: 5.5, includePendingOrdersInMonthlyReport: false };
const settingsOn: GlobalSettings = { ...settingsOff, isTvaSubject: true };

// ---------------------------------------------------------------------------
// Unit conversion & costPerBaseUnit
// ---------------------------------------------------------------------------
describe('convertToCostPerBaseUnit', () => {
  it('converts kg price to per-gram cost', () => {
    // 2€ for 1 kg = 0.002 €/g
    expectEqual(convertToCostPerBaseUnit(2, 1, Unit.KG), 2 / 1 / 1000);
  });

  it('converts L price to per-ml cost', () => {
    // 3€ for 2 L = 3/(2*1000) = 0.0015 €/ml
    expectEqual(convertToCostPerBaseUnit(3, 2, Unit.L), 3 / 2 / 1000);
  });

  it('g unit uses multiplier 1', () => {
    // 5€ for 500g = 0.01 €/g
    expectEqual(convertToCostPerBaseUnit(5, 500, Unit.G), 5 / 500);
  });

  it('ml unit uses multiplier 1', () => {
    // 2€ for 100ml = 0.02 €/ml
    expectEqual(convertToCostPerBaseUnit(2, 100, Unit.ML), 2 / 100);
  });

  it('pièce unit uses multiplier 1', () => {
    // 6€ for 12 pieces = 0.50 €/piece
    expectEqual(convertToCostPerBaseUnit(6, 12, Unit.PIECE), 6 / 12);
  });

  it('non-1 purchase quantities', () => {
    // 10€ for 5 kg = 10/(5*1000) = 0.002 €/g
    expectEqual(convertToCostPerBaseUnit(10, 5, Unit.KG), 10 / 5 / 1000);
    // 7.50€ for 3 L = 7.50/(3*1000) = 0.0025 €/ml
    expectEqual(convertToCostPerBaseUnit(7.50, 3, Unit.L), 7.50 / 3 / 1000);
  });

  it('returns 0 for zero quantity', () => {
    expectEqual(convertToCostPerBaseUnit(3, 0, Unit.G), 0);
  });

  it('returns 0 for negative quantity', () => {
    expectEqual(convertToCostPerBaseUnit(3, -1, Unit.KG), 0);
  });

  it('returns 0 for NaN price', () => {
    expectEqual(convertToCostPerBaseUnit(NaN, 1, Unit.G), 0);
  });

  it('returns 0 for Infinity quantity', () => {
    expectEqual(convertToCostPerBaseUnit(1, Infinity, Unit.G), 0);
  });
});

// ---------------------------------------------------------------------------
// TTC→HT conversion helper
// ---------------------------------------------------------------------------
describe('ttcToHt', () => {
  it('converts TTC to HT with given VAT rate', () => {
    expectEqual(ttcToHt(1.2, 20), 1.2 / (1 + 20 / 100));
  });

  it('0% VAT rate returns price unchanged', () => {
    expectEqual(ttcToHt(5, 0), 5);
  });

  it('negative VAT rate returns price unchanged', () => {
    expectEqual(ttcToHt(5, -1), 5);
  });
});

// ---------------------------------------------------------------------------
// rebuildIngredientCost (always HT, no TVA branching)
// ---------------------------------------------------------------------------
describe('rebuildIngredientCost', () => {
  const ingredient: Ingredient = { id: 'i1', name: 'Farine', unit: Unit.KG, quantity: 1, price: 1.2, costPerBaseUnit: 0 };

  it('computes costPerBaseUnit from price (always HT)', () => {
    // 1.2€ for 1kg → 0.0012 €/g
    expectEqual(rebuildIngredientCost(ingredient).costPerBaseUnit, 1.2 / 1 / 1000);
  });
});

// ---------------------------------------------------------------------------
// Recipe material cost
// ---------------------------------------------------------------------------
describe('calculateRecipeMaterialCost', () => {
  it('sums ingredient costs for a multi-ingredient recipe', () => {
    const ingredients: Ingredient[] = [
      { id: 'i1', name: 'A', unit: Unit.G, price: 1, quantity: 1, costPerBaseUnit: 0.01 },
      { id: 'i2', name: 'B', unit: Unit.G, price: 1, quantity: 1, costPerBaseUnit: 0.02 },
    ];
    const recipe: Recipe = {
      id: 'r1', name: 'Multi', batchYield: 1, lossPercentage: 0,
      ingredients: [{ ingredientId: 'i1', quantity: 100 }, { ingredientId: 'i2', quantity: 50 }]
    };
    // 100*0.01 + 50*0.02 = 1 + 1 = 2
    expectEqual(calculateRecipeMaterialCost(recipe, ingredients), 100 * 0.01 + 50 * 0.02);
  });

  it('applies recipe lossPercentage', () => {
    const ingredients: Ingredient[] = [
      { id: 'i1', name: 'A', unit: Unit.G, price: 1, quantity: 1, costPerBaseUnit: 0.01 }
    ];
    const recipe: Recipe = {
      id: 'r1', name: 'Test', batchYield: 10, lossPercentage: 10,
      ingredients: [{ ingredientId: 'i1', quantity: 100 }]
    };
    // batchCost = 100*0.01 = 1.0; with 10% loss: 1.0 * (1 + 10/100) = 1.1
    expectEqual(calculateRecipeMaterialCost(recipe, ingredients), 100 * 0.01 * (1 + 10 / 100));
  });

  it('handles missing ingredient gracefully (skips it)', () => {
    const ingredients: Ingredient[] = [
      { id: 'i1', name: 'A', unit: Unit.G, price: 1, quantity: 1, costPerBaseUnit: 0.01 }
    ];
    const recipe: Recipe = {
      id: 'r1', name: 'Test', batchYield: 1, lossPercentage: 0,
      ingredients: [{ ingredientId: 'i1', quantity: 100 }, { ingredientId: 'missing', quantity: 10 }]
    };
    // Only i1 counted: 100*0.01 = 1.0
    expectEqual(calculateRecipeMaterialCost(recipe, ingredients), 100 * 0.01);
  });

  it('returns 0 for empty recipe', () => {
    const recipe: Recipe = { id: 'r1', name: 'Empty', ingredients: [], batchYield: 1, lossPercentage: 0 };
    expectEqual(calculateRecipeMaterialCost(recipe, []), 0);
  });

  it('0% lossPercentage does not change cost', () => {
    const ingredients: Ingredient[] = [
      { id: 'i1', name: 'A', unit: Unit.G, price: 1, quantity: 1, costPerBaseUnit: 0.01 }
    ];
    const recipe: Recipe = {
      id: 'r1', name: 'Test', batchYield: 1, lossPercentage: 0,
      ingredients: [{ ingredientId: 'i1', quantity: 100 }]
    };
    expectEqual(calculateRecipeMaterialCost(recipe, ingredients), 100 * 0.01);
  });
});

// ---------------------------------------------------------------------------
// Product metrics
// ---------------------------------------------------------------------------
describe('calculateProductMetrics', () => {
  const ing: Ingredient[] = [{ id: 'i1', name: 'F', unit: Unit.G, price: 1, quantity: 1, costPerBaseUnit: 0.01 }];
  const recipe: Recipe = { id: 'r1', name: 'R', ingredients: [{ ingredientId: 'i1', quantity: 100 }], batchYield: 10, lossPercentage: 0 };
  const base: Product = { id: 'p', name: 'P', recipeId: 'r1', laborTimeMinutes: 0, packagingCost: 0, lossRate: 0, unsoldEstimate: 0, packagingUsedOnUnsold: false, applyLossToPackaging: false, targetMargin: 0, estimatedMonthlySales: 10, category: 'c' };

  it('computes basic unitMaterialCost', () => {
    // batchCost = 100*0.01 = 1.0; unitCost = 1.0/10 = 0.1
    const m = calculateProductMetrics(base, recipe, ing, settingsOff, [base]);
    expectEqual(m.unitMaterialCost, 100 * 0.01 / 10);
  });

  describe('includeLaborInCost toggle', () => {
    const settingsWithLabor: GlobalSettings = { ...settingsOff, hourlyRate: 60, includeLaborInCost: true };
    const settingsWithoutLabor: GlobalSettings = { ...settingsOff, hourlyRate: 60, includeLaborInCost: false };
    const product = { ...base, laborTimeMinutes: 30 };

    it('ON: laborCost is included in fullCost', () => {
      const m = calculateProductMetrics(product, recipe, ing, settingsWithLabor, [product]);
      // labor = (30/60)*60 = 30
      expectEqual(m.laborCost, (30 / 60) * 60);
      expect(m.fullCost).toBeGreaterThan(m.totalVariableCosts);
    });

    it('OFF: laborCost is 0, fullCost equals variable costs + fixed', () => {
      const m = calculateProductMetrics(product, recipe, ing, settingsWithoutLabor, [product]);
      expectEqual(m.laborCost, 0);
    });
  });

  describe('lossRate (manufacturing loss multiplier)', () => {
    it('lossRate 10% increases material cost by 1/(1-0.1)', () => {
      const product = { ...base, lossRate: 10 };
      const m = calculateProductMetrics(product, recipe, ing, settingsOff, [product]);
      const noLoss = calculateProductMetrics(base, recipe, ing, settingsOff, [base]);
      const expectedMultiplier = 1 / (1 - 10 / 100);
      expectEqual(m.unitMaterialCost, noLoss.unitMaterialCost); // unitMaterialCost is before loss
      // fullCost includes the loss multiplier via totalVariableCosts
      expectEqual(m.fullCost, noLoss.unitMaterialCost * expectedMultiplier);
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
      // totalVariableCosts = material + packaging
      const expectedPackaging = 1 * (10 / 10); // = 1.0
      expectEqual(m.totalVariableCosts - m.unitMaterialCost * ((10 + 2) / 10), expectedPackaging);
    });

    it('ON: packaging includes unsold units', () => {
      const m = calculateProductMetrics({ ...product, packagingUsedOnUnsold: true }, recipe, ing, settingsOff, [{ ...product, packagingUsedOnUnsold: true }]);
      const mOff = calculateProductMetrics({ ...product, packagingUsedOnUnsold: false }, recipe, ing, settingsOff, [{ ...product, packagingUsedOnUnsold: false }]);
      // ON = 12/10 = 1.2 ratio, OFF = 10/10 = 1.0 ratio
      expect(m.totalVariableCosts).toBeGreaterThan(mOff.totalVariableCosts);
      // Verify ON total directly: material * productionRatio + packaging * packagingRatio
      // materialProductionRatio = (10+2)/10, mfgLoss = 1, packagingRatio = (10+2)/10
      expectEqual(m.totalVariableCosts, m.unitMaterialCost * ((10 + 2) / 10) + 1 * ((10 + 2) / 10));
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
      const expectedMultiplier = 1 / (1 - 10 / 100);
      // Packaging diff = 1 * expectedMultiplier - 1 * 1
      expectEqual(mOn.totalVariableCosts - mOff.totalVariableCosts, 1 * expectedMultiplier - 1 * 1);
    });
  });

  describe('fixed cost allocation', () => {
    it('distributes across total estimated monthly sales', () => {
      const settingsFC: GlobalSettings = { ...settingsOff, fixedCostItems: [{ id: 'f1', name: 'Rent', amount: 100 }] };
      const p1 = { ...base, estimatedMonthlySales: 20 };
      const p2 = { ...base, id: 'p2', estimatedMonthlySales: 30 };
      const m = calculateProductMetrics(p1, recipe, ing, settingsFC, [p1, p2]);
      // totalVolume = 20+30=50, allocatedFixedCost = 100/50 = 2
      expectEqual(m.allocatedFixedCost, 100 / (20 + 30));
    });

    it('returns 0 when no products have estimated sales', () => {
      const settingsFC: GlobalSettings = { ...settingsOff, fixedCostItems: [{ id: 'f1', name: 'Rent', amount: 100 }] };
      const p = { ...base, estimatedMonthlySales: 0 };
      const m = calculateProductMetrics(p, recipe, ing, settingsFC, [p]);
      expectEqual(m.allocatedFixedCost, 0);
    });
  });

  describe('VAT ON/OFF for minimum price', () => {
    it('TVA OFF: minPriceBreakevenTTC equals minPriceBreakeven (HT)', () => {
      const m = calculateProductMetrics(base, recipe, ing, settingsOff, [base]);
      expectEqual(m.minPriceBreakevenTTC, m.minPriceBreakeven);
    });

    it('TVA ON: minPriceBreakevenTTC = HT * (1 + tvaRate/100)', () => {
      const settingsTva: GlobalSettings = { ...settingsOff, isTvaSubject: true, defaultTvaRate: 10 };
      const m = calculateProductMetrics(base, recipe, ing, settingsTva, [base]);
      expectEqual(m.minPriceBreakevenTTC, m.minPriceBreakeven * (1 + 10 / 100));
    });

    it('product-specific tvaRate overrides default', () => {
      const settingsTva: GlobalSettings = { ...settingsOff, isTvaSubject: true, defaultTvaRate: 10 };
      const product = { ...base, tvaRate: 20 };
      const m = calculateProductMetrics(product, recipe, ing, settingsTva, [product]);
      expectEqual(m.minPriceBreakevenTTC, m.minPriceBreakeven * (1 + 20 / 100));
      expect(m.tvaRate).toBe(20);
    });
  });

  describe('social charges in minimum price', () => {
    it('divisor = 1 - taxRate/100 affects breakeven price', () => {
      const settingsTax: GlobalSettings = { ...settingsOff, taxRate: 20 };
      const m = calculateProductMetrics(base, recipe, ing, settingsTax, [base]);
      // fullCost / (1 - 0.2) = fullCost / 0.8
      expectEqual(m.minPriceBreakeven, m.fullCost / (1 - 20 / 100));
    });
  });

  describe('monotonicity', () => {
    it('increasing ingredient price must not decrease fullCost', () => {
      const lowIng: Ingredient[] = [{ id: 'i1', name: 'F', unit: Unit.G, price: 1, quantity: 1, costPerBaseUnit: 0.01 }];
      const highIng: Ingredient[] = [{ ...lowIng[0], price: 2, costPerBaseUnit: 0.02 }];
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
    it('converts TTC ingredient to HT under TVA ON and flags needsPriceReview', () => {
      // Simulate legacy ingredient with priceBasis='TTC' and vatRate=20
      const legacy = { id: 'i1', name: 'Sucre', unit: Unit.KG, price: 1.2, priceAmount: 1.2, priceBasis: 'TTC', vatRate: 20, quantity: 1, costPerBaseUnit: 0.002 } as any;
      const migrated = normalizeIngredient(legacy, settingsOn);
      // Price should be converted: 1.2 / 1.2 = 1.0 HT
      expectEqual(migrated.price, 1.2 / (1 + 20 / 100));
      expect(migrated.needsPriceReview).toBe(true);
      expect(migrated.helperVatRate).toBe(20);
    });

    it('keeps price as-is when priceBasis was HT', () => {
      const legacy = { id: 'i1', name: 'Sucre', unit: Unit.KG, price: 2, priceAmount: 2, priceBasis: 'HT', vatRate: 20, quantity: 1, costPerBaseUnit: 0.002 } as any;
      const migrated = normalizeIngredient(legacy, settingsOn);
      expectEqual(migrated.price, 2);
      expect(migrated.needsPriceReview).toBeUndefined();
    });

    it('no conversion when TVA is OFF', () => {
      const legacy = { id: 'i1', name: 'Sucre', unit: Unit.KG, price: 1.2, priceAmount: 1.2, priceBasis: 'TTC', vatRate: 20, quantity: 1, costPerBaseUnit: 0.002 } as any;
      const migrated = normalizeIngredient(legacy, settingsOff);
      expectEqual(migrated.price, 1.2);
    });
  });
});
