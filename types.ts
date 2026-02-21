
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
  packagingCost: number;
  lossRate: number; // Taux de perte fabrication (cassé, raté)
  unsoldEstimate: number; // Nombre d'unités invendues (produits finis)
  packagingUsedOnUnsold: boolean; // Nouveau: Est-ce qu'on emballe les invendus ?
  applyLossToPackaging?: boolean;
  targetMargin: number;
  standardPrice?: number; // Prix de vente standard choisi par l'utilisateur
  estimatedMonthlySales: number; 
  category: string;
}

export interface FixedCostItem {
  id: string;
  name: string;
  amount: number;
}

export interface GlobalSettings {
  currency: string;
  fixedCostItems: FixedCostItem[];
  taxRate: number; // Cotisations sociales
  isTvaSubject: boolean; // Assujetti à la TVA ?
  defaultTvaRate: number; // Taux TVA ventes par défaut (ex: 5.5)
  pricingStrategy: 'margin' | 'salary';
  targetMonthlySalary: number;
  includePendingOrdersInMonthlyReport?: boolean;
}

// --- Orders & Reporting ---

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerName: string;
  date: string; // YYYY-MM-DD
  items: OrderItem[];
  tvaRate: number; // Un seul taux de TVA pour toute la commande
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
}

export interface MonthlyEntry {
  id: string;
  productId: string;
  quantitySold: number; // Quantité vendue sur cette ligne (même produit possible sur plusieurs lignes)
  actualPrice: number; // Prix de vente unitaire réellement pratiqué
  tvaRate?: number; // Taux de TVA appliqué à cette ligne; undefined pour anciennes lignes sans info
}

export interface UnsoldEntry {
  productId: string;
  quantityUnsold: number;
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
  unsold: UnsoldEntry[];
  actualFixedCostItems: FixedCostItem[];
  actualIngredientSpend: number; // Method 2: Total cash spent
  inventory: InventoryEntry[]; // Method 3: Stock variation
  costMode: 0 | 1 | 2;
  ingredientPriceMode: 'average' | 'last';
  totalRevenueTTC: number;
  totalRevenueHT: number;
  totalTvaCollected: number;
  finalFoodCost: number;
  totalPackagingCost: number;
  totalSocialCharges: number;
  actualFixedCosts: number;
  netResult: number;
  isLocked: boolean; 
}
