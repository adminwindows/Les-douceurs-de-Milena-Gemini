import React, { useState } from 'react';
import { Product, Recipe, GlobalSettings } from '../../types';
import { Card, Input, Button } from '../ui/Common';
import { calculateProductMetrics } from '../../utils';
import { parseOptionalNumber } from '../../validation';

interface Props {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  recipes: Recipe[];
  settings: GlobalSettings;
}

export const ProductsContent: React.FC<Props> = ({ products, setProducts, recipes, settings }) => {
  const [draft, setDraft] = useState<Partial<Product>>({
    name: '',
    recipeId: recipes[0]?.id,
    laborTimeMinutes: 15,
    packagingCost: 0,
    lossRate: 0,
    unsoldEstimate: 0,
    packagingUsedOnUnsold: false,
    applyLossToPackaging: false,
    targetMargin: 0,
    estimatedMonthlySales: 0,
    category: 'Autre',
    standardPrice: 0
  });

  const save = () => {
    if (!draft.name || !draft.recipeId) return;
    setProducts(prev => [...prev, {
      id: Date.now().toString(),
      name: draft.name!,
      recipeId: draft.recipeId!,
      laborTimeMinutes: draft.laborTimeMinutes ?? 0,
      packagingCost: draft.packagingCost ?? 0,
      lossRate: draft.lossRate ?? 0,
      unsoldEstimate: draft.unsoldEstimate ?? 0,
      packagingUsedOnUnsold: draft.packagingUsedOnUnsold ?? false,
      applyLossToPackaging: draft.applyLossToPackaging ?? false,
      targetMargin: draft.targetMargin ?? 0,
      estimatedMonthlySales: draft.estimatedMonthlySales ?? 0,
      category: draft.category ?? 'Autre',
      standardPrice: draft.standardPrice ?? 0
    }]);
  };

  const updateProduct = (id: string, patch: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5">
        <Card>
          <h3 className="text-lg font-bold mb-4">Nouveau produit</h3>
          <Input label="Nom" value={draft.name || ''} onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))} />
          <div className="mt-2">
            <label className="text-sm font-bold">Recette</label>
            <select className="w-full px-3 py-2 rounded border" value={draft.recipeId} onChange={e => setDraft(prev => ({ ...prev, recipeId: e.target.value }))}>
              {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <Input label="Marge cible (€)" type="number" value={draft.targetMargin ?? 0} onChange={e => setDraft(prev => ({ ...prev, targetMargin: parseOptionalNumber(e.target.value) ?? 0 }))} />
          <Input label="Ventes estimées" type="number" value={draft.estimatedMonthlySales ?? 0} onChange={e => setDraft(prev => ({ ...prev, estimatedMonthlySales: parseOptionalNumber(e.target.value) ?? 0 }))} />
          <Input label="Prix standard" type="number" value={draft.standardPrice ?? 0} onChange={e => setDraft(prev => ({ ...prev, standardPrice: parseOptionalNumber(e.target.value) ?? 0 }))} suffix="€" />
          <Button className="mt-3 w-full" onClick={save}>Ajouter produit</Button>
        </Card>
      </div>
      <div className="lg:col-span-7 space-y-3">
        {products.map(product => {
          const recipe = recipes.find(r => r.id === product.recipeId);
          if (!recipe) return null;
          const metrics = calculateProductMetrics(product, recipe, [], settings, products);
          return (
            <Card key={product.id}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold">{product.name}</h4>
                  <p className="text-xs">Min: {metrics.minPriceBreakevenTTC.toFixed(2)}€ · Conseillé: {metrics.priceWithMarginTTC.toFixed(2)}€</p>
                </div>
                <Button size="sm" variant="danger" onClick={() => setProducts(prev => prev.filter(p => p.id !== product.id))}>Suppr.</Button>
              </div>
              <Input label="Prix standard" type="number" value={product.standardPrice ?? 0} onChange={e => updateProduct(product.id, { standardPrice: parseOptionalNumber(e.target.value) ?? 0 })} suffix="€" />
            </Card>
          );
        })}
      </div>
    </div>
  );
};
