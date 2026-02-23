import { Order } from './types';

export const sumOrderItemQuantityByProduct = (
  order: Order,
  productId: string
): number => order.items
  .filter(item => item.productId === productId)
  .reduce((sum, item) => {
    const quantity = Number(item.quantity);
    return Number.isFinite(quantity) && quantity > 0 ? sum + quantity : sum;
  }, 0);

export const sumCompletedDeliveredQuantityByProduct = (
  orders: Order[],
  productId: string
): number => orders
  .filter(order => order.status === 'completed')
  .reduce((sum, order) => sum + sumOrderItemQuantityByProduct(order, productId), 0);
