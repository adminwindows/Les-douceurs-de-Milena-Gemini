import { AppData } from './dataSchema';
import {
  GlobalSettings,
  Ingredient,
  InventoryEntry,
  MonthlyEntry,
  MonthlyReportData,
  Order,
  OrderItem,
  Product,
  Purchase,
  UnsoldEntry
} from './types';
import { rebuildIngredientCost } from './utils';

const asFiniteNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return fallback;
};

const asNonNegativeNumber = (value: unknown, fallback: number): number => {
  const numeric = asFiniteNumber(value, fallback);
  return numeric >= 0 ? numeric : fallback;
};

const asPercentage = (value: unknown, fallback: number): number => {
  const numeric = asNonNegativeNumber(value, fallback);
  return numeric < 100 ? numeric : fallback;
};

const asMonthCostMode = (value: unknown): 0 | 1 | 2 => {
  if (value === 1 || value === 2) return value;
  return 0;
};

const asIngredientPriceMode = (value: unknown): 'average' | 'last' => {
  if (value === 'last') return 'last';
  return 'average';
};

export const normalizeSettings = (settings: GlobalSettings): GlobalSettings => ({
  ...settings,
  taxRate: asPercentage(settings.taxRate, 0),
  defaultTvaRate: asPercentage(settings.defaultTvaRate, 5.5),
  pricingStrategy: settings.pricingStrategy === 'salary' ? 'salary' : 'margin',
  targetMonthlySalary: asNonNegativeNumber(settings.targetMonthlySalary, 0),
  includePendingOrdersInMonthlyReport: settings.includePendingOrdersInMonthlyReport ?? false
});

export const normalizeIngredient = (ingredient: Ingredient): Ingredient => {
  const helperVatRate = typeof ingredient.helperVatRate === 'number' && Number.isFinite(ingredient.helperVatRate)
    ? ingredient.helperVatRate
    : undefined;

  return rebuildIngredientCost({
    id: ingredient.id,
    name: ingredient.name,
    unit: ingredient.unit,
    price: asNonNegativeNumber(ingredient.price, 0),
    quantity: asNonNegativeNumber(ingredient.quantity, 0),
    costPerBaseUnit: asNonNegativeNumber(ingredient.costPerBaseUnit, 0),
    helperVatRate
  });
};

export const normalizePurchase = (purchase: Purchase): Purchase => ({
  id: purchase.id,
  date: purchase.date,
  ingredientId: purchase.ingredientId,
  quantity: asNonNegativeNumber(purchase.quantity, 0),
  price: asNonNegativeNumber(purchase.price, 0)
});

export const normalizeProduct = (product: Product): Product => ({
  id: product.id,
  name: product.name,
  recipeId: product.recipeId,
  packagingCost: asNonNegativeNumber(product.packagingCost, 0),
  lossRate: asPercentage(product.lossRate, 0),
  unsoldEstimate: asNonNegativeNumber(product.unsoldEstimate, 0),
  packagingUsedOnUnsold: product.packagingUsedOnUnsold ?? true,
  applyLossToPackaging: product.applyLossToPackaging ?? false,
  targetMargin: asNonNegativeNumber(product.targetMargin, 0),
  standardPrice: typeof product.standardPrice === 'number' && Number.isFinite(product.standardPrice)
    ? asNonNegativeNumber(product.standardPrice, 0)
    : undefined,
  estimatedMonthlySales: asNonNegativeNumber(product.estimatedMonthlySales, 0),
  category: product.category || 'Autre'
});

const normalizeOrderItem = (item: OrderItem, productsById: Map<string, Product>): OrderItem => {
  const product = productsById.get(item.productId);
  const defaultPrice = asNonNegativeNumber(product?.standardPrice, 0);

  return {
    productId: item.productId,
    quantity: asNonNegativeNumber(item.quantity, 0),
    price: asNonNegativeNumber(item.price, defaultPrice)
  };
};

export const normalizeOrder = (
  order: Order,
  settings: GlobalSettings,
  productsById: Map<string, Product>
): Order => ({
  id: order.id,
  customerName: order.customerName || 'Client',
  date: order.date,
  items: (order.items ?? []).map(item => normalizeOrderItem(item, productsById)),
  tvaRate: asPercentage(
    (order as unknown as { tvaRate?: number }).tvaRate,
    settings.isTvaSubject ? settings.defaultTvaRate : 0
  ),
  status: order.status,
  notes: order.notes
});

const aggregateLegacyUnsold = (sales: Array<MonthlyEntry & { quantityUnsold?: number }>): UnsoldEntry[] => {
  const unsoldByProduct = new Map<string, number>();

  sales.forEach((line) => {
    const quantityUnsold = asNonNegativeNumber(line.quantityUnsold, 0);
    if (quantityUnsold <= 0) return;
    unsoldByProduct.set(line.productId, (unsoldByProduct.get(line.productId) ?? 0) + quantityUnsold);
  });

  return Array.from(unsoldByProduct.entries()).map(([productId, quantityUnsold]) => ({
    productId,
    quantityUnsold
  }));
};

const normalizeSales = (
  rawSales: Array<MonthlyEntry & { isTvaSubject?: boolean; quantityUnsold?: number }>,
  settings: GlobalSettings
): MonthlyEntry[] => (
  rawSales.map((sale, index) => {
    const rawTvaRate = typeof sale.tvaRate === 'number' && Number.isFinite(sale.tvaRate)
      ? sale.tvaRate
      : undefined;

    let tvaRate: number | undefined = rawTvaRate;
    if (tvaRate === undefined) {
      if ((sale as { isTvaSubject?: boolean }).isTvaSubject === true) {
        tvaRate = settings.defaultTvaRate;
      } else if ((sale as { isTvaSubject?: boolean }).isTvaSubject === false) {
        tvaRate = 0;
      }
    }

    return {
      id: sale.id || `legacy-sale-${index}`,
      productId: sale.productId,
      quantitySold: asNonNegativeNumber(sale.quantitySold, 0),
      actualPrice: asNonNegativeNumber(sale.actualPrice, 0),
      tvaRate
    };
  })
);

const normalizeUnsold = (
  rawUnsold: UnsoldEntry[] | undefined,
  rawSales: Array<MonthlyEntry & { quantityUnsold?: number }>
): UnsoldEntry[] => {
  if (rawUnsold && rawUnsold.length > 0) {
    return rawUnsold.map((entry) => ({
      productId: entry.productId,
      quantityUnsold: asNonNegativeNumber(entry.quantityUnsold, 0)
    }));
  }

  return aggregateLegacyUnsold(rawSales);
};

const normalizeInventory = (inventory: InventoryEntry[] | undefined): InventoryEntry[] => (
  (inventory ?? []).map((item) => ({
    ingredientId: item.ingredientId,
    startStock: asNonNegativeNumber(item.startStock, 0),
    purchasedQuantity: asNonNegativeNumber(item.purchasedQuantity, 0),
    endStock: asNonNegativeNumber(item.endStock, 0)
  }))
);

export const normalizeMonthlyReport = (
  report: MonthlyReportData,
  settings: GlobalSettings
): MonthlyReportData => {
  const rawSales = (report.sales ?? []) as Array<MonthlyEntry & { isTvaSubject?: boolean; quantityUnsold?: number }>;
  const sales = normalizeSales(rawSales, settings);
  const unsold = normalizeUnsold((report as unknown as { unsold?: UnsoldEntry[] }).unsold, rawSales);
  const actualFixedCostItems = (report.actualFixedCostItems ?? []).map(item => ({
    id: item.id,
    name: item.name,
    amount: asNonNegativeNumber(item.amount, 0)
  }));

  const fallbackRevenueTTC = asNonNegativeNumber((report as unknown as { totalRevenue?: number }).totalRevenue, 0);
  const fallbackActualFixedCosts = actualFixedCostItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    id: report.id,
    monthStr: report.monthStr,
    sales,
    unsold,
    actualFixedCostItems,
    actualIngredientSpend: asNonNegativeNumber(report.actualIngredientSpend, 0),
    inventory: normalizeInventory(report.inventory),
    costMode: asMonthCostMode((report as unknown as { costMode?: number }).costMode),
    ingredientPriceMode: asIngredientPriceMode((report as unknown as { ingredientPriceMode?: string }).ingredientPriceMode),
    totalRevenueTTC: asNonNegativeNumber((report as unknown as { totalRevenueTTC?: number }).totalRevenueTTC, fallbackRevenueTTC),
    totalRevenueHT: asNonNegativeNumber((report as unknown as { totalRevenueHT?: number }).totalRevenueHT, fallbackRevenueTTC),
    totalTvaCollected: asNonNegativeNumber((report as unknown as { totalTvaCollected?: number }).totalTvaCollected, 0),
    finalFoodCost: asNonNegativeNumber((report as unknown as { finalFoodCost?: number }).finalFoodCost, 0),
    totalPackagingCost: asNonNegativeNumber((report as unknown as { totalPackagingCost?: number }).totalPackagingCost, 0),
    totalSocialCharges: asNonNegativeNumber((report as unknown as { totalSocialCharges?: number }).totalSocialCharges, 0),
    actualFixedCosts: asNonNegativeNumber((report as unknown as { actualFixedCosts?: number }).actualFixedCosts, fallbackActualFixedCosts),
    netResult: asFiniteNumber(report.netResult, 0),
    isLocked: report.isLocked ?? false
  };
};

export const normalizeAppData = (data: AppData): AppData => {
  const settings = normalizeSettings(data.settings as GlobalSettings);
  const ingredients = data.ingredients.map((ingredient) => normalizeIngredient(ingredient as Ingredient));
  const products = data.products.map(normalizeProduct);
  const productsById = new Map(products.map(product => [product.id, product]));

  return {
    ...data,
    settings,
    ingredients,
    products,
    orders: data.orders.map((order) => normalizeOrder(order as Order, settings, productsById)),
    purchases: data.purchases.map((purchase) => normalizePurchase(purchase as Purchase)),
    savedReports: data.savedReports.map((report) => normalizeMonthlyReport(report as MonthlyReportData, settings))
  };
};
