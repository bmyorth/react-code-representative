/**
 * Dominio del carrito: funciones puras e inmutables.
 * No dependen de React ni del almacenamiento, por eso son triviales de testear.
 * El carrito no importa nada del catálogo: recibe una "instantánea" del producto (bajo acoplamiento).
 */

/** Datos mínimos de un producto que el carrito necesita conocer. */
export interface CartProduct {
  readonly id: string;
  readonly name: string;
  readonly priceInCents: number;
  readonly imageUrl: string;
  /** Stock disponible en el momento de añadirlo. */
  readonly stock: number;
}

export interface CartItem {
  readonly productId: string;
  readonly name: string;
  readonly priceInCents: number;
  readonly imageUrl: string;
  readonly quantity: number;
  readonly maxQuantity: number;
}

export interface Cart {
  readonly items: readonly CartItem[];
}

/** Límite por línea para evitar pedidos abusivos aunque haya stock. */
export const MAX_QUANTITY_PER_ITEM = 10;

export const emptyCart: Cart = { items: [] };

function clampQuantity(quantity: number, maxQuantity: number): number {
  return Math.min(Math.max(Math.trunc(quantity), 0), maxQuantity);
}

export function findItem(cart: Cart, productId: string): CartItem | undefined {
  return cart.items.find((item) => item.productId === productId);
}

/**
 * Añade unidades de un producto. Respeta el stock y el máximo por línea.
 * Las líneas no modificadas conservan su referencia: así solo se re-renderiza la que cambió.
 */
export function addItem(cart: Cart, product: CartProduct, quantity = 1): Cart {
  const maxQuantity = Math.min(product.stock, MAX_QUANTITY_PER_ITEM);
  if (maxQuantity <= 0 || quantity <= 0) return cart;

  const existing = findItem(cart, product.id);
  if (!existing) {
    const item: CartItem = {
      productId: product.id,
      name: product.name,
      priceInCents: product.priceInCents,
      imageUrl: product.imageUrl,
      quantity: clampQuantity(quantity, maxQuantity),
      maxQuantity,
    };
    return { items: [...cart.items, item] };
  }

  const nextQuantity = clampQuantity(existing.quantity + quantity, maxQuantity);
  if (nextQuantity === existing.quantity && existing.maxQuantity === maxQuantity) return cart;
  return replaceItem(cart, { ...existing, quantity: nextQuantity, maxQuantity });
}

/** Fija la cantidad de una línea. Una cantidad de 0 elimina la línea. */
export function setItemQuantity(cart: Cart, productId: string, quantity: number): Cart {
  const existing = findItem(cart, productId);
  if (!existing) return cart;

  const nextQuantity = clampQuantity(quantity, existing.maxQuantity);
  if (nextQuantity === 0) return removeItem(cart, productId);
  if (nextQuantity === existing.quantity) return cart;
  return replaceItem(cart, { ...existing, quantity: nextQuantity });
}

export function removeItem(cart: Cart, productId: string): Cart {
  const items = cart.items.filter((item) => item.productId !== productId);
  return items.length === cart.items.length ? cart : { items };
}

export function getItemCount(cart: Cart): number {
  return cart.items.reduce((total, item) => total + item.quantity, 0);
}

export function getSubtotalInCents(cart: Cart): number {
  return cart.items.reduce((total, item) => total + item.priceInCents * item.quantity, 0);
}

export function getLineTotalInCents(item: CartItem): number {
  return item.priceInCents * item.quantity;
}

function replaceItem(cart: Cart, updated: CartItem): Cart {
  return {
    items: cart.items.map((item) => (item.productId === updated.productId ? updated : item)),
  };
}
