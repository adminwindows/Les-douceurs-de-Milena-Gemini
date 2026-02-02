
import React, { useState, useEffect } from 'react';
import { GlobalSettings, Product, Recipe, Ingredient, MonthlyEntry, Order, FixedCostItem, MonthlyReportData, InventoryEntry, Unit } from '../../types';
import { calculateRecipeMaterialCost, formatCurrency } from '../../utils';
import { Card, Input, Button, InfoTooltip } from '../ui/Common';

interface Props {
  settings: GlobalSettings;
  products: Product[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  orders: Order[];
  savedReports: MonthlyReportData[];
  setSavedReports: React.Dispatch<React.SetStateAction<MonthlyReportData[]>>;
  setSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>; 
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
    const qtyPerUnit = qtyPerBatch / (recipe.batchYield || 1);

    // Apply Manufacturing Loss (product level)
    let safeLossRate = product.lossRate;
    if (safeLossRate >= 100) safeLossRate = 99.9;
    const mfgLossMultiplier = 1 / (1 - safeLossRate/100);

    // Total used = (Sold + Unsold) * QtyPerUnit * MfgLoss
    const totalUnitsProduced = sale.quantitySold + (sale.quantityUnsold || 0);
    
    return total + (totalUnitsProduced * qtyPerUnit * mfgLossMultiplier);
  }, 0);
};

export const MonthlyReport: React.FC<Props> = ({ 
  settings, products, recipes, ingredients, orders, savedReports, setSavedReports, setSettings 
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
      const relevantOrders = orders.filter(o => o.date.startsWith(selectedMonth) && o.status !== 'cancelled');
      const aggregatedSales: Record<string, number> = {};
      
      relevantOrders.forEach(o => {
        o.items.forEach(item => {
          aggregatedSales[item.productId] = (aggregatedSales[item.productId] || 0) + item.quantity;
        });
      });

      const initialSales = products.map(p => {
        // Calculate theoretical price TTC for initialization
        const recipe = recipes.find(r => r.id === p.recipeId);
        const batchCost = recipe ? calculateRecipeMaterialCost(recipe, ingredients) : 0;
        const unitMat = batchCost / (recipe?.batchYield || 1);
        const labor = (p.laborTimeMinutes/60) * settings.hourlyRate;
        const fixed = (settings.fixedCostItems.reduce((s,i)=>s+i.amount,0) / products.reduce((s,prod)=>s+(prod.estimatedMonthlySales||1),0));
        
        // Basic estimation without complex loss logic for default value
        const totalCostHT = unitMat + p.packagingCost + p.variableDeliveryCost + labor + fixed;
        const socialDivisor = (1 - settings.taxRate/100);
        const priceHT = (totalCostHT + p.targetMargin) / socialDivisor;
        const tvaRate = p.tvaRate ?? settings.defaultTvaRate ?? 0;
        const priceTTC = isTva ? priceHT * (1 + tvaRate/100) : priceHT;

        return {
          productId: p.id,
          quantitySold: aggregatedSales[p.id] || 0,
          quantityUnsold: p.unsoldEstimate || 0,
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
  }, [selectedMonth, orders.length, settings.fixedCostItems.length, isTva]);

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

  const saveReport = () => {
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
    
    const others = savedReports.filter(r => r.monthStr !== selectedMonth);
    setSavedReports([...others, report]);
    alert('Bilan sauvegardé !');
  };

  // --- Calculations ---
  // 1. Revenue
  // actualPrice in sales array is considered TTC/Net paid by customer
  const totalRevenueTTC = sales.reduce((sum, s) => sum + (s.quantitySold * s.actualPrice), 0);
  
  // Calculate HT if TVA enabled
  // We must calculate line by line because rates might differ per product
  let totalRevenueHT = 0;
  let totalTvaCollected = 0;

  if (isTva) {
    sales.forEach(s => {
      const p = products.find(prod => prod.id === s.productId);
      const tvaRate = p?.tvaRate ?? settings.defaultTvaRate ?? 0;
      const lineTTC = s.quantitySold * s.actualPrice;
      const lineHT = lineTTC / (1 + tvaRate/100);
      totalRevenueHT += lineHT;
      totalTvaCollected += (lineTTC - lineHT);
    });
  } else {
    totalRevenueHT = totalRevenueTTC; // Franchise base, revenue is the total
    totalTvaCollected = 0;
  }

  // 2. Variable Costs
  // Method 1: Calculated Theoretical
  const calculatedFoodCost = sales.reduce((sum, s) => {
    const product = products.find(p => p.id === s.productId);
    const recipe = recipes.find(r => r.id === product?.recipeId);
    if (!product || !recipe) return sum;

    const batchCost = calculateRecipeMaterialCost(recipe, ingredients);
    const unitCost = batchCost / (recipe.batchYield || 1);
    
    let safeLossRate = product.lossRate;
    if (safeLossRate >= 100) safeLossRate = 99.9;
    const mfgLossMultiplier = 1 / (1 - safeLossRate / 100);

    const totalUnits = s.quantitySold + (s.quantityUnsold || 0);
    return sum + (unitCost * mfgLossMultiplier * totalUnits);
  }, 0);

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

  // Selection
  let finalFoodCost = 0;
  if (costMode === 0) finalFoodCost = calculatedFoodCost;
  else if (costMode === 1) finalFoodCost = actualIngredientSpend;
  else finalFoodCost = inventoryVariationCost;

  // Packaging
  const totalPackagingCost = sales.reduce((sum, s) => {
    const product = products.find(p => p.id === s.productId);
    if (!product) return sum;
    let safeLossRate = product.lossRate;
    if (safeLossRate >= 100) safeLossRate = 99.9;
    const mfgLossMultiplier = 1 / (1 - safeLossRate / 100);
    const totalPackagedUnits = s.quantitySold + (product.packagingUsedOnUnsold ? (s.quantityUnsold || 0) : 0);
    return sum + (product.packagingCost * totalPackagedUnits * mfgLossMultiplier);
  }, 0);

  // 3. Social Charges
  // Logic: Social charges are calculated on Revenue.
  // If isTvaSubject => On Revenue HT.
  // If !isTvaSubject => On Revenue Total.
  const baseForSocialCharges = totalRevenueHT; 
  const totalSocialCharges = baseForSocialCharges * (settings.taxRate / 100);

  // 4. Result
  const totalVariableCosts = finalFoodCost + totalPackagingCost + totalSocialCharges;
  const grossMargin = totalRevenueHT - totalVariableCosts; // Margin on HT
  const totalActualFixedCosts = actualFixedItems.reduce((sum, i) => sum + i.amount, 0);
  const netResult = grossMargin - totalActualFixedCosts;

  if (viewHistory) {
     return (
        <div className="space-y-6">
          <Button onClick={() => setViewHistory(false)} variant="secondary">← Retour au bilan actuel</Button>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {savedReports.map(report => (
              <Card key={report.id} onClick={() => { setSelectedMonth(report.monthStr); setViewHistory(false); }} className="cursor-pointer">
                 {report.monthStr} - {formatCurrency(report.netResult)}
              </Card>
            ))}
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
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {sales.map(s => {
              const p = products.find(prod => prod.id === s.productId);
              if (!p) return null;
              return (
                <div key={s.productId} className="p-3 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-900">
                  <div className="font-medium text-stone-700 dark:text-stone-300 text-sm mb-2">{p.name}</div>
                  <div className="flex gap-2">
                    <Input 
                      className="flex-1"
                      label="Vendus" 
                      type="number" 
                      value={s.quantitySold}
                      onChange={e => handleSaleChange(s.productId, 'quantitySold', parseFloat(e.target.value))}
                    />
                    <Input 
                      className="w-20"
                      label="Invendus" 
                      type="number" 
                      value={s.quantityUnsold}
                      onChange={e => handleSaleChange(s.productId, 'quantityUnsold', parseFloat(e.target.value))}
                    />
                    <Input 
                      className="w-24"
                      label={`Prix ${isTva ? 'TTC' : ''}`} 
                      type="number" 
                      suffix="€"
                      value={s.actualPrice}
                      onChange={e => handleSaleChange(s.productId, 'actualPrice', parseFloat(e.target.value))}
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
                         <input type="number" className="w-12 bg-transparent focus:outline-none" value={item.startStock} onChange={e => handleInventoryChange(item.ingredientId, 'startStock', parseFloat(e.target.value))} />
                       </td>
                       <td className="p-2">
                         <input type="number" className="w-12 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-600 rounded px-1 text-stone-800 dark:text-stone-200" value={item.purchasedQuantity} onChange={e => handleInventoryChange(item.ingredientId, 'purchasedQuantity', parseFloat(e.target.value))} />
                       </td>
                       <td className="p-2">
                         <input type="number" className="w-12 bg-white dark:bg-stone-800 border border-rose-200 dark:border-rose-900 rounded px-1 font-bold text-rose-700 dark:text-rose-400" value={item.endStock} onChange={e => handleInventoryChange(item.ingredientId, 'endStock', parseFloat(e.target.value))} />
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
                  type="number" 
                  className="w-20 text-right bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded px-1 py-0.5"
                  value={item.amount}
                  onChange={e => handleFixedItemChange(item.id, parseFloat(e.target.value))}
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
                   <input type="number" className="ml-2 w-20 text-right border-b border-rose-300 dark:border-rose-700 bg-transparent" value={actualIngredientSpend} onClick={e => e.stopPropagation()} onChange={e => setActualIngredientSpend(parseFloat(e.target.value))} />
                 ) : (
                   <span className="float-right">{formatCurrency(actualIngredientSpend)}</span>
                 )}
               </button>
             </div>
          </div>
        </Card>

        <Button className="w-full shadow-lg" onClick={saveReport}>Sauvegarder ce Bilan</Button>
      </div>

      {/* Report Output */}
      <div className="lg:col-span-7">
        <Card className="h-full border-rose-100 dark:border-stone-700 shadow-xl bg-white dark:bg-stone-800 print:border-none print:shadow-none">
          <div className="flex justify-between items-start mb-6 border-b border-stone-100 dark:border-stone-700 pb-4">
            <div>
              <h2 className="text-3xl font-bold text-rose-950 dark:text-rose-100 font-serif">Bilan Mensuel</h2>
              <p className="text-stone-500 dark:text-stone-400">{new Date(selectedMonth).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
              {isTva && <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 font-bold uppercase tracking-wider">Mode Assujetti TVA</span>}
            </div>
            <div className="text-right no-print">
              <Button size="sm" variant="secondary" onClick={() => window.print()}>🖨️ Imprimer</Button>
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
