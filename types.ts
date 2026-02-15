
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
  packagingUsedOnUnsold: boolean; // Nouveau: Est-ce qu'on emballe les invendus ?
  applyLossToPackaging?: boolean;
  targetMargin: number;
  estimatedMonthlySales: number; 
  category: string;
  tvaRate?: number; // Nouveau: Taux de TVA spécifique au produit
}

export interface FixedCostItem {
  id: string;
  name: string;
  amount: number;
}

export interface GlobalSettings {
  currency: string;
  hourlyRate: number;
  includeLaborInCost: boolean;
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
}

export interface Order {
  id: string;
  customerName: string;
  date: string; // YYYY-MM-DD
  items: OrderItem[];
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
}

export interface MonthlyEntry {
  productId: string;
  quantitySold: number;
  quantityUnsold: number; // Invendus réels du mois
  actualPrice: number; // Prix de vente unitaire (TTC si assujetti)
}

export interface InventoryEntry {
  ingredientId: string;
  startStock: number; // Quantity
  purchasedQuantity: number; // Quantity added this month
  endStock: number; // Quantity counted at end of month
}

export interface MonthlyReportData {
  id: string;
  monthStr: string; // YYYY-MM
  sales: MonthlyEntry[];
  actualFixedCostItems: FixedCostItem[];
  actualIngredientSpend: number; // Method 2: Total cash spent
  inventory: InventoryEntry[]; // Method 3: Stock variation
  totalRevenue: number;
  netResult: number;
  isLocked: boolean; 
}
