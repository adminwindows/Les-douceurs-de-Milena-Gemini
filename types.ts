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
  price: number;
  quantity: number;
  costPerBaseUnit: number;
  helperVatRate?: number;
  needsPriceReview?: boolean;
}

export interface Purchase {
  id: string;
  date: string;
  ingredientId: string;
  quantity: number;
  price: number;
}

export interface ProductionBatch {
  id: string;
  date: string;
  productId: string;
  quantity: number;
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
  lossRate: number;
  unsoldEstimate: number;
  packagingUsedOnUnsold: boolean;
  applyLossToPackaging?: boolean;
  targetMargin: number;
  estimatedMonthlySales: number;
  category: string;
  standardPrice?: number;
  tvaRate?: number;
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
  taxRate: number;
  isTvaSubject: boolean;
  defaultTvaRate: number;
  includePendingOrdersInMonthlyReport?: boolean;
  pricingMode?: 'margin' | 'salary';
  targetMonthlySalary?: number;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerName: string;
  date: string;
  items: OrderItem[];
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  tvaRate?: number;
}

export interface MonthlyEntry {
  id?: string;
  productId: string;
  quantitySold: number;
  actualPrice: number;
  quantityUnsold?: number;
  tvaRate?: number;
  isTvaSubject?: boolean;
  source?: 'loaded' | 'new';
}

export interface UnsoldEntry {
  id?: string;
  productId: string;
  quantityUnsold: number;
  source?: 'loaded' | 'new';
}

export interface InventoryEntry {
  ingredientId: string;
  startStock: number;
  purchasedQuantity: number;
  endStock: number;
}

export interface MonthlyReportData {
  id: string;
  monthStr: string;
  sales: MonthlyEntry[];
  unsold: UnsoldEntry[];
  actualFixedCostItems: FixedCostItem[];
  actualIngredientSpend: number;
  inventory: InventoryEntry[];
  totalRevenue: number;
  totalRevenueHT?: number;
  totalTvaCollected?: number;
  finalFoodCost?: number;
  totalPackagingCost?: number;
  totalSocialCharges?: number;
  netResult: number;
  isLocked: boolean;
}
