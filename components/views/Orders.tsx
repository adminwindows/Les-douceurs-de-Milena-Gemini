import React, { useEffect, useMemo, useState } from 'react';
import { GlobalSettings, Ingredient, Order, OrderItem, Product, ProductionBatch, Recipe } from '../../types';
import { Card, Button, Input, InfoTooltip } from '../ui/Common';
import { usePersistentState } from '../../usePersistentState';
import { isPositiveNumber, parseOptionalNumber, sanitizeTvaRate } from '../../validation';
import { formatCurrency } from '../../utils';
import { computeProductionIngredientUsage, getStockShortages, applyIngredientUsage } from '../../stockMovements';
import { sumCompletedDeliveredQuantityByProduct } from '../../ordersMath';

interface Props {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  products: Product[];
  ingredients: Ingredient[];
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  recipes: Recipe[];
  productionBatches: ProductionBatch[];
  setProductionBatches: React.Dispatch<React.SetStateAction<ProductionBatch[]>>;
  settings: GlobalSettings;
}

const toPositiveNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toNonNegativeNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const formatLaunchDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export const Orders: React.FC<Props> = ({
  orders,
  setOrders,
  products,
  ingredients,
  setIngredients,
  recipes,
  productionBatches,
  setProductionBatches,
  settings
}) => {
  const defaultTvaRate = settings.isTvaSubject ? settings.defaultTvaRate : 0;

  const [newOrder, setNewOrder, resetNewOrder] = usePersistentState<Partial<Order>>('draft:order:newOrder', {
    customerName: '',
    date: new Date().toISOString().split('T')[0],
    items: [],
    tvaRate: defaultTvaRate,
    status: 'pending'
  });
  const [currentItem, setCurrentItem, resetCurrentItem] = usePersistentState<{ productId: string; quantity?: number; price?: number }>('draft:order:currentItem', { productId: '', quantity: 1, price: undefined });
  const [orderPendingProductionConfirm, setOrderPendingProductionConfirm] = useState<Order | null>(null);

  useEffect(() => {
    if (newOrder.tvaRate === undefined) {
      setNewOrder(prev => ({ ...prev, tvaRate: defaultTvaRate }));
    }
  }, [defaultTvaRate, newOrder.tvaRate, setNewOrder]);

  const normalizeDraftItems = (items: OrderItem[] | undefined): OrderItem[] => (
    (items ?? [])
      .filter(item => typeof item.productId === 'string' && item.productId.trim() !== '')
      .map((item) => {
        const product = products.find(entry => entry.id === item.productId);
        return {
          productId: item.productId,
          quantity: toPositiveNumber(item.quantity, 1),
          price: toNonNegativeNumber(item.price, toNonNegativeNumber(product?.standardPrice, 0))
        };
      })
  );

  const draftItems = useMemo(() => normalizeDraftItems(newOrder.items), [newOrder.items, products]);

  const confirmDuplicateLaunch = (order: Order): boolean => {
    if (!order.productionLaunchedAt) return true;

    return window.confirm(
      `Cette commande a deja ete envoyee en production (${formatLaunchDate(order.productionLaunchedAt)}).\n\n` +
      'Voulez-vous quand meme ajouter une nouvelle fois les lignes de production ?'
    );
  };

  const buildValidProductionRequests = (order: Order): Array<{ productId: string; quantity: number }> => (
    order.items
      .filter(item => item.productId)
      .map((item) => ({
        productId: item.productId,
        quantity: toPositiveNumber(item.quantity, 0)
      }))
      .filter(item => item.quantity > 0)
  );

  const confirmPotentialShortages = (order: Order, shortages: ReturnType<typeof getStockShortages>): boolean => {
    if (shortages.length === 0) return true;
    const details = shortages
      .slice(0, 5)
      .map(shortage => `- ${shortage.ingredientName}: manque ${shortage.missing.toFixed(2)} ${shortage.unit}`)
      .join('\n');
    const more = shortages.length > 5 ? `\n...et ${shortages.length - 5} autre(s).` : '';
    return window.confirm(
      `Stock insuffisant pour la commande "${order.customerName}".\n${details}${more}\n\nContinuer quand meme ?`
    );
  };

  const pushOrderItemsToProduction = (order: Order): { launchedAt: string; pushed: boolean } => {
    const launchedAt = new Date().toISOString();
    const validItems = buildValidProductionRequests(order);

    if (validItems.length === 0) {
      return { launchedAt, pushed: false };
    }

    const usageResult = computeProductionIngredientUsage(validItems, products, recipes, ingredients);
    const shortages = getStockShortages(ingredients, usageResult.usages);
    if (!confirmPotentialShortages(order, shortages)) {
      return { launchedAt, pushed: false };
    }

    const newBatches: ProductionBatch[] = validItems.map(item => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      date: order.date,
      productId: item.productId,
      quantity: item.quantity,
      sourceOrderId: order.id
    }));

    setProductionBatches(prev => [...prev, ...newBatches]);
    setIngredients(prev => applyIngredientUsage(prev, usageResult.usages, 'consume'));

    const issues: string[] = [];
    if (usageResult.missingProductIds.length > 0) issues.push(`produits introuvables: ${usageResult.missingProductIds.length}`);
    if (usageResult.missingRecipeProductIds.length > 0) issues.push(`produits sans recette: ${usageResult.missingRecipeProductIds.length}`);
    if (usageResult.missingIngredientIds.length > 0) issues.push(`ingredients manquants: ${usageResult.missingIngredientIds.length}`);
    if (issues.length > 0) {
      alert(`Production ajoutee avec avertissement (${issues.join(', ')}).`);
    }

    return { launchedAt, pushed: true };
  };

  const isCurrentItemQuantityValid = isPositiveNumber(currentItem.quantity);
  const isCurrentItemPriceValid = isPositiveNumber(currentItem.price);

  const addItemToOrder = () => {
    if (!currentItem.productId || !isCurrentItemQuantityValid || !isCurrentItemPriceValid) return;
    const quantity = Number(currentItem.quantity);
    const price = Number(currentItem.price);
    const existing = draftItems.find(item => item.productId === currentItem.productId && item.price === price);

    const updatedItems = existing
      ? draftItems.map(item => (
        item.productId === currentItem.productId && item.price === price
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ))
      : [...draftItems, { productId: currentItem.productId, quantity, price }];

    setNewOrder({ ...newOrder, items: updatedItems });
    setCurrentItem({ productId: '', quantity: 1, price: undefined });
  };

  const saveOrder = () => {
    if (!newOrder.customerName || !newOrder.date || !draftItems.length) return;

    const safeTvaRate = settings.isTvaSubject
      ? sanitizeTvaRate(newOrder.tvaRate, defaultTvaRate)
      : 0;

    setOrders([
      ...orders,
      {
        id: Date.now().toString(),
        customerName: newOrder.customerName,
        date: newOrder.date,
        items: draftItems,
        tvaRate: safeTvaRate,
        status: 'pending',
        notes: newOrder.notes
      }
    ]);

    resetNewOrder();
    resetCurrentItem();
  };

  const deleteOrder = (id: string) => {
    setOrders(orders.filter(order => order.id !== id));
  };

  const sendToProduction = (order: Order) => {
    if (!confirmDuplicateLaunch(order)) return;
    const result = pushOrderItemsToProduction(order);
    if (!result.pushed) return;
    setOrders(prev => prev.map(entry => (
      entry.id === order.id
        ? { ...entry, productionLaunchedAt: result.launchedAt }
        : entry
    )));
    alert('Produits ajoutes a la file de production.');
  };

  const toggleStatus = (order: Order) => {
    const nextStatus = order.status === 'pending' ? 'completed' : 'pending';

    if (nextStatus === 'completed') {
      setOrderPendingProductionConfirm(order);
      return;
    }

    setOrders(orders.map(entry => entry.id === order.id ? { ...entry, status: nextStatus } : entry));
  };

  const markCompleted = (order: Order, mode: 'already-launched' | 'launch-now') => {
    let nextLaunchedAt = order.productionLaunchedAt;

    if (mode === 'launch-now') {
      const result = pushOrderItemsToProduction(order);
      if (!result.pushed) return;
      nextLaunchedAt = result.launchedAt;
      alert('Production enregistree avec succes.');
    } else if (!nextLaunchedAt) {
      nextLaunchedAt = new Date().toISOString();
    }

    setOrders(prev => prev.map(entry => (
      entry.id === order.id
        ? { ...entry, status: 'completed', productionLaunchedAt: nextLaunchedAt }
        : entry
    )));
    setOrderPendingProductionConfirm(null);
  };

  const confirmCancelOrderDraft = () => {
    const hasDraft = Boolean(newOrder.customerName || draftItems.length || newOrder.notes);
    if (!hasDraft) return;
    if (window.confirm('Annuler la creation de commande ? Les saisies en cours seront perdues.')) {
      resetNewOrder();
      resetCurrentItem();
    }
  };

  const handleDeleteOrderItem = (index: number) => {
    setNewOrder({
      ...newOrder,
      items: draftItems.filter((_, itemIndex) => itemIndex !== index)
    });
  };

  const getProductWarnings = (productId: string) => {
    const product = products.find(entry => entry.id === productId);
    if (!product) return null;

    const totalDelivered = sumCompletedDeliveredQuantityByProduct(orders, productId);

    const totalProduced = productionBatches
      .filter(batch => batch.productId === productId)
      .reduce((sum, batch) => sum + toPositiveNumber(batch.quantity, 0), 0);

    if (totalDelivered > totalProduced) {
      return {
        msg: `Attention: ${totalDelivered} livres pour seulement ${totalProduced} produits enregistres !`
      };
    }
    return null;
  };

  const draftOrderTotal = draftItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  return (
    <>
      {orderPendingProductionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md border-rose-200 dark:border-stone-700">
            <h4 className="text-lg font-bold mb-2">Cloturer la commande</h4>
            <p className="text-sm text-stone-600 dark:text-stone-300 mb-4">
              {orderPendingProductionConfirm.productionLaunchedAt
                ? `Production deja lancee le ${formatLaunchDate(orderPendingProductionConfirm.productionLaunchedAt)}.`
                : 'Cette commande est-elle deja partie en production ?'}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
              {orderPendingProductionConfirm.productionLaunchedAt
                ? 'Valider sans ajout ne cree aucune nouvelle ligne. Ajouter a nouveau cree des lots supplementaires.'
                : 'Valider sans ajout marque la commande livree sans nouvelle ligne de production.'}
            </p>
            <div className="grid grid-cols-1 gap-2">
              <Button variant="ghost" onClick={() => setOrderPendingProductionConfirm(null)}>
                Annuler
              </Button>
              <Button variant="secondary" onClick={() => markCompleted(orderPendingProductionConfirm, 'already-launched')}>
                Valider sans ajout
              </Button>
              <Button onClick={() => markCompleted(orderPendingProductionConfirm, 'launch-now')}>
                {orderPendingProductionConfirm.productionLaunchedAt ? 'Ajouter a nouveau en production' : 'Lancer la production maintenant'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Card className="lg:sticky lg:top-24 border-rose-200 dark:border-rose-800 shadow-rose-100/50 dark:shadow-none">
            <h3 className="text-xl font-bold text-rose-950 dark:text-rose-100 font-serif mb-6">Nouvelle Commande</h3>

            <div className="space-y-4">
              <Input
                label="Nom Client"
                placeholder="Ex: Sophie Martin"
                value={newOrder.customerName}
                onChange={event => setNewOrder({ ...newOrder, customerName: event.target.value })}
              />
              <Input
                label="Date de livraison"
                type="date"
                value={newOrder.date}
                onChange={event => setNewOrder({ ...newOrder, date: event.target.value })}
              />
              <Input
                label="TVA de la commande"
                type="number"
                suffix="%"
                value={settings.isTvaSubject ? (newOrder.tvaRate ?? defaultTvaRate) : 0}
                onChange={event => {
                  const parsed = parseOptionalNumber(event.target.value);
                  setNewOrder({
                    ...newOrder,
                    tvaRate: parsed === undefined ? 0 : sanitizeTvaRate(parsed, defaultTvaRate)
                  });
                }}
                helperText={settings.isTvaSubject ? 'Un seul taux TVA pour toute la commande.' : 'TVA inactive: le taux de commande reste a 0%.'}
                disabled={!settings.isTvaSubject}
              />

              <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700">
                <h4 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Ajouter des produits</h4>
                <div className="space-y-2 mb-2">
                  <select
                    className="w-full min-w-0 px-2 py-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                    value={currentItem.productId}
                    onChange={event => {
                      const productId = event.target.value;
                      const product = products.find(entry => entry.id === productId);
                      setCurrentItem({
                        productId,
                        quantity: currentItem.quantity ?? 1,
                        price: product?.standardPrice ?? 0
                      });
                    }}
                  >
                    <option value="">Produit...</option>
                    {currentItem.productId && !products.some(product => product.id === currentItem.productId) && (
                      <option value={currentItem.productId}>Produit supprime</option>
                    )}
                    {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </select>
                  <div className="grid grid-cols-[88px_minmax(0,1fr)_56px] gap-2">
                    <input
                      type="text"
                      className="px-2 py-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                      value={currentItem.quantity ?? ''}
                      onChange={event => setCurrentItem({ ...currentItem, quantity: parseOptionalNumber(event.target.value) })}
                      placeholder="Qte"
                    />
                    <input
                      type="text"
                      className="px-2 py-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                      value={currentItem.price ?? ''}
                      onChange={event => setCurrentItem({ ...currentItem, price: parseOptionalNumber(event.target.value) })}
                      placeholder="Prix"
                    />
                    <Button
                      size="sm"
                      onClick={addItemToOrder}
                      disabled={!currentItem.productId || !isCurrentItemQuantityValid || !isCurrentItemPriceValid}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 mt-3">
                  {draftItems.map((item, index) => {
                    const product = products.find(entry => entry.id === item.productId);
                    return (
                      <div key={`${item.productId}-${item.price}-${index}`} className="flex justify-between text-sm bg-white dark:bg-stone-800 p-2 rounded border border-stone-100 dark:border-stone-700">
                        <span className="dark:text-stone-300">{product?.name || 'Produit supprime'}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold dark:text-stone-200">x {item.quantity}</span>
                          <span className="text-stone-500">{formatCurrency(item.price, settings.currency)}</span>
                          <button className="text-red-500" onClick={() => handleDeleteOrderItem(index)}>x</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {draftItems.length > 0 && (
                  <p className="text-xs text-stone-500 mt-2 text-right">
                    Total commande: <strong>{formatCurrency(draftOrderTotal, settings.currency)}</strong>
                  </p>
                )}
              </div>

              <Input
                label="Notes"
                placeholder="Allergies, message special..."
                value={newOrder.notes || ''}
                onChange={event => setNewOrder({ ...newOrder, notes: event.target.value })}
              />

              <div className="flex gap-2">
                <Button variant="secondary" className="w-1/3 mt-2" onClick={confirmCancelOrderDraft}>Annuler</Button>
                <Button className="flex-1 mt-2" onClick={saveOrder} disabled={!draftItems.length || !newOrder.customerName}>
                  Enregistrer la commande
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 font-serif">Commandes en cours ({orders.filter(order => order.status === 'pending').length})</h3>

          <div className="space-y-4">
            {[...orders].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()).map(order => {
              const safeOrderTotal = order.items.reduce((sum, item) => {
                const product = products.find(entry => entry.id === item.productId);
                const quantity = toPositiveNumber(item.quantity, 0);
                const price = toNonNegativeNumber(item.price, toNonNegativeNumber(product?.standardPrice, 0));
                return sum + (quantity * price);
              }, 0);

              return (
                <Card key={order.id} className={`transition-all border ${order.status === 'completed' ? 'opacity-70 bg-stone-50/80 dark:bg-stone-900/70 border-stone-200 dark:border-stone-700' : 'border-l-4 border-l-[#D45D79] dark:border-l-rose-500 shadow-sm shadow-rose-100/40 dark:shadow-none'}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-bold text-lg text-stone-800 dark:text-stone-200">{order.customerName}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'}`}>
                          {order.status === 'completed' ? 'Livree' : 'A faire'}
                        </span>
                        {order.productionLaunchedAt && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">
                            Production lancee
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone-500 dark:text-stone-400 mb-1">Pour le : {new Date(order.date).toLocaleDateString()}</p>
                      <p className="text-xs text-stone-500">TVA commande: {order.tvaRate}%</p>
                      {order.productionLaunchedAt && (
                        <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-1">
                          Dernier envoi production: {formatLaunchDate(order.productionLaunchedAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 no-print sm:justify-end">
                      {order.status === 'pending' && (
                        <button onClick={() => sendToProduction(order)} className="text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 bg-indigo-50 dark:bg-indigo-900/25 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800 transition-colors">
                          {order.productionLaunchedAt ? 'Produire encore' : 'Produire'}
                        </button>
                      )}
                      <button onClick={() => toggleStatus(order)} className="text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 underline underline-offset-2">
                        {order.status === 'pending' ? 'Marquer livree' : 'Marquer a faire'}
                      </button>
                      <button onClick={() => deleteOrder(order.id)} className="text-xs font-medium text-stone-400 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400">
                        Suppr.
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 pl-4 border-l-2 border-stone-100 dark:border-stone-700 space-y-1">
                    {order.items.map((item, index) => {
                      const product = products.find(entry => entry.id === item.productId);
                      const warning = getProductWarnings(item.productId);
                      const safeQuantity = toPositiveNumber(item.quantity, 0);
                      const safePrice = toNonNegativeNumber(item.price, toNonNegativeNumber(product?.standardPrice, 0));

                      return (
                        <div key={`${item.productId}-${item.price}-${index}`} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-stone-700 dark:text-stone-300 truncate">{product?.name || 'Produit supprime'}</span>
                            {warning && order.status === 'completed' && (
                              <>
                                <InfoTooltip text={warning.msg} />
                                <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded">Stock ?</span>
                              </>
                            )}
                          </div>
                          <span className="font-bold text-stone-900 dark:text-stone-100 tabular-nums shrink-0">
                            x{safeQuantity} - {formatCurrency(safePrice, settings.currency)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-3 text-right">
                    Total: <strong>{formatCurrency(safeOrderTotal, settings.currency)}</strong>
                  </p>

                  {order.notes && <p className="text-xs text-stone-500 dark:text-stone-400 mt-3 italic bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">Note: {order.notes}</p>}
                </Card>
              );
            })}
            {orders.length === 0 && <p className="text-stone-400 dark:text-stone-500 italic text-center py-8">Aucune commande enregistree.</p>}
          </div>
        </div>
      </div>
    </>
  );
};
