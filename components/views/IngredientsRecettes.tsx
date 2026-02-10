
import React, { useState } from 'react';
import { Ingredient, Recipe, Unit, RecipeIngredient } from '../../types';
import { calculateRecipeMaterialCost } from '../../utils';
import { isPercentage, isPositiveNumber, parseOptionalNumber } from '../../validation';
import { Button, Card, Input } from '../ui/Common';
import { usePersistentState } from '../../usePersistentState';

interface Props {
  ingredients: Ingredient[];
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
}

export const IngredientsRecettes: React.FC<Props> = ({ ingredients, recipes, setRecipes }) => {
  // Scaler State: Map recipeID -> targetQuantity (string for input handling)
  const [scalerTargets, setScalerTargets] = useState<Record<string, string>>({});

  // --- Recipe State ---
  const [newRecipe, setNewRecipe, resetNewRecipe] = usePersistentState<Partial<Recipe>>('draft:recipe:newRecipe', { name: '', batchYield: 1, lossPercentage: 0 });
  const [currentRecipeIngs, setCurrentRecipeIngs, resetCurrentRecipeIngs] = usePersistentState<RecipeIngredient[]>('draft:recipe:ingredients', []);
  const [selectedIngId, setSelectedIngId, resetSelectedIngId] = usePersistentState<string>('draft:recipe:selectedIngId', '');
  const [selectedIngQty, setSelectedIngQty, resetSelectedIngQty] = usePersistentState<string>('draft:recipe:selectedIngQty', '');
  const [editingRecipeId, setEditingRecipeId, resetEditingRecipeId] = usePersistentState<string | null>('draft:recipe:editingId', null);

  const isBatchYieldValid = isPositiveNumber(newRecipe.batchYield);
  const isLossPercentageValid = isPercentage(newRecipe.lossPercentage);
  const isRecipeFormValid = Boolean(newRecipe.name && currentRecipeIngs.length > 0 && isBatchYieldValid && isLossPercentageValid);
  const selectedIngredient = ingredients.find(i => i.id === selectedIngId);

  const getRecipeUnitLabel = (unit?: Unit): string => {
    if (!unit) return '';
    if (unit === Unit.KG || unit === Unit.G) return Unit.G;
    if (unit === Unit.L || unit === Unit.ML) return Unit.ML;
    return Unit.PIECE;
  };

  const handleAddIngToRecipe = () => {
    const qty = parseOptionalNumber(selectedIngQty);
    if (!selectedIngId || !isPositiveNumber(qty)) return;
    
    // Check if already added
    const exists = currentRecipeIngs.find(i => i.ingredientId === selectedIngId);
    if (exists) {
      setCurrentRecipeIngs(currentRecipeIngs.map(i => i.ingredientId === selectedIngId ? { ...i, quantity: i.quantity + qty } : i));
    } else {
      setCurrentRecipeIngs([...currentRecipeIngs, { ingredientId: selectedIngId, quantity: qty }]);
    }
    
    setSelectedIngId('');
    setSelectedIngQty('');
  };

  const resetRecipeDraft = () => {
    resetNewRecipe();
    resetCurrentRecipeIngs();
    resetSelectedIngId();
    resetSelectedIngQty();
    resetEditingRecipeId();
  };

  const confirmCancelRecipeDraft = () => {
    if (!newRecipe.name && currentRecipeIngs.length === 0 && !selectedIngId && !selectedIngQty) return;
    if (window.confirm('Annuler la création/modification de recette ? Les saisies en cours seront perdues.')) {
      resetRecipeDraft();
    }
  };

  const handleSaveRecipe = () => {
    if (!isRecipeFormValid) return;
    const recipeToSave: Recipe = {
      id: editingRecipeId ?? Date.now().toString(),
      name: newRecipe.name!,
      ingredients: currentRecipeIngs,
      batchYield: Number(newRecipe.batchYield ?? 1),
      lossPercentage: Number(newRecipe.lossPercentage ?? 0)
    };

    if (editingRecipeId) {
      setRecipes(recipes.map(r => r.id === editingRecipeId ? recipeToSave : r));
    } else {
      setRecipes([...recipes, recipeToSave]);
    }
    resetRecipeDraft();
  };

  const handleDeleteRecipe = (id: string) => {
    setRecipes(recipes.filter(r => r.id !== id));
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setNewRecipe({ name: recipe.name, batchYield: recipe.batchYield, lossPercentage: recipe.lossPercentage });
    setCurrentRecipeIngs(recipe.ingredients);
    setSelectedIngId('');
    setSelectedIngQty('');
  };

  const handleRemoveRecipeIngredient = (ingredientId: string) => {
    setCurrentRecipeIngs(currentRecipeIngs.filter(i => i.ingredientId !== ingredientId));
  };

  const handleUpdateRecipeIngredientQuantity = (ingredientId: string, value: string) => {
    const qty = parseOptionalNumber(value);
    if (!isPositiveNumber(qty)) return;
    setCurrentRecipeIngs(currentRecipeIngs.map(i => i.ingredientId === ingredientId ? { ...i, quantity: qty } : i));
  };

  const toggleScaler = (recipeId: string) => {
      setScalerTargets(prev => {
          const next = { ...prev };
          if (next[recipeId] !== undefined) delete next[recipeId];
          else next[recipeId] = '';
          return next;
      });
  };

  const updateScalerTarget = (recipeId: string, value: string) => {
      setScalerTargets(prev => ({ ...prev, [recipeId]: value }));
  };

  // Calculate provisional cost of new recipe
  const tempRecipe: Recipe = {
    id: 'temp',
    name: 'temp',
    ingredients: currentRecipeIngs,
    batchYield: newRecipe.batchYield ?? 1,
    lossPercentage: newRecipe.lossPercentage ?? 0
  };
  const tempBatchCost = calculateRecipeMaterialCost(tempRecipe, ingredients);
  const tempUnitCost = tempBatchCost / (newRecipe.batchYield ?? 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* New Recipe Form */}
      <div className="lg:col-span-5 space-y-6">
        <Card className="sticky top-24 border-rose-200 dark:border-rose-800">
          <h3 className="text-xl font-bold text-rose-950 dark:text-rose-100 font-serif mb-4">Créer une Recette</h3>
          <p className="text-sm text-stone-500 mb-4">Pour gérer les ingrédients (prix, stock), allez dans l'onglet "Stocks & Achats".</p>
          
          <div className="space-y-4 mb-6">
            <Input 
              label="Nom de la recette" 
              placeholder="Ex: Pâte à choux (50 chouquettes)"
              value={newRecipe.name} 
              onChange={e => setNewRecipe({...newRecipe, name: e.target.value})} 
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Rendement" 
                type="number"
                value={newRecipe.batchYield ?? ''} 
                onChange={e => setNewRecipe({...newRecipe, batchYield: parseOptionalNumber(e.target.value)})} 
                helperText="Nb. de portions/unités obtenues avec ce batch"
                error={isBatchYieldValid ? undefined : '> 0'}
              />
              <Input 
                label="Pertes mat. (%)" 
                type="number"
                value={newRecipe.lossPercentage ?? ''} 
                onChange={e => setNewRecipe({...newRecipe, lossPercentage: parseOptionalNumber(e.target.value)})} 
                helperText="Pâte restée dans le bol..."
                error={isLossPercentageValid ? undefined : '< 100%'}
              />
            </div>
          </div>

          <div className="bg-stone-50 dark:bg-stone-900 p-4 rounded-lg border border-stone-200 dark:border-stone-700 mb-6">
            <h4 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">Composition du batch</h4>
            <div className="flex gap-2 mb-2">
              <select 
                className="flex-1 text-sm border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 rounded-md focus:ring-2 focus:ring-rose-200 focus:outline-none"
                value={selectedIngId}
                onChange={e => setSelectedIngId(e.target.value)}
              >
                <option value="">Choisir ingrédient...</option>
                {ingredients.map(i => <option key={i.id} value={i.id}>{`${i.name} (${getRecipeUnitLabel(i.unit)})`}</option>)}
              </select>
              <input 
                type="number" 
                placeholder="Qté" 
                className="w-24 text-sm border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 rounded-md focus:ring-2 focus:ring-rose-200 focus:outline-none"
                value={selectedIngQty}
                onChange={e => setSelectedIngQty(e.target.value)}
                lang="en"
                inputMode="decimal"
                step="0.01"
              />
              <span className="text-xs px-2 py-1 rounded bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-200 min-w-14 text-center">
                {selectedIngredient ? getRecipeUnitLabel(selectedIngredient.unit) : '-'}
              </span>
              <Button size="sm" onClick={handleAddIngToRecipe}>+</Button>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">Utilisez le point pour les décimales (ex: 3.5).</p>
            {/* List of added ingredients */}
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {currentRecipeIngs.map((ri, idx) => {
                const ing = ingredients.find(i => i.id === ri.ingredientId);
                if(!ing) return null;
                const displayUnit = getRecipeUnitLabel(ing.unit);
                return (
                  <div key={idx} className="flex justify-between items-center gap-2 text-sm text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-800 px-2 py-1 rounded border border-stone-100 dark:border-stone-700">
                    <span className="flex-1">{ing.name}</span>
                    <input
                      type="number"
                      lang="en"
                      inputMode="decimal"
                      step="0.01"
                      className="w-20 px-1 py-0.5 border rounded border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 dark:text-stone-100"
                      value={ri.quantity}
                      onChange={e => handleUpdateRecipeIngredientQuantity(ri.ingredientId, e.target.value)}
                    />
                    <span>{displayUnit}</span>
                    <button className="text-red-500 hover:text-red-700" onClick={() => handleRemoveRecipeIngredient(ri.ingredientId)}>×</button>
                  </div>
                );
              })}
              {currentRecipeIngs.length === 0 && <p className="text-xs text-stone-400 italic">Aucun ingrédient ajouté</p>}
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-lg mb-4 border border-emerald-100 dark:border-emerald-800">
            <div className="flex justify-between text-sm text-emerald-800 dark:text-emerald-300 mb-1">
              <span>Coût Matières Batch:</span>
              <span className="font-bold">{tempBatchCost.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm text-emerald-800 dark:text-emerald-300">
              <span>Coût Matières / Unité:</span>
              <span className="font-bold">{tempUnitCost.toFixed(2)} €</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="w-1/3" onClick={confirmCancelRecipeDraft}>Annuler</Button>
            <Button className="flex-1" onClick={handleSaveRecipe} disabled={!isRecipeFormValid}>
              {editingRecipeId ? 'Mettre à jour la recette' : 'Enregistrer la recette'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Recipe List */}
      <div className="lg:col-span-7 space-y-4">
          <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 font-serif">Mes Recettes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recipes.map(recipe => {
              const batchCost = calculateRecipeMaterialCost(recipe, ingredients);
              const unitCost = batchCost / (recipe.batchYield ?? 1);
              
              const isScaling = scalerTargets.hasOwnProperty(recipe.id);
              const targetQtyStr = scalerTargets[recipe.id] || '';
              const targetQty = parseFloat(targetQtyStr);
              const scaleRatio = (targetQty && !isNaN(targetQty)) ? targetQty / (recipe.batchYield ?? 1) : 1;

              return (
                <Card key={recipe.id} className="relative hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-stone-800 dark:text-stone-100">{recipe.name}</h4>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => toggleScaler(recipe.id)}
                        className={`text-xs px-2 py-1 rounded border ${isScaling ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:border-indigo-700' : 'bg-stone-50 text-stone-500 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700'}`}
                        title="Ouvrir le calculateur"
                      >
                        ⚖️
                      </button>
                      <button onClick={() => handleEditRecipe(recipe)} className="text-xs text-indigo-500 hover:text-indigo-700">✏️</button>
                      <button onClick={() => handleDeleteRecipe(recipe.id)} className="text-xs text-red-400 hover:text-red-600">X</button>
                    </div>
                  </div>
                  <div className="text-sm text-stone-500 dark:text-stone-400 mb-4">
                    Rendement standard: {recipe.batchYield} unités <br/>
                  </div>

                  {/* SCALER MODE */}
                  {isScaling && (
                    <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800 relative animate-in fade-in zoom-in-95 duration-200">
                       <div className="flex justify-between items-center mb-2">
                         <label className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Combien en voulez-vous ?</label>
                         <button 
                           onClick={(e) => { e.stopPropagation(); toggleScaler(recipe.id); }}
                           className="text-stone-400 hover:text-indigo-600 dark:text-stone-500 dark:hover:text-indigo-300 p-1"
                         >
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                             <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                           </svg>
                         </button>
                       </div>
                       <input 
                         type="number" 
                         className="w-full mb-2 px-2 py-1 text-sm border border-indigo-200 dark:border-indigo-700 rounded focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-stone-900 dark:text-white"
                         placeholder={recipe.batchYield.toString()}
                         value={targetQtyStr}
                         onChange={e => updateScalerTarget(recipe.id, e.target.value)}
                         autoFocus
                       />
                       <div className="max-h-32 overflow-y-auto space-y-1 mt-2 border-t border-indigo-200 dark:border-indigo-700 pt-2 custom-scrollbar">
                          {recipe.ingredients.map(ri => {
                            const ing = ingredients.find(i => i.id === ri.ingredientId);
                            if (!ing) return null;
                            const displayUnit = getRecipeUnitLabel(ing.unit);
                            const scaledQty = ri.quantity * scaleRatio;
                            
                            return (
                              <div key={ri.ingredientId} className="flex justify-between text-xs text-indigo-900 dark:text-indigo-200">
                                <span>{ing.name}</span>
                                <span className="font-bold">{scaledQty.toFixed(1)} {displayUnit}</span>
                              </div>
                            )
                          })}
                       </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-stone-100 dark:border-stone-700 flex justify-between items-end">
                    <div>
                      <p className="text-xs text-stone-400 dark:text-stone-500">Coût unitaire mat.</p>
                      <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{unitCost.toFixed(2)} €</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-stone-400 dark:text-stone-500">Coût batch</p>
                      <p className="font-medium text-stone-600 dark:text-stone-300">{batchCost.toFixed(2)} €</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
      </div>
    </div>
  );
};
