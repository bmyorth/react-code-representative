import { type CardDetails } from './card';
import { type Order } from './order';

/** Línea que se envía al crear el pago. Solo producto y cantidad: el precio lo calcula el servidor. */
export interface CheckoutLine {
  readonly productId: string;
  readonly quantity: number;
}

/** Pago creado en el servidor: importe definitivo y credenciales para confirmarlo con la pasarela. */
export interface PaymentSession {
  readonly orderId: string;
  readonly paymentIntentId: string;
  readonly clientSecret: string;
  readonly amountInCents: number;
  readonly publishableKey: string;
}

/** Resultado de confirmar el pago con la pasarela. */
export type ConfirmationStatus = 'succeeded' | 'requires_action';

/** Error de pago legible (tarjeta rechazada, 3D Secure fallido…). */
export class PaymentError extends Error {
  override readonly name = 'PaymentError';
  /** Código de la pasarela (`card_declined`, `expired_card`…). */
  readonly code: string | undefined;

  constructor(message: string, code: string | undefined, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
  }
}

/**
 * Puerto de pagos. Separa los dos interlocutores reales de un pago con Stripe:
 * nuestro backend (crea el pedido y calcula el importe) y la pasarela (recibe la tarjeta).
 */
export interface PaymentGateway {
  /** Pide a NUESTRO backend crear el pedido y el pago. Idempotente por `idempotencyKey`. */
  createPayment(lines: readonly CheckoutLine[], idempotencyKey: string): Promise<PaymentSession>;
  /** Tokeniza la tarjeta directamente contra la pasarela: nuestro backend nunca ve el número. */
  tokenizeCard(card: CardDetails, publishableKey: string): Promise<string>;
  confirmPayment(session: PaymentSession, paymentMethodId: string): Promise<ConfirmationStatus>;
  /** Completa el 3D Secure. Lanza `PaymentError` si el usuario lo rechaza. */
  authenticatePayment(session: PaymentSession, approved: boolean): Promise<void>;
  getOrder(orderId: string, signal?: AbortSignal): Promise<Order>;
  listOrders(signal?: AbortSignal): Promise<readonly Order[]>;
  listAllOrders(signal?: AbortSignal): Promise<readonly Order[]>;
}
