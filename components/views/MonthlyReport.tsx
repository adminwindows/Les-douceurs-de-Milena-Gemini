import React, { useState, useEffect } from 'react';
import { GlobalSettings, Product, Recipe, Ingredient, MonthlyEntry, Order, FixedCostItem, MonthlyReportData } from '../../types';
import { calculateRecipeMaterialCost, formatCurrency } from '../../utils';
import { Card, Input, Button } from '../ui/Common';

interface Props {
  settings: GlobalSettings;
  products: Product[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  orders: Order[];
  savedReports: MonthlyReportData[];
  setSavedReports: React.Dispatch<React.SetStateAction<MonthlyReportData[]>>;
  setSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>; // To update forecast
}

export const MonthlyReport: React.FC<Props> = ({ 
  settings, products, recipes, ingredients, orders, savedReports, setSavedReports, setSettings 
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [viewHistory, setViewHistory] = useState(false);

  // Editable State for current report
  const [sales, setSales] = useState<MonthlyEntry[]>([]);
  const [actualFixedItems, setActualFixedItems] = useState<FixedCostItem[]>([]);
  const [actualIngredientSpend, setActualIngredientSpend] = useState<number>(0);
  const [useCalculatedFoodCost, setUseCalculatedFoodCost] = useState(true);

  // --- Initialization Logic ---
  useEffect(() => {
    // Try find saved report
    const saved = savedReports.find(r => r.monthStr === selectedMonth);
    if (saved) {
      setSales(saved.sales);
      setActualFixedItems(saved.actualFixedCostItems);
      setActualIngredientSpend(saved.actualIngredientSpend);
    } else {
      // Initialize new report
      // 1. Copy fixed costs structure from settings
      setActualFixedItems(settings.fixedCostItems.map(i => ({ ...i })));
      
      // 2. Aggregate Orders for this month
      const relevantOrders = orders.filter(o => o.date.startsWith(selectedMonth) && o.status !== 'cancelled');
      const aggregatedSales: Record<string, number> = {};
      
      relevantOrders.forEach(o => {
        o.items.forEach(item => {
          aggregatedSales[item.productId] = (aggregatedSales[item.productId] || 0) + item.quantity;
        });
      });

      const initialSales = products.map(p => ({
        productId: p.id,
        quantitySold: aggregatedSales[p.id] || 0,
        actualPrice: (calculateRecipeMaterialCost(recipes.find(r => r.id === p.recipeId)!, ingredients) / (recipes.find(r => r.id === p.recipeId)?.batchYield || 1) + p.packagingCost + p.variableDeliveryCost + ((p.laborTimeMinutes/60)*settings.hourlyRate) + (settings.fixedCostItems.reduce((s,i)=>s+i.amount,0) / products.reduce((s,prod)=>s+(prod.estimatedMonthlySales||1),0))) / (1 - settings.taxRate/100) + p.targetMargin
        // Rough default price estimate based on current settings, user can override
      }));
      setSales(initialSales);
    }
  }, [selectedMonth, orders.length, settings.fixedCostItems.length]); // Dependency simplifications for MVP

  // --- Handlers ---
  const handleSaleChange = (productId: string, field: 'quantitySold' | 'actualPrice', value: number) => {
    setSales(prev => prev.map(s => s.productId === productId ? { ...s, [field]: value } : s));
  };

  const handleFixedItemChange = (id: string, val: number) => {
    setActualFixedItems(prev => prev.map(i => i.id === id ? { ...i, amount: val } : i));
  };

  const saveReport = () => {
    const report: MonthlyReportData = {
      id: selectedMonth,
      monthStr: selectedMonth,
      sales,
      actualFixedCostItems: actualFixedItems,
      actualIngredientSpend,
      totalRevenue,
      netResult,
      isLocked: true
    };
    
    // Upsert
    const others = savedReports.filter(r => r.monthStr !== selectedMonth);
    setSavedReports([...others, report]);
    alert('Bilan sauvegardé !');
  };

  const pushActualsToForecast = () => {
    if (window.confirm("Remplacer vos charges fixes prévisionnelles (Paramètres) par ces charges réelles ?")) {
      setSettings(prev => ({ ...prev, fixedCostItems: actualFixedItems.map(i => ({ ...i })) })); // Deep copy
    }
  };

  // --- Calculations ---
  const totalRevenue = sales.reduce((sum, s) => sum + (s.quantitySold * s.actualPrice), 0);
  
  const calculatedFoodCost = sales.reduce((sum, s) => {
    const product = products.find(p => p.id === s.productId);
    const recipe = recipes.find(r => r.id === product?.recipeId);
    if (!product || !recipe) return sum;
    const batchCost = calculateRecipeMaterialCost(recipe, ingredients);
    const unitCost = batchCost / (recipe.batchYield || 1);
    const unitCostWithLoss = unitCost * (1 / (1 - product.lossRate / 100));
    return sum + (unitCostWithLoss * s.quantitySold);
  }, 0);

  const finalFoodCost = useCalculatedFoodCost ? calculatedFoodCost : actualIngredientSpend;
  const totalPackagingCost = sales.reduce((sum, s) => sum + ((products.find(p => p.id === s.productId)?.packagingCost || 0) * s.quantitySold), 0);
  const totalTaxes = totalRevenue * (settings.taxRate / 100);
  const totalVariableCosts = finalFoodCost + totalPackagingCost + totalTaxes;
  const grossMargin = totalRevenue - totalVariableCosts;
  const totalActualFixedCosts = actualFixedItems.reduce((sum, i) => sum + i.amount, 0);
  const netResult = grossMargin - totalActualFixedCosts;

  if (viewHistory) {
    return (
      <div className="space-y-6">
        <Button onClick={() => setViewHistory(false)} variant="secondary">← Retour au bilan actuel</Button>
        <h2 className="text-2xl font-bold font-serif text-rose-950">Historique des Bilans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {savedReports.map(report => (
            <Card key={report.id} className="cursor-pointer hover:border-rose-300" onClick={() => { setSelectedMonth(report.monthStr); setViewHistory(false); }}>
              <h3 className="font-bold text-lg mb-2">{report.monthStr}</h3>
              <div className="flex justify-between text-sm">
                <span>CA:</span>
                <span className="font-medium">{formatCurrency(report.totalRevenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Net:</span>
                <span className={`font-bold ${report.netResult >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(report.netResult)}</span>
              </div>
            </Card>
          ))}
          {savedReports.length === 0 && <p className="text-stone-500 italic">Aucun bilan sauvegardé.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
      {/* Controls & Inputs (Hidden on Print) */}
      <div className="lg:col-span-5 space-y-6 print:hidden no-print">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-stone-200">
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase">Mois du bilan</label>
            <input 
              type="month" 
              className="font-bold text-stone-800 bg-transparent focus:outline-none"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            />
          </div>
          <Button size="sm" variant="ghost" onClick={() => setViewHistory(true)}>Voir Historique</Button>
        </div>

        <Card>
          <h3 className="text-lg font-bold text-stone-800 mb-4 font-serif">1. Ventes Réelles</h3>
          <p className="text-xs text-stone-500 mb-4">Pré-rempli avec les commandes livrées ce mois-ci.</p>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {sales.map(s => {
              const p = products.find(prod => prod.id === s.productId);
              if (!p) return null;
              return (
                <div key={s.productId} className="p-3 border border-stone-100 rounded-lg bg-stone-50">
                  <div className="font-medium text-stone-700 text-sm mb-2">{p.name}</div>
                  <div className="flex gap-2">
                    <Input 
                      className="flex-1"
                      label="Qté" 
                      type="number" 
                      value={s.quantitySold}
                      onChange={e => handleSaleChange(s.productId, 'quantitySold', parseFloat(e.target.value))}
                    />
                    <Input 
                      className="flex-1"
                      label="Prix Réel" 
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

        <Card>
          <h3 className="text-lg font-bold text-stone-800 mb-4 font-serif">2. Dépenses Réelles</h3>
          
          <div className="space-y-4 mb-6">
            <h4 className="text-sm font-bold text-stone-600 border-b border-stone-100 pb-1">Charges Fixes</h4>
            {actualFixedItems.map(item => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <span className="text-stone-600">{item.name}</span>
                <input 
                  type="number" 
                  className="w-20 text-right bg-stone-50 border border-stone-200 rounded px-1 py-0.5"
                  value={item.amount}
                  onChange={e => handleFixedItemChange(item.id, parseFloat(e.target.value))}
                />
              </div>
            ))}
            <button onClick={pushActualsToForecast} className="text-xs text-[#D45D79] hover:underline mt-2">
              Utiliser ces valeurs comme prévision (Paramètres)
            </button>
          </div>
          
          <div className="pt-4 border-t border-stone-100">
             <div className="flex items-center justify-between mb-2">
               <label className="text-sm font-bold text-stone-700">Matières Premières</label>
               <button 
                onClick={() => setUseCalculatedFoodCost(!useCalculatedFoodCost)}
                className="text-xs text-[#D45D79] hover:underline"
               >
                 {useCalculatedFoodCost ? "Saisir montant réel ?" : "Utiliser le calcul théorique ?"}
               </button>
             </div>
             
             {useCalculatedFoodCost ? (
               <div className="p-3 bg-stone-50 rounded text-stone-600 text-sm italic">
                 Calculé théorique : <strong>{formatCurrency(calculatedFoodCost)}</strong>
               </div>
             ) : (
               <Input 
                 label="Total achats ingrédients" 
                 type="number"
                 suffix="€"
                 value={actualIngredientSpend}
                 onChange={e => setActualIngredientSpend(parseFloat(e.target.value))}
               />
             )}
          </div>
        </Card>

        <Button className="w-full shadow-lg" onClick={saveReport}>Sauvegarder ce Bilan</Button>
      </div>

      {/* Report Output */}
      <div className="lg:col-span-7">
        <Card className="h-full border-rose-100 shadow-xl bg-white print:border-none print:shadow-none">
          <div className="flex justify-between items-start mb-6 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-3xl font-bold text-rose-950 font-serif">Bilan Mensuel</h2>
              <p className="text-stone-500">{new Date(selectedMonth).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="text-right no-print">
              <Button size="sm" variant="secondary" onClick={() => window.print()}>🖨️ Imprimer</Button>
            </div>
          </div>

          <div className="space-y-0 text-sm">
            {/* Revenue */}
            <div className="flex justify-between items-center py-4 border-b border-stone-100">
              <span className="font-bold text-lg text-stone-700">Chiffre d'Affaires (CA)</span>
              <span className="font-bold text-xl text-stone-900">{formatCurrency(totalRevenue)}</span>
            </div>

            {/* Variable Costs Group */}
            <div className="py-4 space-y-2">
              <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Charges Variables</div>
              
              <div className="flex justify-between items-center pl-4">
                <span className="text-stone-600">- Matières Premières</span>
                <span className="text-red-500">{formatCurrency(finalFoodCost)}</span>
              </div>
              <div className="flex justify-between items-center pl-4">
                <span className="text-stone-600">- Emballages</span>
                <span className="text-red-500">{formatCurrency(totalPackagingCost)}</span>
              </div>
              <div className="flex justify-between items-center pl-4">
                <span className="text-stone-600">- Cotisations Sociales ({settings.taxRate}%)</span>
                <span className="text-red-500">{formatCurrency(totalTaxes)}</span>
              </div>
            </div>

            {/* Margin Line */}
            <div className="flex justify-between items-center py-4 border-t border-b border-stone-200 bg-[#FDF8F6] px-4 -mx-6">
              <span className="font-bold text-stone-800">Marge sur Coûts Variables</span>
              <span className={`font-bold text-lg ${grossMargin >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {formatCurrency(grossMargin)}
              </span>
            </div>

            {/* Fixed Costs */}
            <div className="py-4">
              <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Charges Fixes</div>
              <div className="space-y-1">
                {actualFixedItems.map(i => (
                  <div key={i.id} className="flex justify-between items-center pl-4 text-stone-500 text-xs">
                     <span>{i.name}</span>
                     <span>{formatCurrency(i.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pl-4 mt-2 font-medium border-t border-stone-100 pt-2">
                <span className="text-stone-600">Total Fixe</span>
                <span className="text-red-500">{formatCurrency(totalActualFixedCosts)}</span>
              </div>
            </div>

            {/* Final Result */}
            <div className="mt-6 p-6 bg-[#D45D79] text-white rounded-xl shadow-lg print:bg-white print:text-black print:border print:border-black">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold font-serif">RÉSULTAT NET</span>
                <span className="text-3xl font-bold">
                  {formatCurrency(netResult)}
                </span>
              </div>
              <p className="text-xs text-rose-100 mt-2 text-center print:hidden">
                Ceci est votre rémunération "dans la poche" pour le mois.
              </p>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-stone-100 text-center text-xs text-stone-400">
            Les douceurs de Miléna • Document généré le {new Date().toLocaleDateString()}
          </div>
        </Card>
      </div>
    </div>
  );
};
