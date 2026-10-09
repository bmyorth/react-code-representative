import { createCartStore } from './application/cart-store';
import { localStorageCartPersistence } from './infrastructure/local-storage-cart-persistence';

/** Raíz de composición: conecta el store con su persistencia concreta. */
export const useCartStore = createCartStore(localStorageCartPersistence);
