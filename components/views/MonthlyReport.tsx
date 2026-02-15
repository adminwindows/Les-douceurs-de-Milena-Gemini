
import React, { useState, useEffect } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { GlobalSettings, Product, Recipe, Ingredient, MonthlyEntry, Order, FixedCostItem, MonthlyReportData, InventoryEntry, Unit, ProductionBatch } from '../../types';
import { calculateRecipeMaterialCost, formatCurrency } from '../../utils';
import { computeMonthlyTotals, shouldIncludeOrder } from '../../monthlyReportMath';
import { isNonNegativeNumber, parseOptionalNumber } from '../../validation';
import { Card, Input, Button, InfoTooltip } from '../ui/Common';
import { BrandLogo } from '../ui/BrandLogo';



const exportMonthlyReportPdf = async (args: {
  monthLabel: string;
  isTva: boolean;
  totalRevenueTTC: number;
  totalRevenueHT: number;
  totalTvaCollected: number;
  finalFoodCost: number;
  totalPackagingCost: number;
  totalSocialCharges: number;
  grossMargin: number;
  totalActualFixedCosts: number;
  netResult: number;
}) => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 790;
  const left = 50;

  const drawLine = (label: string, value: string, boldLine = false) => {
    const lineFont = boldLine ? bold : font;
    const lineSize = boldLine ? 12 : 11;
    page.drawText(label, { x: left, y, size: lineSize, font: lineFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(value, { x: 380, y, size: lineSize, font: lineFont, color: rgb(0.1, 0.1, 0.1) });
    y -= 24;
  };

  page.drawText('Les douceurs de Miléna', { x: left, y, size: 20, font: bold, color: rgb(0.83, 0.36, 0.47) });
  y -= 34;
  page.drawText(`Bilan Mensuel - ${args.monthLabel}`, { x: left, y, size: 14, font: bold, color: rgb(0.2, 0.2, 0.2) });
  y -= 34;

  drawLine(`Chiffre d'affaires ${args.isTva ? '(TTC)' : ''}`, formatCurrency(args.totalRevenueTTC));
  if (args.isTva) {
    drawLine('CA Hors Taxe', formatCurrency(args.totalRevenueHT));
    drawLine('TVA Collectée', formatCurrency(args.totalTvaCollected));
  }

  y -= 8;
  drawLine('Matières Premières', formatCurrency(args.finalFoodCost));
  drawLine('Emballages', formatCurrency(args.totalPackagingCost));
  drawLine('Cotisations Sociales', formatCurrency(args.totalSocialCharges));
  y -= 8;
  drawLine('Marge sur Coûts Variables', formatCurrency(args.grossMargin), true);
  drawLine('Charges Fixes', formatCurrency(args.totalActualFixedCosts));
  y -= 8;
  drawLine('RÉSULTAT NET', formatCurrency(args.netResult), true);

  const bytes = await pdf.save();
  const fileName = `bilan_milena_${args.monthLabel}.pdf`;
  const blob = new Blob([bytes], { type: 'application/pdf' });

  const file = new File([blob], fileName, { type: 'application/pdf' });
  const canUseNativeShare = typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator;
  if (canUseNativeShare) {
    const shareNavigator = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
      share: (data?: ShareData) => Promise<void>;
    };

    if (shareNavigator.canShare?.({ files: [file] })) {
      await shareNavigator.share({
        title: `Bilan ${args.monthLabel}`,
        files: [file]
      });
      return;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);

  alert('PDF généré. Vérifiez votre dossier Téléchargements. Sur mobile, utilisez le partage natif si proposé.');
};

interface Props {
  settings: GlobalSettings;
  products: Product[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  orders: Order[];
  savedReports: MonthlyReportData[];
  setSavedReports: React.Dispatch<React.SetStateAction<MonthlyReportData[]>>;
  setSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>; 
  productionBatches: ProductionBatch[];
}

// Helper: Calculate theoretical consumption for a single ingredient based on sales
const calculateTheoreticalConsumption = (
  ingId: string, 
  sales: MonthlyEntry[], 
  products: Product[], 
  recipes: Recipe[],
  ingredients: Ingredient[]
): number => {
  return sales.reduce((total, sale) => {
    const product = products.find(p => p.id === sale.productId);
    const recipe = recipes.find(r => r.id === product?.recipeId);
    if (!product || !recipe) return total;

    // Find this ingredient in the recipe
    const recIng = recipe.ingredients.find(ri => ri.ingredientId === ingId);
    if (!recIng) return total;

    // Base quantity per batch
    const qtyPerBatch = recIng.quantity;
    
    // Qty per unit
    const qtyPerUnit = qtyPerBatch / (recipe.batchYield ?? 1);

    // Apply Manufacturing Loss (product level)
    const mfgLossMultiplier = 1 / (1 - product.lossRate/100);

    // Total used = (Sold + Unsold) * QtyPerUnit * MfgLoss
    const totalUnitsProduced = sale.quantitySold + (sale.quantityUnsold || 0);
    
    return total + (totalUnitsProduced * qtyPerUnit * mfgLossMultiplier);
  }, 0);
};

export const MonthlyReport: React.FC<Props> = ({ 
  settings, products, recipes, ingredients, orders, savedReports, setSavedReports, setSettings, productionBatches
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); 
  const [viewHistory, setViewHistory] = useState(false);
  const isTva = settings.isTvaSubject;

  // Editable State for current report
  const [sales, setSales] = useState<MonthlyEntry[]>([]);
  const [actualFixedItems, setActualFixedItems] = useState<FixedCostItem[]>([]);
  const [actualIngredientSpend, setActualIngredientSpend] = useState<number>(0); // Method 2
  const [inventory, setInventory] = useState<InventoryEntry[]>([]); // Method 3
  
  // Cost Calculation Mode: 0 = Calculated, 1 = Cash Spend, 2 = Inventory Variation
  const [costMode, setCostMode] = useState<0 | 1 | 2>(0);

  // --- Initialization Logic ---
  useEffect(() => {
    const saved = savedReports.find(r => r.monthStr === selectedMonth);
    if (saved) {
      setSales(saved.sales);
      setActualFixedItems(saved.actualFixedCostItems);
      setActualIngredientSpend(saved.actualIngredientSpend);
      setInventory(saved.inventory || []);
    } else {
      // Initialize new report
      setActualFixedItems(settings.fixedCostItems.map(i => ({ ...i })));
      
      // Orders Aggregation
      const relevantCompletedOrders = orders.filter(o => o.date.startsWith(selectedMonth) && shouldIncludeOrder(o, settings.includePendingOrdersInMonthlyReport ?? false));

      const aggregatedSales: Record<string, number> = {};
      
      relevantCompletedOrders.forEach(o => {
        o.items.forEach(item => {
          aggregatedSales[item.productId] = (aggregatedSales[item.productId] || 0) + item.quantity;
        });
      });

      // Production Aggregation for the month
      const aggregatedProduction: Record<string, number> = {};
      productionBatches.filter(b => b.date.startsWith(selectedMonth)).forEach(b => {
          aggregatedProduction[b.productId] = (aggregatedProduction[b.productId] || 0) + b.quantity;
      });

      const initialSales = products.map(p => {
        const sold = aggregatedSales[p.id] || 0;
        const produced = aggregatedProduction[p.id] || 0;
        // Logic: Unsold is Production - Sold. Cannot be negative (if stock error, 0).
        const calculatedUnsold = Math.max(0, produced - sold);

        // Calculate theoretical price TTC for initialization
        const recipe = recipes.find(r => r.id === p.recipeId);
        const batchCost = recipe ? calculateRecipeMaterialCost(recipe, ingredients) : 0;
        const unitMat = batchCost / (recipe?.batchYield ?? 1);
        const labor = settings.includeLaborInCost ? (p.laborTimeMinutes/60) * settings.hourlyRate : 0;
        const fixed = (settings.fixedCostItems.reduce((s,i)=>s+i.amount,0) / products.reduce((s,prod)=>s+(prod.estimatedMonthlySales ?? 1),0));

        // Basic estimation without complex loss logic for default value
        const totalCostHT = unitMat + p.packagingCost + labor + fixed;
        const socialDivisor = (1 - settings.taxRate/100);
        const priceHT = (totalCostHT + p.targetMargin) / socialDivisor;
        const tvaRate = p.tvaRate ?? settings.defaultTvaRate ?? 0;
        const priceTTC = isTva ? priceHT * (1 + tvaRate/100) : priceHT;

        return {
          productId: p.id,
          quantitySold: sold,
          quantityUnsold: calculatedUnsold,
          actualPrice: priceTTC // Always store TTC (or Net if no Tva)
        };
      });
      setSales(initialSales);

      // Initialize Inventory from Current Global Ingredients State
      setInventory(ingredients.map(ing => ({
        ingredientId: ing.id,
        startStock: ing.quantity, 
        purchasedQuantity: 0,
        endStock: ing.quantity 
      })));
    }
  }, [selectedMonth, orders.length, settings.fixedCostItems.length, isTva, productionBatches.length]);

  // --- Handlers ---
  const handleSaleChange = (productId: string, field: 'quantitySold' | 'actualPrice' | 'quantityUnsold', value: number) => {
    setSales(prev => prev.map(s => s.productId === productId ? { ...s, [field]: value } : s));
  };

  const handleFixedItemChange = (id: string, val: number) => {
    setActualFixedItems(prev => prev.map(i => i.id === id ? { ...i, amount: val } : i));
  };

  const handleInventoryChange = (ingId: string, field: keyof InventoryEntry, value: number) => {
    setInventory(prev => prev.map(i => i.ingredientId === ingId ? { ...i, [field]: value } : i));
  };

  // --- Calculations ---

  // Method 3: Inventory Variation
  const inventoryVariationCost = inventory.reduce((sum, item) => {
    const ing = ingredients.find(i => i.id === item.ingredientId);
    if (!ing) return sum;
    const usedQty = item.startStock + item.purchasedQuantity - item.endStock;
    let unitMultiplier = 1;
    if (ing.unit === Unit.KG || ing.unit === Unit.L) unitMultiplier = 1000;
    const pricePerStockUnit = ing.costPerBaseUnit * unitMultiplier;
    return sum + (usedQty * pricePerStockUnit);
  }, 0);

  const totalActualFixedCosts = actualFixedItems.reduce((sum, i) => sum + i.amount, 0);
  const { totalRevenueTTC, totalRevenueHT, totalTvaCollected, finalFoodCost, totalPackagingCost, totalSocialCharges, netResult } = computeMonthlyTotals({
    sales,
    products,
    recipes,
    ingredients,
    settings,
    costMode,
    actualIngredientSpend,
    inventoryVariationCost,
    actualFixedCosts: totalActualFixedCosts,
    selectedMonth,
    orders
  });
  const calculatedFoodCost = computeMonthlyTotals({
    sales,
    products,
    recipes,
    ingredients,
    settings,
    costMode: 0,
    actualIngredientSpend,
    inventoryVariationCost,
    actualFixedCosts: totalActualFixedCosts,
    selectedMonth,
    orders
  }).finalFoodCost;
  const grossMargin = totalRevenueHT - (finalFoodCost + totalPackagingCost + totalSocialCharges);

  const isSalesValid = sales.every(s =>
    isNonNegativeNumber(s.quantitySold) &&
    isNonNegativeNumber(s.quantityUnsold) &&
    isNonNegativeNumber(s.actualPrice)
  );
  const isInventoryValid = inventory.every(item =>
    isNonNegativeNumber(item.startStock) &&
    isNonNegativeNumber(item.purchasedQuantity) &&
    isNonNegativeNumber(item.endStock)
  );
  const isFixedCostsValid = actualFixedItems.every(item => isNonNegativeNumber(item.amount));
  const isIngredientSpendValid = isNonNegativeNumber(actualIngredientSpend);
  const canSaveReport = isSalesValid && isInventoryValid && isFixedCostsValid && isIngredientSpendValid;
  const invalidLossProducts = products.filter(product => product.lossRate < 0 || product.lossRate >= 100);

  const saveReport = () => {
    if (!canSaveReport) {
      alert('Impossible de sauvegarder : corrigez les valeurs négatives dans les champs du bilan.');
      return;
    }
    const report: MonthlyReportData = {
      id: selectedMonth,
      monthStr: selectedMonth,
      sales,
      actualFixedCostItems: actualFixedItems,
      actualIngredientSpend,
      inventory,
      totalRevenue: totalRevenueTTC, // Storing TTC as total revenue reference
      netResult,
      isLocked: true
    };
    
    // Save to App state
    const others = savedReports.filter(r => r.monthStr !== selectedMonth);
    setSavedReports([...others, report]);
    
    alert('Bilan sauvegardé ! (visible dans Historique)');
  };

  if (viewHistory) {
     return (
        <div className="space-y-6">
          <Button onClick={() => setViewHistory(false)} variant="secondary">← Retour au bilan actuel</Button>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {savedReports.map(report => (
              <Card key={report.id} onClick={() => { setSelectedMonth(report.monthStr); setViewHistory(false); }} className="cursor-pointer hover:border-rose-300">
                 <div className="font-bold mb-2">{report.monthStr}</div>
                 <div className={report.netResult >= 0 ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                     {formatCurrency(report.netResult)}
                 </div>
              </Card>
            ))}
            {savedReports.length === 0 && <p className="text-stone-500 italic col-span-3">Aucun bilan archivé.</p>}
          </div>
        </div>
     )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
      {/* Controls */}
      <div className="lg:col-span-5 space-y-6 print:hidden no-print">
        <div className="flex justify-between items-center bg-white dark:bg-stone-900 p-4 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800">
          <div>
            <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Mois</label>
            <input 
              type="month" 
              className="font-bold text-stone-800 dark:text-stone-200 bg-transparent focus:outline-none dark:[color-scheme:dark]"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            />
          </div>
          <Button size="sm" variant="ghost" onClick={() => setViewHistory(true)}>Historique</Button>
        </div>

        <Card>
          <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4 font-serif">1. Ventes & Invendus</h3>
          <p className="text-xs text-stone-500 mb-3">Invendus pré-remplis = Production - Commandes. Modifiable si besoin.</p>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {sales.map(s => {
              const p = products.find(prod => prod.id === s.productId);
              if (!p) return null;
              
              // Warning logic
              const realSold = orders
                  .filter(o => o.date.startsWith(selectedMonth) && shouldIncludeOrder(o, settings.includePendingOrdersInMonthlyReport ?? false))
                  .reduce((sum, o) => sum + (o.items.find(i=>i.productId === p.id)?.quantity || 0), 0);
                  
              const realProd = productionBatches
                  .filter(b => b.date.startsWith(selectedMonth) && b.productId === p.id)
                  .reduce((sum, b) => sum + b.quantity, 0);
                  
              const manualEditWarning = s.quantitySold !== realSold || s.quantityUnsold !== Math.max(0, realProd - realSold);

              return (
                <div key={s.productId} className={`p-3 border rounded-lg ${manualEditWarning ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/10' : 'bg-stone-50 border-stone-200 dark:bg-stone-900 dark:border-stone-700'}`}>
                  <div className="flex justify-between items-center mb-2">
                      <div className="font-medium text-stone-700 dark:text-stone-300 text-sm">{p.name}</div>
                      {manualEditWarning && <InfoTooltip text={`Données réelles: ${realSold} vendus, ${Math.max(0, realProd - realSold)} invendus. Vous avez modifié ces valeurs.`} />}
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      className="flex-1"
                      label="Vendus" 
                      type="text" 
                      value={s.quantitySold}
                      error={isNonNegativeNumber(s.quantitySold) ? undefined : '≥ 0'}
                      onChange={e => handleSaleChange(s.productId, 'quantitySold', parseOptionalNumber(e.target.value) ?? 0)}
                    />
                    <Input 
                      className="w-20"
                      label="Invendus" 
                      type="text" 
                      value={s.quantityUnsold}
                      error={isNonNegativeNumber(s.quantityUnsold) ? undefined : '≥ 0'}
                      onChange={e => handleSaleChange(s.productId, 'quantityUnsold', parseOptionalNumber(e.target.value) ?? 0)}
                    />
                    <Input 
                      className="w-24"
                      label={`Prix ${isTva ? 'TTC' : ''}`} 
                      type="text" 
                      suffix="€"
                      value={s.actualPrice}
                      error={isNonNegativeNumber(s.actualPrice) ? undefined : '≥ 0'}
                      onChange={e => handleSaleChange(s.productId, 'actualPrice', parseOptionalNumber(e.target.value) ?? 0)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ... (Stock section remains same) ... */}
        <Card>
           <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4 font-serif">2. Gestion des Stocks (Ingrédients)</h3>
           <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">Mettez à jour vos stocks pour calculer la consommation réelle.</p>
           <div className="overflow-x-auto border border-stone-200 dark:border-stone-700 rounded-lg">
             <table className="w-full text-xs text-left">
               <thead className="bg-stone-100 dark:bg-stone-900 font-bold text-stone-700 dark:text-stone-300">
                 <tr>
                   <th className="p-2">Ingrédient</th>
                   <th className="p-2">Début</th>
                   <th className="p-2">Achats</th>
                   <th className="p-2">Fin (Réel)</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                 {inventory.map(item => {
                   const ing = ingredients.find(i => i.id === item.ingredientId);
                   if(!ing) return null;
                   return (
                     <tr key={item.ingredientId} className="dark:text-stone-300">
                       <td className="p-2 truncate max-w-[80px] font-medium">{ing.name} <span className="text-stone-400 dark:text-stone-500">({ing.unit})</span></td>
                       <td className="p-2">
                         <input
                           type="text"
                           className={`w-12 bg-transparent focus:outline-none ${isNonNegativeNumber(item.startStock) ? '' : 'border border-red-400 rounded'}`}
                           value={item.startStock}
                           onChange={e => handleInventoryChange(item.ingredientId, 'startStock', parseOptionalNumber(e.target.value) ?? 0)}
                         />
                       </td>
                       <td className="p-2">
                         <input
                           type="text"
                           className={`w-12 bg-stone-50 dark:bg-stone-800 border rounded px-1 text-stone-800 dark:text-stone-200 ${isNonNegativeNumber(item.purchasedQuantity) ? 'border-stone-200 dark:border-stone-600' : 'border-red-400'}`}
                           value={item.purchasedQuantity}
                           onChange={e => handleInventoryChange(item.ingredientId, 'purchasedQuantity', parseOptionalNumber(e.target.value) ?? 0)}
                         />
                       </td>
                       <td className="p-2">
                         <input
                           type="text"
                           className={`w-12 bg-white dark:bg-stone-800 border rounded px-1 font-bold text-rose-700 dark:text-rose-400 ${isNonNegativeNumber(item.endStock) ? 'border-rose-200 dark:border-rose-900' : 'border-red-400'}`}
                           value={item.endStock}
                           onChange={e => handleInventoryChange(item.ingredientId, 'endStock', parseOptionalNumber(e.target.value) ?? 0)}
                         />
                       </td>
                     </tr>
                   )
                 })}
               </tbody>
             </table>
           </div>
        </Card>

        <Card>
          <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4 font-serif">3. Dépenses & Charges</h3>
          <div className="space-y-4 mb-6">
            <h4 className="text-sm font-bold text-stone-600 dark:text-stone-400 border-b border-stone-100 dark:border-stone-700 pb-1">Charges Fixes Réelles</h4>
            {actualFixedItems.map(item => (
              <div key={item.id} className="flex justify-between items-center text-sm text-stone-600 dark:text-stone-300">
                <span>{item.name}</span>
                <input 
                  type="text" 
                  className={`w-20 text-right bg-stone-50 dark:bg-stone-800 border rounded px-1 py-0.5 ${isNonNegativeNumber(item.amount) ? 'border-stone-200 dark:border-stone-700' : 'border-red-400'}`}
                  value={item.amount}
                  onChange={e => handleFixedItemChange(item.id, parseOptionalNumber(e.target.value) ?? 0)}
                />
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-stone-100 dark:border-stone-700">
             <label className="text-sm font-bold text-stone-700 dark:text-stone-300 block mb-2">Méthode Coût Matières</label>
             <div className="flex flex-col gap-2">
               <button onClick={() => setCostMode(0)} className={`text-left px-3 py-2 rounded text-sm border ${costMode === 0 ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-bold' : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'}`}>
                 1. Théorique (Recettes + Pertes) <span className="float-right">{formatCurrency(calculatedFoodCost)}</span>
               </button>
               <button onClick={() => setCostMode(2)} className={`text-left px-3 py-2 rounded text-sm border ${costMode === 2 ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-bold' : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'}`}>
                 2. Réel (Variation Stock) <span className="float-right">{formatCurrency(inventoryVariationCost)}</span>
               </button>
               <button onClick={() => setCostMode(1)} className={`text-left px-3 py-2 rounded text-sm border ${costMode === 1 ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-bold' : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'}`}>
                 3. Total Dépenses (Factures)
                 {costMode === 1 ? (
                   <input
                     type="text"
                     lang="en"
                           inputMode="decimal"
                           className={`ml-2 w-20 text-right border-b bg-transparent ${isNonNegativeNumber(actualIngredientSpend) ? 'border-rose-300 dark:border-rose-700' : 'border-red-400'}`}
                     value={actualIngredientSpend}
                     onClick={e => e.stopPropagation()}
                     onChange={e => setActualIngredientSpend(parseOptionalNumber(e.target.value) ?? 0)}
                   />
                 ) : (
                   <span className="float-right">{formatCurrency(actualIngredientSpend)}</span>
                 )}
               </button>
             </div>
          </div>
        </Card>

        <div className="space-y-2">
          {!canSaveReport && (
            <p className="text-xs text-red-500">Corrigez les valeurs négatives avant de sauvegarder.</p>
          )}
          <Button className="w-full shadow-lg" onClick={saveReport}>
            Sauvegarder ce Bilan
          </Button>
        </div>
      </div>

      {/* Report Output */}
      <div className="lg:col-span-7">
        {invalidLossProducts.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
            <p className="font-semibold">Attention : taux de pertes invalides détectés.</p>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Ajustez les produits suivants (taux entre 0 et 99,99%) : {invalidLossProducts.map(product => product.name).join(', ')}.
            </p>
          </div>
        )}
        <Card className="h-full border-rose-100 dark:border-stone-700 shadow-xl bg-white dark:bg-stone-800 print:border-none print:shadow-none">
          <div className="flex justify-between items-start mb-6 border-b border-stone-100 dark:border-stone-700 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <BrandLogo className="h-10 w-10" />
                <h2 className="text-2xl sm:text-3xl font-bold text-rose-950 dark:text-rose-100 font-serif">Bilan Mensuel</h2>
              </div>
              <p className="text-stone-500 dark:text-stone-400">{new Date(selectedMonth).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
              {isTva && <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 font-bold uppercase tracking-wider">Mode Assujetti TVA</span>}
            </div>
            <div className="text-right no-print flex flex-col sm:flex-row gap-2">
              <Button size="sm" variant="secondary" onClick={() => {
                void exportMonthlyReportPdf({
                monthLabel: selectedMonth,
                isTva,
                totalRevenueTTC,
                totalRevenueHT,
                totalTvaCollected,
                finalFoodCost,
                totalPackagingCost,
                totalSocialCharges,
                grossMargin,
                totalActualFixedCosts,
                netResult
                }).catch(() => {
                  alert('Impossible de générer le PDF sur cet appareil.');
                });
              }}>📄 Exporter PDF</Button>
            </div>
          </div>

          <div className="space-y-0 text-sm">
            {/* Revenue */}
            <div className="py-4 border-b border-stone-100 dark:border-stone-700">
              <div className="flex justify-between items-center mb-1">
                 <span className="font-bold text-lg text-stone-700 dark:text-stone-300">Chiffre d'Affaires {isTva ? '(TTC)' : ''}</span>
                 <span className="font-bold text-xl text-stone-900 dark:text-stone-100">{formatCurrency(totalRevenueTTC)}</span>
              </div>
              {isTva && (
                <div className="text-xs text-stone-500 dark:text-stone-400 flex flex-col gap-1 pl-2 border-l-2 border-stone-200 dark:border-stone-600 mt-2">
                   <div className="flex justify-between w-full">
                     <span>Dont CA Hors Taxe :</span>
                     <span className="font-medium text-stone-800 dark:text-stone-200">{formatCurrency(totalRevenueHT)}</span>
                   </div>
                   <div className="flex justify-between w-full">
                     <span>Dont TVA Collectée :</span>
                     <span className="font-medium text-stone-800 dark:text-stone-200">{formatCurrency(totalTvaCollected)}</span>
                   </div>
                </div>
              )}
            </div>

            {/* Variable Costs Group */}
            <div className="py-4 space-y-2">
              <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2">Charges Variables</div>
              
              <div className="flex justify-between items-center pl-4">
                <span className="text-stone-600 dark:text-stone-400 flex items-center">
                  - Matières Premières {isTva ? '(HT)' : ''}
                  <span className="ml-2 text-[10px] text-stone-400 bg-stone-100 dark:bg-stone-700 dark:text-stone-300 px-1 rounded">
                    {costMode === 0 ? 'Théorique' : costMode === 1 ? 'Total dépenses' : 'Conso. Stock'}
                  </span>
                </span>
                <span className="text-red-500 dark:text-red-400">{formatCurrency(finalFoodCost)}</span>
              </div>
              <div className="flex justify-between items-center pl-4">
                <span className="text-stone-600 dark:text-stone-400">- Emballages {isTva ? '(HT)' : ''}</span>
                <span className="text-red-500 dark:text-red-400">{formatCurrency(totalPackagingCost)}</span>
              </div>
              <div className="flex justify-between items-center pl-4">
                <span className="text-stone-600 dark:text-stone-400">- Cotisations Sociales ({settings.taxRate}%)</span>
                <span className="text-red-500 dark:text-red-400">{formatCurrency(totalSocialCharges)}</span>
              </div>
            </div>

            {/* Margin Line */}
            <div className="flex justify-between items-center py-4 border-t border-b border-stone-200 dark:border-stone-700 bg-[#FDF8F6] dark:bg-stone-900 px-4 -mx-6">
              <span className="font-bold text-stone-800 dark:text-stone-200">Marge sur Coûts Variables</span>
              <span className={`font-bold text-lg ${grossMargin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(grossMargin)}
              </span>
            </div>

            {/* Fixed Costs */}
            <div className="py-4">
              <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2">Charges Fixes</div>
              <div className="space-y-1">
                {actualFixedItems.map(i => (
                  <div key={i.id} className="flex justify-between items-center pl-4 text-stone-500 dark:text-stone-400 text-xs">
                     <span>{i.name}</span>
                     <span>{formatCurrency(i.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pl-4 mt-2 font-medium border-t border-stone-100 dark:border-stone-700 pt-2">
                <span className="text-stone-600 dark:text-stone-400">Total Fixe</span>
                <span className="text-red-500 dark:text-red-400">{formatCurrency(totalActualFixedCosts)}</span>
              </div>
            </div>

            {/* Final Result */}
            <div className="mt-6 p-6 bg-[#D45D79] dark:bg-[#A03550] text-white rounded-xl shadow-lg print:bg-white print:text-black print:border print:border-black">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold font-serif">RÉSULTAT NET</span>
                <span className="text-3xl font-bold">
                  {formatCurrency(netResult)}
                </span>
              </div>
            </div>

            {/* Detailed Stock Analysis */}
            <div className="mt-8">
               <h4 className="font-bold text-stone-700 dark:text-stone-300 border-b border-stone-100 dark:border-stone-700 pb-2 mb-3">Analyse des Écarts de Consommation</h4>
               <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">Comparaison entre consommation théorique (recettes vendues) et consommation réelle (stock).</p>
               <table className="w-full text-xs text-left">
                 <thead className="bg-stone-50 dark:bg-stone-900 text-stone-500 dark:text-stone-400">
                   <tr>
                     <th className="p-2">Ingrédient</th>
                     <th className="p-2 text-right">Théorique</th>
                     <th className="p-2 text-right">Réel</th>
                     <th className="p-2 text-right">Ecart Conso.</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                   {inventory.map(item => {
                     const ing = ingredients.find(i => i.id === item.ingredientId);
                     if(!ing) return null;
                     
                     const theoreticalQty = calculateTheoreticalConsumption(item.ingredientId, sales, products, recipes, ingredients);
                     const realQty = item.startStock + item.purchasedQuantity - item.endStock;
                     const diff = realQty - theoreticalQty;
                     
                     return (
                       <tr key={item.ingredientId} className="dark:text-stone-300">
                         <td className="p-2 font-medium">{ing.name}</td>
                         <td className="p-2 text-right">{theoreticalQty.toFixed(1)} {ing.unit}</td>
                         <td className="p-2 text-right">{realQty.toFixed(1)} {ing.unit}</td>
                         <td className={`p-2 text-right font-bold ${diff > 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                           {diff > 0 ? '+' : ''}{diff.toFixed(1)} {ing.unit}
                         </td>
                       </tr>
                     )
                   })}
                 </tbody>
               </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
