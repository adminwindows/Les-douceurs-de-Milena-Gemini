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
import { BrandLogo } from './components/ui/BrandLogo';
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
import {
  normalizeAppData,
  normalizeIngredient,
  normalizeMonthlyReport,
  normalizeOrder,
  normalizeProduct,
  normalizePurchase,
  normalizeSettings
} from './dataMigrations';

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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const savedTheme = window.localStorage.getItem('milena_theme');
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return 'dark';
  });
  const firstLaunchSettings: GlobalSettings = {
    ...INITIAL_SETTINGS,
    fixedCostItems: []
  };

  const savedState = loadAppState();
  const normalizedSavedState = savedState ? normalizeAppData(savedState) : undefined;
  const [ingredients, setIngredients] = useState<Ingredient[]>(normalizedSavedState?.ingredients ?? []);
  const [recipes, setRecipes] = useState<Recipe[]>(normalizedSavedState?.recipes ?? []);
  const [products, setProducts] = useState<Product[]>(normalizedSavedState?.products ?? []);
  const [settings, setSettings] = useState<GlobalSettings>(normalizedSavedState?.settings ?? normalizeSettings(firstLaunchSettings));
  const [orders, setOrders] = useState<Order[]>(normalizedSavedState?.orders ?? []);
  const [savedReports, setSavedReports] = useState<MonthlyReportData[]>(normalizedSavedState?.savedReports ?? []);
  const [purchases, setPurchases] = useState<Purchase[]>(normalizedSavedState?.purchases ?? []);
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>(normalizedSavedState?.productionBatches ?? []);
  const [activeDemoDatasetId, setActiveDemoDatasetId] = useState<string | undefined>(loadDemoSession()?.datasetId);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('milena_theme', theme);
    }
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


  useEffect(() => {
    if (!activeDemoDatasetId) {
      clearDemoBackup();
    }
  }, [activeDemoDatasetId]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleSettingsUpdate: React.Dispatch<React.SetStateAction<GlobalSettings>> = (updater) => {
    setSettings(prev => {
      const nextRaw = typeof updater === 'function' ? updater(prev) : updater;
      const next = normalizeSettings(nextRaw);
      setIngredients(current => current.map(normalizeIngredient));
      return next;
    });
  };

  const setAllData = (data: AppData) => {
    const normalized = normalizeAppData(data);
    setIngredients(normalized.ingredients);
    setRecipes(normalized.recipes);
    setProducts(normalized.products);
    setSettings(normalized.settings);
    setOrders(normalized.orders);
    setSavedReports(normalized.savedReports);
    setPurchases(normalized.purchases);
    setProductionBatches(normalized.productionBatches);
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
    const productsById = new Map<string, Product>(products.map((product): [string, Product] => [product.id, product]));
    switch (key) {
      case 'ingredients': setIngredients((val as Ingredient[]).map(normalizeIngredient)); break;
      case 'recipes': setRecipes(val); break;
      case 'products': setProducts((val as Product[]).map(normalizeProduct)); break;
      case 'settings': {
        const normalizedSettings = normalizeSettings(val);
        setSettings(normalizedSettings);
        setIngredients(prev => prev.map(normalizeIngredient));
        break;
      }
      case 'orders': setOrders((val as Order[]).map(order => normalizeOrder(order, settings, productsById))); break;
      case 'savedReports': setSavedReports((val as MonthlyReportData[]).map(report => normalizeMonthlyReport(report, settings))); break;
      case 'purchases': setPurchases((val as Purchase[]).map(normalizePurchase)); break;
      case 'productionBatches': setProductionBatches(val); break;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'settings':
        return <Settings
          settings={settings}
          setSettings={handleSettingsUpdate}
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
          settings={settings}
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
        return <ProductsContent products={products} setProducts={setProducts} recipes={recipes} ingredients={ingredients} settings={settings} />;
      case 'orders':
        return <Orders
          orders={orders}
          setOrders={setOrders}
          products={products}
          productionBatches={productionBatches}
          setProductionBatches={setProductionBatches}
          settings={settings}
        />;
      case 'analysis':
        return <Analysis products={products} recipes={recipes} ingredients={ingredients} settings={settings} setSettings={handleSettingsUpdate} purchases={purchases} />;
      case 'report':
        return <MonthlyReport
          products={products}
          settings={settings}
          recipes={recipes}
          ingredients={ingredients}
          purchases={purchases}
          orders={orders}
          savedReports={savedReports}
          setSavedReports={setSavedReports}
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
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-[#FDF8F6] dark:bg-stone-950 transition-colors duration-300" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <DataManagerModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        data={{ ingredients, recipes, products, settings, orders, savedReports, purchases, productionBatches }}
        setData={setData}
      />

      <header className="bg-white dark:bg-stone-900 border-b border-rose-100 dark:border-stone-800 shrink-0 sticky top-0 z-30 shadow-sm no-print transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 py-2 min-h-16">
            <div className="flex items-center gap-3 min-w-0">
              <BrandLogo className="h-12 w-16 sm:h-14 sm:w-20" />
              <div>
                <h1 className="text-base sm:text-xl font-bold text-rose-950 dark:text-rose-100 font-serif tracking-tight leading-tight">Les douceurs de Miléna</h1>
                <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400">Gestion Artisanale</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
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
                className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 text-[11px] sm:text-xs font-bold transition-colors"
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
                   whitespace-nowrap pb-3 px-2.5 sm:px-3 border-b-2 font-medium text-xs sm:text-sm transition-colors
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

      <main className="flex-1 min-h-0 overflow-y-auto max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 text-stone-900 dark:text-stone-100">
        {renderContent()}
      </main>

      <footer className="bg-white dark:bg-stone-900 border-t border-rose-100 dark:border-stone-800 py-4 sm:py-6 shrink-0 no-print transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 text-center text-stone-400 dark:text-stone-600 text-sm">
          <div className="flex items-center justify-center gap-2">
            <BrandLogo className="h-7 w-10 sm:h-8 sm:w-12" rounded={false} />
            <p className="font-serif">Les douceurs de Miléna © {new Date().getFullYear()}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
