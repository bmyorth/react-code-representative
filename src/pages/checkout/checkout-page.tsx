import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';

import { useCartActions, useCartLines } from '@/features/cart';
import { CheckoutForm } from '@/features/checkout';
import { productQueries } from '@/features/catalog';
import { buildPath } from '@/shared/config/routes';
import { formatCurrency } from '@/shared/lib/format-currency';
import { StatusMessage } from '@/shared/ui';

import styles from './checkout-page.module.css';

/** Página `/checkout`: compone el carrito (resumen) con el formulario de pago. */
export function CheckoutPage() {
  const lines = useCartLines();
  const { clear } = useCartActions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (lines.length === 0) {
    return (
      <StatusMessage
        title="No hay nada que pagar"
        description="Tu carrito está vacío."
        action={<Link to={buildPath.catalog()}>Ir al catálogo</Link>}
      />
    );
  }

  const total = lines.reduce((sum, line) => sum + line.unitPriceInCents * line.quantity, 0);

  return (
    <>
      <title>Pago · Tienda</title>
      <h1 className="page-title">Finalizar compra</h1>
      <div className={styles.layout}>
        <CheckoutForm
          lines={lines}
          onPaid={(orderId) => {
            void navigate(buildPath.orderDetail(orderId), { replace: true });
            clear();
            // El stock ha cambiado: el catálogo debe volver a pedirse.
            void queryClient.invalidateQueries({ queryKey: productQueries.keys.all });
          }}
        />
        <aside className={styles.summary} aria-labelledby="checkout-summary-title">
          <h2 id="checkout-summary-title" className={styles.summaryTitle}>
            Tu pedido
          </h2>
          <ul className={styles.lines}>
            {lines.map((line) => (
              <li key={line.productId} className={styles.line}>
                <span>
                  {line.quantity} × {line.name}
                </span>
                <span>{formatCurrency(line.unitPriceInCents * line.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className={styles.total}>
            <span>Total estimado</span>
            <span>{formatCurrency(total)}</span>
          </p>
        </aside>
      </div>
    </>
  );
}
