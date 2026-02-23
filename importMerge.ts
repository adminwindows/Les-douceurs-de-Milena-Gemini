import { BackupSelection } from './backupIO';
import { AppData } from './dataSchema';
import {
  normalizeAppData,
  normalizeIngredient,
  normalizeMonthlyReport,
  normalizeOrder,
  normalizeProduct,
  normalizeProductionBatch,
  normalizePurchase,
  normalizeSettings
} from './dataMigrations';
import { GlobalSettings, MonthlyReportData, Order, Product, ProductionBatch, Purchase } from './types';

export interface ImportMergeResult {
  mergedData: AppData;
  importedSections: string[];
}

export const mergeImportedAppData = (
  currentData: AppData,
  importedData: Partial<AppData>,
  selection: BackupSelection
): ImportMergeResult => {
  const importedSections: string[] = [];
  const currentSettings = normalizeSettings(currentData.settings as GlobalSettings);

  const mergedSettings: GlobalSettings = selection.settings && importedData.settings
    ? normalizeSettings(importedData.settings as GlobalSettings)
    : currentSettings;
  if (selection.settings && importedData.settings) importedSections.push('Paramètres');

  const mergedIngredients = selection.catalog && importedData.ingredients
    ? importedData.ingredients.map(normalizeIngredient)
    : currentData.ingredients;
  if (selection.catalog && importedData.ingredients) importedSections.push('Ingrédients');

  const mergedProducts = selection.catalog && importedData.products
    ? (importedData.products as Product[]).map(normalizeProduct)
    : (currentData.products as Product[]).map(normalizeProduct);
  if (selection.catalog && importedData.products) importedSections.push('Produits');

  const productsById = new Map(mergedProducts.map((product): [string, Product] => [product.id, product]));

  const mergedOrders = selection.operations && importedData.orders
    ? (importedData.orders as Order[]).map(order => normalizeOrder(order, mergedSettings, productsById))
    : currentData.orders;
  if (selection.operations && importedData.orders) importedSections.push('Commandes');

  const mergedReports = selection.reports && importedData.savedReports
    ? (importedData.savedReports as MonthlyReportData[]).map(report => normalizeMonthlyReport(report, mergedSettings))
    : currentData.savedReports;
  if (selection.reports && importedData.savedReports) importedSections.push('Bilans archivés');

  const mergedPurchases = selection.operations && importedData.purchases
    ? (importedData.purchases as Purchase[]).map(normalizePurchase)
    : currentData.purchases;
  if (selection.operations && importedData.purchases) importedSections.push('Achats');

  const mergedProductionBatches = selection.operations && importedData.productionBatches
    ? (importedData.productionBatches as ProductionBatch[]).map(normalizeProductionBatch)
    : currentData.productionBatches;
  if (selection.operations && importedData.productionBatches) importedSections.push('Production');

  const mergedData = normalizeAppData({
    ingredients: mergedIngredients,
    recipes: selection.catalog && importedData.recipes ? importedData.recipes : currentData.recipes,
    products: mergedProducts,
    settings: mergedSettings,
    orders: mergedOrders,
    savedReports: mergedReports,
    purchases: mergedPurchases,
    productionBatches: mergedProductionBatches
  });
  if (selection.catalog && importedData.recipes) importedSections.push('Recettes');

  return {
    mergedData,
    importedSections
  };
};
