
export enum Unit {
  G = 'g',
  KG = 'kg',
  ML = 'ml',
  L = 'L',
  PIECE = 'pièce'
}

export interface Ingredient {
  id: string;
  name: string;
  unit: Unit;
  price: number; // Prix HT pour 1 unité de stock (seule base stockée)
  quantity: number; // Stock théorique actuel (calculé ou saisi manuellement pour l'initialisation)
  costPerBaseUnit: number;
  helperVatRate?: number; // UI-only: last TVA rate used in TTC→HT converter (prefill convenience)
  needsPriceReview?: boolean; // One-time migration flag: price was auto-converted from TTC to HT
}

// Nouveau : Journal des achats pour gérer les variations de prix
export interface Purchase {
  id: string;
  date: string;
  ingredientId: string;
  quantity: number; // Quantité achetée (dans l'unité de l'ingrédient)
  price: number; // Prix TOTAL HT payé pour cette quantité
}

// Nouveau : Journal de production pour déstocker les ingrédients
export interface ProductionBatch {
  id: string;
  date: string;
  productId: string;
  quantity: number; // Nombre d'unités produites
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  batchYield: number;
  lossPercentage: number;
}

export interface Product {
  id: string;
  name: string;
  recipeId: string;
  laborTimeMinutes: number;
  packagingCost: number;
  lossRate: number; // Taux de perte fabrication (cassé, raté)
  unsoldEstimate: number; // Nombre d'unités invendues (produits finis)
  packagingUsedOnUnsold: boolean; // Est-ce qu'on emballe les invendus ?
  applyLossToPackaging?: boolean;
  targetMargin: number;
  estimatedMonthlySales: number;
  category: string;
  standardPrice?: number; // Prix de vente réel fixé par l'utilisateur (TTC si TVA, net sinon)
}

export interface FixedCostItem {
  id: string;
  name: string;
  amount: number;
}

export type PricingMode = 'margin' | 'salary';

export interface GlobalSettings {
  currency: string;
  hourlyRate: number;
  pricingMode: PricingMode; // 'margin' = MO incluse + marge, 'salary' = MO exclue + objectif salaire
  salaryTarget: number; // Objectif salaire mensuel net (mode salary)
  fixedCostItems: FixedCostItem[];
  taxRate: number; // Cotisations sociales
  isTvaSubject: boolean; // Assujetti à la TVA ?
  defaultTvaRate: number; // Taux TVA ventes par défaut (ex: 5.5)
  includePendingOrdersInMonthlyReport?: boolean;
}

// --- Orders & Reporting ---

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice?: number; // Prix unitaire snapshot au moment de la commande
}

export interface Order {
  id: string;
  customerName: string;
  date: string; // YYYY-MM-DD
  items: OrderItem[];
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  isTvaSubject?: boolean; // TVA snapshot at order creation
}

// --- Monthly Report: separated lines ---

export interface SaleLine {
  productId: string;
  quantity: number;
  unitPrice: number; // TTC si TVA au moment du snapshot, net sinon
  isTvaSubject?: boolean; // TVA mode snapshot
}

export interface UnsoldLine {
  productId: string;
  quantity: number;
}

// Legacy: kept for backward compatibility during import/migration
export interface MonthlyEntry {
  productId: string;
  quantitySold: number;
  quantityUnsold: number;
  actualPrice: number;
  isTvaSubject?: boolean;
}

export interface InventoryEntry {
  ingredientId: string;
  startStock: number;
  purchasedQuantity: number;
  endStock: number;
}

export interface FrozenReportTotals {
  totalRevenueTTC: number;
  totalRevenueHT: number;
  totalTvaCollected: number;
  foodCost: number;
  packagingCost: number;
  socialCharges: number;
  fixedCosts: number;
  grossMargin: number;
  netResult: number;
  costMode: 0 | 1 | 2;
}

export interface MonthlyReportData {
  id: string;
  monthStr: string; // YYYY-MM
  saleLines: SaleLine[];
  unsoldLines: UnsoldLine[];
  actualFixedCostItems: FixedCostItem[];
  actualIngredientSpend: number;
  inventory: InventoryEntry[];
  ingredientPriceMode?: 'standard' | 'average' | 'last';
  frozenTotals?: FrozenReportTotals;
  totalRevenue: number; // Compat: TTC revenue
  netResult: number;
  isLocked: boolean;
}
