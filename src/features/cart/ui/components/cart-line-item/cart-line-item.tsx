import { memo, useCallback } from 'react';
import { Link } from 'react-router';

import { buildPath } from '@/shared/config/routes';
import { formatCurrency } from '@/shared/lib/format-currency';
import { Button, QuantityStepper } from '@/shared/ui';

import { getLineTotalInCents } from '../../../domain/cart';
import { useCartActions, useCartItem } from '../../hooks/use-cart';

import styles from './cart-line-item.module.css';

interface CartLineItemProps {
  readonly productId: string;
}

/**
 * Línea del carrito. Recibe solo el id y lee su propia línea del store:
 * cambiar la cantidad de un producto re-renderiza únicamente esta línea.
 */
export const CartLineItem = memo(function CartLineItem({ productId }: CartLineItemProps) {
  const item = useCartItem(productId);
  const { setQuantity, remove } = useCartActions();

  const handleQuantityChange = useCallback(
    (quantity: number) => {
      setQuantity(productId, quantity);
    },
    [setQuantity, productId],
  );

  if (!item) return null;

  return (
    <li className={styles.item}>
      <img
        className={styles.image}
        src={item.imageUrl}
        alt=""
        width={96}
        height={96}
        loading="lazy"
        decoding="async"
      />
      <div className={styles.info}>
        <Link to={buildPath.productDetail(item.productId)} className={styles.name}>
          {item.name}
        </Link>
        <p className={styles.unitPrice}>{formatCurrency(item.priceInCents)} / ud.</p>
        <div className={styles.controls}>
          <QuantityStepper
            value={item.quantity}
            max={item.maxQuantity}
            onChange={handleQuantityChange}
            label={item.name}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              remove(productId);
            }}
            aria-label={`Eliminar ${item.name} del carrito`}
          >
            Eliminar
          </Button>
        </div>
      </div>
      <p className={styles.total}>{formatCurrency(getLineTotalInCents(item))}</p>
    </li>
  );
});
