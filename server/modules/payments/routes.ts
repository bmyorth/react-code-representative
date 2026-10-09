import { Hono } from 'hono';
import { z } from 'zod';

import { type AppContext, type AppEnv } from '../../context';
import { type OrderItem, type OrderRecord, type PaymentIntentRecord } from '../../db';
import { newId, randomToken } from '../../lib/crypto';
import { errors, HttpError } from '../../lib/errors';
import { parseJson } from '../../lib/http';
import { authenticate, csrfProtection } from '../../middleware/security';
import { priceFor } from '../catalog/routes';

import { verifyWebhookSignature } from './stripe-sim';

const MAX_QUANTITY_PER_ITEM = 10;

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
      }),
    )
    .min(1, 'El carrito está vacío.')
    .max(20),
});

const webhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({ object: z.object({ id: z.string() }) }),
});

/**
 * Pagos. El servidor es la única fuente de verdad del importe: ignora cualquier precio del cliente
 * y recalcula con el catálogo del tenant. El pedido solo pasa a `paid` cuando llega el webhook firmado.
 */
export function paymentRoutes(ctx: AppContext): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  const requireSession = authenticate(ctx);
  const csrf = csrfProtection(ctx);

  app.post('/intents', requireSession, csrf, async (c) => {
    const auth = c.get('auth');
    const idempotencyKey = c.req.header('Idempotency-Key');
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 64) {
      throw errors.validation({ 'Idempotency-Key': 'Cabecera obligatoria (8-64 caracteres).' });
    }

    // Reintentos con la misma clave devuelven el mismo resultado sin duplicar pedidos ni cobros.
    const replayKey = `${auth.userId}:${idempotencyKey}`;
    const replay = ctx.db.idempotency.get(replayKey);
    if (replay) return c.json(replay);

    const { items } = await parseJson(c, checkoutSchema);
    // El tenant de la sesión (no el de la cabecera) fija la lista de precios.
    const tenant = ctx.db.tenants.get(auth.tenantId);
    if (!tenant) throw errors.unauthenticated();
    const orderItems: OrderItem[] = [];
    const merged = new Map<string, number>();
    for (const item of items)
      merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);

    for (const [productId, quantity] of merged) {
      const product = ctx.db.catalog.find((candidate) => candidate.id === productId);
      if (!product) throw errors.notFound(`Producto desconocido: ${productId}`);
      const stock = ctx.db.stock.get(productId) ?? 0;
      if (quantity > stock || quantity > MAX_QUANTITY_PER_ITEM) {
        throw errors.conflict(
          'insufficient_stock',
          `No hay stock suficiente de "${product.name}".`,
          {
            productId,
            available: stock,
          },
        );
      }
      orderItems.push({
        productId,
        name: product.name,
        unitPriceInCents: priceFor(product, tenant),
        quantity,
      });
    }

    const amountInCents = orderItems.reduce(
      (sum, item) => sum + item.unitPriceInCents * item.quantity,
      0,
    );
    const intentId = newId('pi');
    const order: OrderRecord = {
      id: newId('ord'),
      tenantId: auth.tenantId,
      userId: auth.userId,
      items: orderItems,
      amountInCents,
      currency: 'EUR',
      status: 'pending_payment',
      paymentIntentId: intentId,
      createdAt: ctx.now(),
      paidAt: null,
    };
    const intent: PaymentIntentRecord = {
      id: intentId,
      clientSecret: `${intentId}_secret_${randomToken(16)}`,
      tenantId: auth.tenantId,
      orderId: order.id,
      amountInCents,
      currency: 'EUR',
      status: 'requires_payment_method',
      paymentMethodId: null,
      pendingOutcome: null,
    };
    ctx.db.orders.set(order.id, order);
    ctx.db.paymentIntents.set(intent.id, intent);

    const response = {
      orderId: order.id,
      paymentIntentId: intent.id,
      clientSecret: intent.clientSecret,
      amountInCents,
      currency: 'EUR',
      publishableKey: ctx.config.stripePublishableKey,
    };
    ctx.db.idempotency.set(replayKey, response);
    return c.json(response, 201);
  });

  return app;
}

/**
 * Receptor del webhook de Stripe. No usa cookies ni CSRF: se autentica con la firma HMAC.
 * Es idempotente: un mismo evento entregado dos veces no descuenta stock dos veces.
 */
export function webhookRoutes(ctx: AppContext): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.post('/stripe', async (c) => {
    const rawBody = await c.req.text();
    const valid = verifyWebhookSignature(
      ctx.config.stripeWebhookSecret,
      rawBody,
      c.req.header('Stripe-Signature'),
      ctx.now(),
    );
    if (!valid) throw new HttpError(400, 'invalid_signature', 'Firma de webhook inválida.');

    const parsed = webhookEventSchema.safeParse(JSON.parse(rawBody));
    if (!parsed.success) throw errors.validation({ body: 'Evento inválido.' });
    const event = parsed.data;

    if (ctx.db.processedWebhookEvents.has(event.id))
      return c.json({ received: true, duplicate: true });
    ctx.db.processedWebhookEvents.add(event.id);

    if (event.type === 'payment_intent.succeeded') {
      const intent = ctx.db.paymentIntents.get(event.data.object.id);
      const order = intent ? ctx.db.orders.get(intent.orderId) : undefined;
      if (order?.status === 'pending_payment') {
        order.status = 'paid';
        order.paidAt = ctx.now();
        for (const item of order.items) {
          const stock = ctx.db.stock.get(item.productId) ?? 0;
          ctx.db.stock.set(item.productId, Math.max(0, stock - item.quantity));
        }
      }
    }
    return c.json({ received: true });
  });

  return app;
}
