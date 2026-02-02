import React from 'react';
import { Ingredient, Product, Recipe, GlobalSettings } from '../../types';
import { calculateProductMetrics, formatCurrency } from '../../utils';
import { Card, InfoTooltip } from '../ui/Common';

interface Props {
  products: Product[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  settings: GlobalSettings;
}

export const Analysis: React.FC<Props> = ({ products, recipes, ingredients, settings }) => {
  return (
    <div className="space-y-6">
      <div className="bg-[#FFF0F3] border border-rose-200 p-4 rounded-xl flex items-start gap-4 shadow-sm">
        <span className="text-2xl">💡</span>
        <div className="text-sm text-rose-900">
          <p className="font-bold mb-2 font-serif text-lg">Comprendre vos prix</p>
          <ul className="list-disc pl-4 space-y-1 text-rose-800">
            <li><strong>Coût Complet :</strong> Inclut matières, emballage, main d'œuvre ({settings.hourlyRate}€/h) et charges fixes.</li>
            <li><strong>Prix Min (Rentable) :</strong> Seuil de rentabilité (Profit = 0€). Couvre toutes les dépenses + taxes.</li>
            <li><strong>Prix Conseillé :</strong> Inclut votre marge cible pour générer du profit.</li>
          </ul>
        </div>
      </div>

      <div className="overflow-x-auto shadow-md border border-stone-200 rounded-xl bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200 uppercase text-xs tracking-wider">
            <tr>
              <th className="p-4 min-w-[150px]">Produit</th>
              <th className="p-4 text-stone-500">Matières</th>
              <th className="p-4 text-stone-500">M.O.</th>
              <th className="p-4 text-stone-500">Ch. Fixes <InfoTooltip text="Calculé selon le volume estimé par produit" /></th>
              <th className="p-4 bg-stone-50 border-l border-stone-200 text-stone-900">Coût Complet</th>
              <th className="p-4 bg-rose-50 border-l border-rose-100 text-rose-800">Prix Min.</th>
              <th className="p-4 bg-emerald-50 border-l border-emerald-100 text-emerald-800">Prix Conseillé</th>
              <th className="p-4">Food Cost %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {products.map(product => {
              const recipe = recipes.find(r => r.id === product.recipeId);
              if (!recipe) return null;
              
              const metrics = calculateProductMetrics(product, recipe, ingredients, settings, products);
              
              const fcPercent = (metrics.unitMaterialCost / metrics.priceWithMargin) * 100;
              let fcColor = "text-emerald-600";
              if (fcPercent > 35) fcColor = "text-orange-500";
              if (fcPercent > 45) fcColor = "text-red-600 font-bold";

              return (
                <tr key={product.id} className="hover:bg-stone-50 transition-colors">
                  <td className="p-4 font-bold text-stone-800">{product.name}</td>
                  <td className="p-4 text-stone-600">{formatCurrency(metrics.unitMaterialCost)}</td>
                  <td className="p-4 text-stone-600">{formatCurrency(metrics.laborCost)}</td>
                  <td className="p-4 text-stone-600 text-xs">{formatCurrency(metrics.allocatedFixedCost)}</td>
                  
                  <td className="p-4 bg-stone-50 border-l border-stone-200 font-medium text-stone-900">
                    {formatCurrency(metrics.fullCost)}
                  </td>
                  
                  <td className="p-4 bg-rose-50 border-l border-rose-100 text-rose-700 font-medium">
                    {formatCurrency(metrics.minPriceBreakeven)}
                  </td>
                  
                  <td className="p-4 bg-emerald-50 border-l border-emerald-100">
                    <div className="flex flex-col">
                      <span className="text-lg font-bold text-emerald-700">{formatCurrency(metrics.priceWithMargin)}</span>
                      <span className="text-xs text-emerald-600">Marge: {product.targetMargin}€</span>
                    </div>
                  </td>

                  <td className={`p-4 ${fcColor}`}>
                    {isNaN(fcPercent) ? '-' : fcPercent.toFixed(1) + '%'}
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-stone-400">Aucun produit à analyser.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
