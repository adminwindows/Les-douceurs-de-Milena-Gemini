import { z } from 'zod';
import { Unit } from './types';

const unitSchema = z.nativeEnum(Unit);

const ingredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: unitSchema,
  price: z.number(),
  priceAmount: z.number().optional(),
  priceBasis: z.enum(['TTC', 'HT']).optional(),
  vatRate: z.number().optional(),
  needsVatReview: z.boolean().optional(),
  quantity: z.number(),
  costPerBaseUnit: z.number()
});

const purchaseSchema = z.object({
  id: z.string(),
  date: z.string(),
  ingredientId: z.string(),
  quantity: z.number(),
  price: z.number(),
  vatRateSnapshot: z.number().optional(),
  priceBasisSnapshot: z.enum(['TTC', 'HT']).optional()
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
  tvaRate: z.number().optional()
});

const fixedCostItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number()
});

const globalSettingsSchema = z.object({
  currency: z.string(),
  hourlyRate: z.number(),
  includeLaborInCost: z.boolean().default(true),
  fixedCostItems: z.array(fixedCostItemSchema),
  taxRate: z.number(),
  isTvaSubject: z.boolean(),
  defaultTvaRate: z.number(),
  defaultIngredientVatRate: z.number().optional(),
  includePendingOrdersInMonthlyReport: z.boolean().optional()
});

const orderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number()
});

const orderSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  date: z.string(),
  items: z.array(orderItemSchema),
  status: z.enum(['pending', 'completed', 'cancelled']),
  notes: z.string().optional()
});

const monthlyEntrySchema = z.object({
  productId: z.string(),
  quantitySold: z.number(),
  quantityUnsold: z.number(),
  actualPrice: z.number()
});

const inventoryEntrySchema = z.object({
  ingredientId: z.string(),
  startStock: z.number(),
  purchasedQuantity: z.number(),
  endStock: z.number()
});

const monthlyReportSchema = z.object({
  id: z.string(),
  monthStr: z.string(),
  sales: z.array(monthlyEntrySchema),
  actualFixedCostItems: z.array(fixedCostItemSchema),
  actualIngredientSpend: z.number(),
  inventory: z.array(inventoryEntrySchema),
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
  priceAmount: asNumber.optional(),
  priceBasis: z.enum(['TTC', 'HT']).optional(),
  vatRate: asNumber.optional(),
  needsVatReview: z.coerce.boolean().optional(),
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
  tvaRate: asNumber.optional()
}).passthrough();

const legacyFixedCostSchema = z.object({
  id: asString,
  name: asString,
  amount: asNumber.catch(0)
}).passthrough();

const legacySettingsSchema = z.object({
  currency: asString.catch('EUR'),
  hourlyRate: asNumber.catch(0),
  includeLaborInCost: z.coerce.boolean().catch(true),
  fixedCostItems: z.array(legacyFixedCostSchema).default([]),
  taxRate: asNumber.catch(0),
  isTvaSubject: z.coerce.boolean().catch(false),
  defaultTvaRate: asNumber.catch(5.5),
  defaultIngredientVatRate: asNumber.catch(5.5),
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
    quantity: asNumber.catch(0)
  }).passthrough()).default([]),
  status: legacyOrderStatusSchema,
  notes: asString.optional()
}).passthrough();

const legacyPurchaseSchema = z.object({
  id: asString,
  date: asString,
  ingredientId: asString,
  quantity: asNumber.catch(0),
  price: asNumber.catch(0),
  vatRateSnapshot: asNumber.optional(),
  priceBasisSnapshot: z.enum(['TTC', 'HT']).optional()
}).passthrough();

const legacyProductionBatchSchema = z.object({
  id: asString,
  date: asString,
  productId: asString,
  quantity: asNumber.catch(0)
}).passthrough();

const legacyReportSchema = z.object({
  id: asString,
  monthStr: asString,
  sales: z.array(z.object({
    productId: asString,
    quantitySold: asNumber.catch(0),
    quantityUnsold: asNumber.catch(0),
    actualPrice: asNumber.catch(0)
  }).passthrough()).default([]),
  actualFixedCostItems: z.array(legacyFixedCostSchema).default([]),
  actualIngredientSpend: asNumber.catch(0),
  inventory: z.array(z.object({
    ingredientId: asString,
    startStock: asNumber.catch(0),
    purchasedQuantity: asNumber.catch(0),
    endStock: asNumber.catch(0)
  }).passthrough()).default([]),
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
