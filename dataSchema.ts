import { z } from 'zod';
import { Unit } from './types';

const unitSchema = z.nativeEnum(Unit);

const ingredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: unitSchema,
  price: z.number(),
  quantity: z.number(),
  costPerBaseUnit: z.number()
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
  variableDeliveryCost: z.number(),
  lossRate: z.number(),
  unsoldEstimate: z.number(),
  packagingUsedOnUnsold: z.boolean(),
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
  fixedCostItems: z.array(fixedCostItemSchema),
  taxRate: z.number(),
  isTvaSubject: z.boolean(),
  defaultTvaRate: z.number()
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

export const importDataSchema = appDataSchema.partial();

export type AppData = z.infer<typeof appDataSchema>;
