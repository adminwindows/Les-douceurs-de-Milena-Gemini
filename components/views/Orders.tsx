import React, { useMemo, useState } from 'react';
import { Order, Product, ProductionBatch } from '../../types';
import { Card, Button, Input } from '../ui/Common';
import { parseOptionalNumber } from '../../validation';

interface Props {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  products: Product[];
  productionBatches: ProductionBatch[];
  setProductionBatches: React.Dispatch<React.SetStateAction<ProductionBatch[]>>;
  defaultTvaRate?: number;
  isTvaSubject?: boolean;
}

export const Orders: React.FC<Props> = ({
  orders,
  setOrders,
  products,
  productionBatches,
  setProductionBatches,
  defaultTvaRate = 0,
  isTvaSubject = false
}) => {
  const initialTva = isTvaSubject ? defaultTvaRate : 0;
  const [newOrder, setNewOrder] = useState<Partial<Order>>({
    customerName: '',
    date: new Date().toISOString().split('T')[0],
    items: [],
    status: 'pending',
    tvaRate: initialTva
  });
  const [currentItem, setCurrentItem] = useState<{ productId: string; quantity: number; price: number }>({ productId: '', quantity: 1, price: 0 });

  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  const addItemToOrder = () => {
    if (!currentItem.productId || currentItem.quantity <= 0) return;
    const existing = (newOrder.items || []).find(i => i.productId === currentItem.productId && i.price === currentItem.price);
    let items = newOrder.items || [];
    if (existing) {
      items = items.map(i => i === existing ? { ...i, quantity: i.quantity + currentItem.quantity } : i);
    } else {
      items = [...items, { ...currentItem }];
    }
    setNewOrder(prev => ({ ...prev, items }));
    setCurrentItem({ productId: '', quantity: 1, price: 0 });
  };

  const saveOrder = () => {
    if (!newOrder.customerName || !newOrder.date || !newOrder.items?.length) return;
    setOrders(prev => [...prev, {
      id: Date.now().toString(),
      customerName: newOrder.customerName!,
      date: newOrder.date!,
      items: newOrder.items!,
      status: 'pending',
      notes: newOrder.notes,
      tvaRate: newOrder.tvaRate ?? 0
    }]);
    setNewOrder({ customerName: '', date: new Date().toISOString().split('T')[0], items: [], status: 'pending', tvaRate: initialTva });
  };

  const toggleStatus = (order: Order) => {
    const nextStatus = order.status === 'pending' ? 'completed' : 'pending';
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: nextStatus } : o));
  };

  const deleteOrder = (id: string) => setOrders(prev => prev.filter(o => o.id !== id));

  const sendToProduction = (order: Order) => {
    const newBatches: ProductionBatch[] = order.items.map(item => ({
      id: `${Date.now()}-${Math.random()}`,
      date: order.date,
      productId: item.productId,
      quantity: item.quantity
    }));
    setProductionBatches(prev => [...prev, ...newBatches]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5">
        <Card>
          <h3 className="text-lg font-bold mb-4">Nouvelle commande</h3>
          <Input label="Client" value={newOrder.customerName || ''} onChange={e => setNewOrder(prev => ({ ...prev, customerName: e.target.value }))} />
          <Input label="Date" type="date" value={newOrder.date || ''} onChange={e => setNewOrder(prev => ({ ...prev, date: e.target.value }))} />
          <Input label="TVA commande (%)" type="number" value={newOrder.tvaRate ?? 0} onChange={e => setNewOrder(prev => ({ ...prev, tvaRate: parseOptionalNumber(e.target.value) ?? 0 }))} helperText="Un seul taux TVA pour toute la commande." />

          <div className="mt-4 grid grid-cols-1 gap-2">
            <select className="px-3 py-2 rounded border" value={currentItem.productId} onChange={e => {
              const productId = e.target.value;
              const product = productById.get(productId);
              setCurrentItem(prev => ({ ...prev, productId, price: product?.standardPrice ?? 0 }));
            }}>
              <option value="">-- Produit --</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Input label="Quantité" type="number" value={currentItem.quantity} onChange={e => setCurrentItem(prev => ({ ...prev, quantity: parseOptionalNumber(e.target.value) ?? 0 }))} />
            <Input label="Prix unitaire" type="number" value={currentItem.price} onChange={e => setCurrentItem(prev => ({ ...prev, price: parseOptionalNumber(e.target.value) ?? 0 }))} suffix="€" />
            <Button size="sm" onClick={addItemToOrder}>Ajouter ligne</Button>
          </div>

          <div className="mt-3 space-y-1">
            {(newOrder.items || []).map((item, idx) => (
              <div key={idx} className="text-sm flex justify-between border rounded p-2">
                <span>{productById.get(item.productId)?.name}</span>
                <span>x{item.quantity} · {item.price}€</span>
              </div>
            ))}
          </div>

          <Button className="mt-3 w-full" onClick={saveOrder}>Enregistrer la commande</Button>
        </Card>
      </div>

      <div className="lg:col-span-7 space-y-4">
        {[...orders].sort((a, b) => b.date.localeCompare(a.date)).map(order => (
          <Card key={order.id} className={order.status === 'completed' ? 'opacity-70' : ''}>
            <div className="flex justify-between mb-2">
              <div>
                <div className="font-bold">{order.customerName}</div>
                <div className="text-xs">{order.date} · TVA {order.tvaRate}%</div>
              </div>
              <div className="space-x-2">
                <Button size="sm" variant="ghost" onClick={() => sendToProduction(order)}>Produire</Button>
                <Button size="sm" variant="secondary" onClick={() => toggleStatus(order)}>{order.status === 'pending' ? 'Marquer livrée' : 'Marquer à faire'}</Button>
                <Button size="sm" variant="danger" onClick={() => deleteOrder(order.id)}>Suppr.</Button>
              </div>
            </div>
            {order.items.map((item, idx) => (
              <div key={idx} className="text-sm flex justify-between">
                <span>{productById.get(item.productId)?.name || 'Produit supprimé'}</span>
                <span>x{item.quantity} · {item.price}€</span>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
};
