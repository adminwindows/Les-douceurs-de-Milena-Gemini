import { AppData } from './dataSchema';
import { GlobalSettings, Ingredient, MonthlyEntry, MonthlyReportData, Order, Product, Purchase, UnsoldEntry } from './types';
import { rebuildIngredientCost } from './utils';

export const normalizeSettings = (settings: GlobalSettings): GlobalSettings => ({
  ...settings,
  includePendingOrdersInMonthlyReport: settings.includePendingOrdersInMonthlyReport ?? false,
  pricingMode: settings.pricingMode ?? 'margin',
  targetMonthlySalary: settings.targetMonthlySalary ?? 0
});

export const normalizeIngredient = (ingredient: Ingredient, _settings?: GlobalSettings): Ingredient => {
  const normalized: Ingredient = {
    id: ingredient.id,
    name: ingredient.name,
    unit: ingredient.unit,
    price: ingredient.price ?? 0,
    quantity: ingredient.quantity ?? 0,
    costPerBaseUnit: ingredient.costPerBaseUnit ?? 0,
    helperVatRate: ingredient.helperVatRate
  };

  return rebuildIngredientCost(normalized);
};

export const normalizePurchase = (purchase: Purchase): Purchase => ({
  id: purchase.id,
  date: purchase.date,
  ingredientId: purchase.ingredientId,
  quantity: purchase.quantity,
  price: purchase.price
});

export const normalizeProduct = (product: Product): Product => ({
  ...product,
  applyLossToPackaging: product.applyLossToPackaging ?? false,
  standardPrice: product.standardPrice
});

const normalizeOrder = (order: Order, settings: GlobalSettings): Order => ({
  ...order,
  tvaRate: typeof order.tvaRate === 'number' ? order.tvaRate : (settings.isTvaSubject ? settings.defaultTvaRate : 0),
  items: (order.items || []).map(item => ({
    ...item,
    price: typeof item.price === 'number' ? item.price : 0
  }))
});

const normalizeSavedReport = (report: MonthlyReportData): MonthlyReportData => {
  const sales: MonthlyEntry[] = (report.sales || []).map((entry, index) => ({
    id: entry.id ?? `${entry.productId}-${index}`,
    productId: entry.productId,
    quantitySold: entry.quantitySold ?? 0,
    actualPrice: entry.actualPrice ?? 0,
    tvaRate: entry.tvaRate,
    source: 'loaded'
  }));

  const unsold: UnsoldEntry[] = report.unsold
    ? report.unsold.map((entry, index) => ({
      id: entry.id ?? `${entry.productId}-u-${index}`,
      productId: entry.productId,
      quantityUnsold: entry.quantityUnsold ?? 0,
      source: 'loaded'
    }))
    : sales.map((entry, index) => ({
      id: `${entry.productId}-legacy-u-${index}`,
      productId: entry.productId,
      quantityUnsold: (report.sales[index] as any)?.quantityUnsold ?? 0,
      source: 'loaded'
    }));

  return {
    ...report,
    sales,
    unsold,
    totalRevenueHT: report.totalRevenueHT ?? report.totalRevenue,
    totalTvaCollected: report.totalTvaCollected ?? 0,
    finalFoodCost: report.finalFoodCost ?? 0,
    totalPackagingCost: report.totalPackagingCost ?? 0,
    totalSocialCharges: report.totalSocialCharges ?? 0
  };
};

export const normalizeAppData = (data: AppData): AppData => {
  const settings = normalizeSettings(data.settings as GlobalSettings);

  return {
    ...data,
    settings,
    ingredients: data.ingredients.map((ingredient) => normalizeIngredient(ingredient as Ingredient)),
    products: data.products.map(normalizeProduct),
    purchases: data.purchases.map((purchase) => normalizePurchase(purchase as Purchase)),
    orders: data.orders.map((order) => normalizeOrder(order as Order, settings)),
    savedReports: data.savedReports.map((report) => normalizeSavedReport(report as MonthlyReportData))
  };
};
