import React, { useEffect, useState } from 'react';
import { GlobalSettings, Order, Product, ProductionBatch } from '../../types';
import { Card, Button, Input, InfoTooltip } from '../ui/Common';
import { usePersistentState } from '../../usePersistentState';
import { isPositiveNumber, parseOptionalNumber } from '../../validation';
import { formatCurrency } from '../../utils';

interface Props {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  products: Product[];
  productionBatches: ProductionBatch[];
  setProductionBatches: React.Dispatch<React.SetStateAction<ProductionBatch[]>>;
  settings: GlobalSettings;
}

export const Orders: React.FC<Props> = ({ orders, setOrders, products, productionBatches, setProductionBatches, settings }) => {
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

  const isCurrentItemQuantityValid = isPositiveNumber(currentItem.quantity);
  const isCurrentItemPriceValid = isPositiveNumber(currentItem.price);

  const addItemToOrder = () => {
    if (!currentItem.productId || !isCurrentItemQuantityValid || !isCurrentItemPriceValid) return;
    const price = Number(currentItem.price);
    const existing = (newOrder.items || []).find(item => item.productId === currentItem.productId && item.price === price);

    const updatedItems = existing
      ? (newOrder.items || []).map(item => (
        item.productId === currentItem.productId && item.price === price
          ? { ...item, quantity: item.quantity + Number(currentItem.quantity) }
          : item
      ))
      : [...(newOrder.items || []), { productId: currentItem.productId, quantity: Number(currentItem.quantity), price }];

    setNewOrder({ ...newOrder, items: updatedItems });
    setCurrentItem({ productId: '', quantity: 1, price: undefined });
  };

  const saveOrder = () => {
    if (!newOrder.customerName || !newOrder.date || !newOrder.items?.length) return;

    setOrders([
      ...orders,
      {
        id: Date.now().toString(),
        customerName: newOrder.customerName,
        date: newOrder.date,
        items: newOrder.items,
        tvaRate: Number(newOrder.tvaRate ?? defaultTvaRate),
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
    const newBatches: ProductionBatch[] = order.items.map(item => ({
      id: Date.now().toString() + Math.random().toString(),
      date: order.date,
      productId: item.productId,
      quantity: item.quantity
    }));
    setProductionBatches(prev => [...prev, ...newBatches]);
    alert('Produits ajoutés à la file de production !');
  };

  const toggleStatus = (order: Order) => {
    const nextStatus = order.status === 'pending' ? 'completed' : 'pending';

    if (nextStatus === 'completed') {
      setOrderPendingProductionConfirm(order);
      return;
    }

    setOrders(orders.map(entry => entry.id === order.id ? { ...entry, status: nextStatus } : entry));
  };

  const markCompleted = (order: Order, createProduction: boolean) => {
    if (createProduction) {
      const newBatches: ProductionBatch[] = order.items.map(item => ({
        id: Date.now().toString() + Math.random().toString(),
        date: order.date,
        productId: item.productId,
        quantity: item.quantity
      }));
      setProductionBatches(prev => [...prev, ...newBatches]);
      alert('Production enregistrée avec succès.');
    }

    setOrders(prev => prev.map(entry => entry.id === order.id ? { ...entry, status: 'completed' } : entry));
    setOrderPendingProductionConfirm(null);
  };

  const confirmCancelOrderDraft = () => {
    const hasDraft = Boolean(newOrder.customerName || (newOrder.items && newOrder.items.length) || newOrder.notes);
    if (!hasDraft) return;
    if (window.confirm('Annuler la création de commande ? Les saisies en cours seront perdues.')) {
      resetNewOrder();
      resetCurrentItem();
    }
  };

  const handleDeleteOrderItem = (index: number) => {
    setNewOrder({
      ...newOrder,
      items: (newOrder.items || []).filter((_, itemIndex) => itemIndex !== index)
    });
  };

  const getProductWarnings = (productId: string) => {
    const product = products.find(entry => entry.id === productId);
    if (!product) return null;

    const totalDelivered = orders
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => {
        return sum + order.items
          .filter(item => item.productId === productId)
          .reduce((subSum, item) => subSum + item.quantity, 0);
      }, 0);

    const totalProduced = productionBatches
      .filter(batch => batch.productId === productId)
      .reduce((sum, batch) => sum + batch.quantity, 0);

    if (totalDelivered > totalProduced) {
      return {
        msg: `Attention: ${totalDelivered} livrés pour seulement ${totalProduced} produits enregistrés !`
      };
    }
    return null;
  };

  const draftOrderTotal = (newOrder.items || []).reduce((sum, item) => sum + (item.quantity * item.price), 0);

  return (
    <>
      {orderPendingProductionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md border-rose-200 dark:border-stone-700">
            <h4 className="text-lg font-bold mb-2">Commande livrée ✅</h4>
            <p className="text-sm text-stone-600 dark:text-stone-300 mb-4">
              Avez-vous déjà enregistré la production ?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => markCompleted(orderPendingProductionConfirm, false)}>
                Non
              </Button>
              <Button onClick={() => markCompleted(orderPendingProductionConfirm, true)}>
                Oui
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
                value={newOrder.tvaRate ?? defaultTvaRate}
                onChange={event => setNewOrder({ ...newOrder, tvaRate: parseOptionalNumber(event.target.value) ?? 0 })}
                helperText="Un seul taux TVA pour toute la commande."
              />

              <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700">
                <h4 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Ajouter des produits</h4>
                <div className="grid grid-cols-[1fr_80px_110px_48px] gap-2 mb-2">
                  <select
                    className="min-w-0 px-2 py-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
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
                    {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </select>
                  <input
                    type="text"
                    className="px-2 py-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                    value={currentItem.quantity ?? ''}
                    onChange={event => setCurrentItem({ ...currentItem, quantity: parseOptionalNumber(event.target.value) })}
                    placeholder="Qté"
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

                <div className="space-y-1 mt-3">
                  {(newOrder.items || []).map((item, index) => {
                    const product = products.find(entry => entry.id === item.productId);
                    return (
                      <div key={`${item.productId}-${item.price}-${index}`} className="flex justify-between text-sm bg-white dark:bg-stone-800 p-2 rounded border border-stone-100 dark:border-stone-700">
                        <span className="dark:text-stone-300">{product?.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold dark:text-stone-200">x {item.quantity}</span>
                          <span className="text-stone-500">{formatCurrency(item.price)}</span>
                          <button className="text-red-500" onClick={() => handleDeleteOrderItem(index)}>×</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {newOrder.items && newOrder.items.length > 0 && (
                  <p className="text-xs text-stone-500 mt-2 text-right">
                    Total commande: <strong>{formatCurrency(draftOrderTotal)}</strong>
                  </p>
                )}
              </div>

              <Input
                label="Notes"
                placeholder="Allergies, message spécial..."
                value={newOrder.notes || ''}
                onChange={event => setNewOrder({ ...newOrder, notes: event.target.value })}
              />

              <div className="flex gap-2">
                <Button variant="secondary" className="w-1/3 mt-2" onClick={confirmCancelOrderDraft}>Annuler</Button>
                <Button className="flex-1 mt-2" onClick={saveOrder} disabled={!newOrder.items?.length || !newOrder.customerName}>
                  Enregistrer la commande
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 font-serif">Commandes en cours ({orders.filter(order => order.status === 'pending').length})</h3>

          <div className="space-y-4">
            {[...orders].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()).map(order => (
              <Card key={order.id} className={`transition-all ${order.status === 'completed' ? 'opacity-60 bg-stone-50 dark:bg-stone-900' : 'border-l-4 border-l-[#D45D79] dark:border-l-rose-500'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-lg text-stone-800 dark:text-stone-200">{order.customerName}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'}`}>
                        {order.status === 'completed' ? 'Livrée' : 'À faire'}
                      </span>
                    </div>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mb-1">Pour le : {new Date(order.date).toLocaleDateString()}</p>
                    <p className="text-xs text-stone-500">TVA commande: {order.tvaRate}%</p>
                  </div>
                  <div className="flex gap-2 no-print">
                    {order.status === 'pending' && (
                      <button onClick={() => sendToProduction(order)} className="text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-stone-100 dark:bg-stone-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-2 py-1 rounded border border-stone-200 dark:border-stone-700 transition-colors">
                        👩‍🍳 Produire
                      </button>
                    )}
                    <button onClick={() => toggleStatus(order)} className="text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline">
                      {order.status === 'pending' ? 'Marquer livrée' : 'Marquer à faire'}
                    </button>
                    <button onClick={() => deleteOrder(order.id)} className="text-xs font-medium text-stone-300 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400">
                      Suppr.
                    </button>
                  </div>
                </div>

                <div className="pl-4 border-l-2 border-stone-100 dark:border-stone-700 space-y-1">
                  {order.items.map((item, index) => {
                    const product = products.find(entry => entry.id === item.productId);
                    const warning = getProductWarnings(item.productId);

                    return (
                      <div key={`${item.productId}-${item.price}-${index}`} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-stone-700 dark:text-stone-300">{product?.name || 'Produit supprimé'}</span>
                          {warning && order.status === 'completed' && (
                            <>
                              <InfoTooltip text={warning.msg} />
                              <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded">Stock ?</span>
                            </>
                          )}
                        </div>
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          x{item.quantity} · {formatCurrency(item.price)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {order.notes && <p className="text-xs text-stone-500 dark:text-stone-400 mt-3 italic bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">Note: {order.notes}</p>}
              </Card>
            ))}
            {orders.length === 0 && <p className="text-stone-400 dark:text-stone-500 italic text-center py-8">Aucune commande enregistrée.</p>}
          </div>
        </div>
      </div>
    </>
  );
};
