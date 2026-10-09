/** Estado de un pedido: espera el cobro o ya está pagado (confirmado por el webhook de la pasarela). */
export type OrderStatus = 'pending_payment' | 'paid';

/** Línea de un pedido, con el precio que fijó el servidor en el momento de crearlo. */
export interface OrderLine {
  readonly productId: string;
  readonly name: string;
  readonly unitPriceInCents: number;
  readonly quantity: number;
}

/** Pedido tal y como lo necesita la interfaz. */
export interface Order {
  readonly id: string;
  readonly status: OrderStatus;
  readonly amountInCents: number;
  readonly lines: readonly OrderLine[];
  readonly createdAt: Date;
  readonly paidAt: Date | null;
  /** Solo en el panel de administración. */
  readonly customerName?: string;
}

/** Etiqueta legible del estado. */
export function describeOrderStatus(status: OrderStatus): string {
  return status === 'paid' ? 'Pagado' : 'Pendiente de pago';
}

/** `true` mientras haya que seguir consultando el pedido para ver el resultado del cobro. */
export function isAwaitingPayment(order: Pick<Order, 'status'> | undefined): boolean {
  return order?.status !== 'paid';
}
