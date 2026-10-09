import { CartView } from '@/features/cart';

export function CartPage() {
  return (
    <>
      <title>Carrito · Tienda</title>
      <h1 className="page-title">Tu carrito</h1>
      <CartView />
    </>
  );
}
