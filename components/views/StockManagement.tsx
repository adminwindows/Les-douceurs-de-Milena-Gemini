
import React, { useState, useMemo } from 'react';
import { Ingredient, Unit, Purchase, ProductionBatch, Recipe, Product } from '../../types';
import { convertToCostPerBaseUnit, formatCurrency } from '../../utils';
import { isNonNegativeNumber, isPositiveNumber, parseOptionalNumber } from '../../validation';
import { Button, Card, Input, Select } from '../ui/Common';
import { usePersistentState } from '../../usePersistentState';

interface Props {
  ingredients: Ingredient[];
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  purchases: Purchase[];
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
  productionBatches: ProductionBatch[];
  recipes: Recipe[];
  products: Product[];
}

export const StockManagement: React.FC<Props> = ({ 
  ingredients, setIngredients, purchases, setPurchases, productionBatches, recipes, products 
}) => {
  const [activeTab, setActiveTab] = usePersistentState<'purchases' | 'analysis' | 'definitions'>('draft:stock:activeTab', 'purchases');

  // --- Purchase Logic ---
  const [newPurchase, setNewPurchase, resetNewPurchase] = usePersistentState<Partial<Purchase>>('draft:stock:newPurchase', { 
    date: new Date().toISOString().split('T')[0],
    quantity: 0,
    price: 0
  });

  const isPurchaseQuantityValid = isPositiveNumber(newPurchase.quantity);
  const isPurchasePriceValid = isPositiveNumber(newPurchase.price);
  const isPurchaseFormValid = Boolean(newPurchase.ingredientId && isPurchaseQuantityValid && isPurchasePriceValid);

  const handleAddPurchase = () => {
    if (!isPurchaseFormValid) return;
    setPurchases([...purchases, {
      id: Date.now().toString(),
      date: newPurchase.date || new Date().toISOString().split('T')[0],
      ingredientId: newPurchase.ingredientId,
      quantity: Number(newPurchase.quantity),
      price: Number(newPurchase.price)
    }]);
    resetNewPurchase();
  };

  const handleDeletePurchase = (id: string) => {
    setPurchases(purchases.filter(p => p.id !== id));
  };

  // --- Ingredient Definition Logic ---
  const [newIng, setNewIng, resetNewIng] = usePersistentState<Partial<Ingredient>>('draft:stock:newIng', { unit: Unit.KG, price: 0 });
  const [editingId, setEditingId, resetEditingId] = usePersistentState<string | null>('draft:stock:editingId', null);
  const isIngredientPriceValid = isNonNegativeNumber(newIng.price);
  const isIngredientFormValid = Boolean(newIng.name && isIngredientPriceValid);
  
  const handleAddOrUpdateIngredient = () => {
    if (!isIngredientFormValid) return;
    const costPerBaseUnit = convertToCostPerBaseUnit(Number(newIng.price || 0), 1, newIng.unit as Unit); 
    
    if (editingId) {
        setIngredients(prev => prev.map(i => i.id === editingId ? {
            ...i,
            name: newIng.name!,
            unit: newIng.unit as Unit,
            price: Number(newIng.price || 0),
            costPerBaseUnit
        } : i));
        setEditingId(null);
    } else {
        setIngredients([...ingredients, {
            id: Date.now().toString(),
            name: newIng.name,
            unit: newIng.unit as Unit,
            price: Number(newIng.price || 0),
            quantity: 0, // Starts with 0 stock
            costPerBaseUnit
        }]);
    }
    resetNewIng();
  };

  const startEditIngredient = (ing: Ingredient) => {
      setNewIng({
          name: ing.name,
          unit: ing.unit,
          price: ing.price
      });
      setEditingId(ing.id);
  };

  const cancelEdit = () => {
      setEditingId(null);
      resetNewIng();
  };

  const handleDeleteIngredient = (id: string) => {
    if(confirm("Supprimer cet ingrédient ? Cela affectera les recettes qui l'utilisent.")) {
        setIngredients(ingredients.filter(i => i.id !== id));
        if (editingId === id) cancelEdit();
    }
  };


  const confirmCancelIngredientDraft = () => {
    const hasDraft = Boolean(newIng.name || newIng.price);
    if (!hasDraft && !editingId) return;
    if (window.confirm('Annuler la création/modification ingrédient ? Les saisies en cours seront perdues.')) {
      resetEditingId();
      resetNewIng();
    }
  };

  const confirmCancelPurchaseDraft = () => {
    const hasDraft = Boolean(newPurchase.ingredientId || newPurchase.quantity || newPurchase.price);
    if (!hasDraft) return;
    if (window.confirm('Annuler la saisie achat en cours ?')) {
      resetNewPurchase();
    }
  };

  // --- Analysis & Stock Logic ---
  const stockAnalysis = useMemo(() => {
    return ingredients.map(ing => {
      // 1. Calculate Purchased Quantity and Spend
      const ingPurchases = purchases.filter(p => p.ingredientId === ing.id);
      const totalPurchasedQty = ingPurchases.reduce((acc, p) => acc + p.quantity, 0);
      const totalSpent = ingPurchases.reduce((acc, p) => acc + p.price, 0);
      
      // 2. Calculate Prices (Average vs Last)
      // Terminology Update: "CUMP" -> "Prix Moyen"
      const averagePrice = totalPurchasedQty > 0 ? totalSpent / totalPurchasedQty : 0;
      
      const sortedPurchases = [...ingPurchases].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastPurchase = sortedPurchases[0];
      const lastPrice = lastPurchase ? (lastPurchase.price / lastPurchase.quantity) : 0;

      // 3. Calculate Consumption based on Production Batches
      // This is the "Theoretical" usage INCLUDING LOSS RATE
      let totalConsumed = 0;
      productionBatches.forEach(batch => {
        const product = products.find(p => p.id === batch.productId);
        if(!product) return;
        const recipe = recipes.find(r => r.id === product.recipeId);
        if(!recipe) return;

        const recipeIng = recipe.ingredients.find(ri => ri.ingredientId === ing.id);
        if(!recipeIng) return;

        // Qty used per product unit
        let qtyPerUnit = recipeIng.quantity / (recipe.batchYield ?? 1);
        
        // Apply Manufacturing Loss Rate from Product (the "real" consumption)
        // If loss rate is 10%, we consume 1/(1-0.10) times more to get the final unit
        const lossMultiplier = 1 / (1 - (product.lossRate / 100));

        qtyPerUnit = qtyPerUnit * lossMultiplier;

        // Convert recipe unit to stock unit if necessary
        // Assumption: Recipe is usually G/ML, Stock is KG/L
        let convertedQtyPerUnit = qtyPerUnit;
        if (ing.unit === Unit.KG || ing.unit === Unit.L) {
           convertedQtyPerUnit = qtyPerUnit / 1000;
        }

        totalConsumed += convertedQtyPerUnit * batch.quantity;
      });

      const currentStock = totalPurchasedQty - totalConsumed;

      return {
        ingredient: ing,
        currentStock,
        averagePrice, // Previously CUMP
        lastPrice,
        totalPurchasedQty
      };
    });
  }, [ingredients, purchases, productionBatches, recipes, products]);

  const updateStandardPrice = (ingId: string, newPrice: number) => {
    setIngredients(prev => prev.map(i => {
      if(i.id !== ingId) return i;
      const costPerBaseUnit = convertToCostPerBaseUnit(newPrice, 1, i.unit);
      return { ...i, price: newPrice, costPerBaseUnit };
    }));
  };

  return (
    <div className="space-y-6">
       <div className="flex space-x-4 border-b border-stone-300 dark:border-stone-700 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('purchases')}
          className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'purchases' ? 'border-rose-500 text-rose-600 dark:text-rose-400' : 'border-transparent text-stone-500 hover:text-stone-700 dark:text-stone-400'}`}
        >
          🛒 Journal des Achats
        </button>
        <button 
          onClick={() => setActiveTab('analysis')}
          className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'analysis' ? 'border-rose-500 text-rose-600 dark:text-rose-400' : 'border-transparent text-stone-500 hover:text-stone-700 dark:text-stone-400'}`}
        >
          📊 Stocks & Prix Moyens
        </button>
        <button 
          onClick={() => setActiveTab('definitions')}
          className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'definitions' ? 'border-rose-500 text-rose-600 dark:text-rose-400' : 'border-transparent text-stone-500 hover:text-stone-700 dark:text-stone-400'}`}
        >
          📝 Référentiel Ingrédients
        </button>
      </div>

      {activeTab === 'definitions' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="md:col-span-1 h-fit lg:sticky lg:top-24">
             <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">{editingId ? 'Modifier Ingrédient' : 'Nouvel Ingrédient'}</h3>
             <div className="space-y-4">
               <Input 
                 label="Nom" 
                 value={newIng.name} 
                 onChange={e => setNewIng({...newIng, name: e.target.value})} 
               />
               <Select 
                  label="Unité de Stock" 
                  options={[
                    { value: Unit.KG, label: 'Kilogramme (kg)' },
                    { value: Unit.G, label: 'Gramme (g)' },
                    { value: Unit.L, label: 'Litre (L)' },
                    { value: Unit.ML, label: 'Millilitre (ml)' },
                    { value: Unit.PIECE, label: 'Pièce' },
                  ]}
                  value={newIng.unit}
                  onChange={e => setNewIng({...newIng, unit: e.target.value as Unit})}
                />
               <Input 
                 label="Prix Standard estimé (€)" 
                 type="number"
                 step="0.01"
                 value={newIng.price ?? ''} 
                 onChange={e => setNewIng({...newIng, price: parseOptionalNumber(e.target.value)})}
                 helperText="Prix pour 1 unité de stock (ex: pour 1kg)" 
                 error={isIngredientPriceValid ? undefined : '≥ 0'}
               />
               <div className="flex gap-2">
                 <Button variant="secondary" onClick={confirmCancelIngredientDraft} className="w-1/3">Annuler</Button>
                 <Button onClick={handleAddOrUpdateIngredient} disabled={!isIngredientFormValid} className="flex-1">
                     {editingId ? 'Mettre à jour' : 'Créer Fiche'}
                 </Button>
               </div>
             </div>
           </Card>
           <Card className="md:col-span-2">
             <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">Liste des Ingrédients (Fiches Techniques)</h3>
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left text-stone-600 dark:text-stone-300">
                 <thead className="bg-stone-100 dark:bg-stone-900 font-bold uppercase text-xs">
                   <tr>
                     <th className="p-3">Nom</th>
                     <th className="p-3">Unité</th>
                     <th className="p-3">Prix Standard</th>
                     <th className="p-3">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                   {ingredients.map(ing => (
                     <tr key={ing.id} className={`hover:bg-stone-50 dark:hover:bg-stone-800 ${editingId === ing.id ? 'bg-rose-50 dark:bg-rose-900/20' : ''}`}>
                       <td className="p-3 font-medium">{ing.name}</td>
                       <td className="p-3"><span className="bg-stone-200 dark:bg-stone-700 px-2 py-0.5 rounded text-xs">{ing.unit}</span></td>
                       <td className="p-3">{formatCurrency(ing.price)}</td>
                       <td className="p-3 space-x-2">
                         <button onClick={() => startEditIngredient(ing)} className="text-indigo-500 hover:text-indigo-700 text-xs font-bold">Modifier</button>
                         <button onClick={() => handleDeleteIngredient(ing.id)} className="text-red-500 hover:text-red-700 text-xs">Supprimer</button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </Card>
        </div>
      )}

      {activeTab === 'purchases' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 h-fit lg:sticky lg:top-24">
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">Enregistrer un Achat</h3>
            <div className="space-y-4">
              <Input 
                label="Date" 
                type="date"
                value={newPurchase.date} 
                onChange={e => setNewPurchase({...newPurchase, date: e.target.value})} 
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-stone-700 dark:text-stone-300">Ingrédient</label>
                <select 
                  className="px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-900 focus:border-[#D45D79] shadow-sm"
                  value={newPurchase.ingredientId}
                  onChange={e => setNewPurchase({...newPurchase, ingredientId: e.target.value})}
                >
                  <option value="">Choisir...</option>
                  {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Quantité" 
                  type="number"
                  step="0.01"
                  value={newPurchase.quantity ?? ''} 
                  onChange={e => setNewPurchase({...newPurchase, quantity: parseOptionalNumber(e.target.value)})} 
                  error={isPurchaseQuantityValid ? undefined : '> 0'}
                />
                <Input 
                  label="Prix Payé (Total)" 
                  type="number"
                  step="0.01"
                  suffix="€"
                  value={newPurchase.price ?? ''} 
                  onChange={e => setNewPurchase({...newPurchase, price: parseOptionalNumber(e.target.value)})} 
                  error={isPurchasePriceValid ? undefined : '> 0'}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={confirmCancelPurchaseDraft} className="w-1/3">Annuler</Button>
                <Button onClick={handleAddPurchase} disabled={!isPurchaseFormValid} className="flex-1">
                  Ajouter au Journal
                </Button>
              </div>
            </div>
          </Card>
          
          <Card className="md:col-span-2">
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">Historique des Achats</h3>
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-sm text-left text-stone-600 dark:text-stone-300">
                <thead className="bg-stone-100 dark:bg-stone-900 font-bold uppercase text-xs">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Ingrédient</th>
                    <th className="p-3 text-right">Qté</th>
                    <th className="p-3 text-right">Prix Total</th>
                    <th className="p-3 text-right">Prix Unit.</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {[...purchases].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(p => {
                    const ing = ingredients.find(i => i.id === p.ingredientId);
                    return (
                      <tr key={p.id} className="hover:bg-stone-50 dark:hover:bg-stone-800">
                        <td className="p-3">{new Date(p.date).toLocaleDateString()}</td>
                        <td className="p-3 font-medium text-stone-800 dark:text-stone-200">{ing?.name || 'Inconnu'}</td>
                        <td className="p-3 text-right">{p.quantity} {ing?.unit}</td>
                        <td className="p-3 text-right font-bold">{formatCurrency(p.price)}</td>
                        <td className="p-3 text-right text-xs text-stone-400">{(p.price/p.quantity).toFixed(2)}€/{ing?.unit}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => handleDeletePurchase(p.id)} className="text-stone-300 hover:text-red-500">×</button>
                        </td>
                      </tr>
                    );
                  })}
                  {purchases.length === 0 && <tr><td colSpan={6} className="p-4 text-center italic">Aucun achat enregistré.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'analysis' && (
        <Card>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
             <div>
               <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100">Analyse Stocks & Prix</h3>
               <p className="text-sm text-stone-500">Stock théorique calculé (incluant pertes de fabrication) et valorisation.</p>
             </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-100 dark:bg-stone-900 font-bold uppercase text-xs text-stone-600 dark:text-stone-400">
                <tr>
                  <th className="p-3 min-w-[150px]">Ingrédient</th>
                  <th className="p-3 text-right">Stock Théorique</th>
                  <th className="p-3 text-right bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300">Prix Standard (Fiche)</th>
                  <th className="p-3 text-right">Dernier Prix Achat</th>
                  <th className="p-3 text-right">Prix Moyen (Lissé)</th>
                  <th className="p-3 text-center">Mise à jour Fiche</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                {stockAnalysis.map(row => (
                  <tr key={row.ingredient.id} className="hover:bg-stone-50 dark:hover:bg-stone-800">
                    <td className="p-3 font-medium text-stone-800 dark:text-stone-200">
                      {row.ingredient.name}
                      <span className="block text-xs text-stone-400 font-normal">Unité: {row.ingredient.unit}</span>
                    </td>
                    <td className={`p-3 text-right font-bold ${row.currentStock < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {row.currentStock.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-bold bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400">
                      {formatCurrency(row.ingredient.price)}
                    </td>
                    <td className="p-3 text-right text-stone-600 dark:text-stone-400">
                      {row.lastPrice > 0 ? formatCurrency(row.lastPrice) : '-'}
                    </td>
                    <td className="p-3 text-right text-stone-600 dark:text-stone-400">
                       {row.averagePrice > 0 ? formatCurrency(row.averagePrice) : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-2 justify-center">
                        {row.lastPrice > 0 && Math.abs(row.lastPrice - row.ingredient.price) > 0.01 && (
                          <button 
                            onClick={() => updateStandardPrice(row.ingredient.id, row.lastPrice)}
                            className="text-xs bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 px-2 py-1 rounded transition-colors"
                            title="Mettre à jour le prix standard avec le dernier prix d'achat"
                          >
                            Utiliser Dernier ({formatCurrency(row.lastPrice)})
                          </button>
                        )}
                        {row.averagePrice > 0 && Math.abs(row.averagePrice - row.ingredient.price) > 0.01 && (
                           <button 
                             onClick={() => updateStandardPrice(row.ingredient.id, row.averagePrice)}
                             className="text-xs bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 px-2 py-1 rounded transition-colors"
                             title="Mettre à jour le prix standard avec le Coût Moyen Lissé"
                           >
                             Utiliser Moyen ({formatCurrency(row.averagePrice)})
                           </button>
                        )}
                        {row.lastPrice === 0 && row.averagePrice === 0 && <span className="text-xs text-stone-300">Pas d'achats</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
