
import React, { useState } from 'react';
import { Order, Product, OrderItem, ProductionBatch } from '../../types';
import { Card, Button, Input, Select, InfoTooltip } from '../ui/Common';

interface Props {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  products: Product[];
  productionBatches: ProductionBatch[];
  setProductionBatches: React.Dispatch<React.SetStateAction<ProductionBatch[]>>;
}

export const Orders: React.FC<Props> = ({ orders, setOrders, products, productionBatches, setProductionBatches }) => {
  const [newOrder, setNewOrder] = useState<Partial<Order>>({ customerName: '', date: new Date().toISOString().split('T')[0], items: [], status: 'pending' });
  const [currentItem, setCurrentItem] = useState<{ productId: string, quantity: number }>({ productId: '', quantity: 1 });

  const addItemToOrder = () => {
    if (!currentItem.productId || currentItem.quantity <= 0) return;
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

  const sendToProduction = (order: Order) => {
    const newBatches: ProductionBatch[] = order.items.map(item => ({
        id: Date.now().toString() + Math.random().toString(),
        date: order.date, // Use delivery date as production date default
        productId: item.productId,
        quantity: item.quantity
    }));
    setProductionBatches(prev => [...prev, ...newBatches]);
    alert("Produits ajoutés à la file de production !");
  };

  const toggleStatus = (order: Order) => {
    const nextStatus = order.status === 'pending' ? 'completed' : 'pending';
    
    // Logic: If marking as completed, ask to add to production
    if (nextStatus === 'completed') {
       const confirmProd = window.confirm("Commande livrée ! \n\nAvez-vous déjà enregistré la production ? \nSi NON, cliquez sur OK pour le faire maintenant.\nSi OUI, cliquez sur Annuler pour juste marquer la commande comme livrée.");
       
       if (confirmProd) {
           const newBatches: ProductionBatch[] = order.items.map(item => ({
               id: Date.now().toString() + Math.random().toString(),
               date: order.date,
               productId: item.productId,
               quantity: item.quantity
           }));
           setProductionBatches(prev => [...prev, ...newBatches]);
           alert("Production enregistrée avec succès.");
       }
    }

    setOrders(orders.map(o => o.id === order.id ? { ...o, status: nextStatus } : o));
  };

  // Warning System: Check if Total Delivered > Total Produced
  const getProductWarnings = (productId: string) => {
      const prod = products.find(p => p.id === productId);
      if(!prod) return null;
      
      const totalDelivered = orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => {
            const item = o.items.find(i => i.productId === productId);
            return sum + (item?.quantity || 0);
        }, 0);
        
      const totalProduced = productionBatches
        .filter(b => b.productId === productId)
        .reduce((sum, b) => sum + b.quantity, 0);

      if (totalDelivered > totalProduced) {
          return {
              type: 'warning',
              diff: totalDelivered - totalProduced,
              msg: `Attention: ${totalDelivered} livrés pour seulement ${totalProduced} produits enregistrés !`
          };
      }
      return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Order Form */}
      <div className="lg:col-span-5 space-y-6">
        <Card className="sticky top-24 border-rose-200 dark:border-rose-800 shadow-rose-100/50 dark:shadow-none">
          <h3 className="text-xl font-bold text-rose-950 dark:text-rose-100 font-serif mb-6">Nouvelle Commande</h3>
          
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
            
            <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700">
              <h4 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Ajouter des produits</h4>
              <div className="flex gap-2 mb-2">
                <select 
                  className="flex-1 px-2 py-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                  value={currentItem.productId}
                  onChange={e => setCurrentItem({...currentItem, productId: e.target.value})}
                >
                  <option value="">Produit...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input 
                  type="number" 
                  className="w-16 px-2 py-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                  value={currentItem.quantity}
                  onChange={e => setCurrentItem({...currentItem, quantity: parseFloat(e.target.value)})}
                />
                <Button size="sm" onClick={addItemToOrder}>+</Button>
              </div>

              <div className="space-y-1 mt-3">
                {(newOrder.items || []).map((item, idx) => {
                  const p = products.find(p => p.id === item.productId);
                  return (
                    <div key={idx} className="flex justify-between text-sm bg-white dark:bg-stone-800 p-2 rounded border border-stone-100 dark:border-stone-700">
                      <span className="dark:text-stone-300">{p?.name}</span>
                      <span className="font-bold dark:text-stone-200">x {item.quantity}</span>
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
        <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 font-serif">Commandes en cours ({orders.filter(o => o.status === 'pending').length})</h3>
        
        <div className="space-y-4">
          {[...orders].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(order => (
            <Card key={order.id} className={`transition-all ${order.status === 'completed' ? 'opacity-60 bg-stone-50 dark:bg-stone-900' : 'border-l-4 border-l-[#D45D79] dark:border-l-rose-500'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-lg text-stone-800 dark:text-stone-200">{order.customerName}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'}`}>
                      {order.status === 'completed' ? 'Livrée' : 'À faire'}
                    </span>
                  </div>
                  <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">Pour le : {new Date(order.date).toLocaleDateString()}</p>
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
                {order.items.map((item, idx) => {
                  const p = products.find(prod => prod.id === item.productId);
                  const warning = getProductWarnings(item.productId);
                  
                  return (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                          <span className="text-stone-700 dark:text-stone-300">{p?.name || 'Produit supprimé'}</span>
                          {warning && order.status === 'completed' && (
                              <InfoTooltip text={warning.msg} />
                          )}
                          {warning && order.status === 'completed' && (
                               <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded">Stock ?</span>
                          )}
                      </div>
                      <span className="font-bold text-stone-900 dark:text-stone-100">x{item.quantity}</span>
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
  );
};
