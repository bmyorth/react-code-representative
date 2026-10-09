import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { z } from 'zod';

import { type AppContext, type AppEnv } from '../../context';
import { type PendingRegistration, type UserRecord } from '../../db';
import { newId, randomCode, safeEqual, sha256 } from '../../lib/crypto';
import { errors, HttpError } from '../../lib/errors';
import {
  clearSessionCookies,
  COOKIES,
  issueCsrfCookie,
  parseJson,
  setSessionCookies,
} from '../../lib/http';
import { dummyHash, hashPassword, verifyPassword } from '../../lib/password';
import { authenticate, csrfProtection } from '../../middleware/security';

import {
  activeSessions,
  createSession,
  findUser,
  maskIdentifier,
  parseIdentifier,
  rotateRefreshToken,
  sendCode,
  toPublicUser,
} from './service';

const passwordSchema = z
  .string()
  .min(10, 'Mínimo 10 caracteres.')
  .max(128, 'Máximo 128 caracteres.')
  .regex(/[a-z]/, 'Incluye una minúscula.')
  .regex(/[A-Z]/, 'Incluye una mayúscula.')
  .regex(/\d/, 'Incluye un número.');

const identifierSchema = z.string().trim().min(1, 'Obligatorio.').max(254);

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Mínimo 2 caracteres.').max(80),
  identifier: identifierSchema,
  password: passwordSchema,
});
const verifySchema = z.object({
  challengeId: z.string().min(1).max(100),
  code: z.string().regex(/^\d{6}$/, 'El código tiene 6 dígitos.'),
});
const resendSchema = z.object({ challengeId: z.string().min(1).max(100) });
const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, 'Obligatorio.').max(128),
});

/** Respuesta común de "código enviado": idéntica exista o no la cuenta (no permite enumerar usuarios). */
function challengeResponse(ctx: AppContext, challengeId: string, target: string, sentAt: number) {
  return {
    challengeId,
    target,
    expiresAt: sentAt + ctx.config.codeTtlSec * 1000,
    resendAvailableAt: sentAt + ctx.config.resendCooldownSec * 1000,
  };
}

function codeMessage(code: string, ctx: AppContext): string {
  return `Tu código de verificación es ${code}. Caduca en ${String(ctx.config.codeTtlSec / 60)} minutos.`;
}

/** Endpoints de autenticación: registro con código, login, refresh con rotación y gestión de sesiones. */
export function authRoutes(ctx: AppContext): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  const requireSession = authenticate(ctx);
  const csrf = csrfProtection(ctx);
  const meta = (c: {
    get: (key: 'ip') => string;
    req: { header: (n: string) => string | undefined };
  }) => ({
    ip: c.get('ip'),
    userAgent: c.req.header('User-Agent') ?? 'desconocido',
  });

  // Freno específico para endpoints sensibles, además del límite global por IP.
  app.use('*', async (c, next) => {
    if (c.req.method !== 'GET') {
      const { allowed, retryAfterSec } = ctx.authRateLimiter.hit(c.get('ip'));
      if (!allowed) {
        c.header('Retry-After', String(retryAfterSec));
        throw errors.tooMany(retryAfterSec);
      }
    }
    await next();
  });

  /** El cliente la llama antes de su primer POST para obtener la cookie CSRF. */
  app.get('/csrf', (c) => {
    issueCsrfCookie(c, ctx);
    return c.json({ ok: true });
  });

  app.post('/register', csrf, async (c) => {
    const input = await parseJson(c, registerSchema);
    const parsed = parseIdentifier(input.identifier);
    if (!parsed)
      throw errors.validation({ identifier: 'Introduce un email o un teléfono (+34…).' });

    const tenant = c.get('tenant');

    // Tope por destino (exista o no la cuenta): sin él se podrían encadenar desafíos nuevos, de 5
    // intentos cada uno, hasta adivinar el código de 6 dígitos de un destino ajeno.
    const { allowed, retryAfterSec } = ctx.registrationLimiter.hit(
      `${tenant.id}|${parsed.identifier}`,
    );
    if (!allowed) {
      c.header('Retry-After', String(retryAfterSec));
      throw errors.tooMany(retryAfterSec);
    }

    const passwordHash = await hashPassword(input.password);
    const now = ctx.now();
    const accountExists = findUser(ctx, tenant.id, parsed.identifier) !== undefined;

    // Un registro pendiente anterior para el mismo destino se sustituye por el nuevo.
    for (const [id, pending] of ctx.db.pendingRegistrations) {
      if (pending.tenantId === tenant.id && pending.identifier === parsed.identifier) {
        ctx.db.pendingRegistrations.delete(id);
      }
    }

    const code = randomCode();
    const pending: PendingRegistration = {
      id: newId('chl'),
      tenantId: tenant.id,
      name: input.name,
      identifier: parsed.identifier,
      identifierType: parsed.type,
      passwordHash,
      decoy: accountExists,
      codeHash: sha256(code),
      expiresAt: now + ctx.config.codeTtlSec * 1000,
      attempts: 0,
      resends: 0,
      lastSentAt: now,
    };
    ctx.db.pendingRegistrations.set(pending.id, pending);
    // Mismo camino para cuentas nuevas y existentes: al dueño de una cuenta existente se le avisa
    // en lugar de enviarle un código, y el solicitante recibe un desafío idéntico (señuelo).
    sendCode(
      ctx,
      parsed.identifier,
      parsed.type,
      accountExists
        ? 'Alguien intentó registrarse con tu cuenta. Si fuiste tú, inicia sesión.'
        : codeMessage(code, ctx),
    );

    return c.json(
      challengeResponse(ctx, pending.id, maskIdentifier(parsed.identifier, parsed.type), now),
      202,
    );
  });

  app.post('/resend', csrf, async (c) => {
    const { challengeId } = await parseJson(c, resendSchema);
    const pending = ctx.db.pendingRegistrations.get(challengeId);
    const now = ctx.now();
    if (!pending || pending.expiresAt <= now) {
      throw new HttpError(400, 'challenge_expired', 'El código ha caducado. Vuelve a registrarte.');
    }
    const waitSec = Math.ceil(
      (pending.lastSentAt + ctx.config.resendCooldownSec * 1000 - now) / 1000,
    );
    if (waitSec > 0) {
      c.header('Retry-After', String(waitSec));
      throw errors.tooMany(waitSec);
    }
    if (pending.resends >= ctx.config.resendMax) {
      throw new HttpError(429, 'resend_limit', 'Has alcanzado el máximo de reenvíos.');
    }

    const code = randomCode();
    pending.codeHash = sha256(code);
    pending.attempts = 0;
    pending.resends += 1;
    pending.lastSentAt = now;
    pending.expiresAt = now + ctx.config.codeTtlSec * 1000;
    // Un señuelo se comporta igual (cooldown, límites, respuesta) pero no envía ningún código.
    if (!pending.decoy) {
      sendCode(ctx, pending.identifier, pending.identifierType, codeMessage(code, ctx));
    }

    return c.json(
      challengeResponse(
        ctx,
        pending.id,
        maskIdentifier(pending.identifier, pending.identifierType),
        now,
      ),
    );
  });

  app.post('/verify', csrf, async (c) => {
    const { challengeId, code } = await parseJson(c, verifySchema);
    const pending = ctx.db.pendingRegistrations.get(challengeId);
    const now = ctx.now();
    if (!pending || pending.expiresAt <= now) {
      throw new HttpError(400, 'invalid_code', 'El código no es válido o ha caducado.');
    }

    if (pending.decoy || !safeEqual(sha256(code), pending.codeHash)) {
      pending.attempts += 1;
      if (pending.attempts >= ctx.config.codeMaxAttempts) {
        ctx.db.pendingRegistrations.delete(pending.id);
        throw new HttpError(400, 'challenge_expired', 'Demasiados intentos. Vuelve a registrarte.');
      }
      throw new HttpError(400, 'invalid_code', 'El código no es correcto.', {
        attemptsLeft: ctx.config.codeMaxAttempts - pending.attempts,
      });
    }

    ctx.db.pendingRegistrations.delete(pending.id);
    if (findUser(ctx, pending.tenantId, pending.identifier)) {
      throw errors.conflict('already_registered', 'Esta cuenta ya existe. Inicia sesión.');
    }

    const user: UserRecord = {
      id: newId('usr'),
      tenantId: pending.tenantId,
      name: pending.name,
      identifier: pending.identifier,
      identifierType: pending.identifierType,
      passwordHash: pending.passwordHash,
      role: 'customer', // El rol nunca lo elige el cliente: todo registro público es `customer`.
      createdAt: now,
    };
    ctx.db.users.set(user.id, user);

    const tokens = await createSession(ctx, user, meta(c));
    setSessionCookies(c, ctx, tokens);
    return c.json({ user: toPublicUser(user, c.get('tenant')) }, 201);
  });

  app.post('/login', csrf, async (c) => {
    const input = await parseJson(c, loginSchema);
    const parsed = parseIdentifier(input.identifier);
    const tenant = c.get('tenant');
    const account = `${tenant.id}|${parsed?.identifier ?? input.identifier.toLowerCase()}`;
    const throttleKey = `${c.get('ip')}|${account}`;

    // Dos bloqueos: por IP + cuenta (frena a un atacante concreto) y por cuenta sola con un umbral
    // mayor (frena un ataque distribuido desde muchas IPs).
    const lockedFor = Math.max(
      ctx.loginThrottle.lockedForSec(throttleKey),
      ctx.accountThrottle.lockedForSec(account),
    );
    if (lockedFor > 0) {
      c.header('Retry-After', String(lockedFor));
      throw new HttpError(
        429,
        'account_locked',
        'Demasiados intentos fallidos. Espera antes de reintentar.',
        {
          retryAfterSec: lockedFor,
        },
      );
    }

    const user = parsed ? findUser(ctx, tenant.id, parsed.identifier) : undefined;
    // Se verifica siempre contra un hash (real o ficticio) para igualar el tiempo de respuesta.
    const valid = await verifyPassword(input.password, user?.passwordHash ?? (await dummyHash));
    if (!user || !valid) {
      ctx.loginThrottle.registerFailure(throttleKey);
      ctx.accountThrottle.registerFailure(account);
      throw new HttpError(401, 'invalid_credentials', 'Credenciales incorrectas.');
    }

    ctx.loginThrottle.reset(throttleKey);
    ctx.accountThrottle.reset(account);
    const tokens = await createSession(ctx, user, meta(c));
    setSessionCookies(c, ctx, tokens);
    return c.json({ user: toPublicUser(user, tenant) });
  });

  app.post('/refresh', csrf, async (c) => {
    const refreshToken = getCookie(c, COOKIES.refresh);
    if (!refreshToken) throw new HttpError(401, 'no_refresh_token', 'No hay sesión que refrescar.');

    const result = await rotateRefreshToken(ctx, refreshToken);
    if (!result.ok) {
      clearSessionCookies(c);
      throw new HttpError(
        401,
        result.reason === 'reused' ? 'refresh_reuse_detected' : 'invalid_refresh_token',
        'La sesión ya no es válida. Inicia sesión de nuevo.',
      );
    }
    setSessionCookies(c, ctx, result.tokens);
    return c.json({ ok: true });
  });

  app.post('/logout', csrf, (c) => {
    const refreshToken = getCookie(c, COOKIES.refresh);
    const session = refreshToken
      ? ctx.db.sessions.get(refreshToken.split('.')[0] ?? '')
      : undefined;
    if (
      session &&
      refreshToken &&
      session.refreshHash === sha256(refreshToken.split('.')[1] ?? '')
    ) {
      session.revokedAt = ctx.now();
    }
    clearSessionCookies(c);
    return c.body(null, 204);
  });

  app.post('/logout-all', requireSession, csrf, (c) => {
    for (const session of activeSessions(ctx, c.get('auth').userId)) session.revokedAt = ctx.now();
    clearSessionCookies(c);
    return c.body(null, 204);
  });

  app.get('/me', requireSession, (c) => {
    const { userId, tenantId } = c.get('auth');
    const user = ctx.db.users.get(userId);
    const tenant = ctx.db.tenants.get(tenantId);
    if (!user || !tenant) throw errors.unauthenticated();
    return c.json({ user: toPublicUser(user, tenant) });
  });

  app.get('/sessions', requireSession, (c) => {
    const { userId, sessionId } = c.get('auth');
    const sessions = activeSessions(ctx, userId)
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .map((session) => ({
        id: session.id,
        userAgent: session.userAgent,
        ip: session.ip,
        createdAt: new Date(session.createdAt).toISOString(),
        lastUsedAt: new Date(session.lastUsedAt).toISOString(),
        current: session.id === sessionId,
      }));
    return c.json({ data: sessions });
  });

  app.delete('/sessions/:id', requireSession, csrf, (c) => {
    const { userId, sessionId } = c.get('auth');
    const session = ctx.db.sessions.get(c.req.param('id'));
    // Solo se pueden cerrar las propias; para el resto se responde 404 (no se confirma que existan).
    if (session?.userId !== userId || session.revokedAt !== null) throw errors.notFound();
    session.revokedAt = ctx.now();
    if (session.id === sessionId) clearSessionCookies(c);
    return c.body(null, 204);
  });

  return app;
}
