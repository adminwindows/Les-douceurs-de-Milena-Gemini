import { describe, expect, it } from 'vitest';
import { sumCompletedDeliveredQuantityByProduct, sumOrderItemQuantityByProduct } from '../ordersMath';
import { Order } from '../types';

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'o1',
  customerName: 'Client',
  date: '2026-01-01',
  items: [],
  tvaRate: 0,
  status: 'pending',
  ...overrides
});

describe('sumOrderItemQuantityByProduct', () => {
  it('sums duplicate product lines and ignores invalid quantities', () => {
    const order = makeOrder({
      items: [
        { productId: 'p1', quantity: 2, price: 1 },
        { productId: 'p2', quantity: 10, price: 1 },
        { productId: 'p1', quantity: 3, price: 1 },
        { productId: 'p1', quantity: Number.NaN, price: 1 },
        { productId: 'p1', quantity: -5, price: 1 }
      ]
    });

    expect(sumOrderItemQuantityByProduct(order, 'p1')).toBe(5);
    expect(sumOrderItemQuantityByProduct(order, 'p2')).toBe(10);
  });
});

describe('sumCompletedDeliveredQuantityByProduct', () => {
  it('includes only completed orders', () => {
    const orders: Order[] = [
      makeOrder({
        id: 'o1',
        status: 'completed',
        items: [
          { productId: 'p1', quantity: 1, price: 1 },
          { productId: 'p1', quantity: 4, price: 1 }
        ]
      }),
      makeOrder({
        id: 'o2',
        status: 'pending',
        items: [{ productId: 'p1', quantity: 10, price: 1 }]
      }),
      makeOrder({
        id: 'o3',
        status: 'completed',
        items: [{ productId: 'p1', quantity: 2, price: 1 }]
      })
    ];

    expect(sumCompletedDeliveredQuantityByProduct(orders, 'p1')).toBe(7);
  });
});

