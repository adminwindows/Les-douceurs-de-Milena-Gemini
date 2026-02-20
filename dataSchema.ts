import { z } from 'zod';
import { Unit } from './types';

const unitSchema = z.nativeEnum(Unit);

const ingredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: unitSchema,
  price: z.number(),
  quantity: z.number(),
  costPerBaseUnit: z.number(),
  helperVatRate: z.number().optional(),
  needsPriceReview: z.boolean().optional()
});

const purchaseSchema = z.object({
  id: z.string(),
  date: z.string(),
  ingredientId: z.string(),
  quantity: z.number(),
  price: z.number()
});

const productionBatchSchema = z.object({
  id: z.string(),
  date: z.string(),
  productId: z.string(),
  quantity: z.number()
});

const recipeIngredientSchema = z.object({
  ingredientId: z.string(),
  quantity: z.number()
});

const recipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  ingredients: z.array(recipeIngredientSchema),
  batchYield: z.number(),
  lossPercentage: z.number()
});

const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  recipeId: z.string(),
  laborTimeMinutes: z.number(),
  packagingCost: z.number(),
  lossRate: z.number(),
  unsoldEstimate: z.number(),
  packagingUsedOnUnsold: z.boolean(),
  applyLossToPackaging: z.boolean().default(false),
  targetMargin: z.number(),
  estimatedMonthlySales: z.number(),
  category: z.string(),
  standardPrice: z.number().optional()
});

const fixedCostItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number()
});

const globalSettingsSchema = z.object({
  currency: z.string(),
  hourlyRate: z.number(),
  pricingMode: z.enum(['margin', 'salary']),
  salaryTarget: z.number(),
  fixedCostItems: z.array(fixedCostItemSchema),
  taxRate: z.number(),
  isTvaSubject: z.boolean(),
  defaultTvaRate: z.number(),
  includePendingOrdersInMonthlyReport: z.boolean().optional()
});

const orderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number(),
  unitPrice: z.number().optional()
});

const orderSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  date: z.string(),
  items: z.array(orderItemSchema),
  status: z.enum(['pending', 'completed', 'cancelled']),
  notes: z.string().optional(),
  isTvaSubject: z.boolean().optional()
});

const saleLineSchema = z.object({
  productId: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  isTvaSubject: z.boolean().optional()
});

const unsoldLineSchema = z.object({
  productId: z.string(),
  quantity: z.number()
});

const inventoryEntrySchema = z.object({
  ingredientId: z.string(),
  startStock: z.number(),
  purchasedQuantity: z.number(),
  endStock: z.number()
});

const frozenReportTotalsSchema = z.object({
  totalRevenueTTC: z.number(),
  totalRevenueHT: z.number(),
  totalTvaCollected: z.number(),
  foodCost: z.number(),
  packagingCost: z.number(),
  socialCharges: z.number(),
  fixedCosts: z.number(),
  grossMargin: z.number(),
  netResult: z.number(),
  costMode: z.union([z.literal(0), z.literal(1), z.literal(2)])
});

const monthlyReportSchema = z.object({
  id: z.string(),
  monthStr: z.string(),
  saleLines: z.array(saleLineSchema),
  unsoldLines: z.array(unsoldLineSchema),
  actualFixedCostItems: z.array(fixedCostItemSchema),
  actualIngredientSpend: z.number(),
  inventory: z.array(inventoryEntrySchema),
  ingredientPriceMode: z.enum(['standard', 'average', 'last']).optional(),
  frozenTotals: frozenReportTotalsSchema.optional(),
  totalRevenue: z.number(),
  netResult: z.number(),
  isLocked: z.boolean()
});

export const appDataSchema = z.object({
  ingredients: z.array(ingredientSchema),
  recipes: z.array(recipeSchema),
  products: z.array(productSchema),
  settings: globalSettingsSchema,
  orders: z.array(orderSchema),
  savedReports: z.array(monthlyReportSchema),
  purchases: z.array(purchaseSchema),
  productionBatches: z.array(productionBatchSchema)
});

// ---------------------------------------------------------------------------
// Legacy import schemas (accept old data formats and normalize)
// ---------------------------------------------------------------------------

const asNumber = z.coerce.number().refine(Number.isFinite);
const asString = z.coerce.string();

const legacyUnitSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const normalized = value.toLowerCase();
  if (normalized === 'kg') return Unit.KG;
  if (normalized === 'g' || normalized === 'gr') return Unit.G;
  if (normalized === 'ml') return Unit.ML;
  if (normalized === 'l' || normalized === 'lt') return Unit.L;
  if (normalized === 'piece' || normalized === 'pieces' || normalized === 'pièce' || normalized === 'pcs') return Unit.PIECE;
  return value;
}, unitSchema).catch(Unit.G);

const legacyIngredientSchema = z.object({
  id: asString,
  name: asString,
  unit: legacyUnitSchema.default(Unit.G),
  price: asNumber.catch(0),
  priceAmount: asNumber.optional(),       // legacy: kept for migration
  priceBasis: z.enum(['TTC', 'HT']).optional(), // legacy: kept for migration
  vatRate: asNumber.optional(),            // legacy: kept for migration
  helperVatRate: asNumber.optional(),
  needsPriceReview: z.coerce.boolean().optional(),
  needsVatReview: z.coerce.boolean().optional(), // legacy: ignored
  quantity: asNumber.catch(0),
  costPerBaseUnit: asNumber.catch(0)
}).passthrough();

const legacyRecipeIngredientSchema = z.object({
  ingredientId: asString,
  quantity: asNumber.catch(0)
}).passthrough();

const legacyRecipeSchema = z.object({
  id: asString,
  name: asString,
  ingredients: z.array(legacyRecipeIngredientSchema).default([]),
  batchYield: asNumber.catch(1),
  lossPercentage: asNumber.catch(0)
}).passthrough();

const legacyProductSchema = z.object({
  id: asString,
  name: asString,
  recipeId: asString,
  laborTimeMinutes: asNumber.catch(0),
  packagingCost: asNumber.catch(0),
  lossRate: asNumber.catch(0),
  unsoldEstimate: asNumber.catch(0),
  packagingUsedOnUnsold: z.coerce.boolean().catch(true),
  applyLossToPackaging: z.coerce.boolean().catch(false),
  targetMargin: asNumber.catch(0),
  estimatedMonthlySales: asNumber.catch(0),
  category: asString.catch('Autre'),
  tvaRate: asNumber.optional(),             // legacy: dropped during migration
  standardPrice: asNumber.optional()
}).passthrough();

const legacyFixedCostSchema = z.object({
  id: asString,
  name: asString,
  amount: asNumber.catch(0)
}).passthrough();

const legacySettingsSchema = z.object({
  currency: asString.catch('EUR'),
  hourlyRate: asNumber.catch(0),
  // New fields
  pricingMode: z.enum(['margin', 'salary']).catch('margin'),
  salaryTarget: asNumber.catch(0),
  // Legacy field: kept for migration
  includeLaborInCost: z.coerce.boolean().optional(),
  fixedCostItems: z.array(legacyFixedCostSchema).default([]),
  taxRate: asNumber.catch(0),
  isTvaSubject: z.coerce.boolean().catch(false),
  defaultTvaRate: asNumber.catch(5.5),
  defaultIngredientVatRate: asNumber.catch(5.5), // legacy: kept for migration
  includePendingOrdersInMonthlyReport: z.coerce.boolean().catch(false)
}).passthrough();

const legacyOrderStatusSchema = z.preprocess((value) => {
  if (value === 'pending' || value === 'completed' || value === 'cancelled') return value;
  return 'pending';
}, z.enum(['pending', 'completed', 'cancelled']));

const legacyOrderSchema = z.object({
  id: asString,
  customerName: asString.catch('Client'),
  date: asString,
  items: z.array(z.object({
    productId: asString,
    quantity: asNumber.catch(0),
    unitPrice: asNumber.optional()
  }).passthrough()).default([]),
  status: legacyOrderStatusSchema,
  notes: asString.optional(),
  isTvaSubject: z.coerce.boolean().optional()
}).passthrough();

const legacyPurchaseSchema = z.object({
  id: asString,
  date: asString,
  ingredientId: asString,
  quantity: asNumber.catch(0),
  price: asNumber.catch(0),
  vatRateSnapshot: asNumber.optional(),               // legacy: kept for migration
  priceBasisSnapshot: z.enum(['TTC', 'HT']).optional() // legacy: kept for migration
}).passthrough();

const legacyProductionBatchSchema = z.object({
  id: asString,
  date: asString,
  productId: asString,
  quantity: asNumber.catch(0)
}).passthrough();

// Legacy monthly entry (old combined format)
const legacyMonthlyEntrySchema = z.object({
  productId: asString,
  quantitySold: asNumber.catch(0),
  quantityUnsold: asNumber.catch(0),
  actualPrice: asNumber.catch(0),
  isTvaSubject: z.boolean().optional()
}).passthrough();

// Legacy sale line (new separated format, accepted as-is)
const legacySaleLineSchema = z.object({
  productId: asString,
  quantity: asNumber.catch(0),
  unitPrice: asNumber.catch(0),
  isTvaSubject: z.boolean().optional()
}).passthrough();

const legacyUnsoldLineSchema = z.object({
  productId: asString,
  quantity: asNumber.catch(0)
}).passthrough();

const legacyFrozenTotalsSchema = z.object({
  totalRevenueTTC: asNumber.catch(0),
  totalRevenueHT: asNumber.catch(0),
  totalTvaCollected: asNumber.catch(0),
  foodCost: asNumber.catch(0),
  packagingCost: asNumber.catch(0),
  socialCharges: asNumber.catch(0),
  fixedCosts: asNumber.catch(0),
  grossMargin: asNumber.catch(0),
  netResult: asNumber.catch(0),
  costMode: z.union([z.literal(0), z.literal(1), z.literal(2)]).catch(0)
}).optional();

const legacyReportSchema = z.object({
  id: asString,
  monthStr: asString,
  // New separated format
  saleLines: z.array(legacySaleLineSchema).optional(),
  unsoldLines: z.array(legacyUnsoldLineSchema).optional(),
  // Legacy combined format
  sales: z.array(legacyMonthlyEntrySchema).optional(),
  actualFixedCostItems: z.array(legacyFixedCostSchema).default([]),
  actualIngredientSpend: asNumber.catch(0),
  inventory: z.array(z.object({
    ingredientId: asString,
    startStock: asNumber.catch(0),
    purchasedQuantity: asNumber.catch(0),
    endStock: asNumber.catch(0)
  }).passthrough()).default([]),
  ingredientPriceMode: z.enum(['standard', 'average', 'last']).optional(),
  frozenTotals: legacyFrozenTotalsSchema,
  totalRevenue: asNumber.catch(0),
  netResult: asNumber.catch(0),
  isLocked: z.coerce.boolean().catch(false)
}).passthrough();

export const importDataSchema = z.object({
  ingredients: z.array(legacyIngredientSchema).optional(),
  recipes: z.array(legacyRecipeSchema).optional(),
  products: z.array(legacyProductSchema).optional(),
  settings: legacySettingsSchema.optional(),
  orders: z.array(legacyOrderSchema).optional(),
  savedReports: z.array(legacyReportSchema).optional(),
  purchases: z.array(legacyPurchaseSchema).optional(),
  productionBatches: z.array(legacyProductionBatchSchema).optional()
}).passthrough();

export type AppData = z.infer<typeof appDataSchema>;
