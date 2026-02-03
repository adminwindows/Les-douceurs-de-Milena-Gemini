import React, { useState } from 'react';
import { Ingredient, Recipe, Unit, RecipeIngredient } from '../../types';
import { convertToCostPerBaseUnit, calculateRecipeMaterialCost, toInputValue, toNumber } from '../../utils';
import { Button, Card, Input, Select, InfoTooltip } from '../ui/Common';

interface Props {
  ingredients: Ingredient[];
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
}

export const IngredientsRecettes: React.FC<Props> = ({ ingredients, setIngredients, recipes, setRecipes }) => {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'recettes'>('ingredients');

  // --- Ingredient State ---
  const [newIng, setNewIng] = useState<Partial<Ingredient>>({ unit: Unit.KG, quantity: 1, price: 0 });

  const handleAddIngredient = () => {
    const priceValue = toNumber(newIng.price ?? '');
    const quantityValue = toNumber(newIng.quantity ?? '');
    if (!newIng.name || !Number.isFinite(priceValue) || !Number.isFinite(quantityValue) || quantityValue <= 0 || priceValue < 0) {
      return;
    }
    const costPerBaseUnit = convertToCostPerBaseUnit(priceValue, quantityValue, newIng.unit as Unit);
    
    setIngredients([...ingredients, {
      id: Date.now().toString(),
      name: newIng.name,
      unit: newIng.unit as Unit,
      price: priceValue,
      quantity: quantityValue,
      costPerBaseUnit
    }]);
    setNewIng({ unit: Unit.KG, quantity: 1, name: '', price: 0 });
  };

  const handleDeleteIngredient = (id: string) => {
    setIngredients(ingredients.filter(i => i.id !== id));
  };

  // --- Recipe State ---
  const [newRecipe, setNewRecipe] = useState<Partial<Recipe>>({ name: '', batchYield: 1, lossPercentage: 0 });
  const [currentRecipeIngs, setCurrentRecipeIngs] = useState<RecipeIngredient[]>([]);
  const [selectedIngId, setSelectedIngId] = useState<string>('');
  const [selectedIngQty, setSelectedIngQty] = useState<string>('');

  const handleAddIngToRecipe = () => {
    const qty = toNumber(selectedIngQty);
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

  const handleSaveRecipe = () => {
    if (!newRecipe.name || currentRecipeIngs.length === 0) return;
    if (!canSaveRecipe) return;
    const batchYieldValue = toNumber(newRecipe.batchYield ?? '');
    const lossPercentageValue = toNumber(newRecipe.lossPercentage ?? '');
    setRecipes([...recipes, {
      id: Date.now().toString(),
      name: newRecipe.name!,
      ingredients: currentRecipeIngs,
      batchYield: batchYieldValue,
      lossPercentage: lossPercentageValue
    }]);
    setNewRecipe({ name: '', batchYield: 1, lossPercentage: 0 });
    setCurrentRecipeIngs([]);
  };

  const handleDeleteRecipe = (id: string) => {
    setRecipes(recipes.filter(r => r.id !== id));
  };

  const getIngredientName = (id: string) => ingredients.find(i => i.id === id)?.name || 'Inconnu';
  const getIngredientUnit = (id: string) => ingredients.find(i => i.id === id)?.unit || '';

  // Calculate provisional cost of new recipe
  const tempRecipeBatchYield = toNumber(newRecipe.batchYield ?? '');
  const tempRecipeLoss = toNumber(newRecipe.lossPercentage ?? '');
  const tempRecipe: Recipe = {
    id: 'temp',
    name: 'temp',
    ingredients: currentRecipeIngs,
    batchYield: Number.isFinite(tempRecipeBatchYield) && tempRecipeBatchYield > 0 ? tempRecipeBatchYield : 1,
    lossPercentage: Number.isFinite(tempRecipeLoss) && tempRecipeLoss >= 0 ? tempRecipeLoss : 0
  };
  const tempBatchCost = calculateRecipeMaterialCost(tempRecipe, ingredients);
  const tempUnitCost = tempBatchCost / tempRecipe.batchYield;

  const ingredientPriceValue = toNumber(newIng.price ?? '');
  const ingredientQuantityValue = toNumber(newIng.quantity ?? '');
  const batchYieldValue = toNumber(newRecipe.batchYield ?? '');
  const lossPercentageValue = toNumber(newRecipe.lossPercentage ?? '');
  const ingredientPriceError = newIng.price !== undefined && (!Number.isFinite(ingredientPriceValue) || ingredientPriceValue < 0) ? '≥ 0' : undefined;
  const ingredientQuantityError = newIng.quantity !== undefined && (!Number.isFinite(ingredientQuantityValue) || ingredientQuantityValue <= 0) ? '> 0' : undefined;
  const batchYieldError = !Number.isFinite(batchYieldValue) || batchYieldValue <= 0 ? '> 0' : undefined;
  const lossPercentageError = !Number.isFinite(lossPercentageValue) || lossPercentageValue < 0 || lossPercentageValue >= 100 ? '0 à 99.99' : undefined;
  const canAddIngredient = !!newIng.name
    && Number.isFinite(ingredientPriceValue)
    && ingredientPriceValue >= 0
    && Number.isFinite(ingredientQuantityValue)
    && ingredientQuantityValue > 0;
  const canSaveRecipe = !!newRecipe.name
    && currentRecipeIngs.length > 0
    && Number.isFinite(batchYieldValue)
    && batchYieldValue > 0
    && Number.isFinite(lossPercentageValue)
    && lossPercentageValue >= 0
    && lossPercentageValue < 100;

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('ingredients')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ingredients' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Ingrédients ({ingredients.length})
        </button>
        <button 
          onClick={() => setActiveTab('recettes')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'recettes' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Recettes ({recipes.length})
        </button>
      </div>

      {activeTab === 'ingredients' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Stock Ingrédients</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium">
                  <tr>
                    <th className="p-3">Nom</th>
                    <th className="p-3">Achat</th>
                    <th className="p-3">Coût calculé <InfoTooltip text="Coût ramené à l'unité de base (1g, 1ml, 1pièce) pour les calculs" /></th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ingredients.map(ing => (
                    <tr key={ing.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">{ing.name}</td>
                      <td className="p-3 text-slate-600">
                        {ing.price}€ / {ing.quantity} {ing.unit}
                      </td>
                      <td className="p-3 text-emerald-600 font-medium">
                        {(ing.costPerBaseUnit * (ing.unit === Unit.KG || ing.unit === Unit.L ? 1000 : 1)).toFixed(2)}€ 
                        / {ing.unit === Unit.KG ? 'kg' : ing.unit === Unit.L ? 'L' : ing.unit}
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => handleDeleteIngredient(ing.id)} className="text-red-400 hover:text-red-600 font-medium">Supprimer</button>
                      </td>
                    </tr>
                  ))}
                  {ingredients.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-slate-400">Aucun ingrédient. Ajoutez-en un à droite.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="h-fit sticky top-24">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Ajouter un ingrédient</h3>
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
                  value={toInputValue(newIng.price ?? Number.NaN)} 
                  onChange={e => setNewIng({...newIng, price: toNumber(e.target.value)})}
                  error={ingredientPriceError}
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
                value={toInputValue(newIng.quantity ?? Number.NaN)} 
                onChange={e => setNewIng({...newIng, quantity: toNumber(e.target.value)})}
                error={ingredientQuantityError}
                helperText={newIng.unit === Unit.KG ? "Ex: Si 2.5kg, entrez 2.5" : ""}
              />
              <Button className="w-full" onClick={handleAddIngredient} disabled={!canAddIngredient}>
                Ajouter au stock
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* New Recipe Form */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="sticky top-24">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Créer une Recette</h3>
              
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
                    value={toInputValue(newRecipe.batchYield ?? Number.NaN)} 
                    onChange={e => setNewRecipe({...newRecipe, batchYield: toNumber(e.target.value)})} 
                    error={batchYieldError}
                    helperText="Nb. de portions/unités obtenues avec ce batch"
                  />
                  <Input 
                    label="Pertes mat. (%)" 
                    type="number"
                    value={toInputValue(newRecipe.lossPercentage ?? Number.NaN)} 
                    onChange={e => setNewRecipe({...newRecipe, lossPercentage: toNumber(e.target.value)})}
                    error={lossPercentageError}
                    helperText="Pâte restée dans le bol..."
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Composition du batch</h4>
                <div className="flex gap-2 mb-2">
                  <select 
                    className="flex-1 text-sm border-slate-200 rounded-md"
                    value={selectedIngId}
                    onChange={e => setSelectedIngId(e.target.value)}
                  >
                    <option value="">Choisir ingrédient...</option>
                    {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                  <input 
                    type="number" 
                    placeholder="Qté" 
                    className="w-20 text-sm border-slate-200 rounded-md"
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
                      <div key={idx} className="flex justify-between text-sm text-slate-600 bg-white px-2 py-1 rounded border border-slate-100">
                        <span>{ing.name}</span>
                        <span>{ri.quantity} {displayUnit}</span>
                      </div>
                    );
                  })}
                  {currentRecipeIngs.length === 0 && <p className="text-xs text-slate-400 italic">Aucun ingrédient ajouté</p>}
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-lg mb-4">
                <div className="flex justify-between text-sm text-emerald-800 mb-1">
                  <span>Coût Matières Batch:</span>
                  <span className="font-bold">{tempBatchCost.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-800">
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
             <h3 className="text-lg font-bold text-slate-800">Mes Recettes</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {recipes.map(recipe => {
                 const batchCost = calculateRecipeMaterialCost(recipe, ingredients);
                 const unitCost = batchCost / (recipe.batchYield || 1);
                 return (
                   <Card key={recipe.id} className="relative hover:shadow-md transition-shadow">
                     <div className="flex justify-between items-start mb-2">
                       <h4 className="font-bold text-slate-800">{recipe.name}</h4>
                       <button onClick={() => handleDeleteRecipe(recipe.id)} className="text-xs text-red-400 hover:text-red-600">X</button>
                     </div>
                     <div className="text-sm text-slate-500 mb-4">
                       Rendement: {recipe.batchYield} unités <br/>
                       {recipe.ingredients.length} ingrédients
                     </div>
                     <div className="pt-3 border-t border-slate-100 flex justify-between items-end">
                       <div>
                         <p className="text-xs text-slate-400">Coût unitaire mat.</p>
                         <p className="text-lg font-bold text-rose-600">{unitCost.toFixed(2)} €</p>
                       </div>
                       <div className="text-right">
                         <p className="text-xs text-slate-400">Coût batch</p>
                         <p className="font-medium text-slate-600">{batchCost.toFixed(2)} €</p>
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
