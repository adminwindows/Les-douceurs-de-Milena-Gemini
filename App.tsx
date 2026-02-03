
import React, { useState, useEffect } from 'react';
import { IngredientsRecettes } from './components/views/IngredientsRecettes';
import { ProductsContent } from './components/views/Products'; 
import { Analysis } from './components/views/Analysis';
import { MonthlyReport } from './components/views/MonthlyReport';
import { Settings } from './components/views/Settings';
import { Orders } from './components/views/Orders'; 
import { UserGuide } from './components/views/UserGuide'; 
import { 
  INITIAL_INGREDIENTS, 
  INITIAL_RECIPES, 
  INITIAL_PRODUCTS, 
  INITIAL_SETTINGS 
} from './utils';
import { Ingredient, Recipe, Product, GlobalSettings, Order, MonthlyReportData, Unit } from './types';
import { isFiniteNumber, isNonEmptyString, isValidNonNegativeNumber, isValidPercentage, isValidPositiveNumber } from './validation';

const App = () => {
  // Default tab is now 'guide'
  const [activeTab, setActiveTab] = useState<'settings' | 'ingredients' | 'products' | 'orders' | 'analysis' | 'report' | 'guide'>('guide');
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Apply theme class to HTML element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  // State
  const [ingredients, setIngredients] = useState<Ingredient[]>(INITIAL_INGREDIENTS);
  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [settings, setSettings] = useState<GlobalSettings>(INITIAL_SETTINGS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [savedReports, setSavedReports] = useState<MonthlyReportData[]>([]);

  // Persistence Helpers
  const exportData = () => {
    const data = { ingredients, recipes, products, settings, orders, savedReports };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_milena_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const isValidUnit = (value: unknown): value is Unit =>
          Object.values(Unit).includes(value as Unit);
        const isValidIngredient = (value: any): value is Ingredient =>
          Boolean(value)
          && isNonEmptyString(value.id)
          && isNonEmptyString(value.name)
          && isValidUnit(value.unit)
          && isValidNonNegativeNumber(value.price)
          && isValidPositiveNumber(value.quantity)
          && isValidNonNegativeNumber(value.costPerBaseUnit);
        const isValidRecipe = (value: any): value is Recipe =>
          Boolean(value)
          && isNonEmptyString(value.id)
          && isNonEmptyString(value.name)
          && Array.isArray(value.ingredients)
          && value.ingredients.every((item: any) =>
            Boolean(item)
            && isNonEmptyString(item.ingredientId)
            && isValidPositiveNumber(item.quantity)
          )
          && isValidPositiveNumber(value.batchYield)
          && isValidPercentage(value.lossPercentage);
        const isValidProduct = (value: any): value is Product =>
          Boolean(value)
          && isNonEmptyString(value.id)
          && isNonEmptyString(value.name)
          && isNonEmptyString(value.recipeId)
          && isValidNonNegativeNumber(value.laborTimeMinutes)
          && isValidNonNegativeNumber(value.packagingCost)
          && isValidNonNegativeNumber(value.variableDeliveryCost)
          && isValidPercentage(value.lossRate)
          && isValidNonNegativeNumber(value.unsoldEstimate)
          && typeof value.packagingUsedOnUnsold === 'boolean'
          && isValidNonNegativeNumber(value.targetMargin)
          && isValidNonNegativeNumber(value.estimatedMonthlySales)
          && isNonEmptyString(value.category)
          && (value.tvaRate === undefined || isValidPercentage(value.tvaRate));
        const isValidSettings = (value: any): value is GlobalSettings =>
          Boolean(value)
          && isNonEmptyString(value.currency)
          && isValidNonNegativeNumber(value.hourlyRate)
          && Array.isArray(value.fixedCostItems)
          && value.fixedCostItems.every((item: any) =>
            Boolean(item)
            && isNonEmptyString(item.id)
            && isNonEmptyString(item.name)
            && isValidNonNegativeNumber(item.amount)
          )
          && isValidPercentage(value.taxRate)
          && typeof value.isTvaSubject === 'boolean'
          && isValidPercentage(value.defaultTvaRate);
        const isValidOrder = (value: any): value is Order =>
          Boolean(value)
          && isNonEmptyString(value.id)
          && isNonEmptyString(value.customerName)
          && isNonEmptyString(value.date)
          && Array.isArray(value.items)
          && value.items.every((item: any) =>
            Boolean(item)
            && isNonEmptyString(item.productId)
            && isValidPositiveNumber(item.quantity)
          )
          && (value.status === 'pending' || value.status === 'completed' || value.status === 'cancelled')
          && (value.notes === undefined || typeof value.notes === 'string');
        const isValidMonthlyReport = (value: any): value is MonthlyReportData =>
          Boolean(value)
          && isNonEmptyString(value.id)
          && isNonEmptyString(value.monthStr)
          && Array.isArray(value.sales)
          && value.sales.every((sale: any) =>
            Boolean(sale)
            && isNonEmptyString(sale.productId)
            && isValidNonNegativeNumber(sale.quantitySold)
            && isValidNonNegativeNumber(sale.quantityUnsold)
            && isValidNonNegativeNumber(sale.actualPrice)
          )
          && Array.isArray(value.actualFixedCostItems)
          && value.actualFixedCostItems.every((item: any) =>
            Boolean(item)
            && isNonEmptyString(item.id)
            && isNonEmptyString(item.name)
            && isValidNonNegativeNumber(item.amount)
          )
          && isValidNonNegativeNumber(value.actualIngredientSpend)
          && Array.isArray(value.inventory)
          && value.inventory.every((item: any) =>
            Boolean(item)
            && isNonEmptyString(item.ingredientId)
            && isValidNonNegativeNumber(item.startStock)
            && isValidNonNegativeNumber(item.purchasedQuantity)
            && isValidNonNegativeNumber(item.endStock)
          )
          && isValidNonNegativeNumber(value.totalRevenue)
          && isFiniteNumber(value.netResult)
          && typeof value.isLocked === 'boolean';

        if (
          !json
          || (json.ingredients && (!Array.isArray(json.ingredients) || !json.ingredients.every(isValidIngredient)))
          || (json.recipes && (!Array.isArray(json.recipes) || !json.recipes.every(isValidRecipe)))
          || (json.products && (!Array.isArray(json.products) || !json.products.every(isValidProduct)))
          || (json.settings && !isValidSettings(json.settings))
          || (json.orders && (!Array.isArray(json.orders) || !json.orders.every(isValidOrder)))
          || (json.savedReports && (!Array.isArray(json.savedReports) || !json.savedReports.every(isValidMonthlyReport)))
        ) {
          alert("Le fichier importé contient des données invalides.");
          return;
        }
        if (window.confirm("Voulez-vous ÉCRASER les données actuelles (Ok) ou FUSIONNER (Annuler - non dispo MVP) ?")) {
          if (json.ingredients) setIngredients(json.ingredients);
          if (json.recipes) setRecipes(json.recipes);
          if (json.products) setProducts(json.products);
          if (json.settings) setSettings(json.settings);
          if (json.orders) setOrders(json.orders);
          if (json.savedReports) setSavedReports(json.savedReports);
          alert("Données chargées avec succès !");
        }
      } catch (err) {
        alert("Erreur lors de la lecture du fichier.");
      }
    };
    reader.readAsText(file);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'settings':
        return <Settings settings={settings} setSettings={setSettings} />;
      case 'ingredients':
        return <IngredientsRecettes 
          ingredients={ingredients} 
          setIngredients={setIngredients} 
          recipes={recipes} 
          setRecipes={setRecipes} 
        />;
      case 'products':
        return <ProductsContent 
          products={products} 
          setProducts={setProducts} 
          recipes={recipes} 
          settings={settings} 
        />;
      case 'orders':
        return <Orders 
          orders={orders} 
          setOrders={setOrders} 
          products={products} 
        />;
      case 'analysis':
        return <Analysis 
          products={products} 
          recipes={recipes} 
          ingredients={ingredients} 
          settings={settings} 
        />;
      case 'report':
        return <MonthlyReport 
          products={products} 
          settings={settings} 
          recipes={recipes}
          ingredients={ingredients}
          orders={orders}
          savedReports={savedReports}
          setSavedReports={setSavedReports}
          setSettings={setSettings}
        />;
      case 'guide':
        return <UserGuide />;
      default:
        return <UserGuide />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDF8F6] dark:bg-stone-950 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-stone-900 border-b border-rose-100 dark:border-stone-800 sticky top-0 z-20 shadow-sm no-print transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🧁</span>
              <div>
                <h1 className="text-xl font-bold text-rose-950 dark:text-rose-100 font-serif tracking-tight">Les douceurs de Miléna</h1>
                <p className="text-xs text-stone-500 dark:text-stone-400">Gestion Artisanale</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-rose-100 dark:hover:bg-stone-700 transition-colors"
                title={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              
              <label className="text-xs text-stone-400 dark:text-stone-500 cursor-pointer hover:text-stone-600 dark:hover:text-stone-300">
                📥 Charger
                <input type="file" onChange={importData} accept=".json" className="hidden" />
              </label>
              <button onClick={exportData} className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300">
                💾 Sauvegarder
              </button>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto pb-0 hide-scrollbar pt-2 border-t border-transparent dark:border-stone-800">
             {[
               { id: 'guide', label: '📖 Guide & Aide' },
               { id: 'settings', label: 'Paramètres' },
               { id: 'ingredients', label: 'Ingrédients' },
               { id: 'products', label: 'Produits' },
               { id: 'orders', label: 'Commandes' },
               { id: 'analysis', label: 'Analyse Prix' },
               { id: 'report', label: 'Bilan' },
             ].map((tab) => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)}
                 className={`
                   whitespace-nowrap pb-3 px-3 border-b-2 font-medium text-sm transition-colors
                   ${activeTab === tab.id 
                     ? 'border-[#D45D79] text-[#D45D79] font-bold' 
                     : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:border-stone-300 dark:hover:border-stone-600'}
                 `}
               >
                 {tab.label}
               </button>
             ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 text-stone-900 dark:text-stone-100">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-stone-900 border-t border-rose-100 dark:border-stone-800 py-6 mt-auto no-print transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 text-center text-stone-400 dark:text-stone-600 text-sm">
          <p className="font-serif">Les douceurs de Miléna © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
