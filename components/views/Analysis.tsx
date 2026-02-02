
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
  const isTva = settings.isTvaSubject;

  return (
    <div className="space-y-6">
      <div className="bg-[#FFF0F3] dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 rounded-xl flex items-start gap-4 shadow-sm">
        <span className="text-2xl">💡</span>
        <div className="text-sm text-rose-900 dark:text-rose-100">
          <p className="font-bold mb-2 font-serif text-lg">Comprendre vos prix {isTva ? '(Mode Assujetti TVA)' : '(Mode Franchise)'}</p>
          <ul className="list-disc pl-4 space-y-1 text-rose-800 dark:text-rose-200">
            <li><strong>Coût Complet :</strong> Inclut matières, emballage, main d'œuvre ({settings.hourlyRate}€/h) et charges fixes. {isTva && "(Affiché Hors Taxe)"}</li>
            <li><strong>Prix Min (Rentable) :</strong> Seuil de rentabilité (Profit = 0€). Couvre toutes les dépenses + charges sociales.</li>
            <li><strong>Prix Conseillé :</strong> Inclut votre marge cible pour générer du profit.</li>
          </ul>
        </div>
      </div>

      <div className="overflow-x-auto shadow-md border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800">
        <table className="w-full text-sm text-left">
          <thead className="bg-stone-200 dark:bg-stone-900 text-stone-800 dark:text-stone-200 font-bold border-b border-stone-300 dark:border-stone-700 uppercase text-xs tracking-wider">
            <tr>
              <th className="p-4 min-w-[150px]">Produit</th>
              <th className="p-4 text-stone-600 dark:text-stone-400">Matières</th>
              <th className="p-4 text-stone-600 dark:text-stone-400">M.O.</th>
              <th className="p-4 bg-stone-100 dark:bg-stone-800/50 border-l border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100">Coût {isTva ? 'HT' : ''}</th>
              
              <th className="p-4 bg-rose-50 dark:bg-rose-900/20 border-l border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300">
                Prix Min. {isTva ? 'TTC' : ''}
              </th>
              {isTva && <th className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300 text-opacity-60 font-normal">Min. HT</th>}
              
              <th className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border-l border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                Conseillé {isTva ? 'TTC' : ''}
              </th>
              {isTva && <th className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 text-opacity-60 font-normal">HT</th>}
              
              <th className="p-4">Food Cost %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
            {products.map(product => {
              const recipe = recipes.find(r => r.id === product.recipeId);
              if (!recipe) return null;
              
              const metrics = calculateProductMetrics(product, recipe, ingredients, settings, products);
              
              const fcPercent = (metrics.unitMaterialCost / metrics.priceWithMargin) * 100;
              let fcColor = "text-emerald-600 dark:text-emerald-400";
              if (fcPercent > 35) fcColor = "text-orange-600 dark:text-orange-400";
              if (fcPercent > 45) fcColor = "text-red-600 dark:text-red-400 font-bold";

              return (
                <tr key={product.id} className="hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors">
                  <td className="p-4 font-bold text-stone-800 dark:text-stone-200">
                    {product.name}
                    {isTva && <span className="block text-[10px] text-stone-400 dark:text-stone-500 font-normal">TVA {metrics.tvaRate}%</span>}
                  </td>
                  <td className="p-4 text-stone-600 dark:text-stone-400">{formatCurrency(metrics.unitMaterialCost)}</td>
                  <td className="p-4 text-stone-600 dark:text-stone-400">{formatCurrency(metrics.laborCost)}</td>
                  
                  <td className="p-4 bg-stone-50 dark:bg-stone-800/50 border-l border-stone-200 dark:border-stone-700 font-medium text-stone-900 dark:text-stone-100">
                    {formatCurrency(metrics.fullCost)}
                  </td>
                  
                  <td className="p-4 bg-rose-50 dark:bg-rose-900/10 border-l border-rose-100 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 font-medium">
                    {formatCurrency(metrics.minPriceBreakevenTTC)}
                  </td>
                  {isTva && (
                    <td className="p-4 bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400 text-opacity-70 text-xs">
                       {formatCurrency(metrics.minPriceBreakeven)}
                    </td>
                  )}
                  
                  <td className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border-l border-emerald-100 dark:border-emerald-900/50">
                    <div className="flex flex-col">
                      <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(metrics.priceWithMarginTTC)}</span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-500">Marge: {product.targetMargin}€</span>
                    </div>
                  </td>
                  {isTva && (
                    <td className="p-4 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 text-opacity-70 text-xs">
                       {formatCurrency(metrics.priceWithMargin)}
                    </td>
                  )}

                  <td className={`p-4 ${fcColor}`}>
                    {isNaN(fcPercent) ? '-' : fcPercent.toFixed(1) + '%'}
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr><td colSpan={isTva ? 9 : 7} className="p-8 text-center text-stone-400 dark:text-stone-500">Aucun produit à analyser.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
