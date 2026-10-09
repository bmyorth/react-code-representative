import { create } from 'zustand';

import {
  addItem,
  type Cart,
  type CartProduct,
  emptyCart,
  removeItem,
  setItemQuantity,
} from '../domain/cart';

import { type CartPersistence } from './cart-persistence';

/** Operaciones que modifican el carrito. Delegan las reglas de negocio en el dominio. */
export interface CartActions {
  readonly add: (product: CartProduct, quantity?: number) => void;
  readonly setQuantity: (productId: string, quantity: number) => void;
  readonly remove: (productId: string) => void;
  readonly clear: () => void;
}

/** Estado del store del carrito: los datos y sus acciones. */
export interface CartState {
  readonly cart: Cart;
  /** Las acciones viven aparte y nunca cambian de referencia: suscribirse a ellas no provoca renders. */
  readonly actions: CartActions;
}

/**
 * Crea el store del carrito. Las reglas de negocio están en el dominio;
 * el store solo orquesta: aplica la función pura y persiste el resultado.
 */
export function createCartStore(persistence: CartPersistence) {
  const store = create<CartState>()((set) => {
    const apply = (transition: (cart: Cart) => Cart) => {
      set((state) => {
        const cart = transition(state.cart);
        // Si el dominio devuelve la misma referencia, no hay cambio ni render.
        return cart === state.cart ? state : { cart };
      });
    };

    return {
      cart: persistence.load() ?? emptyCart,
      actions: {
        add: (product, quantity) => {
          apply((cart) => addItem(cart, product, quantity));
        },
        setQuantity: (productId, quantity) => {
          apply((cart) => setItemQuantity(cart, productId, quantity));
        },
        remove: (productId) => {
          apply((cart) => removeItem(cart, productId));
        },
        clear: () => {
          apply(() => emptyCart);
        },
      },
    };
  });

  store.subscribe((state, previous) => {
    if (state.cart !== previous.cart) persistence.save(state.cart);
  });

  return store;
}

/** Hook de Zustand devuelto por `createCartStore`. */
export type CartStore = ReturnType<typeof createCartStore>;
