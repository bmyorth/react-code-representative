import { z } from 'zod';

import { type Order } from '../domain/order';
import { type PaymentSession } from '../domain/payment-gateway';

/** Respuesta de "crear pago" de NUESTRO backend. */
export const paymentSessionDtoSchema = z.object({
  orderId: z.string(),
  paymentIntentId: z.string(),
  clientSecret: z.string(),
  amountInCents: z.number().int().nonnegative(),
  publishableKey: z.string(),
});

/** Respuesta de la pasarela al tokenizar una tarjeta. */
export const paymentMethodDtoSchema = z.object({ id: z.string() });

/** Respuesta de la pasarela al confirmar o autenticar un pago. */
export const paymentIntentDtoSchema = z.object({
  id: z.string(),
  status: z.enum(['succeeded', 'requires_action', 'requires_payment_method']),
});

const orderDtoSchema = z.object({
  id: z.string(),
  status: z.enum(['pending_payment', 'paid']),
  amountInCents: z.number().int().nonnegative(),
  items: z.array(
    z.object({
      productId: z.string(),
      name: z.string(),
      unitPriceInCents: z.number().int().nonnegative(),
      quantity: z.number().int().positive(),
    }),
  ),
  createdAt: z.iso.datetime(),
  paidAt: z.iso.datetime().nullable(),
  customerName: z.string().optional(),
});

/** Un pedido. */
export const orderResponseSchema = orderDtoSchema;

/** Lista de pedidos. */
export const orderListResponseSchema = z.object({ data: z.array(orderDtoSchema) });

/** Traduce el DTO de "crear pago" al modelo de dominio. */
export function toPaymentSession(dto: z.infer<typeof paymentSessionDtoSchema>): PaymentSession {
  return { ...dto };
}

/** Traduce el DTO de pedido (fechas ISO, `items`) al modelo de dominio. */
export function toOrder(dto: z.infer<typeof orderDtoSchema>): Order {
  return {
    id: dto.id,
    status: dto.status,
    amountInCents: dto.amountInCents,
    lines: dto.items,
    createdAt: new Date(dto.createdAt),
    paidAt: dto.paidAt === null ? null : new Date(dto.paidAt),
    ...(dto.customerName ? { customerName: dto.customerName } : {}),
  };
}
