
import React, { useState } from 'react';
import { Ingredient, Recipe, Unit, RecipeIngredient } from '../../types';
import { convertToCostPerBaseUnit, calculateRecipeMaterialCost } from '../../utils';
import { isValidPercentage, isValidPositiveNumber } from '../../validation';
import { Button, Card, Input, Select, InfoTooltip } from '../ui/Common';

interface Props {
  ingredients: Ingredient[];
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
}

export const IngredientsRecettes: React.FC<Props> = ({ ingredients, setIngredients, recipes, setRecipes }) => {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'recettes'>('ingredients');
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- Ingredient State ---
  const [newIng, setNewIng] = useState<Partial<Ingredient>>({ unit: Unit.KG, quantity: 1, price: 0 });

  const isIngredientPriceValid = isValidPositiveNumber(Number(newIng.price));
  const isIngredientQuantityValid = isValidPositiveNumber(Number(newIng.quantity));
  const canSaveIngredient = Boolean(newIng.name) && isIngredientPriceValid && isIngredientQuantityValid;

  const handleAddIngredient = () => {
    if (!canSaveIngredient) return;
    const costPerBaseUnit = convertToCostPerBaseUnit(Number(newIng.price), Number(newIng.quantity), newIng.unit as Unit);
    
    if (editingId) {
      setIngredients(ingredients.map(i => i.id === editingId ? {
        ...i,
        name: newIng.name!,
        unit: newIng.unit as Unit,
        price: Number(newIng.price),
        quantity: Number(newIng.quantity),
        costPerBaseUnit
      } : i));
      setEditingId(null);
    } else {
      setIngredients([...ingredients, {
        id: Date.now().toString(),
        name: newIng.name,
        unit: newIng.unit as Unit,
        price: Number(newIng.price),
        quantity: Number(newIng.quantity),
        costPerBaseUnit
      }]);
    }
    setNewIng({ unit: Unit.KG, quantity: 1, name: '', price: 0 });
  };

  const handleEditIngredient = (ing: Ingredient) => {
    setNewIng({
      name: ing.name,
      unit: ing.unit,
      price: ing.price,
      quantity: ing.quantity
    });
    setEditingId(ing.id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewIng({ unit: Unit.KG, quantity: 1, name: '', price: 0 });
  };

  const handleDeleteIngredient = (id: string) => {
    setIngredients(ingredients.filter(i => i.id !== id));
    if (editingId === id) handleCancelEdit();
  };

  // --- Recipe State ---
  const [newRecipe, setNewRecipe] = useState<Partial<Recipe>>({ name: '', batchYield: 1, lossPercentage: 0 });
  const [currentRecipeIngs, setCurrentRecipeIngs] = useState<RecipeIngredient[]>([]);
  const [selectedIngId, setSelectedIngId] = useState<string>('');
  const [selectedIngQty, setSelectedIngQty] = useState<string>('');

  const handleAddIngToRecipe = () => {
    const qty = parseFloat(selectedIngQty);
    if (!selectedIngId || isNaN(qty) || qty <= 0) return;
    
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

  const isBatchYieldValid = isValidPositiveNumber(Number(newRecipe.batchYield));
  const isLossPercentageValid = isValidPercentage(Number(newRecipe.lossPercentage));
  const canSaveRecipe = Boolean(newRecipe.name) && currentRecipeIngs.length > 0 && isBatchYieldValid && isLossPercentageValid;

  const handleSaveRecipe = () => {
    if (!canSaveRecipe) return;
    setRecipes([...recipes, {
      id: Date.now().toString(),
      name: newRecipe.name!,
      ingredients: currentRecipeIngs,
      batchYield: Number(newRecipe.batchYield),
      lossPercentage: Number(newRecipe.lossPercentage)
    }]);
    setNewRecipe({ name: '', batchYield: 1, lossPercentage: 0 });
    setCurrentRecipeIngs([]);
  };

  const handleDeleteRecipe = (id: string) => {
    setRecipes(recipes.filter(r => r.id !== id));
  };

  // Calculate provisional cost of new recipe
  const tempRecipe: Recipe = {
    id: 'temp',
    name: 'temp',
    ingredients: currentRecipeIngs,
    batchYield: Number(newRecipe.batchYield),
    lossPercentage: Number(newRecipe.lossPercentage)
  };
  const tempBatchCost = calculateRecipeMaterialCost(tempRecipe, ingredients);
  const tempUnitCost = isBatchYieldValid ? tempBatchCost / Number(newRecipe.batchYield) : NaN;

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 border-b border-slate-300 dark:border-slate-700">
        <button 
          onClick={() => setActiveTab('ingredients')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ingredients' ? 'border-rose-500 text-rose-600 dark:text-rose-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
        >
          Ingrédients ({ingredients.length})
        </button>
        <button 
          onClick={() => setActiveTab('recettes')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'recettes' ? 'border-rose-500 text-rose-600 dark:text-rose-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
        >
          Recettes ({recipes.length})
        </button>
      </div>

      {activeTab === 'ingredients' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Stock Ingrédients</h3>
            <div className="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-200 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold">
                  <tr>
                    <th className="p-3">Nom</th>
                    <th className="p-3">Achat</th>
                    <th className="p-3">Coût calculé <InfoTooltip text="Coût ramené à l'unité de base (1g, 1ml, 1pièce) pour les calculs" /></th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {ingredients.map(ing => (
                    <tr key={ing.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 ${editingId === ing.id ? 'bg-rose-50 dark:bg-rose-900/20' : ''}`}>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{ing.name}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {ing.price}€ / {ing.quantity} {ing.unit}
                      </td>
                      <td className="p-3 text-emerald-600 dark:text-emerald-400 font-medium">
                        {(ing.costPerBaseUnit * (ing.unit === Unit.KG || ing.unit === Unit.L ? 1000 : 1)).toFixed(2)}€ 
                        / {ing.unit === Unit.KG ? 'kg' : ing.unit === Unit.L ? 'L' : ing.unit}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button onClick={() => handleEditIngredient(ing)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium">Modif.</button>
                        <button onClick={() => handleDeleteIngredient(ing.id)} className="text-red-400 hover:text-red-600 font-medium">Suppr.</button>
                      </td>
                    </tr>
                  ))}
                  {ingredients.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-slate-400 dark:text-slate-500">Aucun ingrédient. Ajoutez-en un à droite.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="h-fit sticky top-24">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
              {editingId ? "Modifier l'ingrédient" : "Ajouter un ingrédient"}
            </h3>
            <div className="space-y-4">
              <Input 
                label="Nom" 
                placeholder="Ex: Beurre doux"
                value={newIng.name} 
                onChange={e => setNewIng({...newIng, name: e.target.value})} 
              />
              <div className="grid grid-cols-2 gap-4">
                 <Input 
                  label="Prix d'achat (€)" 
                  type="number" 
                  step="0.01"
                  value={newIng.price} 
                  onChange={e => setNewIng({...newIng, price: parseFloat(e.target.value)})}
                  error={!isIngredientPriceValid ? '> 0' : undefined}
                />
                 <Select 
                  label="Unité stock" 
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
              </div>
              <Input 
                label={`Quantité achetée (en ${newIng.unit})`} 
                type="number" 
                value={newIng.quantity} 
                onChange={e => setNewIng({...newIng, quantity: parseFloat(e.target.value)})}
                error={!isIngredientQuantityValid ? '> 0' : undefined}
                helperText={newIng.unit === Unit.KG ? "Ex: Si 2.5kg, entrez 2.5" : ""}
              />
              <div className="flex gap-2">
                {editingId && (
                   <Button variant="secondary" onClick={handleCancelEdit} className="w-1/3">
                     Annuler
                   </Button>
                )}
                <Button className="flex-1" onClick={handleAddIngredient} disabled={!canSaveIngredient}>
                  {editingId ? "Mettre à jour" : "Ajouter au stock"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* New Recipe Form */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="sticky top-24">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Créer une Recette</h3>
              
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
                    value={newRecipe.batchYield} 
                    onChange={e => setNewRecipe({...newRecipe, batchYield: parseFloat(e.target.value)})}
                    error={!isBatchYieldValid ? '> 0' : undefined}
                    helperText="Nb. de portions/unités obtenues avec ce batch"
                  />
                  <Input 
                    label="Pertes mat. (%)" 
                    type="number"
                    value={newRecipe.lossPercentage} 
                    onChange={e => setNewRecipe({...newRecipe, lossPercentage: parseFloat(e.target.value)})}
                    error={!isLossPercentageValid ? '< 100%' : undefined}
                    helperText="Pâte restée dans le bol..."
                  />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mb-6">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Composition du batch</h4>
                <div className="flex gap-2 mb-2">
                  <select 
                    className="flex-1 text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 rounded-md focus:ring-2 focus:ring-rose-200 focus:outline-none"
                    value={selectedIngId}
                    onChange={e => setSelectedIngId(e.target.value)}
                  >
                    <option value="">Choisir ingrédient...</option>
                    {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                  <input 
                    type="number" 
                    placeholder="Qté" 
                    className="w-20 text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 rounded-md focus:ring-2 focus:ring-rose-200 focus:outline-none"
                    value={selectedIngQty}
                    onChange={e => setSelectedIngQty(e.target.value)}
                  />
                  <Button size="sm" onClick={handleAddIngToRecipe}>+</Button>
                </div>
                {/* List of added ingredients */}
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {currentRecipeIngs.map((ri, idx) => {
                    const ing = ingredients.find(i => i.id === ri.ingredientId);
                    if(!ing) return null;
                    const displayUnit = (ing.unit === Unit.KG || ing.unit === Unit.G) ? 'g' : (ing.unit === Unit.L || ing.unit === Unit.ML) ? 'ml' : 'pcs';
                    return (
                      <div key={idx} className="flex justify-between text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-100 dark:border-slate-700">
                        <span>{ing.name}</span>
                        <span>{ri.quantity} {displayUnit}</span>
                      </div>
                    );
                  })}
                  {currentRecipeIngs.length === 0 && <p className="text-xs text-slate-400 italic">Aucun ingrédient ajouté</p>}
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

              <Button className="w-full" onClick={handleSaveRecipe} disabled={!canSaveRecipe}>
                Enregistrer la recette
              </Button>
            </Card>
          </div>

          {/* Recipe List */}
          <div className="lg:col-span-7 space-y-4">
             <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Mes Recettes</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {recipes.map(recipe => {
                 const batchCost = calculateRecipeMaterialCost(recipe, ingredients);
                 const unitCost = batchCost / (recipe.batchYield || 1);
                 return (
                   <Card key={recipe.id} className="relative hover:shadow-md transition-shadow">
                     <div className="flex justify-between items-start mb-2">
                       <h4 className="font-bold text-slate-800 dark:text-slate-100">{recipe.name}</h4>
                       <button onClick={() => handleDeleteRecipe(recipe.id)} className="text-xs text-red-400 hover:text-red-600">X</button>
                     </div>
                     <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                       Rendement: {recipe.batchYield} unités <br/>
                       {recipe.ingredients.length} ingrédients
                     </div>
                     <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-end">
                       <div>
                         <p className="text-xs text-slate-400 dark:text-slate-500">Coût unitaire mat.</p>
                         <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{unitCost.toFixed(2)} €</p>
                       </div>
                       <div className="text-right">
                         <p className="text-xs text-slate-400 dark:text-slate-500">Coût batch</p>
                         <p className="font-medium text-slate-600 dark:text-slate-300">{batchCost.toFixed(2)} €</p>
                       </div>
                     </div>
                   </Card>
                 );
               })}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
