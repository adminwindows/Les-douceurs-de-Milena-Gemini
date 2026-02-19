import React from 'react';
import { Product, Recipe, Ingredient, GlobalSettings, Purchase } from '../../types';
import { Card, Button } from '../ui/Common';
import { calculateProductMetrics, formatCurrency } from '../../utils';

interface Props {
  products: Product[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  settings: GlobalSettings;
  purchases: Purchase[];
}

export const Analysis: React.FC<Props> = ({ products, recipes, ingredients, settings }) => {
  const toggleMode = () => {
    if ((settings.pricingMode ?? 'margin') === 'margin') {
      // eslint-disable-next-line no-alert
      alert('Passez en mode salaire depuis Réglages.');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-lg font-bold mb-2">Pricing mode</h3>
        <p className="text-sm">Mode actif: <strong>{settings.pricingMode ?? 'margin'}</strong></p>
        <p className="text-sm">Salaire cible mensuel: <strong>{settings.targetMonthlySalary ?? 0}€</strong></p>
        <Button size="sm" variant="secondary" onClick={toggleMode}>Info mode</Button>
      </Card>

      <Card>
        <h3 className="text-lg font-bold mb-3">Prix minimum vs recommandé</h3>
        <div className="space-y-2">
          {products.map(product => {
            const recipe = recipes.find(r => r.id === product.recipeId);
            if (!recipe) return null;
            const metrics = calculateProductMetrics(product, recipe, ingredients, settings, products);
            return (
              <div key={product.id} className="border rounded p-3 text-sm">
                <div className="font-bold">{product.name}</div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>Prix minimum: {formatCurrency(metrics.minPriceBreakevenTTC)}</div>
                  <div>Prix recommandé: {formatCurrency(metrics.priceWithMarginTTC)}</div>
                  <div>Recommandé (mode marge): {formatCurrency(metrics.marginModePriceTTC)}</div>
                  <div>Recommandé (mode salaire): {formatCurrency(metrics.salaryModePriceTTC)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
