import { type Cart } from '../domain/cart';

/**
 * Puerto de persistencia del carrito. La aplicación no sabe si se guarda en
 * localStorage, IndexedDB o un backend: solo conoce este contrato.
 */
export interface CartPersistence {
  load(): Cart | null;
  save(cart: Cart): void;
}
