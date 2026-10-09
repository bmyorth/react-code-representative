import { httpClient, isApiError } from '@/shared/api';

import { type PaymentGateway, PaymentError } from '../domain/payment-gateway';

import {
  orderListResponseSchema,
  orderResponseSchema,
  paymentIntentDtoSchema,
  paymentMethodDtoSchema,
  paymentSessionDtoSchema,
  toOrder,
  toPaymentSession,
} from './payment-dto';

const STRIPE_PATH = '/stripe/v1';

const optionalSignal = (signal?: AbortSignal) => (signal ? { signal } : {});

/** Las llamadas a la pasarela se hacen "como terceros": sin cookies, sin CSRF y sin tenant. */
async function callGateway<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isApiError(error) && error.status !== 0) {
      throw new PaymentError(error.message, error.code, { cause: error });
    }
    throw error;
  }
}

/**
 * Adaptador HTTP del puerto `PaymentGateway`.
 * Reproduce el flujo real de Stripe: la tarjeta se tokeniza contra la pasarela con la clave
 * publicable y el pago se confirma con el `client_secret`. Nuestro backend no recibe la tarjeta.
 */
export const httpPaymentGateway: PaymentGateway = {
  async createPayment(lines, idempotencyKey) {
    return toPaymentSession(
      await httpClient.post('/payments/intents', {
        schema: paymentSessionDtoSchema,
        body: { items: lines },
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
    );
  },

  async tokenizeCard(card, publishableKey) {
    const method = await callGateway(() =>
      httpClient.post(`${STRIPE_PATH}/payment_methods`, {
        schema: paymentMethodDtoSchema,
        authenticated: false,
        headers: { Authorization: `Bearer ${publishableKey}` },
        body: {
          card: {
            number: card.number,
            exp_month: card.expMonth,
            exp_year: card.expYear,
            cvc: card.cvc,
          },
        },
      }),
    );
    return method.id;
  },

  async confirmPayment(session, paymentMethodId) {
    const intent = await callGateway(() =>
      httpClient.post(
        `${STRIPE_PATH}/payment_intents/${encodeURIComponent(session.paymentIntentId)}/confirm`,
        {
          schema: paymentIntentDtoSchema,
          authenticated: false,
          body: { client_secret: session.clientSecret, payment_method: paymentMethodId },
        },
      ),
    );
    if (intent.status === 'succeeded') return 'succeeded';
    if (intent.status === 'requires_action') return 'requires_action';
    throw new PaymentError('No se pudo completar el pago.', undefined);
  },

  async authenticatePayment(session, approved) {
    await callGateway(() =>
      httpClient.post(
        `${STRIPE_PATH}/payment_intents/${encodeURIComponent(session.paymentIntentId)}/authenticate`,
        {
          schema: paymentIntentDtoSchema,
          authenticated: false,
          body: { client_secret: session.clientSecret, result: approved ? 'success' : 'failure' },
        },
      ),
    );
  },

  async getOrder(orderId, signal) {
    return toOrder(
      await httpClient.get(`/orders/${encodeURIComponent(orderId)}`, {
        schema: orderResponseSchema,
        ...optionalSignal(signal),
      }),
    );
  },

  async listOrders(signal) {
    const { data } = await httpClient.get('/orders', {
      schema: orderListResponseSchema,
      ...optionalSignal(signal),
    });
    return data.map(toOrder);
  },

  async listAllOrders(signal) {
    const { data } = await httpClient.get('/admin/orders', {
      schema: orderListResponseSchema,
      ...optionalSignal(signal),
    });
    return data.map(toOrder);
  },
};
