import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link } from 'react-router';

import { buildPath } from '@/shared/config/routes';
import { formatCurrency } from '@/shared/lib/format-currency';
import { Spinner, StatusMessage } from '@/shared/ui';

import { checkoutQueries } from '../../../checkout.container';

import styles from './order-status-view.module.css';

interface OrderStatusViewProps {
  readonly orderId: string;
  /** Se llama una vez cuando el pedido pasa a "pagado" (p. ej. para refrescar el stock del catálogo). */
  readonly onPaid?: () => void;
}

/**
 * Estado de un pedido. Mientras la pasarela no confirma el cobro (webhook) consulta al servidor
 * cada segundo; en cuanto figura como pagado deja de consultar y muestra el recibo.
 */
export function OrderStatusView({ orderId, onPaid }: OrderStatusViewProps) {
  const { data: order, isPending, isError } = useQuery(checkoutQueries.detail(orderId));
  const isPaid = order?.status === 'paid';

  useEffect(() => {
    if (isPaid) onPaid?.();
  }, [isPaid, onPaid]);

  if (isPending) return <Spinner label="Cargando pedido…" />;
  if (isError) {
    return (
      <StatusMessage
        tone="error"
        title="No se encontró el pedido"
        action={<Link to={buildPath.orders()}>Ver mis pedidos</Link>}
      />
    );
  }

  return (
    <section className={styles.receipt} aria-labelledby="order-title">
      <h2 id="order-title" className={styles.title}>
        Pedido {order.id}
      </h2>
      {isPaid ? (
        <p className={styles.paid} role="status">
          ✓ Pago confirmado. ¡Gracias por tu compra!
        </p>
      ) : (
        <p className={styles.pending} role="status">
          Esperando la confirmación del banco…
        </p>
      )}
      <ul className={styles.lines}>
        {order.lines.map((line) => (
          <li key={line.productId} className={styles.line}>
            <span>
              {line.quantity} × {line.name}
            </span>
            <span>{formatCurrency(line.unitPriceInCents * line.quantity)}</span>
          </li>
        ))}
      </ul>
      <p className={styles.total}>
        <span>Total</span>
        <span>{formatCurrency(order.amountInCents)}</span>
      </p>
      <Link to={buildPath.catalog()}>Seguir comprando</Link>
    </section>
  );
}
