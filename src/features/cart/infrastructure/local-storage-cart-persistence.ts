import { z } from 'zod';

import { type CartPersistence } from '../application/cart-persistence';
import { type Cart, MAX_QUANTITY_PER_ITEM } from '../domain/cart';

const STORAGE_KEY = 'shop:cart';
const STORAGE_VERSION = 1;

/**
 * localStorage es una entrada no fiable (el usuario o una extensión pueden modificarla):
 * se valida con Zod y, si no es válida, se descarta en lugar de romper la app.
 */
const storedCartSchema = z.object({
  version: z.literal(STORAGE_VERSION),
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[a-z0-9-]{1,64}$/),
        name: z.string().min(1).max(120),
        priceInCents: z.number().int().nonnegative(),
        imageUrl: z.url({ protocol: /^https$/ }),
        quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
        maxQuantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
      }),
    )
    .max(100),
});

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    // Modo privado o almacenamiento bloqueado: el carrito funciona solo en memoria.
    return null;
  }
}

/** Adaptador de `CartPersistence` sobre `localStorage`, versionado y validado con Zod. */
export const localStorageCartPersistence: CartPersistence = {
  load() {
    const raw = getStorage()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const result = storedCartSchema.safeParse(JSON.parse(raw));
      return result.success ? { items: result.data.items } : null;
    } catch {
      return null;
    }
  },

  save(cart: Cart) {
    try {
      getStorage()?.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: STORAGE_VERSION, items: cart.items }),
      );
    } catch {
      // Cuota excedida: no se interrumpe la compra por no poder persistir.
    }
  },
};
