import { useShallow } from 'zustand/react/shallow';

import { useCartStore } from '../../cart.container';
import { findItem, getItemCount, getSubtotalInCents } from '../../domain/cart';

/**
 * Selectores granulares: cada componente se suscribe solo al dato que pinta.
 * Cambiar la cantidad de una línea no re-renderiza las demás líneas.
 */

export const useCartActions = () => useCartStore((state) => state.actions);

export const useCartItemCount = () => useCartStore((state) => getItemCount(state.cart));

export const useCartSubtotal = () => useCartStore((state) => getSubtotalInCents(state.cart));

export const useCartItem = (productId: string) =>
  useCartStore((state) => findItem(state.cart, productId));

/** Solo los ids: la lista se re-renderiza al añadir o quitar líneas, no al cambiar cantidades. */
export const useCartItemIds = () =>
  useCartStore(useShallow((state) => state.cart.items.map((item) => item.productId)));
