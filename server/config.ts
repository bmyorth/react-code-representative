import { randomBytes } from 'node:crypto';

/** Configuración del backend local. Todo valor tiene un default seguro para desarrollo. */
export interface ServerConfig {
  readonly port: number;
  readonly isProduction: boolean;
  /** Secreto HS256 de los access tokens. Si no se define, se genera uno por arranque. */
  readonly jwtSecret: Uint8Array;
  /** Secreto con el que el "Stripe" simulado firma los webhooks. */
  readonly stripeWebhookSecret: string;
  readonly stripePublishableKey: string;
  /** Orígenes de navegador autorizados a hacer peticiones que modifican datos. */
  readonly allowedOrigins: readonly string[];
  /** Cookies `Secure`: obligatorio en producción, opcional en `http://localhost`. */
  readonly cookieSecure: boolean;
  readonly accessTtlSec: number;
  readonly refreshTtlSec: number;
  readonly maxSessionsPerUser: number;
  readonly codeTtlSec: number;
  readonly codeMaxAttempts: number;
  readonly resendCooldownSec: number;
  readonly resendMax: number;
  readonly loginMaxAttempts: number;
  readonly lockoutSec: number;
  /** Peticiones por minuto y por IP (0 = sin límite). */
  readonly rateLimitPerMinute: number;
  /** Retardo del webhook simulado. Con 0 se entrega de forma síncrona (tests). */
  readonly webhookDelayMs: number;
  /** Latencia artificial de la API para que los estados de carga sean visibles. */
  readonly latencyMs: number;
  /** Habilita `/api/dev/*` (bandeja de SMS/emails simulados). Nunca en producción. */
  readonly devTools: boolean;
}

/** Lee la configuración del entorno aplicando valores por defecto y validaciones básicas. */
export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
  overrides: Partial<ServerConfig> = {},
): ServerConfig {
  const isProduction = env.NODE_ENV === 'production';
  const secret = env.JWT_SECRET;
  if (isProduction && (!secret || secret.length < 32)) {
    throw new Error('JWT_SECRET (mínimo 32 caracteres) es obligatorio en producción.');
  }

  return {
    port: Number(env.API_PORT ?? 3001),
    isProduction,
    jwtSecret: new TextEncoder().encode(secret ?? randomBytes(32).toString('hex')),
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET ?? `whsec_${randomBytes(16).toString('hex')}`,
    stripePublishableKey: 'pk_test_simulado',
    allowedOrigins: (env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:4173')
      .split(',')
      .map((origin) => origin.trim()),
    cookieSecure: isProduction,
    accessTtlSec: 10 * 60,
    refreshTtlSec: 7 * 24 * 3600,
    maxSessionsPerUser: 5,
    codeTtlSec: 10 * 60,
    codeMaxAttempts: 5,
    resendCooldownSec: 30,
    resendMax: 3,
    loginMaxAttempts: 5,
    lockoutSec: 15 * 60,
    rateLimitPerMinute: 300,
    webhookDelayMs: 600,
    latencyMs: isProduction ? 0 : 250,
    devTools: !isProduction,
    ...overrides,
  };
}
