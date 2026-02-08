import React, { useState, useEffect } from 'react';
import { IngredientsRecettes } from './components/views/IngredientsRecettes';
import { ProductsContent } from './components/views/Products';
import { Analysis } from './components/views/Analysis';
import { MonthlyReport } from './components/views/MonthlyReport';
import { Settings } from './components/views/Settings';
import { Orders } from './components/views/Orders';
import { UserGuide } from './components/views/UserGuide';
import { ShoppingList } from './components/views/ShoppingList';
import { StockManagement } from './components/views/StockManagement';
import { Production } from './components/views/Production';
import { Button } from './components/ui/Common';
import {
  INITIAL_SETTINGS
} from './utils';
import { AppData } from './dataSchema';
import {
  loadAppState,
  saveAppState,
  loadDemoBackup,
  saveDemoBackup,
  clearDemoBackup,
  loadDemoSession,
  saveDemoSession,
  clearDemoSession
} from './storage';
import { DEMO_DATASETS, cloneAppData, getDemoDatasetById } from './demoData';
import { Ingredient, Recipe, Product, GlobalSettings, Order, MonthlyReportData, Purchase, ProductionBatch } from './types';
import { BackupSelection, exportBackupFile, getMobileBackupBridge, parseImportedAppData } from './backupIO';

const DataManagerModal = ({
  isOpen, onClose,
  data, setData
}: {
  isOpen: boolean,
  onClose: () => void,
  data: any,
  setData: (key: string, val: any) => void
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'export' | 'import'>('export');
  const [selection, setSelection] = useState<BackupSelection>({
    settings: true,
    catalog: true,
    operations: true,
    reports: true
  });

  const toggle = (key: keyof typeof selection) => setSelection(prev => ({ ...prev, [key]: !prev[key] }));
  const supportsNativeBackupPicker = Boolean(getMobileBackupBridge());

  const applyImportedData = (rawContent: string) => {
    try {
      const dataToImport = parseImportedAppData(rawContent);
      let msg = 'Données chargées :\n';

      if (dataToImport.settings && selection.settings) { setData('settings', dataToImport.settings); msg += '- Paramètres\n'; }

      if (selection.catalog) {
        if (dataToImport.ingredients) { setData('ingredients', dataToImport.ingredients); msg += '- Ingrédients\n'; }
        if (dataToImport.recipes) { setData('recipes', dataToImport.recipes); msg += '- Recettes\n'; }
        if (dataToImport.products) { setData('products', dataToImport.products); msg += '- Produits\n'; }
      }

      if (selection.operations) {
        if (dataToImport.orders) { setData('orders', dataToImport.orders); msg += '- Commandes\n'; }
        if (dataToImport.purchases) { setData('purchases', dataToImport.purchases); msg += '- Achats\n'; }
        if (dataToImport.productionBatches) { setData('productionBatches', dataToImport.productionBatches); msg += '- Production\n'; }
      }

      if (dataToImport.savedReports && selection.reports) { setData('savedReports', dataToImport.savedReports); msg += '- Bilans archivés\n'; }

      alert(msg);
      onClose();
    } catch {
      alert('Erreur: Fichier invalide.');
    }
  };

  const handleExport = async () => {
    try {
      await exportBackupFile(data, selection);
    } catch {
      alert("Impossible d'exporter la sauvegarde.");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawContent = event.target?.result as string;
      applyImportedData(rawContent);
    };
    reader.readAsText(file);
  };

  const handleNativeImport = async () => {
    try {
      const bridge = getMobileBackupBridge();
      if (!bridge) {
        alert('Import natif indisponible sur cet appareil.');
        return;
      }

      const content = await bridge.pickTextFile({
        mimeTypes: ['application/json', 'text/json']
      });

      if (!content) return;

      applyImportedData(content);
    } catch {
      alert('Erreur: Fichier invalide.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-2xl max-w-md w-full p-6 border border-stone-200 dark:border-stone-700">
        <h3 className="text-xl font-bold font-serif mb-4 text-stone-900 dark:text-white">Gestion des Sauvegardes</h3>

        <div className="flex gap-2 mb-6 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg">
          <button
            onClick={() => setMode('export')}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${mode === 'export' ? 'bg-white dark:bg-stone-700 shadow text-rose-600' : 'text-stone-500'}`}
          >
            💾 Sauvegarder (Export)
          </button>
          <button
            onClick={() => setMode('import')}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${mode === 'import' ? 'bg-white dark:bg-stone-700 shadow text-emerald-600' : 'text-stone-500'}`}
          >
            📥 Charger (Import)
          </button>
        </div>

        <p className="text-sm text-stone-500 mb-3 font-medium">Sélectionnez les données concernées :</p>
        <div className="space-y-3 mb-6">
          <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 dark:border-stone-700">
            <span className="text-stone-800 dark:text-stone-200 text-sm">🛠️ Paramètres</span>
            <input type="checkbox" checked={selection.settings} onChange={() => toggle('settings')} className="accent-rose-500 w-5 h-5" />
          </label>
          <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 dark:border-stone-700">
            <span className="text-stone-800 dark:text-stone-200 text-sm">📚 Catalogue (Ingr. / Recettes / Prod.)</span>
            <input type="checkbox" checked={selection.catalog} onChange={() => toggle('catalog')} className="accent-rose-500 w-5 h-5" />
          </label>
          <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 dark:border-stone-700">
            <span className="text-stone-800 dark:text-stone-200 text-sm">⚡ Activité (Commandes / Stocks)</span>
            <input type="checkbox" checked={selection.operations} onChange={() => toggle('operations')} className="accent-rose-500 w-5 h-5" />
          </label>
          <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 dark:border-stone-700">
            <span className="text-stone-800 dark:text-stone-200 text-sm">📊 Archives Bilans</span>
            <input type="checkbox" checked={selection.reports} onChange={() => toggle('reports')} className="accent-rose-500 w-5 h-5" />
          </label>
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">Fermer</Button>
          {mode === 'export' ? (
            <Button onClick={() => void handleExport()} className="flex-1">Télécharger le fichier</Button>
          ) : (
            supportsNativeBackupPicker ? (
              <Button onClick={() => void handleNativeImport()} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                Choisir un fichier (appareil)
              </Button>
            ) : (
              <label className="flex-1">
                <div className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg text-sm text-center cursor-pointer transition-colors shadow-sm">
                  Choisir un fichier...
                </div>
                <input type="file" onChange={handleImport} accept=".json" className="hidden" />
              </label>
            )
          )}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'ingredients' | 'products' | 'orders' | 'analysis' | 'report' | 'guide' | 'shopping' | 'stock' | 'production'>('guide');
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const firstLaunchSettings: GlobalSettings = {
    ...INITIAL_SETTINGS,
    fixedCostItems: []
  };

  const savedState = loadAppState();
  const [ingredients, setIngredients] = useState<Ingredient[]>(savedState?.ingredients ?? []);
  const [recipes, setRecipes] = useState<Recipe[]>(savedState?.recipes ?? []);
  const [products, setProducts] = useState<Product[]>(savedState?.products ?? []);
  const [settings, setSettings] = useState<GlobalSettings>(savedState?.settings ?? firstLaunchSettings);
  const [orders, setOrders] = useState<Order[]>(savedState?.orders ?? []);
  const [savedReports, setSavedReports] = useState<MonthlyReportData[]>(savedState?.savedReports ?? []);
  const [purchases, setPurchases] = useState<Purchase[]>(savedState?.purchases ?? []);
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>(savedState?.productionBatches ?? []);
  const [activeDemoDatasetId, setActiveDemoDatasetId] = useState<string | undefined>(loadDemoSession()?.datasetId);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    saveAppState({
      ingredients,
      recipes,
      products,
      settings,
      orders,
      savedReports,
      purchases,
      productionBatches
    });
  }, [ingredients, recipes, products, settings, orders, savedReports, purchases, productionBatches]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const setAllData = (data: AppData) => {
    setIngredients(data.ingredients);
    setRecipes(data.recipes);
    setProducts(data.products);
    setSettings(data.settings);
    setOrders(data.orders);
    setSavedReports(data.savedReports);
    setPurchases(data.purchases);
    setProductionBatches(data.productionBatches);
  };

  const getCurrentData = (): AppData => ({
    ingredients,
    recipes,
    products,
    settings,
    orders,
    savedReports,
    purchases,
    productionBatches
  });

  const activateDemo = (datasetId: string) => {
    const dataset = getDemoDatasetById(datasetId);
    if (!dataset) return;

    const currentSession = loadDemoSession();
    if (!currentSession) {
      saveDemoBackup(cloneAppData(getCurrentData()));
    }

    setAllData(cloneAppData(dataset.data));
    saveDemoSession({ datasetId });
    setActiveDemoDatasetId(datasetId);
  };

  const exitDemo = () => {
    const backup = loadDemoBackup();
    if (backup) {
      setAllData(cloneAppData(backup));
    }
    clearDemoBackup();
    clearDemoSession();
    setActiveDemoDatasetId(undefined);
  };

  const setData = (key: string, val: any) => {
    switch (key) {
      case 'ingredients': setIngredients(val); break;
      case 'recipes': setRecipes(val); break;
      case 'products': setProducts(val); break;
      case 'settings': setSettings(val); break;
      case 'orders': setOrders(val); break;
      case 'savedReports': setSavedReports(val); break;
      case 'purchases': setPurchases(val); break;
      case 'productionBatches': setProductionBatches(val); break;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'settings':
        return <Settings
          settings={settings}
          setSettings={setSettings}
          demoDatasets={DEMO_DATASETS}
          activeDemoDatasetId={activeDemoDatasetId}
          onActivateDemo={activateDemo}
          onExitDemo={exitDemo}
        />;
      case 'ingredients':
        return <IngredientsRecettes ingredients={ingredients} recipes={recipes} setRecipes={setRecipes} />;
      case 'stock':
        return <StockManagement
          ingredients={ingredients}
          setIngredients={setIngredients}
          purchases={purchases}
          setPurchases={setPurchases}
          productionBatches={productionBatches}
          recipes={recipes}
          products={products}
        />;
      case 'production':
        return <Production
          productionBatches={productionBatches}
          setProductionBatches={setProductionBatches}
          products={products}
          recipes={recipes}
          ingredients={ingredients}
          orders={orders}
        />;
      case 'products':
        return <ProductsContent products={products} setProducts={setProducts} recipes={recipes} settings={settings} />;
      case 'orders':
        return <Orders
          orders={orders}
          setOrders={setOrders}
          products={products}
          productionBatches={productionBatches}
          setProductionBatches={setProductionBatches}
        />;
      case 'analysis':
        return <Analysis products={products} recipes={recipes} ingredients={ingredients} settings={settings} purchases={purchases} />;
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
          productionBatches={productionBatches}
        />;
      case 'shopping':
        return <ShoppingList orders={orders} products={products} recipes={recipes} ingredients={ingredients} />;
      case 'guide':
      default:
        return <UserGuide />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDF8F6] dark:bg-stone-950 transition-colors duration-300">
      <DataManagerModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        data={{ ingredients, recipes, products, settings, orders, savedReports, purchases, productionBatches }}
        setData={setData}
      />

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
              {activeDemoDatasetId && (
                <span className="hidden sm:inline text-xs font-bold px-2 py-1 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200">
                  Mode démo actif
                </span>
              )}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-rose-100 dark:hover:bg-stone-700 transition-colors"
                title={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>

              <button
                onClick={() => setIsDataModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 text-xs font-bold transition-colors"
              >
                💾 Sauvegardes / Données
              </button>
            </div>
          </div>

          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto pb-0 hide-scrollbar pt-2 border-t border-transparent dark:border-stone-800">
            {[
              { id: 'guide', label: '📖 Guide' },
              { id: 'orders', label: 'Commandes' },
              { id: 'shopping', label: '🛒 Courses' },
              { id: 'production', label: '👩‍🍳 Production' },
              { id: 'stock', label: '📦 Stocks & Achats' },
              { id: 'ingredients', label: 'Recettes' },
              { id: 'products', label: 'Produits' },
              { id: 'analysis', label: 'Prix' },
              { id: 'report', label: 'Bilan' },
              { id: 'settings', label: 'Paramètres' },
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 text-stone-900 dark:text-stone-100">
        {renderContent()}
      </main>

      <footer className="bg-white dark:bg-stone-900 border-t border-rose-100 dark:border-stone-800 py-6 mt-auto no-print transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 text-center text-stone-400 dark:text-stone-600 text-sm">
          <p className="font-serif">Les douceurs de Miléna © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
