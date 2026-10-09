import { memo } from 'react';

import { Button, type ButtonProps } from '@/shared/ui';

import { type CartProduct, MAX_QUANTITY_PER_ITEM } from '../../../domain/cart';
import { useCartActions, useCartItem } from '../../hooks/use-cart';

interface AddToCartButtonProps {
  readonly product: CartProduct;
  readonly size?: ButtonProps['size'];
}

/** Botón de compra. Se suscribe solo a la línea de su producto, no al carrito entero. */
export const AddToCartButton = memo(function AddToCartButton({
  product,
  size = 'md',
}: AddToCartButtonProps) {
  const { add } = useCartActions();
  const quantityInCart = useCartItem(product.id)?.quantity ?? 0;

  const maxQuantity = Math.min(product.stock, MAX_QUANTITY_PER_ITEM);
  const outOfStock = product.stock <= 0;
  const limitReached = !outOfStock && quantityInCart >= maxQuantity;

  const label = outOfStock
    ? 'Agotado'
    : limitReached
      ? 'Máximo alcanzado'
      : quantityInCart > 0
        ? `Añadir otra (${quantityInCart} en el carrito)`
        : 'Añadir al carrito';

  return (
    <Button
      size={size}
      disabled={outOfStock || limitReached}
      onClick={() => {
        add(product);
      }}
      fullWidth
    >
      {label}
    </Button>
  );
});
