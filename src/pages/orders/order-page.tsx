import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Link, useParams } from 'react-router';

import { productQueries } from '@/features/catalog';
import { OrderStatusView } from '@/features/checkout';
import { buildPath } from '@/shared/config/routes';

/** Página `/orders/:orderId`: recibo del pedido; sigue consultando hasta que el webhook confirma el cobro. */
export function OrderPage() {
  const { orderId = '' } = useParams();
  const queryClient = useQueryClient();

  // Al confirmarse el cobro el stock cambia: el catálogo debe actualizarse.
  const handlePaid = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: productQueries.keys.all });
  }, [queryClient]);

  return (
    <>
      <title>Pedido · Tienda</title>
      <Link to={buildPath.orders()} className="back-link">
        ← Mis pedidos
      </Link>
      <h1 className="page-title">Tu pedido</h1>
      <OrderStatusView orderId={orderId} onPaid={handlePaid} />
    </>
  );
}
