import React, { useState, useMemo } from 'react';
import { ProductionBatch, Product, Order, Recipe, Ingredient, Unit } from '../../types';
import { Card, Button, Input } from '../ui/Common';
import { usePersistentState } from '../../usePersistentState';
import { isPositiveNumber, parseOptionalNumber } from '../../validation';
import { applyIngredientUsage, computeProductionIngredientUsage, getStockShortages } from '../../stockMovements';
import { sumCompletedDeliveredQuantityByProduct } from '../../ordersMath';

interface Props {
  productionBatches: ProductionBatch[];
  setProductionBatches: React.Dispatch<React.SetStateAction<ProductionBatch[]>>;
  products: Product[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  orders?: Order[];
}

const getDisplayUnit = (unit: Unit) => {
  if (unit === Unit.KG || unit === Unit.G) return 'g';
  if (unit === Unit.L || unit === Unit.ML) return 'ml';
  return 'pièce';
};

export const Production: React.FC<Props> = ({ productionBatches, setProductionBatches, products, recipes, ingredients, setIngredients, orders = [] }) => {
  const [newBatch, setNewBatch, resetNewBatch] = usePersistentState<Partial<ProductionBatch>>('draft:production:newBatch', {
    date: new Date().toISOString().split('T')[0],
    quantity: 0
  });
  const isBatchQuantityValid = isPositiveNumber(newBatch.quantity);

  const selectedProduct = products.find(p => p.id === newBatch.productId);
  const selectedRecipe = recipes.find(r => r.id === selectedProduct?.recipeId);

  const scaledIngredients = useMemo(() => {
    if (!selectedRecipe || !isBatchQuantityValid) return [];

    const targetQty = Number(newBatch.quantity);
    const ratio = targetQty / (selectedRecipe.batchYield || 1);

    return selectedRecipe.ingredients.map(ri => {
      const ingredient = ingredients.find(i => i.id === ri.ingredientId);
      return {
        ingredientName: ingredient?.name || 'Ingrédient inconnu',
        requiredQuantity: ri.quantity * ratio,
        unit: ingredient ? getDisplayUnit(ingredient.unit) : ''
      };
    });
  }, [selectedRecipe, isBatchQuantityValid, newBatch.quantity, ingredients]);

  const handleAddBatch = () => {
    if (!newBatch.productId || !isBatchQuantityValid) return;

    const quantity = Number(newBatch.quantity);
    const usageResult = computeProductionIngredientUsage(
      [{ productId: newBatch.productId, quantity }],
      products,
      recipes,
      ingredients
    );
    const shortages = getStockShortages(ingredients, usageResult.usages);
    if (shortages.length > 0) {
      const lines = shortages
        .slice(0, 5)
        .map(shortage => `- ${shortage.ingredientName}: manque ${shortage.missing.toFixed(2)} ${shortage.unit}`)
        .join('\n');
      const more = shortages.length > 5 ? `\n...et ${shortages.length - 5} autre(s).` : '';
      const proceed = window.confirm(`Stock insuffisant:\n${lines}${more}\n\nContinuer quand meme ?`);
      if (!proceed) return;
    }

    setProductionBatches([
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        date: newBatch.date || new Date().toISOString().split('T')[0],
        productId: newBatch.productId,
        quantity
      },
      ...productionBatches
    ]);
    setIngredients(prev => applyIngredientUsage(prev, usageResult.usages, 'consume'));
    resetNewBatch();
  };


  const confirmCancelBatchDraft = () => {
    const hasDraft = Boolean(newBatch.productId || newBatch.quantity);
    if (!hasDraft) return;
    if (window.confirm('Annuler la saisie de production en cours ?')) {
      resetNewBatch();
    }
  };

  const handleDeleteBatch = (id: string) => {
    const batch = productionBatches.find(entry => entry.id === id);
    if (!batch) return;

    const linkedOrder = batch.sourceOrderId
      ? orders.find(order => order.id === batch.sourceOrderId)
      : orders.find(order => (
        Boolean(order.productionLaunchedAt) &&
        order.date === batch.date &&
        order.items.some(item => item.productId === batch.productId)
      ));

    const warningMessage = linkedOrder
      ? `Cette ligne peut etre liee a la commande \"${linkedOrder.customerName}\" deja marquee comme production lancee.\n\nSupprimer quand meme cette ligne ?`
      : 'Supprimer cette ligne de production ? Cette action peut desynchroniser une commande marquee comme production lancee.';

    if (!window.confirm(warningMessage)) return;
    const usageResult = computeProductionIngredientUsage(
      [{ productId: batch.productId, quantity: batch.quantity }],
      products,
      recipes,
      ingredients
    );
    setProductionBatches(productionBatches.filter(b => b.id !== id));
    setIngredients(prev => applyIngredientUsage(prev, usageResult.usages, 'restore'));
  };

  // Calculate Alerts
  const productionAlerts = useMemo(() => {
    const alerts: { productId: string; produced: number; delivered: number; diff: number }[] = [];

    products.forEach(p => {
      const totalDelivered = sumCompletedDeliveredQuantityByProduct(orders, p.id);

      const totalProduced = productionBatches
        .filter(b => b.productId === p.id)
        .reduce((sum, b) => sum + b.quantity, 0);

      if (totalDelivered > totalProduced) {
        alerts.push({
          productId: p.id,
          produced: totalProduced,
          delivered: totalDelivered,
          diff: totalDelivered - totalProduced
        });
      }
    });
    return alerts;
  }, [products, orders, productionBatches]);

  return (
    <div className="space-y-6">
      {/* Alert Section */}
      {productionAlerts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200 font-bold">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M8.485 2.495c.961-1.986 3.84-1.986 4.799 0l6.512 13.469c.928 1.918-.466 4.036-2.6 4.036H2.804c-2.135 0-3.528-2.118-2.6-4.036L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            Attention : Stock insuffisant (Ventes livrées {'>'} Production)
          </div>
          <ul className="list-disc pl-8 space-y-1 text-sm text-red-700 dark:text-red-300">
            {productionAlerts.map(alert => {
              const p = products.find(prod => prod.id === alert.productId);
              return (
                <li key={alert.productId}>
                  <strong>{p?.name || 'Produit inconnu'}</strong> : {alert.delivered} livrés vs {alert.produced} produits (Manque {alert.diff})
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <Card className="lg:sticky lg:top-24 border-rose-200 dark:border-rose-800">
            <h3 className="text-xl font-bold text-rose-950 dark:text-rose-100 font-serif mb-4">Enregistrer une Production</h3>
            <p className="text-sm text-stone-500 mb-4">Notez ici ce que vous sortez du four. Cela déduira automatiquement les ingrédients du stock.</p>

            <div className="space-y-4">
              <Input
                label="Date"
                type="date"
                value={newBatch.date}
                onChange={e => setNewBatch({ ...newBatch, date: e.target.value })}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-stone-700 dark:text-stone-300">Produit Fabriqué</label>
                <select
                  className="px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-900 focus:border-[#D45D79] shadow-sm"
                  value={newBatch.productId}
                  onChange={e => setNewBatch({ ...newBatch, productId: e.target.value })}
                >
                  <option value="">Choisir un produit...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <Input
                label="Quantité Produite"
                type="number"
                value={newBatch.quantity ?? ''}
                onChange={e => setNewBatch({ ...newBatch, quantity: parseOptionalNumber(e.target.value) })}
                helperText="Nombre d'unités (ex: 50 cookies)"
                error={isBatchQuantityValid ? undefined : '> 0'}
              />

              <div className="flex gap-2">
                <Button variant="secondary" className="w-1/3" onClick={confirmCancelBatchDraft}>Annuler</Button>
                <Button onClick={handleAddBatch} disabled={!newBatch.productId || !isBatchQuantityValid} className="flex-1 shadow-md">
                  Valider la Production
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {selectedProduct && selectedRecipe && scaledIngredients.length > 0 && (
            <Card className="border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-200 font-serif">📋 Fiche recette production</h3>
                <span className="text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-800">
                  {selectedProduct.name} · {newBatch.quantity} unités
                </span>
              </div>
              <p className="text-sm text-stone-600 dark:text-stone-300 mb-3">
                Quantités à préparer pour cette production (base recette: {selectedRecipe.batchYield} unités).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {scaledIngredients.map((item, index) => (
                  <div key={`${item.ingredientName}-${index}`} className="flex justify-between text-sm bg-stone-50 dark:bg-stone-900 px-3 py-2 rounded border border-stone-100 dark:border-stone-700">
                    <span className="text-stone-700 dark:text-stone-300">{item.ingredientName}</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{item.requiredQuantity.toFixed(2)} {item.unit}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-6">Historique de Production</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-stone-100 dark:bg-stone-900 font-bold uppercase text-xs text-stone-600 dark:text-stone-400">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Produit</th>
                    <th className="p-3 text-right">Quantité</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {productionBatches.map(batch => {
                    const prod = products.find(p => p.id === batch.productId);
                    return (
                      <tr key={batch.id} className="hover:bg-stone-50 dark:hover:bg-stone-800">
                        <td className="p-3 text-stone-600 dark:text-stone-400">{new Date(batch.date).toLocaleDateString()}</td>
                        <td className="p-3 font-bold text-stone-800 dark:text-stone-200">{prod?.name || 'Inconnu'}</td>
                        <td className="p-3 text-right text-rose-600 dark:text-rose-400 font-bold">{batch.quantity}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => handleDeleteBatch(batch.id)} className="text-stone-300 hover:text-red-500">×</button>
                        </td>
                      </tr>
                    );
                  })}
                  {productionBatches.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-stone-400 italic">Aucune production enregistrée.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
