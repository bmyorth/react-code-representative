import { describe, expect, it } from 'vitest';

import {
  addItem,
  type Cart,
  type CartProduct,
  emptyCart,
  findItem,
  getItemCount,
  getLineTotalInCents,
  getSubtotalInCents,
  MAX_QUANTITY_PER_ITEM,
  removeItem,
  setItemQuantity,
} from './cart';

const headphones: CartProduct = {
  id: 'headphones',
  name: 'Auriculares',
  priceInCents: 12_999,
  imageUrl: 'https://example.com/headphones.jpg',
  stock: 14,
};

const speaker: CartProduct = {
  id: 'speaker',
  name: 'Altavoz',
  priceInCents: 5_999,
  imageUrl: 'https://example.com/speaker.jpg',
  stock: 3,
};

describe('addItem', () => {
  it('añade una línea nueva con la cantidad indicada', () => {
    const cart = addItem(emptyCart, headphones, 2);

    expect(cart.items).toEqual([
      {
        productId: 'headphones',
        name: 'Auriculares',
        priceInCents: 12_999,
        imageUrl: 'https://example.com/headphones.jpg',
        quantity: 2,
        maxQuantity: 10,
      },
    ]);
  });

  it('suma unidades a una línea existente', () => {
    const cart = addItem(addItem(emptyCart, headphones), headphones, 3);

    expect(findItem(cart, 'headphones')?.quantity).toBe(4);
  });

  it('no supera el stock disponible', () => {
    const cart = addItem(emptyCart, speaker, 99);

    expect(findItem(cart, 'speaker')?.quantity).toBe(speaker.stock);
  });

  it(`no supera el máximo de ${MAX_QUANTITY_PER_ITEM} unidades por línea aunque haya stock`, () => {
    const cart = addItem(emptyCart, { ...headphones, stock: 500 }, 50);

    expect(findItem(cart, 'headphones')?.quantity).toBe(MAX_QUANTITY_PER_ITEM);
  });

  it('descarta las cantidades decimales', () => {
    const cart = addItem(emptyCart, headphones, 2.7);

    expect(findItem(cart, 'headphones')?.quantity).toBe(2);
  });

  it.each([
    ['un producto agotado', { ...headphones, stock: 0 }, 1],
    ['una cantidad de cero', headphones, 0],
    ['una cantidad negativa', headphones, -3],
  ])('devuelve el mismo carrito con %s', (_, product, quantity) => {
    expect(addItem(emptyCart, product, quantity)).toBe(emptyCart);
  });

  it('devuelve el mismo carrito si la línea ya está en el máximo', () => {
    const full = addItem(emptyCart, speaker, speaker.stock);

    expect(addItem(full, speaker)).toBe(full);
  });

  it('actualiza el máximo si el stock cambió desde que se añadió', () => {
    const cart = addItem(emptyCart, speaker, 3);
    const restocked = addItem(cart, { ...speaker, stock: 8 }, 0.5);

    expect(restocked).not.toBe(cart);
    expect(findItem(restocked, 'speaker')).toMatchObject({ quantity: 3, maxQuantity: 8 });
  });

  it('conserva la referencia de las líneas que no cambian (evita renders)', () => {
    const cart = addItem(addItem(emptyCart, headphones), speaker);
    const untouched = findItem(cart, 'speaker');

    const next = addItem(cart, headphones);

    expect(findItem(next, 'speaker')).toBe(untouched);
    expect(findItem(next, 'headphones')).not.toBe(findItem(cart, 'headphones'));
  });
});

describe('setItemQuantity', () => {
  const cart = addItem(emptyCart, headphones, 2);

  it('fija la cantidad de una línea', () => {
    expect(findItem(setItemQuantity(cart, 'headphones', 5), 'headphones')?.quantity).toBe(5);
  });

  it('limita la cantidad al máximo de la línea', () => {
    expect(findItem(setItemQuantity(cart, 'headphones', 50), 'headphones')?.quantity).toBe(10);
  });

  it('elimina la línea cuando la cantidad es cero o menor', () => {
    expect(setItemQuantity(cart, 'headphones', 0).items).toHaveLength(0);
    expect(setItemQuantity(cart, 'headphones', -1).items).toHaveLength(0);
  });

  it('devuelve el mismo carrito si la cantidad no cambia', () => {
    expect(setItemQuantity(cart, 'headphones', 2)).toBe(cart);
  });

  it('devuelve el mismo carrito si el producto no está', () => {
    expect(setItemQuantity(cart, 'unknown', 3)).toBe(cart);
  });
});

describe('removeItem', () => {
  it('elimina la línea del producto', () => {
    const cart = addItem(addItem(emptyCart, headphones), speaker);

    expect(removeItem(cart, 'headphones').items.map((item) => item.productId)).toEqual(['speaker']);
  });

  it('devuelve el mismo carrito si el producto no está', () => {
    const cart = addItem(emptyCart, headphones);

    expect(removeItem(cart, 'unknown')).toBe(cart);
  });
});

describe('totales', () => {
  const cart: Cart = addItem(addItem(emptyCart, headphones, 2), speaker, 3);

  it('cuenta unidades, no líneas', () => {
    expect(getItemCount(cart)).toBe(5);
    expect(getItemCount(emptyCart)).toBe(0);
  });

  it('calcula el subtotal en céntimos', () => {
    expect(getSubtotalInCents(cart)).toBe(2 * 12_999 + 3 * 5_999);
    expect(getSubtotalInCents(emptyCart)).toBe(0);
  });

  it('calcula el total de una línea', () => {
    const line = findItem(cart, 'speaker');
    expect(line && getLineTotalInCents(line)).toBe(3 * 5_999);
  });
});
