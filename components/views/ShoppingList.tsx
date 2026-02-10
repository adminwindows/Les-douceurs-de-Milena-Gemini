
import React, { useState, useMemo } from 'react';
import { Order, Product, Recipe, Ingredient, Unit } from '../../types';
import { Card, Button, Input } from '../ui/Common';

interface Props {
  orders: Order[];
  products: Product[];
  recipes: Recipe[];
  ingredients: Ingredient[];
}

export const ShoppingList: React.FC<Props> = ({ orders, products, recipes, ingredients }) => {
  // Default: Next 7 days
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextWeek);

  // Filter orders
  const relevantOrders = useMemo(() => {
    return orders.filter(o => {
      return o.date >= startDate && o.date <= endDate && o.status !== 'cancelled';
    });
  }, [orders, startDate, endDate]);

  // Calculate Needs
  const shoppingData = useMemo(() => {
    const needs: Record<string, number> = {};

    relevantOrders.forEach(order => {
      order.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return;
        const recipe = recipes.find(r => r.id === product.recipeId);
        if (!recipe) return;

        // Ratio: Needed items / Recipe Batch Yield
        // Example: Need 50 cookies, Batch is 12. Ratio = 4.16
        const ratio = item.quantity / (recipe.batchYield ?? 1);

        recipe.ingredients.forEach(ri => {
          // Add to total needed (in recipe units, usually grams)
          needs[ri.ingredientId] = (needs[ri.ingredientId] || 0) + (ri.quantity * ratio);
        });
      });
    });

    // Map to array and compare with stock
    return ingredients.map(ing => {
      const neededRaw = needs[ing.id] || 0;
      
      // Unit Conversion Logic for Comparison
      // If Ingredient is KG/L but Recipe is usually in G/ML (which is common practice in the app)
      // We need to divide neededRaw by 1000 to compare with Stock which is in KG/L
      let neededConverted = neededRaw;
      const isBulkUnit = ing.unit === Unit.KG || ing.unit === Unit.L;
      
      // Assumption based on App usage: Recipe ingredients are usually in grams/ml if stock is kg/L
      // To make it robust: displayUnit logic from IngredientsRecettes
      // displayUnit = (ing.unit === Unit.KG || ing.unit === Unit.G) ? 'g' : (ing.unit === Unit.L || ing.unit === Unit.ML) ? 'ml' : 'pcs';
      
      if (isBulkUnit) {
          neededConverted = neededRaw / 1000;
      }

      const toBuy = Math.max(0, neededConverted - ing.quantity);

      return {
        ingredient: ing,
        neededRaw, // Amount in recipe units (often g)
        neededConverted, // Amount in stock units (often kg)
        stock: ing.quantity,
        toBuy,
        isBulkUnit
      };
    }).filter(item => item.neededRaw > 0).sort((a, b) => b.toBuy - a.toBuy); // Show items to buy first

  }, [relevantOrders, products, recipes, ingredients]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
      <div className="lg:col-span-4 space-y-6 print:hidden">
        <Card className="sticky top-24 border-rose-200 dark:border-rose-800">
          <h3 className="text-xl font-bold text-rose-950 dark:text-rose-100 font-serif mb-4">Paramètres</h3>
          <div className="space-y-4">
            <Input 
              label="Du" 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
            />
            <Input 
              label="Au" 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
            />
            <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-lg text-sm text-stone-600 dark:text-stone-300">
              <p className="font-bold mb-1">{relevantOrders.length} commandes trouvées</p>
              <ul className="list-disc pl-4 space-y-1">
                {relevantOrders.slice(0, 5).map(o => (
                  <li key={o.id} className="truncate">{o.customerName} ({new Date(o.date).toLocaleDateString()})</li>
                ))}
                {relevantOrders.length > 5 && <li>...</li>}
              </ul>
            </div>
            <Button className="w-full" onClick={() => window.print()}>🖨️ Imprimer la liste</Button>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-8">
        <Card className="min-h-[500px] print:shadow-none print:border-none">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 font-serif">Liste de Courses</h2>
            <span className="text-sm text-stone-500 dark:text-stone-400 print:block hidden">
                Période du {new Date(startDate).toLocaleDateString()} au {new Date(endDate).toLocaleDateString()}
            </span>
          </div>

          {shoppingData.length === 0 ? (
            <div className="text-center py-12 text-stone-400 dark:text-stone-500">
              <p>Aucun ingrédient nécessaire pour cette période.</p>
              <p className="text-sm">Vérifiez les dates ou ajoutez des commandes.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 font-bold uppercase text-xs">
                  <tr>
                    <th className="p-3">Ingrédient</th>
                    <th className="p-3 text-right">Besoin Recette</th>
                    <th className="p-3 text-right">En Stock</th>
                    <th className="p-3 text-right bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300">À Acheter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {shoppingData.map(row => {
                    const ingName = row.ingredient.name;
                    const stockUnit = row.ingredient.unit;
                    
                    // Display formatting
                    // If bulk (KG), display needed in g (row.neededRaw) but stock/buy in KG
                    const baseUnit = stockUnit === Unit.L ? 'ml' : stockUnit === Unit.KG ? 'g' : stockUnit;
                    const displayNeeded = row.isBulkUnit 
                        ? `${row.neededRaw.toFixed(0)} ${baseUnit}` 
                        : `${row.neededRaw.toFixed(1)} ${stockUnit}`;
                    
                    const displayStock = `${row.stock} ${stockUnit}`;
                    
                    const displayToBuy = row.toBuy > 0 
                        ? `${row.toBuy.toFixed(2)} ${stockUnit}`
                        : '-';

                    return (
                      <tr key={row.ingredient.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                        <td className="p-3 font-medium text-stone-800 dark:text-stone-200">{ingName}</td>
                        <td className="p-3 text-right text-stone-600 dark:text-stone-400">{displayNeeded}</td>
                        <td className="p-3 text-right text-stone-600 dark:text-stone-400">{displayStock}</td>
                        <td className={`p-3 text-right font-bold bg-rose-50 dark:bg-rose-900/10 ${row.toBuy > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-500'}`}>
                          {displayToBuy}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
