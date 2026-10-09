import { type MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { secureHeaders } from 'hono/secure-headers';

import { type AppContext, type AppEnv } from '../context';
import { type Role } from '../db';
import { safeEqual } from '../lib/crypto';
import { errors, HttpError } from '../lib/errors';
import { COOKIES } from '../lib/http';
import { createRateLimiter } from '../lib/rate-limit';
import { verifyAccessToken } from '../lib/tokens';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Cabeceras de seguridad estándar para una API JSON (nosniff, sin framing, sin referrer…). */
export const securityHeaders = (): MiddlewareHandler<AppEnv> =>
  secureHeaders({
    contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    referrerPolicy: 'no-referrer',
  });

/** Las respuestas de la API con datos de usuario nunca deben quedar en cachés compartidas. */
export const noStore = (): MiddlewareHandler<AppEnv> => async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
};

/** Latencia artificial: hace visibles los estados de carga de la interfaz. */
export const latency =
  (ctx: AppContext): MiddlewareHandler<AppEnv> =>
  async (_c, next) => {
    if (ctx.config.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, ctx.config.latencyMs));
    }
    await next();
  };

/** Limita las peticiones por IP y minuto. Responde 429 con `Retry-After`. */
export const rateLimit = (ctx: AppContext): MiddlewareHandler<AppEnv> => {
  const limiter = createRateLimiter({
    limit: ctx.config.rateLimitPerMinute,
    windowMs: 60_000,
    now: ctx.now,
  });
  return async (c, next) => {
    const { allowed, retryAfterSec } = limiter.hit(c.get('ip'));
    if (!allowed) {
      c.header('Retry-After', String(retryAfterSec));
      throw errors.tooMany(retryAfterSec);
    }
    await next();
  };
};

/** Resuelve el tenant de la petición a partir de `X-Tenant-Id` (por defecto, `acme`). */
export const resolveTenant = (ctx: AppContext): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    const tenantId = c.req.header('X-Tenant-Id') ?? 'acme';
    const tenant = ctx.db.tenants.get(tenantId);
    if (!tenant) throw new HttpError(400, 'unknown_tenant', 'Tienda desconocida.');
    c.set('tenant', tenant);
    await next();
  };
};

/**
 * Protección CSRF en dos capas para peticiones que modifican datos:
 * 1. `Origin` debe pertenecer a la lista de orígenes permitidos.
 * 2. Double-submit: la cabecera `X-CSRF-Token` debe coincidir con la cookie `csrf_token`
 *    (un sitio ajeno no puede leer ni fijar esa cookie para este origen).
 */
export const csrfProtection = (ctx: AppContext): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    if (SAFE_METHODS.has(c.req.method)) return next();

    const origin = c.req.header('Origin');
    if (origin && !ctx.config.allowedOrigins.includes(origin)) {
      throw new HttpError(403, 'invalid_origin', 'Origen no permitido.');
    }

    const cookieToken = getCookie(c, COOKIES.csrf);
    const headerToken = c.req.header('X-CSRF-Token');
    if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
      throw new HttpError(403, 'csrf_failed', 'Token CSRF ausente o inválido.');
    }
    await next();
  };
};

/**
 * Exige una sesión válida: access token firmado y vigente + sesión no revocada.
 * Distingue `token_expired` (el cliente debe refrescar) de `unauthenticated` (debe iniciar sesión).
 */
export const authenticate = (ctx: AppContext): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    const token = getCookie(c, COOKIES.access);
    if (!token) throw errors.unauthenticated();

    const result = await verifyAccessToken(token, ctx.config.jwtSecret, ctx.now());
    if (result.status === 'expired') {
      throw new HttpError(401, 'token_expired', 'La sesión ha caducado; hay que refrescarla.');
    }
    if (result.status === 'invalid') {
      throw new HttpError(401, 'invalid_token', 'Token de acceso inválido.');
    }

    const { claims } = result;
    const session = ctx.db.sessions.get(claims.sessionId);
    if (session?.revokedAt !== null || session.expiresAt <= ctx.now()) {
      throw new HttpError(401, 'session_revoked', 'La sesión ya no es válida.');
    }

    // Aislamiento entre tenants: el token manda; una cabecera distinta es un intento de cruce.
    // Se compara el tenant ya resuelto (que por defecto es `acme` si falta la cabecera), no solo la
    // cabecera: así una petición sin cabecera tampoco puede operar con el tenant equivocado.
    const tenant = ctx.db.tenants.get(claims.tenantId);
    if (!tenant) throw new HttpError(401, 'invalid_token', 'Token de acceso inválido.');
    if (c.get('tenant').id !== claims.tenantId) {
      throw new HttpError(403, 'tenant_mismatch', 'La sesión pertenece a otra tienda.');
    }
    c.set('tenant', tenant);

    session.lastUsedAt = ctx.now();
    c.set('auth', claims);
    await next();
  };
};

/** Autorización por rol (RBAC). Debe ir después de `authenticate`. */
export const requireRole =
  (...roles: readonly Role[]): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    if (!roles.includes(c.get('auth').role)) throw errors.forbidden();
    await next();
  };
