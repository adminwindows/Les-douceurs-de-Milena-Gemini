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
  price: number; // Prix HT pour 1 unite de stock (seule base stockee)
  quantity: number; // Stock theorique actuel (calcule ou saisi manuellement pour l'initialisation)
  costPerBaseUnit: number;
  helperVatRate?: number; // UI-only: last TVA rate used in TTC->HT converter (prefill convenience)
}

// Journal des achats pour gerer les variations de prix
export interface Purchase {
  id: string;
  date: string;
  ingredientId: string;
  quantity: number; // Quantite achetee (dans l'unite de l'ingredient)
  price: number; // Prix TOTAL HT paye pour cette quantite
}

// Journal de production pour destocker les ingredients
export interface ProductionBatch {
  id: string;
  date: string;
  productId: string;
  quantity: number; // Nombre d'unites produites
  sourceOrderId?: string; // Optionnel: commande d'origine quand lance depuis "Commandes"
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
  lossRate: number; // Taux de perte fabrication (casse, rate)
  unsoldEstimate: number; // Nombre d'unites invendues (produits finis)
  packagingUsedOnUnsold: boolean; // Est-ce qu'on emballe les invendus ?
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
  isTvaSubject: boolean; // Assujetti a la TVA ?
  defaultTvaRate: number; // Taux TVA ventes par defaut (ex: 5.5)
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
  productionLaunchedAt?: string; // Horodatage du dernier envoi vers la production
}

export interface MonthlyEntry {
  id: string;
  productId: string;
  quantitySold: number; // Quantite vendue sur cette ligne (meme produit possible sur plusieurs lignes)
  actualPrice: number; // Prix de vente unitaire reellement pratique
  tvaRate?: number; // Taux de TVA applique a cette ligne; undefined pour anciennes lignes sans info
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
