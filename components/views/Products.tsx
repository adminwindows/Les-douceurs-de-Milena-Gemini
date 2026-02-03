import React, { useState } from 'react';
import { Product, Recipe } from '../../types';
import { Button, Card, Input, Select, InfoTooltip } from '../ui/Common';
import { toInputValue, toNumber } from '../../utils';

interface Props {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  recipes: Recipe[];
}

export const Products: React.FC<Props> = ({ products, setProducts, recipes }) => {
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    laborTimeMinutes: 15,
    packagingCost: 0.10,
    variableDeliveryCost: 0,
    lossRate: 0,
    targetMargin: 0,
    estimatedMonthlySales: 0,
    category: 'gateau'
  });

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.recipeId) return;
    const estimatedMonthlySalesValue = toNumber(newProduct.estimatedMonthlySales ?? '');
    const laborTimeValue = toNumber(newProduct.laborTimeMinutes ?? '');
    const packagingCostValue = toNumber(newProduct.packagingCost ?? '');
    const deliveryCostValue = toNumber(newProduct.variableDeliveryCost ?? '');
    const lossRateValue = toNumber(newProduct.lossRate ?? '');
    const targetMarginValue = toNumber(newProduct.targetMargin ?? '');
    const isValid = [
      estimatedMonthlySalesValue,
      laborTimeValue,
      packagingCostValue,
      deliveryCostValue,
      lossRateValue,
      targetMarginValue
    ].every(value => Number.isFinite(value))
      && estimatedMonthlySalesValue >= 0
      && laborTimeValue >= 0
      && packagingCostValue >= 0
      && deliveryCostValue >= 0
      && lossRateValue >= 0
      && lossRateValue < 100
      && targetMarginValue >= 0;
    if (!isValid) return;

    setProducts([...products, {
      id: Date.now().toString(),
      name: newProduct.name,
      recipeId: newProduct.recipeId,
      laborTimeMinutes: laborTimeValue,
      packagingCost: packagingCostValue,
      variableDeliveryCost: deliveryCostValue,
      lossRate: lossRateValue,
      targetMargin: targetMarginValue,
      estimatedMonthlySales: estimatedMonthlySalesValue,
      category: newProduct.category as any
    }]);

    setNewProduct({
      name: '',
      laborTimeMinutes: 15,
      packagingCost: 0.10,
      variableDeliveryCost: 0,
      lossRate: 0,
      targetMargin: 0,
      estimatedMonthlySales: 0,
      category: 'gateau',
      recipeId: ''
    });
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const estimatedMonthlySalesValue = toNumber(newProduct.estimatedMonthlySales ?? '');
  const laborTimeValue = toNumber(newProduct.laborTimeMinutes ?? '');
  const packagingCostValue = toNumber(newProduct.packagingCost ?? '');
  const deliveryCostValue = toNumber(newProduct.variableDeliveryCost ?? '');
  const lossRateValue = toNumber(newProduct.lossRate ?? '');
  const targetMarginValue = toNumber(newProduct.targetMargin ?? '');
  const estimatedMonthlySalesError = !Number.isFinite(estimatedMonthlySalesValue) || estimatedMonthlySalesValue < 0 ? '≥ 0' : undefined;
  const laborTimeError = !Number.isFinite(laborTimeValue) || laborTimeValue < 0 ? '≥ 0' : undefined;
  const packagingCostError = !Number.isFinite(packagingCostValue) || packagingCostValue < 0 ? '≥ 0' : undefined;
  const deliveryCostError = !Number.isFinite(deliveryCostValue) || deliveryCostValue < 0 ? '≥ 0' : undefined;
  const lossRateError = !Number.isFinite(lossRateValue) || lossRateValue < 0 || lossRateValue >= 100 ? '0 à 99.99' : undefined;
  const targetMarginError = !Number.isFinite(targetMarginValue) || targetMarginValue < 0 ? '≥ 0' : undefined;
  const canAddProduct = !!newProduct.name
    && !!newProduct.recipeId
    && !estimatedMonthlySalesError
    && !laborTimeError
    && !packagingCostError
    && !deliveryCostError
    && !lossRateError
    && !targetMarginError;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Form */}
      <div className="lg:col-span-4">
        <Card className="sticky top-24 border-rose-100 shadow-rose-100/50">
          <h3 className="text-xl font-bold text-rose-950 font-serif mb-6 flex items-center gap-2">
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
            
            <Select 
              label="Recette de base"
              options={[
                { value: '', label: 'Sélectionner une recette...' },
                ...recipes.map(r => ({ value: r.id, label: r.name }))
              ]}
              value={newProduct.recipeId || ''}
              onChange={e => setNewProduct({...newProduct, recipeId: e.target.value})}
            />

            <Select 
              label="Catégorie" 
              options={[
                { value: 'gateau', label: 'Gâteau' },
                { value: 'biscuit', label: 'Biscuit / Cookie' },
                { value: 'entremet', label: 'Entremet' },
                { value: 'autre', label: 'Autre' },
              ]}
              value={newProduct.category}
              onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}
            />

            <div className="p-4 bg-[#FDF8F6] rounded-lg border border-rose-100">
               <Input 
                label="Ventes estimées / mois" 
                type="number"
                suffix="unités"
                value={toInputValue(newProduct.estimatedMonthlySales ?? Number.NaN)} 
                onChange={e => setNewProduct({...newProduct, estimatedMonthlySales: toNumber(e.target.value)})}
                error={estimatedMonthlySalesError}
                helperText="Sert à répartir vos charges fixes (Loyer, etc.)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Main d'œuvre" 
                type="number"
                suffix="min"
                value={toInputValue(newProduct.laborTimeMinutes ?? Number.NaN)} 
                onChange={e => setNewProduct({...newProduct, laborTimeMinutes: toNumber(e.target.value)})}
                error={laborTimeError}
                helperText="Temps/unité"
              />
               <Input 
                label="Emballage" 
                type="number"
                step="0.01"
                suffix="€"
                value={toInputValue(newProduct.packagingCost ?? Number.NaN)} 
                onChange={e => setNewProduct({...newProduct, packagingCost: toNumber(e.target.value)})}
                error={packagingCostError}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Pertes invendus" 
                type="number"
                suffix="%"
                value={toInputValue(newProduct.lossRate ?? Number.NaN)} 
                onChange={e => setNewProduct({...newProduct, lossRate: toNumber(e.target.value)})}
                error={lossRateError}
              />
              <Input 
                label="Marge cible" 
                type="number"
                step="0.10"
                suffix="€"
                value={toInputValue(newProduct.targetMargin ?? Number.NaN)} 
                onChange={e => setNewProduct({...newProduct, targetMargin: toNumber(e.target.value)})}
                error={targetMarginError}
                helperText="Profit net souhaité"
              />
            </div>

            <Button 
              className="w-full mt-4 py-3 shadow-md" 
              onClick={handleAddProduct} 
              disabled={!canAddProduct}
            >
              Ajouter au Catalogue
            </Button>
          </div>
        </Card>
      </div>

      {/* List */}
      <div className="lg:col-span-8 space-y-6">
        <h3 className="text-xl font-bold text-stone-800 font-serif">Catalogue ({products.length})</h3>
        
        {products.length === 0 ? (
          <div className="bg-stone-50 border border-dashed border-stone-300 rounded-xl p-12 text-center">
            <p className="text-stone-500 mb-2">Votre catalogue est vide.</p>
            <p className="text-sm text-stone-400">Créez votre premier produit en utilisant le formulaire à gauche.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map(product => {
              const recipe = recipes.find(r => r.id === product.recipeId);
              return (
                <Card key={product.id} className="hover:border-rose-300 transition-colors group">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-[#FDF8F6] text-[#D45D79] border border-rose-100 mb-2 uppercase tracking-wide">
                        {product.category}
                      </span>
                      <h4 className="text-lg font-bold text-stone-800 group-hover:text-[#D45D79] transition-colors font-serif">
                        {product.name}
                      </h4>
                    </div>
                    <button onClick={() => handleDeleteProduct(product.id)} className="text-stone-300 hover:text-red-500 transition-colors p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-2 text-sm text-stone-600 mb-4">
                    <div className="col-span-2 flex items-center gap-2">
                       <span className="text-stone-400 w-16">Volume:</span>
                       <span className="font-bold text-stone-800">{product.estimatedMonthlySales} / mois</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-stone-400 w-16">Recette:</span>
                      <span className="font-medium truncate">{recipe?.name || 'Inconnue'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-stone-400 w-16">Marge:</span>
                       <span>{product.targetMargin} €</span>
                    </div>
                  </div>

                  <div className="text-xs text-[#D45D79] font-medium text-right mt-2 pt-2 border-t border-stone-50">
                    Voir analyse de prix &rarr;
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
