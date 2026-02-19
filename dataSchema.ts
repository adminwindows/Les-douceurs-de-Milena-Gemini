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
  standardPrice: z.number().optional(),
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
  includePendingOrdersInMonthlyReport: z.boolean().optional(),
  pricingMode: z.enum(['margin', 'salary']).optional(),
  targetMonthlySalary: z.number().optional()
});

const orderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number(),
  price: z.number()
});

const orderSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  date: z.string(),
  items: z.array(orderItemSchema),
  status: z.enum(['pending', 'completed', 'cancelled']),
  notes: z.string().optional(),
  tvaRate: z.number().optional()
});

const monthlyEntrySchema = z.object({
  id: z.string().optional(),
  productId: z.string(),
  quantitySold: z.number(),
  actualPrice: z.number(),
  quantityUnsold: z.number().optional(),
  tvaRate: z.number().optional(),
  isTvaSubject: z.boolean().optional(),
  source: z.enum(['loaded', 'new']).optional()
});

const unsoldEntrySchema = z.object({
  id: z.string().optional(),
  productId: z.string(),
  quantityUnsold: z.number(),
  source: z.enum(['loaded', 'new']).optional()
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
  totalRevenue: z.number(),
  totalRevenueHT: z.number().optional(),
  totalTvaCollected: z.number().optional(),
  finalFoodCost: z.number().optional(),
  totalPackagingCost: z.number().optional(),
  totalSocialCharges: z.number().optional(),
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

const legacyOrderItemSchema = z.object({
  productId: asString,
  quantity: asNumber.catch(0),
  price: asNumber.optional()
}).passthrough();

const legacyReportSalesSchema = z.object({
  id: asString.optional(),
  productId: asString,
  quantitySold: asNumber.catch(0),
  quantityUnsold: asNumber.optional(),
  actualPrice: asNumber.catch(0),
  tvaRate: asNumber.optional(),
  source: z.enum(['loaded', 'new']).optional()
}).passthrough();

export const importDataSchema = z.object({
  ingredients: z.array(z.object({
    id: asString,
    name: asString,
    unit: legacyUnitSchema.default(Unit.G),
    price: asNumber.catch(0),
    quantity: asNumber.catch(0),
    costPerBaseUnit: asNumber.catch(0),
    helperVatRate: asNumber.optional(),
    needsPriceReview: z.coerce.boolean().optional()
  }).passthrough()).optional(),
  recipes: z.array(z.object({
    id: asString,
    name: asString,
    ingredients: z.array(z.object({ ingredientId: asString, quantity: asNumber.catch(0) }).passthrough()).default([]),
    batchYield: asNumber.catch(1),
    lossPercentage: asNumber.catch(0)
  }).passthrough()).optional(),
  products: z.array(z.object({
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
    standardPrice: asNumber.optional(),
    tvaRate: asNumber.optional()
  }).passthrough()).optional(),
  settings: z.object({
    currency: asString.catch('EUR'),
    hourlyRate: asNumber.catch(0),
    includeLaborInCost: z.coerce.boolean().catch(true),
    fixedCostItems: z.array(z.object({ id: asString, name: asString, amount: asNumber.catch(0) }).passthrough()).default([]),
    taxRate: asNumber.catch(0),
    isTvaSubject: z.coerce.boolean().catch(false),
    defaultTvaRate: asNumber.catch(5.5),
    includePendingOrdersInMonthlyReport: z.coerce.boolean().catch(false),
    pricingMode: z.enum(['margin', 'salary']).optional(),
    targetMonthlySalary: asNumber.optional()
  }).passthrough().optional(),
  orders: z.array(z.object({
    id: asString,
    customerName: asString.catch('Client'),
    date: asString,
    items: z.array(legacyOrderItemSchema).default([]),
    status: z.enum(['pending', 'completed', 'cancelled']).catch('pending'),
    notes: asString.optional(),
    tvaRate: asNumber.optional()
  }).passthrough()).optional(),
  savedReports: z.array(z.object({
    id: asString,
    monthStr: asString,
    sales: z.array(legacyReportSalesSchema).default([]),
    unsold: z.array(z.object({ id: asString.optional(), productId: asString, quantityUnsold: asNumber.catch(0), source: z.enum(['loaded', 'new']).optional() }).passthrough()).optional(),
    actualFixedCostItems: z.array(z.object({ id: asString, name: asString, amount: asNumber.catch(0) }).passthrough()).default([]),
    actualIngredientSpend: asNumber.catch(0),
    inventory: z.array(z.object({ ingredientId: asString, startStock: asNumber.catch(0), purchasedQuantity: asNumber.catch(0), endStock: asNumber.catch(0) }).passthrough()).default([]),
    totalRevenue: asNumber.catch(0),
    totalRevenueHT: asNumber.optional(),
    totalTvaCollected: asNumber.optional(),
    finalFoodCost: asNumber.optional(),
    totalPackagingCost: asNumber.optional(),
    totalSocialCharges: asNumber.optional(),
    netResult: asNumber.catch(0),
    isLocked: z.coerce.boolean().catch(false)
  }).passthrough()).optional(),
  purchases: z.array(z.object({ id: asString, date: asString, ingredientId: asString, quantity: asNumber.catch(0), price: asNumber.catch(0) }).passthrough()).optional(),
  productionBatches: z.array(z.object({ id: asString, date: asString, productId: asString, quantity: asNumber.catch(0) }).passthrough()).optional()
}).passthrough();

export type AppData = z.infer<typeof appDataSchema>;
