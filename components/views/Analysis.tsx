import React, { useMemo, useState } from 'react';
import { Ingredient, Product, Recipe, GlobalSettings, Purchase } from '../../types';
import {
  applyIngredientPriceMode,
  calculateProductMetrics,
  estimateUnitsForTargetSalary,
  formatCurrency,
  IngredientPriceMode
} from '../../utils';
import { Card } from '../ui/Common';
import { parseOptionalNumber } from '../../validation';

interface Props {
  products: Product[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  settings: GlobalSettings;
  setSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
  purchases: Purchase[];
}

export const Analysis: React.FC<Props> = ({ products, recipes, ingredients, settings, setSettings, purchases }) => {
  const isTva = settings.isTvaSubject;
  const [ingredientPriceMode, setIngredientPriceMode] = useState<IngredientPriceMode>('standard');
  const [helperUsesStandardPrice, setHelperUsesStandardPrice] = useState(true);

  const activeIngredients = useMemo(
    () => applyIngredientPriceMode(ingredients, purchases, ingredientPriceMode),
    [ingredients, purchases, ingredientPriceMode]
  );

  const salaryPlan = useMemo(
    () => estimateUnitsForTargetSalary({
      targetSalary: settings.targetMonthlySalary,
      products,
      recipes,
      ingredients: activeIngredients,
      settings: { ...settings, pricingStrategy: 'margin' },
      useStandardPrice: helperUsesStandardPrice
    }),
    [settings, products, recipes, activeIngredients, helperUsesStandardPrice]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-rose-200 dark:border-rose-800">
          <h3 className="font-bold text-lg text-rose-900 dark:text-rose-100 mb-3">Mode de recommandation</h3>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="pricingStrategy"
                checked={settings.pricingStrategy === 'margin'}
                onChange={() => setSettings(prev => ({ ...prev, pricingStrategy: 'margin' }))}
              />
              <span><strong>Marge cible</strong> (structure actuelle)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="pricingStrategy"
                checked={settings.pricingStrategy === 'salary'}
                onChange={() => setSettings(prev => ({ ...prev, pricingStrategy: 'salary' }))}
              />
              <span><strong>Salaire cible</strong> (répartition du salaire mensuel sur le volume estimé)</span>
            </label>
          </div>
          <p className="text-xs text-stone-500 mt-3">
            Le <strong>prix minimum</strong> reste identique dans les deux modes. Seul le prix conseillé change.
          </p>
        </Card>

        <Card className="border-stone-200 dark:border-stone-700">
          <label className="text-sm font-bold text-stone-700 dark:text-stone-300 block mb-3">Base de calcul des coûts matières</label>
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="priceMode"
                value="standard"
                checked={ingredientPriceMode === 'standard'}
                onChange={() => setIngredientPriceMode('standard')}
              />
              <span>Prix Standard (fiche technique)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="priceMode"
                value="average"
                checked={ingredientPriceMode === 'average'}
                onChange={() => setIngredientPriceMode('average')}
              />
              <span>Prix moyen lissé (achats)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="priceMode"
                value="last"
                checked={ingredientPriceMode === 'last'}
                onChange={() => setIngredientPriceMode('last')}
              />
              <span>Dernier prix d'achat</span>
            </label>
          </div>
        </Card>
      </div>

      {settings.pricingStrategy === 'margin' && (
        <Card>
          <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100 mb-2">Helper salaire cible (mode marge)</h3>
          <p className="text-xs text-stone-500 mb-3">
            Estimation des quantités à vendre pour atteindre le salaire cible, avec répartition pondérée par ventes mensuelles estimées.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3 mb-3">
            <div>
              <label className="text-xs font-bold text-stone-600 block mb-1">Salaire cible / mois</label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900"
                value={settings.targetMonthlySalary}
                onChange={event => setSettings(prev => ({ ...prev, targetMonthlySalary: parseOptionalNumber(event.target.value) ?? 0 }))}
              />
            </div>
            <div className="flex items-end gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={helperUsesStandardPrice}
                  onChange={() => setHelperUsesStandardPrice(true)}
                />
                Base prix standard
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!helperUsesStandardPrice}
                  onChange={() => setHelperUsesStandardPrice(false)}
                />
                Base prix conseillé (marge)
              </label>
            </div>
          </div>

          {salaryPlan.feasible ? (
            <div className="text-sm space-y-1">
              <p className="text-stone-700 dark:text-stone-300">
                Total estimé à vendre: <strong>{salaryPlan.totalUnitsNeeded.toFixed(1)} unités</strong>
              </p>
              <p className="text-stone-700 dark:text-stone-300 mb-2">
                Gain net estimé: <strong>{formatCurrency(salaryPlan.estimatedNetResult)}</strong>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {salaryPlan.rows.map(row => (
                  <div key={row.productId} className="rounded border border-stone-200 dark:border-stone-700 px-3 py-2">
                    <p className="font-medium">{row.productName}</p>
                    <p className="text-xs text-stone-500">
                      Part: {(row.weight * 100).toFixed(1)}% · Net/unité: {formatCurrency(row.netPerUnit)}
                    </p>
                    <p className="text-sm font-semibold">{row.estimatedUnits.toFixed(1)} unités</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-600 dark:text-red-400">{salaryPlan.message}</p>
          )}
        </Card>
      )}

      <div className="overflow-x-auto shadow-md border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800">
        <table className="w-full text-sm text-left">
          <thead className="bg-stone-200 dark:bg-stone-900 text-stone-800 dark:text-stone-200 font-bold border-b border-stone-300 dark:border-stone-700 uppercase text-xs tracking-wider">
            <tr>
              <th className="p-4 min-w-[150px]">Produit</th>
              <th className="p-4">Matières</th>
              <th className="p-4">Emballage</th>
              <th className="p-4 bg-stone-100 dark:bg-stone-800/50 border-l border-stone-300 dark:border-stone-700">Coût complet</th>
              <th className="p-4 bg-rose-50 dark:bg-rose-900/20 border-l border-rose-200 dark:border-rose-800">Prix min</th>
              <th className="p-4 bg-emerald-50 dark:bg-emerald-900/20">Conseillé marge</th>
              <th className="p-4 bg-emerald-50 dark:bg-emerald-900/20">Conseillé salaire</th>
              <th className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-l border-indigo-200 dark:border-indigo-800">Prix standard</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
            {products.map(product => {
              const recipe = recipes.find(entry => entry.id === product.recipeId);
              if (!recipe) return null;
              const metrics = calculateProductMetrics(product, recipe, activeIngredients, settings, products);
              const activeRecommended = settings.pricingStrategy === 'salary' ? metrics.priceWithSalaryTTC : metrics.priceWithMarginTTC;

              return (
                <tr key={product.id} className="hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors">
                  <td className="p-4 font-bold text-stone-800 dark:text-stone-200">{product.name}</td>
                  <td className="p-4 text-stone-600 dark:text-stone-400">{formatCurrency(metrics.finalMaterialCost)}</td>
                  <td className="p-4 text-stone-600 dark:text-stone-400">{formatCurrency(metrics.finalPackagingCost)}</td>
                  <td className="p-4 bg-stone-50 dark:bg-stone-800/50 border-l border-stone-200 dark:border-stone-700 font-medium">
                    {formatCurrency(metrics.fullCost)}
                  </td>
                  <td className="p-4 bg-rose-50 dark:bg-rose-900/10 border-l border-rose-100 dark:border-rose-900/50">
                    <div className="flex flex-col">
                      <span className="font-semibold">{formatCurrency(metrics.minPriceBreakevenTTC)}</span>
                      {isTva && <span className="text-[11px] text-stone-500">HT: {formatCurrency(metrics.minPriceBreakeven)}</span>}
                    </div>
                  </td>
                  <td className="p-4 bg-emerald-50 dark:bg-emerald-900/10">
                    <div className="flex flex-col">
                      <span className="font-semibold">{formatCurrency(metrics.priceWithMarginTTC)}</span>
                      {isTva && <span className="text-[11px] text-stone-500">HT: {formatCurrency(metrics.priceWithMargin)}</span>}
                    </div>
                  </td>
                  <td className="p-4 bg-emerald-50 dark:bg-emerald-900/10">
                    <div className="flex flex-col">
                      <span className="font-semibold">{formatCurrency(metrics.priceWithSalaryTTC)}</span>
                      {isTva && <span className="text-[11px] text-stone-500">HT: {formatCurrency(metrics.priceWithSalary)}</span>}
                    </div>
                  </td>
                  <td className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-l border-indigo-100 dark:border-indigo-800">
                    <div className="flex flex-col">
                      <span className="font-bold">{formatCurrency(product.standardPrice ?? activeRecommended)}</span>
                      <span className="text-[11px] text-stone-500">Actif: {formatCurrency(activeRecommended)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-stone-400 dark:text-stone-500">Aucun produit à analyser.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
