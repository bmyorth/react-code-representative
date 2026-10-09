import { describe, expect, it, vi } from 'vitest';

import { addItem, type Cart, type CartProduct, emptyCart } from '../domain/cart';

import { type CartPersistence } from './cart-persistence';
import { createCartStore } from './cart-store';

const product: CartProduct = {
  id: 'lamp',
  name: 'Lámpara',
  priceInCents: 3_500,
  imageUrl: 'https://example.com/lamp.jpg',
  stock: 5,
};

/** Persistencia en memoria: el store no sabe (ni necesita saber) que no es localStorage. */
function createFakePersistence(initial: Cart | null = null) {
  return {
    load: vi.fn<CartPersistence['load']>(() => initial),
    save: vi.fn<CartPersistence['save']>(),
  } satisfies CartPersistence;
}

describe('createCartStore', () => {
  it('arranca con el carrito persistido', () => {
    const saved = addItem(emptyCart, product, 2);
    const store = createCartStore(createFakePersistence(saved));

    expect(store.getState().cart).toBe(saved);
  });

  it('arranca vacío si no hay nada persistido', () => {
    const store = createCartStore(createFakePersistence());

    expect(store.getState().cart).toBe(emptyCart);
  });

  it('aplica las acciones y persiste cada cambio', () => {
    const persistence = createFakePersistence();
    const { actions } = createCartStore(persistence).getState();

    actions.add(product, 2);
    actions.setQuantity('lamp', 4);
    actions.remove('lamp');

    expect(persistence.save).toHaveBeenCalledTimes(3);
    expect(persistence.save).toHaveBeenLastCalledWith(emptyCart);
  });

  it('vacía el carrito con clear', () => {
    const store = createCartStore(createFakePersistence(addItem(emptyCart, product)));

    store.getState().actions.clear();

    expect(store.getState().cart).toBe(emptyCart);
  });

  it('no notifica ni persiste si la acción no cambia nada', () => {
    const persistence = createFakePersistence();
    const store = createCartStore(persistence);
    const listener = vi.fn();
    store.subscribe(listener);

    store.getState().actions.remove('no-existe');
    store.getState().actions.setQuantity('no-existe', 3);

    expect(listener).not.toHaveBeenCalled();
    expect(persistence.save).not.toHaveBeenCalled();
  });

  it('mantiene estable la referencia de las acciones', () => {
    const store = createCartStore(createFakePersistence());
    const { actions } = store.getState();

    actions.add(product);

    expect(store.getState().actions).toBe(actions);
  });
});
