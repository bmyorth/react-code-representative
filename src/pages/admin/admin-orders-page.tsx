import { OrderList } from '@/features/checkout';

/** Página `/admin/orders`: pedidos de toda la tienda. Solo accesible con rol administrador. */
export function AdminOrdersPage() {
  return (
    <>
      <title>Administración · Tienda</title>
      <h1 className="page-title">Pedidos de la tienda</h1>
      <OrderList scope="tenant" />
    </>
  );
}
