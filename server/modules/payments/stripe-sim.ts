import { Hono, type Context } from 'hono';
import { z } from 'zod';

import { type AppContext, type AppEnv } from '../../context';
import { type PaymentIntentRecord } from '../../db';
import { hmacSha256, newId, safeEqual } from '../../lib/crypto';

/** Entrega un webhook firmado a la API. Se inyecta para poder cablearlo con la app real. */
export type WebhookDelivery = (rawBody: string, signatureHeader: string) => Promise<void>;

/** Firma un cuerpo como lo hace Stripe: `t=<timestamp>,v1=HMAC_SHA256(secret, "<t>.<cuerpo>")`. */
export function signWebhook(secret: string, rawBody: string, timestampSec: number): string {
  return `t=${String(timestampSec)},v1=${hmacSha256(secret, `${String(timestampSec)}.${rawBody}`)}`;
}

/** Verifica la firma y la antigüedad (anti-replay) de un webhook. */
export function verifyWebhookSignature(
  secret: string,
  rawBody: string,
  header: string | undefined,
  nowMs: number,
  toleranceSec = 300,
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(',').map((part) => part.split('=') as [string, string]),
  );
  const timestamp = Number(parts.t);
  const signature = parts.v1;
  if (!Number.isFinite(timestamp) || !signature) return false;
  if (Math.abs(nowMs / 1000 - timestamp) > toleranceSec) return false;
  return safeEqual(signature, hmacSha256(secret, `${String(timestamp)}.${rawBody}`));
}

/** Tarjetas de prueba (mismas que documenta Stripe) y su comportamiento. */
const SCENARIOS: Readonly<
  Record<string, 'requires_3ds' | 'declined' | 'insufficient_funds' | 'expired'>
> = {
  '4000002500003155': 'requires_3ds',
  '4000000000000002': 'declined',
  '4000000000009995': 'insufficient_funds',
  '4000000000000069': 'expired',
};

function luhnValid(number: string): boolean {
  let sum = 0;
  for (let index = 0; index < number.length; index += 1) {
    let digit = Number(number[number.length - 1 - index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function detectBrand(number: string): string {
  if (number.startsWith('4')) return 'visa';
  if (/^5[1-5]/.test(number)) return 'mastercard';
  if (/^3[47]/.test(number)) return 'amex';
  return 'unknown';
}

const cardSchema = z.object({
  card: z.object({
    number: z.string(),
    exp_month: z.number().int(),
    exp_year: z.number().int(),
    cvc: z.string(),
  }),
});
const confirmSchema = z.object({ client_secret: z.string(), payment_method: z.string() });
const authenticateSchema = z.object({
  client_secret: z.string(),
  result: z.enum(['success', 'failure']),
});

function cardError(c: Context<AppEnv>, code: string, message: string, declineCode?: string) {
  return c.json(
    {
      error: {
        type: 'card_error',
        code,
        message,
        ...(declineCode ? { decline_code: declineCode } : {}),
      },
    },
    402,
  );
}

/**
 * "Stripe" simulado. Reproduce el flujo real de PaymentIntents:
 * el navegador tokeniza la tarjeta contra Stripe (nunca contra nuestra API), confirma el pago con
 * el `client_secret` y es Stripe quien avisa a nuestro backend mediante un webhook firmado.
 * Nuestro backend jamás recibe el número de tarjeta.
 */
export function stripeSimRoutes(ctx: AppContext, deliverWebhook: WebhookDelivery): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  const findIntent = (id: string, clientSecret: string): PaymentIntentRecord | undefined => {
    const intent = ctx.db.paymentIntents.get(id);
    return intent && safeEqual(intent.clientSecret, clientSecret) ? intent : undefined;
  };

  const emitSucceeded = async (intent: PaymentIntentRecord): Promise<void> => {
    const body = JSON.stringify({
      id: newId('evt'),
      type: 'payment_intent.succeeded',
      data: { object: { id: intent.id, amount: intent.amountInCents, currency: 'eur' } },
    });
    const signature = signWebhook(
      ctx.config.stripeWebhookSecret,
      body,
      Math.floor(ctx.now() / 1000),
    );
    const send = () =>
      deliverWebhook(body, signature).catch((error: unknown) => {
        console.error('[stripe-sim] fallo al entregar el webhook', error);
      });
    if (ctx.config.webhookDelayMs <= 0) await send();
    else setTimeout(() => void send(), ctx.config.webhookDelayMs);
  };

  const complete = async (intent: PaymentIntentRecord) => {
    intent.status = 'succeeded';
    intent.pendingOutcome = null;
    await emitSucceeded(intent);
  };

  // Stripe real exige la clave publicable para tokenizar; aquí también.
  app.use('/payment_methods', async (c, next) => {
    const key = c.req.header('Authorization')?.replace(/^Bearer /, '') ?? '';
    if (!safeEqual(key, ctx.config.stripePublishableKey)) {
      return c.json(
        { error: { type: 'invalid_request_error', message: 'Clave API no válida.' } },
        401,
      );
    }
    return next();
  });

  app.post('/payment_methods', async (c) => {
    const parsed = cardSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json(
        { error: { type: 'invalid_request_error', message: 'Petición inválida.' } },
        400,
      );
    }
    const { number: rawNumber, exp_month: month, exp_year: year, cvc } = parsed.data.card;
    const number = rawNumber.replace(/[\s-]/g, '');

    if (!/^\d{13,19}$/.test(number) || !luhnValid(number)) {
      return cardError(c, 'incorrect_number', 'El número de tarjeta no es válido.');
    }
    const now = new Date(ctx.now());
    const expired =
      month < 1 ||
      month > 12 ||
      year < now.getUTCFullYear() ||
      (year === now.getUTCFullYear() && month < now.getUTCMonth() + 1);
    if (expired)
      return cardError(c, 'invalid_expiry', 'La tarjeta ha caducado o la fecha no es válida.');
    if (!/^\d{3,4}$/.test(cvc)) return cardError(c, 'invalid_cvc', 'El CVC no es válido.');

    const method = {
      id: newId('pm'),
      brand: detectBrand(number),
      last4: number.slice(-4),
      // Solo se conserva el escenario de prueba, nunca el número completo.
      scenario: SCENARIOS[number] ?? 'ok',
    };
    ctx.db.paymentMethods.set(method.id, method);
    return c.json({
      id: method.id,
      type: 'card',
      card: { brand: method.brand, last4: method.last4 },
    });
  });

  app.post('/payment_intents/:id/confirm', async (c) => {
    const parsed = confirmSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json(
        { error: { type: 'invalid_request_error', message: 'Petición inválida.' } },
        400,
      );
    }
    const intent = findIntent(c.req.param('id'), parsed.data.client_secret);
    const method = ctx.db.paymentMethods.get(parsed.data.payment_method);
    if (!intent || !method) {
      return c.json(
        { error: { type: 'invalid_request_error', message: 'Recurso inexistente.' } },
        404,
      );
    }
    if (intent.status === 'succeeded') return c.json({ id: intent.id, status: intent.status });

    intent.paymentMethodId = method.id;
    switch (method.scenario) {
      case 'declined':
        return cardError(c, 'card_declined', 'Tu tarjeta ha sido rechazada.', 'generic_decline');
      case 'insufficient_funds':
        return cardError(c, 'card_declined', 'Fondos insuficientes.', 'insufficient_funds');
      case 'expired':
        return cardError(c, 'expired_card', 'Tu tarjeta ha caducado.');
      case 'requires_3ds':
        intent.status = 'requires_action';
        intent.pendingOutcome = 'succeeded';
        return c.json({
          id: intent.id,
          status: intent.status,
          next_action: { type: 'use_stripe_sdk' },
        });
      default:
        await complete(intent);
        return c.json({ id: intent.id, status: intent.status });
    }
  });

  app.post('/payment_intents/:id/authenticate', async (c) => {
    const parsed = authenticateSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json(
        { error: { type: 'invalid_request_error', message: 'Petición inválida.' } },
        400,
      );
    }
    const intent = findIntent(c.req.param('id'), parsed.data.client_secret);
    if (intent?.status !== 'requires_action') {
      return c.json(
        { error: { type: 'invalid_request_error', message: 'Recurso inexistente.' } },
        404,
      );
    }
    if (parsed.data.result === 'failure') {
      intent.status = 'requires_payment_method';
      intent.pendingOutcome = null;
      return cardError(
        c,
        'payment_intent_authentication_failure',
        'La autenticación 3D Secure ha fallado.',
      );
    }
    await complete(intent);
    return c.json({ id: intent.id, status: intent.status });
  });

  return app;
}
