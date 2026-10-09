import { type CardDetails } from '../domain/card';
import { type CheckoutLine, type PaymentGateway } from '../domain/payment-gateway';

/** Datos para pagar un carrito con tarjeta. */
export interface PayWithCardInput {
  readonly lines: readonly CheckoutLine[];
  readonly card: CardDetails;
  /** Misma clave en cada reintento del mismo pago: el servidor no duplica pedidos ni cobros. */
  readonly idempotencyKey: string;
  /** Pide al usuario completar el 3D Secure. Devuelve `true` si lo aprueba. */
  readonly requestThreeDSecure: () => Promise<boolean>;
}

/** Resultado de un pago confirmado por la pasarela. El pedido pasará a `paid` al llegar el webhook. */
export interface PaymentResult {
  readonly orderId: string;
  readonly amountInCents: number;
}

/**
 * Caso de uso "pagar con tarjeta". Orquesta el flujo de Stripe:
 * 1. Nuestro backend crea el pedido y fija el importe.
 * 2. El navegador tokeniza la tarjeta contra la pasarela (nunca contra nuestro backend).
 * 3. Se confirma el pago y, si el banco lo exige, se completa el 3D Secure.
 * El cobro definitivo lo confirma la pasarela por webhook, no este cliente.
 */
export async function payWithCard(
  gateway: PaymentGateway,
  input: PayWithCardInput,
): Promise<PaymentResult> {
  const session = await gateway.createPayment(input.lines, input.idempotencyKey);
  const paymentMethodId = await gateway.tokenizeCard(input.card, session.publishableKey);

  const status = await gateway.confirmPayment(session, paymentMethodId);
  if (status === 'requires_action') {
    const approved = await input.requestThreeDSecure();
    await gateway.authenticatePayment(session, approved);
  }

  return { orderId: session.orderId, amountInCents: session.amountInCents };
}
