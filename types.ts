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
  variableDeliveryCost: number;
  lossRate: number;
  targetMargin: number;
  estimatedMonthlySales: number; // Moved from global to per-product
  category: 'gateau' | 'biscuit' | 'entremet' | 'autre';
}

export interface FixedCostItem {
  id: string;
  name: string;
  amount: number;
}

export interface GlobalSettings {
  currency: string;
  hourlyRate: number;
  fixedCostItems: FixedCostItem[]; // Detailed list instead of single number
  taxRate: number;
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
  actualPrice: number;
}

export interface MonthlyReportData {
  id: string;
  monthStr: string; // YYYY-MM
  sales: MonthlyEntry[];
  actualFixedCostItems: FixedCostItem[];
  actualIngredientSpend: number;
  totalRevenue: number;
  netResult: number;
  isLocked: boolean; // If true, represents a saved archive
}
