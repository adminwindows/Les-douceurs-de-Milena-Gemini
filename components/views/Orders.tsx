import React, { useState } from 'react';
import { Order, Product, OrderItem } from '../../types';
import { Card, Button, Input, Select } from '../ui/Common';
import { toInputValue, toNumber } from '../../utils';

interface Props {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  products: Product[];
}

export const Orders: React.FC<Props> = ({ orders, setOrders, products }) => {
  const [newOrder, setNewOrder] = useState<Partial<Order>>({ customerName: '', date: new Date().toISOString().split('T')[0], items: [], status: 'pending' });
  const [currentItem, setCurrentItem] = useState<{ productId: string, quantity: number }>({ productId: '', quantity: 1 });

  const addItemToOrder = () => {
    if (!currentItem.productId || !Number.isFinite(currentItem.quantity) || currentItem.quantity <= 0) return;
    const existing = (newOrder.items || []).find(i => i.productId === currentItem.productId);
    
    let updatedItems;
    if (existing) {
      updatedItems = (newOrder.items || []).map(i => i.productId === currentItem.productId ? { ...i, quantity: i.quantity + currentItem.quantity } : i);
    } else {
      updatedItems = [...(newOrder.items || []), { ...currentItem }];
    }
    
    setNewOrder({ ...newOrder, items: updatedItems });
    setCurrentItem({ productId: '', quantity: 1 });
  };

  const saveOrder = () => {
    if (!newOrder.customerName || !newOrder.date || !newOrder.items?.length) return;
    
    setOrders([...orders, {
      id: Date.now().toString(),
      customerName: newOrder.customerName,
      date: newOrder.date,
      items: newOrder.items,
      status: 'pending',
      notes: newOrder.notes
    }]);
    
    setNewOrder({ customerName: '', date: new Date().toISOString().split('T')[0], items: [], status: 'pending', notes: '' });
  };

  const deleteOrder = (id: string) => {
    setOrders(orders.filter(o => o.id !== id));
  };

  const toggleStatus = (id: string) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: o.status === 'pending' ? 'completed' : 'pending' } : o));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Order Form */}
      <div className="lg:col-span-5 space-y-6">
        <Card className="sticky top-24 border-rose-100 shadow-rose-100/50">
          <h3 className="text-xl font-bold text-rose-950 font-serif mb-6">Nouvelle Commande</h3>
          
          <div className="space-y-4">
            <Input 
              label="Nom Client" 
              placeholder="Ex: Sophie Martin"
              value={newOrder.customerName} 
              onChange={e => setNewOrder({...newOrder, customerName: e.target.value})} 
            />
            <Input 
              label="Date de livraison" 
              type="date"
              value={newOrder.date} 
              onChange={e => setNewOrder({...newOrder, date: e.target.value})} 
            />
            
            <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
              <h4 className="text-sm font-bold text-stone-700 mb-2">Ajouter des produits</h4>
              <div className="flex gap-2 mb-2">
                <select 
                  className="flex-1 px-2 py-2 rounded border border-stone-300 text-sm"
                  value={currentItem.productId}
                  onChange={e => setCurrentItem({...currentItem, productId: e.target.value})}
                >
                  <option value="">Produit...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input 
                  type="number" 
                  className="w-16 px-2 py-2 rounded border border-stone-300 text-sm"
                  value={toInputValue(currentItem.quantity)}
                  onChange={e => setCurrentItem({...currentItem, quantity: toNumber(e.target.value)})}
                />
                <Button size="sm" onClick={addItemToOrder}>+</Button>
              </div>

              <div className="space-y-1 mt-3">
                {(newOrder.items || []).map((item, idx) => {
                  const p = products.find(p => p.id === item.productId);
                  return (
                    <div key={idx} className="flex justify-between text-sm bg-white p-2 rounded border border-stone-100">
                      <span>{p?.name}</span>
                      <span className="font-bold">x {item.quantity}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Input 
              label="Notes" 
              placeholder="Allergies, message spécial..."
              value={newOrder.notes || ''} 
              onChange={e => setNewOrder({...newOrder, notes: e.target.value})} 
            />

            <Button className="w-full mt-2" onClick={saveOrder} disabled={!newOrder.items?.length || !newOrder.customerName}>
              Enregistrer la commande
            </Button>
          </div>
        </Card>
      </div>

      {/* Order List */}
      <div className="lg:col-span-7 space-y-6">
        <h3 className="text-xl font-bold text-stone-800 font-serif">Commandes en cours ({orders.filter(o => o.status === 'pending').length})</h3>
        
        <div className="space-y-4">
          {[...orders].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(order => (
            <Card key={order.id} className={`transition-all ${order.status === 'completed' ? 'opacity-60 bg-stone-50' : 'border-l-4 border-l-[#D45D79]'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-lg text-stone-800">{order.customerName}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>
                      {order.status === 'completed' ? 'Livrée' : 'À faire'}
                    </span>
                  </div>
                  <p className="text-sm text-stone-500 mb-3">Pour le : {new Date(order.date).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 no-print">
                   <button onClick={() => toggleStatus(order.id)} className="text-xs font-medium text-stone-500 hover:text-emerald-600 underline">
                     {order.status === 'pending' ? 'Marquer livrée' : 'Marquer à faire'}
                   </button>
                   <button onClick={() => deleteOrder(order.id)} className="text-xs font-medium text-stone-300 hover:text-red-500">
                     Suppr.
                   </button>
                </div>
              </div>

              <div className="pl-4 border-l-2 border-stone-100 space-y-1">
                {order.items.map((item, idx) => {
                  const p = products.find(prod => prod.id === item.productId);
                  return (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-stone-700">{p?.name || 'Produit supprimé'}</span>
                      <span className="font-bold text-stone-900">x{item.quantity}</span>
                    </div>
                  );
                })}
              </div>
              {order.notes && <p className="text-xs text-stone-500 mt-3 italic bg-yellow-50 p-2 rounded">Note: {order.notes}</p>}
            </Card>
          ))}
          {orders.length === 0 && <p className="text-stone-400 italic text-center py-8">Aucune commande enregistrée.</p>}
        </div>
      </div>
    </div>
  );
};
