import React, { useEffect, useMemo, useState } from 'react';
import { GlobalSettings, Product, Recipe, Ingredient, MonthlyEntry, Order, FixedCostItem, MonthlyReportData, InventoryEntry, ProductionBatch, UnsoldEntry } from '../../types';
import { formatCurrency } from '../../utils';
import { computeMonthlyTotals, shouldIncludeOrder } from '../../monthlyReportMath';
import { parseOptionalNumber } from '../../validation';
import { Card, Input, Button } from '../ui/Common';

interface Props {
  settings: GlobalSettings;
  products: Product[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  orders: Order[];
  savedReports: MonthlyReportData[];
  setSavedReports: React.Dispatch<React.SetStateAction<MonthlyReportData[]>>;
  setSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
  productionBatches: ProductionBatch[];
}

const buildInitialSales = (month: string, orders: Order[], settings: GlobalSettings): MonthlyEntry[] => {
  const map = new Map<string, MonthlyEntry>();
  orders
    .filter(o => o.date.startsWith(month) && shouldIncludeOrder(o, settings.includePendingOrdersInMonthlyReport ?? false))
    .forEach(order => {
      order.items.forEach((item, idx) => {
        const key = `${item.productId}-${item.price}-${order.tvaRate}`;
        const existing = map.get(key);
        if (existing) {
          existing.quantitySold += item.quantity;
        } else {
          map.set(key, {
            id: `${order.id}-${idx}`,
            productId: item.productId,
            quantitySold: item.quantity,
            actualPrice: item.price,
            tvaRate: order.tvaRate,
            source: 'new' as const
          });
        }
      });
    });
  return Array.from(map.values());
};

const buildInitialUnsold = (month: string, products: Product[], orders: Order[], productionBatches: ProductionBatch[], settings: GlobalSettings): UnsoldEntry[] => {
  return products.map((product, idx) => {
    const sold = orders
      .filter(o => o.date.startsWith(month) && shouldIncludeOrder(o, settings.includePendingOrdersInMonthlyReport ?? false))
      .reduce((sum, o) => sum + o.items.filter(i => i.productId === product.id).reduce((inner, i) => inner + i.quantity, 0), 0);
    const produced = productionBatches
      .filter(b => b.date.startsWith(month) && b.productId === product.id)
      .reduce((sum, b) => sum + b.quantity, 0);

    return {
      id: `${product.id}-${idx}`,
      productId: product.id,
      quantityUnsold: Math.max(0, produced - sold),
      source: 'new' as const
    };
  }).filter(entry => entry.quantityUnsold > 0);
};

export const MonthlyReport: React.FC<Props> = ({
  settings, products, recipes, ingredients, orders, savedReports, setSavedReports, productionBatches
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [sales, setSales] = useState<MonthlyEntry[]>([]);
  const [unsold, setUnsold] = useState<UnsoldEntry[]>([]);
  const [actualFixedItems, setActualFixedItems] = useState<FixedCostItem[]>([]);
  const [actualIngredientSpend, setActualIngredientSpend] = useState(0);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [costMode, setCostMode] = useState<0 | 1 | 2>(0);

  const loaded = useMemo(() => savedReports.find(r => r.monthStr === selectedMonth), [savedReports, selectedMonth]);

  useEffect(() => {
    if (loaded) {
      setSales(loaded.sales.map(s => ({ ...s, source: 'loaded' as const })));
      setUnsold((loaded.unsold || []).map(u => ({ ...u, source: 'loaded' as const })));
      setActualFixedItems(loaded.actualFixedCostItems);
      setActualIngredientSpend(loaded.actualIngredientSpend);
      setInventory(loaded.inventory);
      return;
    }

    setSales(buildInitialSales(selectedMonth, orders, settings));
    setUnsold(buildInitialUnsold(selectedMonth, products, orders, productionBatches, settings));
    setActualFixedItems(settings.fixedCostItems.map(i => ({ ...i })));
    setActualIngredientSpend(0);
    setInventory(ingredients.map(i => ({ ingredientId: i.id, startStock: i.quantity, purchasedQuantity: 0, endStock: i.quantity })));
  }, [selectedMonth, loaded, settings, orders, products, ingredients, productionBatches]);

  const inventoryVariationCost = inventory.reduce((sum, item) => {
    const ing = ingredients.find(i => i.id === item.ingredientId);
    if (!ing) return sum;
    return sum + ((item.startStock + item.purchasedQuantity - item.endStock) * ing.costPerBaseUnit);
  }, 0);

  const totals = computeMonthlyTotals({
    sales,
    unsold,
    products,
    recipes,
    ingredients,
    settings,
    costMode,
    actualIngredientSpend,
    inventoryVariationCost,
    actualFixedCosts: actualFixedItems.reduce((sum, i) => sum + i.amount, 0),
    selectedMonth,
    orders
  });

  const handleSave = () => {
    const base: MonthlyReportData = {
      id: loaded?.id ?? Date.now().toString(),
      monthStr: selectedMonth,
      sales,
      unsold,
      actualFixedCostItems: actualFixedItems,
      actualIngredientSpend,
      inventory,
      totalRevenue: totals.totalRevenueTTC,
      totalRevenueHT: totals.totalRevenueHT,
      totalTvaCollected: totals.totalTvaCollected,
      finalFoodCost: totals.finalFoodCost,
      totalPackagingCost: totals.totalPackagingCost,
      totalSocialCharges: totals.totalSocialCharges,
      netResult: totals.netResult,
      isLocked: true
    };

    setSavedReports(prev => {
      const filtered = prev.filter(r => r.monthStr !== selectedMonth);
      return [...filtered, base];
    });
    alert('Bilan sauvegardé');
  };

  const addSalesRow = () => {
    if (!products[0]) return;
    setSales(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      productId: products[0].id,
      quantitySold: 0,
      actualPrice: products[0].standardPrice ?? 0,
      tvaRate: settings.isTvaSubject ? settings.defaultTvaRate : 0,
      source: 'new' as const
    }]);
  };

  const addUnsoldRow = () => {
    if (!products[0]) return;
    setUnsold(prev => [...prev, {
      id: `${Date.now()}-u-${Math.random()}`,
      productId: products[0].id,
      quantityUnsold: 0,
      source: 'new' as const
    }]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 space-y-4">
        <Card>
          <div className="flex justify-between items-center mb-4">
            <Input label="Mois" type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
            <Button size="sm" onClick={handleSave}>Sauvegarder</Button>
          </div>
          <h3 className="font-bold mb-2">Ventes</h3>
          <Button size="sm" variant="secondary" onClick={addSalesRow}>+ Ajouter ligne vente</Button>
          <div className="space-y-2 mt-2">
            {sales.map((line, idx) => {
              const readOnly = line.source === 'loaded';
              return (
                <div key={line.id} className="border rounded p-2 text-sm">
                  <select className="w-full mb-1 px-2 py-1 border rounded" disabled={readOnly} value={line.productId} onChange={e => setSales(prev => prev.map((s, i) => i === idx ? { ...s, productId: e.target.value } : s))}>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div className="grid grid-cols-3 gap-2">
                    <Input label="Qté" type="number" value={line.quantitySold} disabled={readOnly} onChange={e => setSales(prev => prev.map((s, i) => i === idx ? { ...s, quantitySold: parseOptionalNumber(e.target.value) ?? 0 } : s))} />
                    <Input label="Prix" type="number" value={line.actualPrice} disabled={readOnly} onChange={e => setSales(prev => prev.map((s, i) => i === idx ? { ...s, actualPrice: parseOptionalNumber(e.target.value) ?? 0 } : s))} suffix="€" />
                    <Input label="TVA" type="number" value={line.tvaRate ?? ''} disabled={readOnly} onChange={e => setSales(prev => prev.map((s, i) => i === idx ? { ...s, tvaRate: parseOptionalNumber(e.target.value) } : s))} suffix="%" />
                  </div>
                  {readOnly && <div className="text-xs text-stone-500 mt-1">Ligne chargée (figée)</div>}
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h3 className="font-bold mb-2">Invendus (section séparée)</h3>
          <Button size="sm" variant="secondary" onClick={addUnsoldRow}>+ Ajouter ligne invendu</Button>
          <div className="space-y-2 mt-2">
            {unsold.map((line, idx) => {
              const readOnly = line.source === 'loaded';
              return (
                <div key={line.id} className="border rounded p-2 text-sm">
                  <select className="w-full mb-1 px-2 py-1 border rounded" disabled={readOnly} value={line.productId} onChange={e => setUnsold(prev => prev.map((s, i) => i === idx ? { ...s, productId: e.target.value } : s))}>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <Input label="Qté invendue" type="number" value={line.quantityUnsold} disabled={readOnly} onChange={e => setUnsold(prev => prev.map((s, i) => i === idx ? { ...s, quantityUnsold: parseOptionalNumber(e.target.value) ?? 0 } : s))} />
                  {readOnly && <div className="text-xs text-stone-500 mt-1">Ligne chargée (figée)</div>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="lg:col-span-7">
        <Card>
          <h3 className="text-lg font-bold mb-4">Résultat</h3>
          <div className="flex gap-2 mb-3">
            <Button size="sm" variant={costMode === 0 ? 'primary' : 'secondary'} onClick={() => setCostMode(0)}>Théorique</Button>
            <Button size="sm" variant={costMode === 1 ? 'primary' : 'secondary'} onClick={() => setCostMode(1)}>Dépenses</Button>
            <Button size="sm" variant={costMode === 2 ? 'primary' : 'secondary'} onClick={() => setCostMode(2)}>Stock</Button>
          </div>
          {costMode === 1 && <Input label="Dépenses ingrédients" type="number" value={actualIngredientSpend} onChange={e => setActualIngredientSpend(parseOptionalNumber(e.target.value) ?? 0)} suffix="€" />}
          <div className="space-y-2 mt-3 text-sm">
            <div className="flex justify-between"><span>CA TTC</span><span>{formatCurrency(totals.totalRevenueTTC)}</span></div>
            <div className="flex justify-between"><span>CA HT</span><span>{formatCurrency(totals.totalRevenueHT)}</span></div>
            <div className="flex justify-between"><span>TVA collectée</span><span>{formatCurrency(totals.totalTvaCollected)}</span></div>
            <div className="flex justify-between"><span>Matières</span><span>{formatCurrency(totals.finalFoodCost)}</span></div>
            <div className="flex justify-between"><span>Emballages</span><span>{formatCurrency(totals.totalPackagingCost)}</span></div>
            <div className="flex justify-between"><span>Cotisations</span><span>{formatCurrency(totals.totalSocialCharges)}</span></div>
            <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Résultat net</span><span>{formatCurrency(totals.netResult)}</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
};
