import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';

import { loadConfig, type ServerConfig } from './config';
import { type AppContext, type AppEnv } from './context';
import { createDb, type Db } from './db';
import { HttpError } from './lib/errors';
import { createLoginThrottle, createRateLimiter } from './lib/rate-limit';
import { latency, noStore, rateLimit, resolveTenant, securityHeaders } from './middleware/security';
import { authRoutes } from './modules/auth/routes';
import { catalogRoutes } from './modules/catalog/routes';
import { adminRoutes, orderRoutes } from './modules/orders/routes';
import { paymentRoutes, webhookRoutes } from './modules/payments/routes';
import { stripeSimRoutes } from './modules/payments/stripe-sim';

/** Opciones de `createApp`. Los tests inyectan reloj, configuración y base de datos. */
export interface CreateAppOptions {
  readonly config?: Partial<ServerConfig>;
  readonly now?: () => number;
  readonly db?: Db;
}

/** Aplicación Hono completa más el contexto, para que los tests puedan inspeccionar el estado. */
export interface ApiApp {
  readonly app: Hono<AppEnv>;
  readonly ctx: AppContext;
}

/** Compone la API: middlewares globales, módulos y manejo uniforme de errores. */
export async function createApp(options: CreateAppOptions = {}): Promise<ApiApp> {
  const config = loadConfig(process.env, options.config);
  const now = options.now ?? Date.now;
  const ctx: AppContext = {
    config,
    db: options.db ?? (await createDb()),
    now,
    loginThrottle: createLoginThrottle({
      maxAttempts: config.loginMaxAttempts,
      lockoutMs: config.lockoutSec * 1000,
      now,
    }),
    authRateLimiter: createRateLimiter({ limit: 30, windowMs: 60_000, now }),
  };

  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    // Sin proxy de confianza no se lee `X-Forwarded-For`: sería un valor que el cliente controla.
    c.set('ip', c.req.header('X-Real-IP') ?? '127.0.0.1');
    await next();
  });
  app.use('*', securityHeaders(), noStore(), latency(ctx), rateLimit(ctx));
  app.use(
    '*',
    bodyLimit({
      maxSize: 16 * 1024,
      onError: () => {
        throw new HttpError(413, 'payload_too_large', 'Cuerpo demasiado grande.');
      },
    }),
  );

  // Webhooks y Stripe simulado se autentican por firma / client_secret, no por cookies.
  const deliverWebhook = async (rawBody: string, signature: string): Promise<void> => {
    await app.request('/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature },
      body: rawBody,
    });
  };
  app.route('/api/stripe/v1', stripeSimRoutes(ctx, deliverWebhook));
  app.route('/api/webhooks', webhookRoutes(ctx));

  app.use('/api/*', resolveTenant(ctx));
  app.route('/api/auth', authRoutes(ctx));
  app.route('/api/products', catalogRoutes(ctx));
  app.route('/api/payments', paymentRoutes(ctx));
  app.route('/api/orders', orderRoutes(ctx));
  app.route('/api/admin', adminRoutes(ctx));

  if (config.devTools) {
    // Bandeja de SMS/emails simulados para poder leer el código de verificación en desarrollo.
    app.get('/api/dev/outbox', (c) => {
      const to = c.req.query('to');
      const data = ctx.db.outbox
        .filter((message) => !to || message.to === to)
        .slice(-10)
        .reverse();
      return c.json({ data });
    });
  }

  app.get('/api/health', (c) => c.json({ status: 'ok' }));

  app.notFound((c) =>
    c.json({ error: { code: 'not_found', message: 'Ruta no encontrada.' } }, 404),
  );
  app.onError((error, c) => {
    if (error instanceof HttpError) {
      return c.json(
        { error: { code: error.code, message: error.message, ...error.details } },
        error.status,
      );
    }
    console.error('[api] error no controlado', error);
    return c.json(
      { error: { code: 'internal_error', message: 'Error interno del servidor.' } },
      500,
    );
  });

  return { app, ctx };
}
