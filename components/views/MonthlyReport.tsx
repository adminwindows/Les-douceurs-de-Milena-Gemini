import React, { useEffect, useMemo, useState } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  FixedCostItem,
  GlobalSettings,
  Ingredient,
  InventoryEntry,
  MonthlyEntry,
  MonthlyReportData,
  Order,
  Product,
  ProductionBatch,
  Purchase,
  Recipe,
  Unit,
  UnsoldEntry
} from '../../types';
import { applyIngredientPriceMode, formatCurrency } from '../../utils';
import { computeMonthlyTotals, shouldIncludeOrder } from '../../monthlyReportMath';
import { isNonNegativeNumber, parseOptionalNumber } from '../../validation';
import { Card, Button, Input } from '../ui/Common';
import { BrandLogo } from '../ui/BrandLogo';

interface Props {
  settings: GlobalSettings;
  products: Product[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  purchases: Purchase[];
  orders: Order[];
  savedReports: MonthlyReportData[];
  setSavedReports: React.Dispatch<React.SetStateAction<MonthlyReportData[]>>;
  productionBatches: ProductionBatch[];
}

interface TotalsSnapshot {
  totalRevenueTTC: number;
  totalRevenueHT: number;
  totalTvaCollected: number;
  finalFoodCost: number;
  totalPackagingCost: number;
  totalSocialCharges: number;
  actualFixedCosts: number;
  netResult: number;
}

const makeSaleId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const exportMonthlyReportPdf = async (monthLabel: string, totals: TotalsSnapshot, grossMargin: number) => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 790;
  const left = 50;
  const drawLine = (label: string, value: string, strong = false) => {
    const lineFont = strong ? bold : font;
    const size = strong ? 12 : 11;
    page.drawText(label, { x: left, y, size, font: lineFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(value, { x: 380, y, size, font: lineFont, color: rgb(0.1, 0.1, 0.1) });
    y -= 24;
  };
  page.drawText('Les douceurs de Miléna', { x: left, y, size: 20, font: bold, color: rgb(0.83, 0.36, 0.47) });
  y -= 34;
  page.drawText(`Bilan Mensuel - ${monthLabel}`, { x: left, y, size: 14, font: bold, color: rgb(0.2, 0.2, 0.2) });
  y -= 34;
  drawLine(`Chiffre d'affaires (TTC)`, formatCurrency(totals.totalRevenueTTC));
  drawLine('CA Hors Taxe', formatCurrency(totals.totalRevenueHT));
  drawLine('TVA Collectée', formatCurrency(totals.totalTvaCollected));
  y -= 8;
  drawLine('Matières Premières', formatCurrency(totals.finalFoodCost));
  drawLine('Emballages', formatCurrency(totals.totalPackagingCost));
  drawLine('Cotisations Sociales', formatCurrency(totals.totalSocialCharges));
  y -= 8;
  drawLine('Marge sur Coûts Variables', formatCurrency(grossMargin), true);
  drawLine('Charges Fixes', formatCurrency(totals.actualFixedCosts));
  y -= 8;
  drawLine('RÉSULTAT NET', formatCurrency(totals.netResult), true);
  const bytes = await pdf.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `bilan_milena_${monthLabel}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const MonthlyReport: React.FC<Props> = ({
  settings, products, recipes, ingredients, purchases, orders, savedReports, setSavedReports, productionBatches
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [viewHistory, setViewHistory] = useState(false);
  const [frozenSales, setFrozenSales] = useState<MonthlyEntry[]>([]);
  const [editableSales, setEditableSales] = useState<MonthlyEntry[]>([]);
  const [frozenUnsold, setFrozenUnsold] = useState<UnsoldEntry[]>([]);
  const [editableUnsold, setEditableUnsold] = useState<UnsoldEntry[]>([]);
  const [actualFixedItems, setActualFixedItems] = useState<FixedCostItem[]>([]);
  const [actualIngredientSpend, setActualIngredientSpend] = useState<number>(0);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [costMode, setCostMode] = useState<0 | 1 | 2>(0);
  const [ingredientPriceMode, setIngredientPriceMode] = useState<'average' | 'last'>('average');
  const [frozenTotals, setFrozenTotals] = useState<TotalsSnapshot | null>(null);
  const [newSaleDraft, setNewSaleDraft] = useState<Partial<MonthlyEntry>>({});
  const [newUnsoldDraft, setNewUnsoldDraft] = useState<Partial<UnsoldEntry>>({});

  useEffect(() => {
    const saved = savedReports.find(r => r.monthStr === selectedMonth);
    if (saved) {
      setFrozenSales(saved.sales);
      setEditableSales([]);
      setFrozenUnsold(saved.unsold);
      setEditableUnsold([]);
      setActualFixedItems(saved.actualFixedCostItems);
      setActualIngredientSpend(saved.actualIngredientSpend);
      setInventory(saved.inventory || []);
      setCostMode(saved.costMode);
      setIngredientPriceMode(saved.ingredientPriceMode);
      setFrozenTotals({
        totalRevenueTTC: saved.totalRevenueTTC,
        totalRevenueHT: saved.totalRevenueHT,
        totalTvaCollected: saved.totalTvaCollected,
        finalFoodCost: saved.finalFoodCost,
        totalPackagingCost: saved.totalPackagingCost,
        totalSocialCharges: saved.totalSocialCharges,
        actualFixedCosts: saved.actualFixedCosts,
        netResult: saved.netResult
      });
      return;
    }

    setFrozenSales([]);
    setFrozenUnsold([]);
    setFrozenTotals(null);
    setActualFixedItems(settings.fixedCostItems.map(i => ({ ...i })));
    setActualIngredientSpend(0);
    setCostMode(0);
    setIngredientPriceMode('average');
    setInventory(ingredients.map(ing => ({ ingredientId: ing.id, startStock: ing.quantity, purchasedQuantity: 0, endStock: ing.quantity })));

    const grouped = new Map<string, MonthlyEntry>();
    const included = orders.filter(o => o.date.startsWith(selectedMonth) && shouldIncludeOrder(o, settings.includePendingOrdersInMonthlyReport ?? false));
    included.forEach(order => {
      order.items.forEach(item => {
        const key = `${item.productId}::${item.price}::${order.tvaRate}`;
        const existing = grouped.get(key);
        if (existing) grouped.set(key, { ...existing, quantitySold: existing.quantitySold + item.quantity });
        else grouped.set(key, { id: makeSaleId(), productId: item.productId, quantitySold: item.quantity, actualPrice: item.price, tvaRate: order.tvaRate });
      });
    });
    const initialSales = Array.from(grouped.values());
    setEditableSales(initialSales);

    const soldByProduct = new Map<string, number>();
    initialSales.forEach(s => soldByProduct.set(s.productId, (soldByProduct.get(s.productId) ?? 0) + s.quantitySold));
    const producedByProduct = new Map<string, number>();
    productionBatches.filter(b => b.date.startsWith(selectedMonth)).forEach(b => producedByProduct.set(b.productId, (producedByProduct.get(b.productId) ?? 0) + b.quantity));
    setEditableUnsold(products.map(p => ({ productId: p.id, quantityUnsold: Math.max(0, (producedByProduct.get(p.id) ?? 0) - (soldByProduct.get(p.id) ?? 0)) })));
  }, [selectedMonth, savedReports, settings.fixedCostItems, settings.includePendingOrdersInMonthlyReport, orders, products, ingredients, productionBatches]);

  const inventoryVariationCost = useMemo(() => inventory.reduce((sum, item) => {
    const ing = ingredients.find(i => i.id === item.ingredientId);
    if (!ing) return sum;
    const used = item.startStock + item.purchasedQuantity - item.endStock;
    const multiplier = (ing.unit === Unit.KG || ing.unit === Unit.L) ? 1000 : 1;
    return sum + (used * ing.costPerBaseUnit * multiplier);
  }, 0), [inventory, ingredients]);

  const totalActualFixedCosts = actualFixedItems.reduce((sum, i) => sum + i.amount, 0);
  const effectiveIngredients = costMode === 0 ? applyIngredientPriceMode(ingredients, purchases, ingredientPriceMode) : ingredients;
  const editableTotals = computeMonthlyTotals({
    sales: editableSales,
    unsold: editableUnsold,
    products,
    recipes,
    ingredients: effectiveIngredients,
    settings,
    costMode: frozenTotals ? 0 : costMode,
    actualIngredientSpend,
    inventoryVariationCost,
    actualFixedCosts: frozenTotals ? 0 : totalActualFixedCosts
  });

  const totals: TotalsSnapshot = frozenTotals ? {
    totalRevenueTTC: frozenTotals.totalRevenueTTC + editableTotals.totalRevenueTTC,
    totalRevenueHT: frozenTotals.totalRevenueHT + editableTotals.totalRevenueHT,
    totalTvaCollected: frozenTotals.totalTvaCollected + editableTotals.totalTvaCollected,
    finalFoodCost: frozenTotals.finalFoodCost + editableTotals.finalFoodCost,
    totalPackagingCost: frozenTotals.totalPackagingCost + editableTotals.totalPackagingCost,
    totalSocialCharges: frozenTotals.totalSocialCharges + editableTotals.totalSocialCharges,
    actualFixedCosts: frozenTotals.actualFixedCosts,
    netResult: frozenTotals.netResult + editableTotals.netResult
  } : {
    totalRevenueTTC: editableTotals.totalRevenueTTC,
    totalRevenueHT: editableTotals.totalRevenueHT,
    totalTvaCollected: editableTotals.totalTvaCollected,
    finalFoodCost: editableTotals.finalFoodCost,
    totalPackagingCost: editableTotals.totalPackagingCost,
    totalSocialCharges: editableTotals.totalSocialCharges,
    actualFixedCosts: totalActualFixedCosts,
    netResult: editableTotals.netResult
  };
  const grossMargin = totals.totalRevenueHT - (totals.finalFoodCost + totals.totalPackagingCost + totals.totalSocialCharges);

  const addSaleLine = () => {
    if (!newSaleDraft.productId) return;
    const p = products.find(prod => prod.id === newSaleDraft.productId);
    setEditableSales(prev => [...prev, {
      id: makeSaleId(),
      productId: newSaleDraft.productId!,
      quantitySold: Number(newSaleDraft.quantitySold ?? 0),
      actualPrice: Number(newSaleDraft.actualPrice ?? (p?.standardPrice ?? 0)),
      tvaRate: newSaleDraft.tvaRate ?? (settings.isTvaSubject ? settings.defaultTvaRate : 0)
    }]);
    setNewSaleDraft({});
  };
  const addUnsoldLine = () => {
    if (!newUnsoldDraft.productId || editableUnsold.some(e => e.productId === newUnsoldDraft.productId)) return;
    setEditableUnsold(prev => [...prev, { productId: newUnsoldDraft.productId!, quantityUnsold: Number(newUnsoldDraft.quantityUnsold ?? 0) }]);
    setNewUnsoldDraft({});
  };
  const mergeUnsold = (lines: UnsoldEntry[]) => {
    const map = new Map<string, number>();
    lines.forEach(line => map.set(line.productId, (map.get(line.productId) ?? 0) + line.quantityUnsold));
    return Array.from(map.entries()).map(([productId, quantityUnsold]) => ({ productId, quantityUnsold }));
  };
  const canSave = editableSales.every(s => isNonNegativeNumber(s.quantitySold) && isNonNegativeNumber(s.actualPrice) && (s.tvaRate === undefined || isNonNegativeNumber(s.tvaRate)));
  const saveReport = () => {
    if (!canSave) return alert('Valeurs invalides.');
    const report: MonthlyReportData = {
      id: selectedMonth,
      monthStr: selectedMonth,
      sales: [...frozenSales, ...editableSales],
      unsold: mergeUnsold([...frozenUnsold, ...editableUnsold]),
      actualFixedCostItems: actualFixedItems,
      actualIngredientSpend,
      inventory,
      costMode,
      ingredientPriceMode,
      totalRevenueTTC: totals.totalRevenueTTC,
      totalRevenueHT: totals.totalRevenueHT,
      totalTvaCollected: totals.totalTvaCollected,
      finalFoodCost: totals.finalFoodCost,
      totalPackagingCost: totals.totalPackagingCost,
      totalSocialCharges: totals.totalSocialCharges,
      actualFixedCosts: totals.actualFixedCosts,
      netResult: totals.netResult,
      isLocked: true
    };
    setSavedReports(prev => [...prev.filter(r => r.monthStr !== selectedMonth), report]);
    alert('Bilan sauvegardé.');
  };

  if (viewHistory) {
    return (
      <div className="space-y-6">
        <Button onClick={() => setViewHistory(false)} variant="secondary">← Retour au bilan actuel</Button>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {savedReports.map(report => (
            <Card key={report.id} onClick={() => { setSelectedMonth(report.monthStr); setViewHistory(false); }} className="cursor-pointer hover:border-rose-300">
              <div className="font-bold mb-2">{report.monthStr}</div>
              <div className={report.netResult >= 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{formatCurrency(report.netResult)}</div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
      <div className="lg:col-span-5 space-y-6 print:hidden no-print">
        <div className="flex justify-between items-center bg-white dark:bg-stone-900 p-4 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800">
          <input type="month" className="font-bold bg-transparent" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
          <Button size="sm" variant="ghost" onClick={() => setViewHistory(true)}>Historique</Button>
        </div>
        {frozenTotals && <Card className="border-amber-200 bg-amber-50"><p className="text-sm">Lignes chargées figées. Ajouts possibles uniquement.</p></Card>}

        <Card>
          <h3 className="text-lg font-bold mb-3">1. Ventes</h3>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {frozenSales.map(line => <div key={`f-${line.id}`} className="text-sm p-2 bg-stone-100 rounded">{products.find(p => p.id === line.productId)?.name} · {line.quantitySold} · {formatCurrency(line.actualPrice)} · {line.tvaRate ?? '—'}%</div>)}
            {editableSales.map(line => (
              <div key={line.id} className="grid grid-cols-[1fr_60px_88px_60px_22px] gap-1">
                <select value={line.productId} onChange={e => setEditableSales(prev => prev.map(s => s.id === line.id ? { ...s, productId: e.target.value } : s))}>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input value={line.quantitySold} onChange={e => setEditableSales(prev => prev.map(s => s.id === line.id ? { ...s, quantitySold: parseOptionalNumber(e.target.value) ?? 0 } : s))} />
                <input value={line.actualPrice} onChange={e => setEditableSales(prev => prev.map(s => s.id === line.id ? { ...s, actualPrice: parseOptionalNumber(e.target.value) ?? 0 } : s))} />
                <input value={line.tvaRate ?? 0} onChange={e => setEditableSales(prev => prev.map(s => s.id === line.id ? { ...s, tvaRate: parseOptionalNumber(e.target.value) ?? 0 } : s))} />
                <button onClick={() => setEditableSales(prev => prev.filter(s => s.id !== line.id))}>×</button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_60px_88px_60px_56px] gap-1 mt-2">
            <select value={newSaleDraft.productId ?? ''} onChange={e => setNewSaleDraft({ ...newSaleDraft, productId: e.target.value, tvaRate: settings.isTvaSubject ? settings.defaultTvaRate : 0 })}><option value="">Produit</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <input value={newSaleDraft.quantitySold ?? ''} onChange={e => setNewSaleDraft({ ...newSaleDraft, quantitySold: parseOptionalNumber(e.target.value) ?? 0 })} />
            <input value={newSaleDraft.actualPrice ?? ''} onChange={e => setNewSaleDraft({ ...newSaleDraft, actualPrice: parseOptionalNumber(e.target.value) ?? 0 })} />
            <input value={newSaleDraft.tvaRate ?? (settings.isTvaSubject ? settings.defaultTvaRate : 0)} onChange={e => setNewSaleDraft({ ...newSaleDraft, tvaRate: parseOptionalNumber(e.target.value) ?? 0 })} />
            <Button size="sm" onClick={addSaleLine}>+</Button>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-bold mb-3">2. Invendus</h3>
          {frozenUnsold.map(line => <div key={`u-f-${line.productId}`} className="text-sm p-2 bg-stone-100 rounded">{products.find(p => p.id === line.productId)?.name} · {line.quantityUnsold}</div>)}
          {editableUnsold.map(line => (
            <div key={`u-${line.productId}`} className="grid grid-cols-[1fr_80px_22px] gap-1 mt-1">
              <span>{products.find(p => p.id === line.productId)?.name}</span>
              <input value={line.quantityUnsold} onChange={e => setEditableUnsold(prev => prev.map(u => u.productId === line.productId ? { ...u, quantityUnsold: parseOptionalNumber(e.target.value) ?? 0 } : u))} />
              <button onClick={() => setEditableUnsold(prev => prev.filter(u => u.productId !== line.productId))}>×</button>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_80px_56px] gap-1 mt-2">
            <select value={newUnsoldDraft.productId ?? ''} onChange={e => setNewUnsoldDraft({ ...newUnsoldDraft, productId: e.target.value })}><option value="">Produit</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <input value={newUnsoldDraft.quantityUnsold ?? ''} onChange={e => setNewUnsoldDraft({ ...newUnsoldDraft, quantityUnsold: parseOptionalNumber(e.target.value) ?? 0 })} />
            <Button size="sm" onClick={addUnsoldLine}>+</Button>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-bold mb-3">3. Coûts</h3>
          <div className="flex gap-2 mb-2">
            <Button size="sm" variant={costMode === 0 ? 'primary' : 'secondary'} onClick={() => !frozenTotals && setCostMode(0)}>Théorique</Button>
            <Button size="sm" variant={costMode === 2 ? 'primary' : 'secondary'} onClick={() => !frozenTotals && setCostMode(2)}>Stock</Button>
            <Button size="sm" variant={costMode === 1 ? 'primary' : 'secondary'} onClick={() => !frozenTotals && setCostMode(1)}>Factures</Button>
          </div>
          {costMode === 0 && (
            <div className="text-xs flex gap-3 mb-2">
              <label><input type="radio" checked={ingredientPriceMode === 'average'} onChange={() => setIngredientPriceMode('average')} /> Prix moyen lissé</label>
              <label><input type="radio" checked={ingredientPriceMode === 'last'} onChange={() => setIngredientPriceMode('last')} /> Dernier prix</label>
            </div>
          )}
          {costMode === 1 && <Input label="Dépenses ingrédients" type="number" value={actualIngredientSpend} onChange={e => setActualIngredientSpend(parseOptionalNumber(e.target.value) ?? 0)} />}
          <p className="text-xs text-stone-500 mt-2">Mode stock: coût variation inventaire = {formatCurrency(inventoryVariationCost)}</p>
          <Button className="w-full mt-3" onClick={saveReport} disabled={!canSave}>Sauvegarder ce bilan</Button>
        </Card>
      </div>

      <div className="lg:col-span-7">
        <Card className="h-full">
          <div className="flex justify-between items-start mb-6 border-b pb-4">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-10 w-10" />
              <div>
                <h2 className="text-2xl font-bold font-serif">Bilan Mensuel</h2>
                <p className="text-stone-500">{selectedMonth}</p>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => { void exportMonthlyReportPdf(selectedMonth, totals, grossMargin); }}>📄 Exporter PDF</Button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Chiffre d'affaires (TTC)</span><strong>{formatCurrency(totals.totalRevenueTTC)}</strong></div>
            <div className="flex justify-between"><span>CA HT</span><strong>{formatCurrency(totals.totalRevenueHT)}</strong></div>
            <div className="flex justify-between"><span>TVA collectée</span><strong>{formatCurrency(totals.totalTvaCollected)}</strong></div>
            <div className="flex justify-between"><span>Matières</span><strong className="text-red-500">{formatCurrency(totals.finalFoodCost)}</strong></div>
            <div className="flex justify-between"><span>Emballages</span><strong className="text-red-500">{formatCurrency(totals.totalPackagingCost)}</strong></div>
            <div className="flex justify-between"><span>Cotisations sociales</span><strong className="text-red-500">{formatCurrency(totals.totalSocialCharges)}</strong></div>
            <div className="flex justify-between border-t pt-2"><span>Marge sur coûts variables</span><strong>{formatCurrency(grossMargin)}</strong></div>
            <div className="flex justify-between"><span>Charges fixes</span><strong className="text-red-500">{formatCurrency(totals.actualFixedCosts)}</strong></div>
            <div className="flex justify-between text-lg font-bold border-t pt-3"><span>RÉSULTAT NET</span><span>{formatCurrency(totals.netResult)}</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
};
