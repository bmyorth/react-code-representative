import { queryOptions } from '@tanstack/react-query';

import { isAwaitingPayment } from '../domain/order';
import { type PaymentGateway } from '../domain/payment-gateway';

const ORDER_POLL_INTERVAL_MS = 1000;

/**
 * Lecturas de pedidos como `queryOptions`. El pedido consulta al servidor cada segundo
 * mientras espera el webhook de la pasarela y deja de hacerlo cuando figura como pagado.
 */
export function createCheckoutQueries(gateway: PaymentGateway) {
  const keys = {
    all: ['orders'] as const,
    list: () => [...keys.all, 'list'] as const,
    detail: (orderId: string) => [...keys.all, 'detail', orderId] as const,
    admin: () => [...keys.all, 'admin'] as const,
  };

  return {
    keys,
    /** Pedidos del usuario (`mine`) o de toda la tienda (`tenant`, solo administradores). */
    orders: (scope: 'mine' | 'tenant') =>
      queryOptions({
        queryKey: scope === 'tenant' ? keys.admin() : keys.list(),
        queryFn: ({ signal }) =>
          scope === 'tenant' ? gateway.listAllOrders(signal) : gateway.listOrders(signal),
      }),
    detail: (orderId: string) =>
      queryOptions({
        queryKey: keys.detail(orderId),
        queryFn: ({ signal }) => gateway.getOrder(orderId, signal),
        refetchInterval: (query) =>
          isAwaitingPayment(query.state.data) ? ORDER_POLL_INTERVAL_MS : false,
      }),
  } as const;
}

/** Lecturas de pedidos ya conectadas a una pasarela. */
export type CheckoutQueries = ReturnType<typeof createCheckoutQueries>;
