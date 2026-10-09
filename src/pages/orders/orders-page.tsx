import { OrderList } from '@/features/checkout';

/** Página `/orders`: historial de pedidos del usuario. */
export function OrdersPage() {
  return (
    <>
      <title>Mis pedidos · Tienda</title>
      <h1 className="page-title">Mis pedidos</h1>
      <OrderList scope="mine" />
    </>
  );
}
