import { cn } from '@/shared/lib/cn';
import { formatCurrency } from '@/shared/lib/format-currency';

import { useCartItemCount, useCartSubtotal } from '../../hooks/use-cart';

import styles from './cart-summary.module.css';

/** Resumen del pedido. Se re-renderiza solo cuando cambian el subtotal o el número de unidades. */
export function CartSummary() {
  const subtotal = useCartSubtotal();
  const count = useCartItemCount();

  return (
    <aside className={styles.summary} aria-labelledby="cart-summary-title">
      <h2 id="cart-summary-title" className={styles.title}>
        Resumen
      </h2>
      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt>Productos</dt>
          <dd>{count}</dd>
        </div>
        <div className={styles.row}>
          <dt>Envío</dt>
          <dd>Gratis</dd>
        </div>
        <div className={cn(styles.row, styles.total)}>
          <dt>Total</dt>
          <dd>{formatCurrency(subtotal)}</dd>
        </div>
      </dl>
    </aside>
  );
}
