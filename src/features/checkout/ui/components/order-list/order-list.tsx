import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import { buildPath } from '@/shared/config/routes';
import { formatCurrency } from '@/shared/lib/format-currency';
import { Spinner, StatusMessage } from '@/shared/ui';

import { checkoutQueries } from '../../../checkout.container';
import { describeOrderStatus } from '../../../domain/order';

import styles from './order-list.module.css';

interface OrderListProps {
  /** `mine`: pedidos del usuario. `tenant`: todos los de la tienda (solo rol administrador). */
  readonly scope: 'mine' | 'tenant';
}

const dateFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

/** Tabla de pedidos, tanto del usuario como del panel de administración. */
export function OrderList({ scope }: OrderListProps) {
  const { data, isPending, isError } = useQuery(checkoutQueries.orders(scope));

  if (isPending) return <Spinner label="Cargando pedidos…" />;
  if (isError) return <StatusMessage tone="error" title="No se pudieron cargar los pedidos" />;
  if (data.length === 0) {
    return (
      <StatusMessage
        title="Todavía no hay pedidos"
        action={<Link to={buildPath.catalog()}>Ir al catálogo</Link>}
      />
    );
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <caption className="visually-hidden">
          {scope === 'tenant' ? 'Pedidos de la tienda' : 'Mis pedidos'}
        </caption>
        <thead>
          <tr>
            <th scope="col">Pedido</th>
            {scope === 'tenant' ? <th scope="col">Cliente</th> : null}
            <th scope="col">Fecha</th>
            <th scope="col">Estado</th>
            <th scope="col" className={styles.amount}>
              Importe
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((order) => (
            <tr key={order.id}>
              <td>
                <Link to={buildPath.orderDetail(order.id)}>{order.id}</Link>
              </td>
              {scope === 'tenant' ? <td>{order.customerName}</td> : null}
              <td>{dateFormat.format(order.createdAt)}</td>
              <td data-status={order.status}>{describeOrderStatus(order.status)}</td>
              <td className={styles.amount}>{formatCurrency(order.amountInCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
