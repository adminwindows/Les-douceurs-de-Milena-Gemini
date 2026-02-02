import React, { useState, useEffect } from 'react';
import { IngredientsRecettes } from './components/views/IngredientsRecettes';
import { Products } from './components/views/Products';
import { Analysis } from './components/views/Analysis';
import { MonthlyReport } from './components/views/MonthlyReport';
import { Settings } from './components/views/Settings';
import { Orders } from './components/views/Orders'; // New component
import { 
  INITIAL_INGREDIENTS, 
  INITIAL_RECIPES, 
  INITIAL_PRODUCTS, 
  INITIAL_SETTINGS 
} from './utils';
import { Ingredient, Recipe, Product, GlobalSettings, Order, MonthlyReportData } from './types';

const App = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'ingredients' | 'products' | 'orders' | 'analysis' | 'report'>('products');
  
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
        return <Products 
          products={products} 
          setProducts={setProducts} 
          recipes={recipes} 
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
      default:
        return <Products products={products} setProducts={setProducts} recipes={recipes} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDF8F6]">
      {/* Header */}
      <header className="bg-white border-b border-rose-100 sticky top-0 z-20 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🧁</span>
              <div>
                <h1 className="text-xl font-bold text-rose-950 font-serif tracking-tight">Les douceurs de Miléna</h1>
                <p className="text-xs text-stone-500">Gestion Artisanale</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <label className="text-xs text-stone-400 cursor-pointer hover:text-stone-600">
                📥 Charger
                <input type="file" onChange={importData} accept=".json" className="hidden" />
              </label>
              <button onClick={exportData} className="text-xs text-stone-400 hover:text-stone-600">
                💾 Sauvegarder
              </button>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto pb-0 hide-scrollbar pt-2">
             {[
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
                     : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'}
                 `}
               >
                 {tab.label}
               </button>
             ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-rose-100 py-6 mt-auto no-print">
        <div className="max-w-7xl mx-auto px-4 text-center text-stone-400 text-sm">
          <p className="font-serif">Les douceurs de Miléna © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
