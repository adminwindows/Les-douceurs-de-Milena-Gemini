
import React, { useState } from 'react';
import { Product, Recipe, Ingredient, GlobalSettings } from '../../types';
import { calculateProductMetrics, formatCurrency } from '../../utils';
import { Button, Card, Input, Select, InfoTooltip } from '../ui/Common';

interface Props {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  recipes: Recipe[];
  settings?: GlobalSettings; 
}

// Default categories + user can type new ones
const DEFAULT_CATEGORIES = ['Gâteau', 'Biscuit', 'Entremet', 'Tarte', 'Viennoiserie', 'Autre'];

export const Products: React.FC<Props> = ({ products, setProducts, recipes }) => {
  return (
      <ProductsContent products={products} setProducts={setProducts} recipes={recipes} />
  );
};

export const ProductsContent: React.FC<Props & { settings?: GlobalSettings }> = ({ products, setProducts, recipes, settings }) => {
  const isTvaEnabled = settings?.isTvaSubject || false;
  const defaultTva = settings?.defaultTvaRate || 5.5;

  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    laborTimeMinutes: 15,
    packagingCost: 0.10,
    variableDeliveryCost: 0,
    lossRate: 0, 
    unsoldEstimate: 0, 
    packagingUsedOnUnsold: true, 
    targetMargin: 0,
    estimatedMonthlySales: 0,
    category: 'Gâteau',
    tvaRate: defaultTva
  });

  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const lossRate = newProduct.lossRate ?? 0;
  const isLossRateValid = !isNaN(lossRate) && lossRate >= 0 && lossRate < 100;

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.recipeId || !isLossRateValid) return;

    setProducts([...products, {
      id: Date.now().toString(),
      name: newProduct.name,
      recipeId: newProduct.recipeId,
      laborTimeMinutes: Number(newProduct.laborTimeMinutes),
      packagingCost: Number(newProduct.packagingCost),
      variableDeliveryCost: Number(newProduct.variableDeliveryCost),
      lossRate: Number(newProduct.lossRate),
      unsoldEstimate: Number(newProduct.unsoldEstimate),
      packagingUsedOnUnsold: !!newProduct.packagingUsedOnUnsold,
      targetMargin: Number(newProduct.targetMargin),
      estimatedMonthlySales: Number(newProduct.estimatedMonthlySales),
      category: newProduct.category || 'Autre',
      tvaRate: Number(newProduct.tvaRate ?? defaultTva)
    }]);

    setNewProduct({
      name: '',
      laborTimeMinutes: 15,
      packagingCost: 0.10,
      variableDeliveryCost: 0,
      lossRate: 0,
      unsoldEstimate: 0,
      packagingUsedOnUnsold: true,
      targetMargin: 0,
      estimatedMonthlySales: 0,
      category: 'Gâteau',
      recipeId: '',
      tvaRate: defaultTva
    });
    setIsCustomCategory(false);
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const categoryOptions = [
    ...DEFAULT_CATEGORIES.map(c => ({ value: c, label: c })),
    { value: 'custom__', label: '+ Autre / Nouveau...' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Form */}
      <div className="lg:col-span-4">
        <Card className="sticky top-24 border-rose-200 dark:border-rose-800 shadow-rose-100/50 dark:shadow-none">
          <h3 className="text-xl font-bold text-rose-950 dark:text-rose-100 font-serif mb-6 flex items-center gap-2">
            Nouveau Produit
            <InfoTooltip text="Un produit est ce que vous vendez au client. Il est basé sur une recette." />
          </h3>
          
          <div className="space-y-5">
            <Input 
              label="Nom commercial" 
              placeholder="Ex: Cookie Géant Pépites"
              value={newProduct.name || ''} 
              onChange={e => setNewProduct({...newProduct, name: e.target.value})} 
            />
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-stone-700 dark:text-stone-300">Recette de base</label>
              <select
                className="px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-900 focus:border-[#D45D79] shadow-sm"
                value={newProduct.recipeId || ''}
                onChange={e => setNewProduct({...newProduct, recipeId: e.target.value})}
              >
                <option value="">Sélectionner une recette...</option>
                {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            {isCustomCategory ? (
                <div className="flex flex-col gap-1.5">
                   <label className="text-sm font-bold text-stone-700 dark:text-stone-300">Catégorie</label>
                   <div className="flex gap-2">
                     <input 
                       className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-900 focus:border-[#D45D79] shadow-sm"
                       value={newProduct.category}
                       onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                       placeholder="Nom de la catégorie"
                       autoFocus
                     />
                     <Button variant="secondary" onClick={() => { setIsCustomCategory(false); setNewProduct({...newProduct, category: 'Gâteau'}); }}>
                       Liste
                     </Button>
                   </div>
                </div>
            ) : (
                <Select
                    label="Catégorie"
                    options={categoryOptions}
                    value={newProduct.category}
                    onChange={(e) => {
                        if (e.target.value === 'custom__') {
                            setIsCustomCategory(true);
                            setNewProduct({...newProduct, category: ''});
                        } else {
                            setNewProduct({...newProduct, category: e.target.value});
                        }
                    }}
                />
            )}

            <div className="p-4 bg-[#FDF8F6] dark:bg-stone-900 rounded-lg border border-rose-100 dark:border-stone-700 grid grid-cols-2 gap-4">
               <Input 
                label="Ventes / mois" 
                type="number"
                suffix="u"
                value={newProduct.estimatedMonthlySales} 
                onChange={e => setNewProduct({...newProduct, estimatedMonthlySales: parseFloat(e.target.value)})} 
                helperText="Prévision"
              />
               <Input 
                label="Invendus est." 
                type="number"
                suffix="u"
                value={newProduct.unsoldEstimate} 
                onChange={e => setNewProduct({...newProduct, unsoldEstimate: parseFloat(e.target.value)})} 
                helperText="Pertes produits finis"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Main d'œuvre" 
                type="number"
                suffix="min"
                value={newProduct.laborTimeMinutes} 
                onChange={e => setNewProduct({...newProduct, laborTimeMinutes: parseFloat(e.target.value)})} 
                helperText="Temps/unité"
              />
               <Input 
                label={`Emballage ${isTvaEnabled ? 'HT' : ''}`}
                type="number"
                step="0.01"
                suffix="€"
                value={newProduct.packagingCost} 
                onChange={e => setNewProduct({...newProduct, packagingCost: parseFloat(e.target.value)})} 
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="packagingOnUnsold"
                className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                checked={newProduct.packagingUsedOnUnsold}
                onChange={e => setNewProduct({...newProduct, packagingUsedOnUnsold: e.target.checked})}
              />
              <label htmlFor="packagingOnUnsold" className="text-sm text-stone-600 dark:text-stone-400 cursor-pointer">
                L'emballage est perdu si invendu ? 
                <span className="block text-xs text-stone-400 dark:text-stone-500">Si non coché, le coût emballage ne s'applique pas aux invendus.</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <Input 
                  label="Perte Fab." 
                  type="number"
                  suffix="%"
                  min={0}
                  max={99.9}
                  value={newProduct.lossRate} 
                  onChange={e => setNewProduct({...newProduct, lossRate: parseFloat(e.target.value)})} 
                  error={!isLossRateValid ? "< 100%" : undefined}
                />
                <div className="text-[10px] text-stone-400 dark:text-stone-500 leading-tight">
                  % pâte/gâteaux ratés (fabrication).
                </div>
              </div>
              <Input 
                label="Marge cible" 
                type="number"
                step="0.10"
                suffix="€"
                value={newProduct.targetMargin} 
                onChange={e => setNewProduct({...newProduct, targetMargin: parseFloat(e.target.value)})} 
                helperText="Profit net souhaité"
              />
            </div>

            {isTvaEnabled && (
               <Input 
                label="Taux TVA" 
                type="number"
                step="0.1"
                suffix="%"
                value={newProduct.tvaRate} 
                onChange={e => setNewProduct({...newProduct, tvaRate: parseFloat(e.target.value)})} 
                helperText={`Par défaut: ${defaultTva}%`}
              />
            )}

            <Button 
              className="w-full mt-4 py-3 shadow-md" 
              onClick={handleAddProduct} 
              disabled={!newProduct.name || !newProduct.recipeId || !isLossRateValid}
            >
              Ajouter au Catalogue
            </Button>
          </div>
        </Card>
      </div>

      {/* List */}
      <div className="lg:col-span-8 space-y-6">
        <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 font-serif">Catalogue ({products.length})</h3>
        
        {products.length === 0 ? (
          <div className="bg-stone-50 dark:bg-stone-900 border border-dashed border-stone-300 dark:border-stone-700 rounded-xl p-12 text-center">
            <p className="text-stone-500 dark:text-stone-400 mb-2">Votre catalogue est vide.</p>
            <p className="text-sm text-stone-400 dark:text-stone-500">Créez votre premier produit en utilisant le formulaire à gauche.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map(product => {
              const recipe = recipes.find(r => r.id === product.recipeId);
              const tvaDisplay = isTvaEnabled ? `(TVA ${product.tvaRate ?? defaultTva}%)` : '';
              
              return (
                <Card key={product.id} className="hover:border-rose-300 dark:hover:border-rose-700 transition-colors group flex flex-col h-full">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-[#FDF8F6] dark:bg-stone-900 text-[#D45D79] dark:text-rose-400 border border-rose-100 dark:border-rose-900 mb-2 uppercase tracking-wide">
                        {product.category}
                      </span>
                      <h4 className="text-lg font-bold text-stone-800 dark:text-stone-100 group-hover:text-[#D45D79] dark:group-hover:text-rose-400 transition-colors font-serif">
                        {product.name}
                      </h4>
                    </div>
                    <button onClick={() => handleDeleteProduct(product.id)} className="text-stone-300 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-2 text-sm text-stone-600 dark:text-stone-400 mb-4 flex-1">
                    <div className="col-span-2 flex items-center justify-between border-b border-stone-100 dark:border-stone-700 pb-1 mb-1">
                       <span className="text-stone-400 dark:text-stone-500">Recette</span>
                       <span className="font-medium truncate max-w-[150px]">{recipe?.name || 'Inconnue'}</span>
                    </div>
                    <div className="col-span-2 grid grid-cols-2 gap-2 text-xs text-stone-500 dark:text-stone-400">
                        <div>
                            <span className="block text-stone-400 dark:text-stone-500">Emballage</span>
                            <span className="font-semibold">{product.packagingCost}€</span>
                        </div>
                        <div>
                            <span className="block text-stone-400 dark:text-stone-500">MO</span>
                            <span className="font-semibold">{product.laborTimeMinutes} min</span>
                        </div>
                        <div>
                            <span className="block text-stone-400 dark:text-stone-500">Pertes Fab.</span>
                            <span className="font-semibold">{product.lossRate}%</span>
                        </div>
                        <div>
                            <span className="block text-stone-400 dark:text-stone-500">Invendus est.</span>
                            <span className="font-semibold">{product.unsoldEstimate} u/mois</span>
                        </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-[#D45D79] dark:text-rose-400 font-medium mt-2 pt-2 border-t border-stone-50 dark:border-stone-700">
                    <span className="text-stone-400 dark:text-stone-500">Volume: <strong className="text-stone-600 dark:text-stone-300">{product.estimatedMonthlySales}</strong>/mois</span>
                    <span>Analyse {tvaDisplay} &rarr;</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
