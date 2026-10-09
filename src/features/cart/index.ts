/**
 * API pública de la feature Carrito.
 * Todo lo que no se exporta aquí es un detalle interno (encapsulamiento).
 */
export { type CartProduct } from './domain/cart';
export { AddToCartButton } from './ui/components/add-to-cart-button/add-to-cart-button';
export { CartBadge } from './ui/components/cart-badge/cart-badge';
export { type CartLineSnapshot, useCartActions, useCartLines } from './ui/hooks/use-cart';
export { CartView } from './ui/components/cart-view/cart-view';
