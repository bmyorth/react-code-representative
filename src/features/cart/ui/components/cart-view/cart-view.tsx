import { Link } from 'react-router';

import { buildPath } from '@/shared/config/routes';
import { StatusMessage } from '@/shared/ui';

import { useCartItemIds } from '../../hooks/use-cart';
import { CartLineItem } from '../cart-line-item/cart-line-item';
import { CartSummary } from '../cart-summary/cart-summary';

import styles from './cart-view.module.css';

/** Composición del carrito: lista de líneas + resumen (patrón Composite). */
export function CartView() {
  const productIds = useCartItemIds();

  if (productIds.length === 0) {
    return (
      <StatusMessage
        title="Tu carrito está vacío"
        description="Explora el catálogo y añade lo que te guste."
        action={<Link to={buildPath.catalog()}>Ir al catálogo</Link>}
      />
    );
  }

  return (
    <div className={styles.layout}>
      <ul className={styles.list} aria-label="Productos en el carrito">
        {productIds.map((productId) => (
          <CartLineItem key={productId} productId={productId} />
        ))}
      </ul>
      <CartSummary />
    </div>
  );
}
