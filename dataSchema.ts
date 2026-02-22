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
  helperVatRate: z.number().optional()
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
  quantity: z.number(),
  sourceOrderId: z.string().optional()
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
  packagingCost: z.number(),
  lossRate: z.number(),
  unsoldEstimate: z.number(),
  packagingUsedOnUnsold: z.boolean(),
  applyLossToPackaging: z.boolean().default(false),
  targetMargin: z.number(),
  standardPrice: z.number().optional(),
  estimatedMonthlySales: z.number(),
  category: z.string()
});

const fixedCostItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number()
});

const globalSettingsSchema = z.object({
  currency: z.string(),
  fixedCostItems: z.array(fixedCostItemSchema),
  taxRate: z.number(),
  isTvaSubject: z.boolean(),
  defaultTvaRate: z.number(),
  pricingStrategy: z.enum(['margin', 'salary']).default('margin'),
  targetMonthlySalary: z.number().default(0),
  includePendingOrdersInMonthlyReport: z.boolean().optional()
});

const orderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number(),
  price: z.number().default(0)
});

const orderSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  date: z.string(),
  items: z.array(orderItemSchema),
  tvaRate: z.number().default(0),
  status: z.enum(['pending', 'completed', 'cancelled']),
  notes: z.string().optional(),
  productionLaunchedAt: z.string().optional()
});

const monthlyEntrySchema = z.object({
  id: z.string().optional(),
  productId: z.string(),
  quantitySold: z.number(),
  actualPrice: z.number(),
  tvaRate: z.number().optional(),
  quantityUnsold: z.number().optional(),
  isTvaSubject: z.boolean().optional()
});

const unsoldEntrySchema = z.object({
  productId: z.string(),
  quantityUnsold: z.number()
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
  unsold: z.array(unsoldEntrySchema).default([]),
  actualFixedCostItems: z.array(fixedCostItemSchema),
  actualIngredientSpend: z.number(),
  inventory: z.array(inventoryEntrySchema),
  costMode: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0),
  ingredientPriceMode: z.enum(['average', 'last']).default('average'),
  totalRevenue: z.number().optional(),
  totalRevenueTTC: z.number().default(0),
  totalRevenueHT: z.number().default(0),
  totalTvaCollected: z.number().default(0),
  finalFoodCost: z.number().default(0),
  totalPackagingCost: z.number().default(0),
  totalSocialCharges: z.number().default(0),
  actualFixedCosts: z.number().default(0),
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
const asBoolean = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off' || normalized === '') return false;
  }
  return value;
}, z.boolean());

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
  helperVatRate: asNumber.optional(),
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
  packagingCost: asNumber.catch(0),
  lossRate: asNumber.catch(0),
  unsoldEstimate: asNumber.catch(0),
  packagingUsedOnUnsold: asBoolean.catch(true),
  applyLossToPackaging: asBoolean.catch(false),
  targetMargin: asNumber.catch(0),
  standardPrice: asNumber.optional(),
  estimatedMonthlySales: asNumber.catch(0),
  category: asString.catch('Autre')
}).passthrough();

const legacyFixedCostSchema = z.object({
  id: asString,
  name: asString,
  amount: asNumber.catch(0)
}).passthrough();

const legacySettingsSchema = z.object({
  currency: asString.catch('EUR'),
  fixedCostItems: z.array(legacyFixedCostSchema).default([]),
  taxRate: asNumber.catch(0),
  isTvaSubject: asBoolean.catch(false),
  defaultTvaRate: asNumber.catch(5.5),
  pricingStrategy: z.enum(['margin', 'salary']).catch('margin'),
  targetMonthlySalary: asNumber.catch(0),
  includePendingOrdersInMonthlyReport: asBoolean.catch(false)
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
    price: asNumber.catch(0)
  }).passthrough()).default([]),
  tvaRate: asNumber.optional(),
  status: legacyOrderStatusSchema,
  notes: asString.optional(),
  productionLaunchedAt: asString.optional()
}).passthrough();

const legacyPurchaseSchema = z.object({
  id: asString,
  date: asString,
  ingredientId: asString,
  quantity: asNumber.catch(0),
  price: asNumber.catch(0)
}).passthrough();

const legacyProductionBatchSchema = z.object({
  id: asString,
  date: asString,
  productId: asString,
  quantity: asNumber.catch(0),
  sourceOrderId: asString.optional()
}).passthrough();

const legacyReportSchema = z.object({
  id: asString,
  monthStr: asString,
  sales: z.array(z.object({
    id: asString.optional(),
    productId: asString,
    quantitySold: asNumber.catch(0),
    actualPrice: asNumber.catch(0),
    tvaRate: asNumber.optional(),
    quantityUnsold: asNumber.optional(),
    isTvaSubject: z.boolean().optional()
  }).passthrough()).default([]),
  unsold: z.array(z.object({
    productId: asString,
    quantityUnsold: asNumber.catch(0)
  }).passthrough()).optional(),
  actualFixedCostItems: z.array(legacyFixedCostSchema).default([]),
  actualIngredientSpend: asNumber.catch(0),
  costMode: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
  ingredientPriceMode: z.enum(['average', 'last']).optional(),
  inventory: z.array(z.object({
    ingredientId: asString,
    startStock: asNumber.catch(0),
    purchasedQuantity: asNumber.catch(0),
    endStock: asNumber.catch(0)
  }).passthrough()).default([]),
  totalRevenue: asNumber.optional(),
  totalRevenueTTC: asNumber.optional(),
  totalRevenueHT: asNumber.optional(),
  totalTvaCollected: asNumber.optional(),
  finalFoodCost: asNumber.optional(),
  totalPackagingCost: asNumber.optional(),
  totalSocialCharges: asNumber.optional(),
  actualFixedCosts: asNumber.optional(),
  netResult: asNumber.catch(0),
  isLocked: asBoolean.catch(false)
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
