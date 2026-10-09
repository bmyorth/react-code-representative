/**
 * API pública de la feature Pago y pedidos.
 * Todo lo que no se exporta aquí es un detalle interno (encapsulamiento).
 */
export { checkoutQueries } from './checkout.container';
export { CheckoutForm, type CheckoutLineView } from './ui/components/checkout-form/checkout-form';
export { OrderList } from './ui/components/order-list/order-list';
export { OrderStatusView } from './ui/components/order-status-view/order-status-view';
