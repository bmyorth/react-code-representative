import { describe, expect, it, vi } from 'vitest';

import { addItem, type CartProduct, emptyCart } from '../domain/cart';

import { localStorageCartPersistence } from './local-storage-cart-persistence';

const STORAGE_KEY = 'shop:cart';

const product: CartProduct = {
  id: 'mug',
  name: 'Taza',
  priceInCents: 1_200,
  imageUrl: 'https://example.com/mug.jpg',
  stock: 20,
};

const validItem = {
  productId: 'mug',
  name: 'Taza',
  priceInCents: 1_200,
  imageUrl: 'https://example.com/mug.jpg',
  quantity: 2,
  maxQuantity: 10,
};

describe('localStorageCartPersistence', () => {
  it('guarda y recupera el carrito', () => {
    const cart = addItem(emptyCart, product, 2);

    localStorageCartPersistence.save(cart);

    expect(localStorageCartPersistence.load()).toEqual(cart);
  });

  it('devuelve null si no hay nada guardado', () => {
    expect(localStorageCartPersistence.load()).toBeNull();
  });

  it.each([
    ['JSON corrupto', '{no es json'],
    ['una versión desconocida', JSON.stringify({ version: 99, items: [] })],
    [
      'una URL de imagen insegura',
      JSON.stringify({
        version: 1,
        items: [{ ...validItem, imageUrl: 'javascript:alert(1)' }],
      }),
    ],
    [
      'una cantidad fuera de rango',
      JSON.stringify({ version: 1, items: [{ ...validItem, quantity: 1_000 }] }),
    ],
    [
      'un id con caracteres no permitidos',
      JSON.stringify({ version: 1, items: [{ ...validItem, productId: '../../etc' }] }),
    ],
  ])('descarta datos manipulados: %s', (_, raw) => {
    window.localStorage.setItem(STORAGE_KEY, raw);

    expect(localStorageCartPersistence.load()).toBeNull();
  });

  it('no rompe la compra si el almacenamiento está lleno', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    expect(() => {
      localStorageCartPersistence.save(addItem(emptyCart, product));
    }).not.toThrow();
  });

  it('funciona solo en memoria si localStorage está bloqueado', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError');
    });

    expect(localStorageCartPersistence.load()).toBeNull();
    expect(() => {
      localStorageCartPersistence.save(emptyCart);
    }).not.toThrow();
  });
});
