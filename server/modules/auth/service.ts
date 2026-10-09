import { type AppContext } from '../../context';
import { type IdentifierType, type SessionRecord, type Tenant, type UserRecord } from '../../db';
import { newId, randomToken, sha256 } from '../../lib/crypto';
import { signAccessToken } from '../../lib/tokens';

/** Normaliza el identificador y deduce si es email o teléfono (E.164). `null` si no es ninguno. */
export function parseIdentifier(raw: string): { identifier: string; type: IdentifierType } | null {
  const value = raw.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254) {
    return { identifier: value.toLowerCase(), type: 'email' };
  }
  const phone = value.replace(/[\s().-]/g, '');
  if (/^\+[1-9]\d{7,14}$/.test(phone)) return { identifier: phone, type: 'phone' };
  return null;
}

/** Oculta parte del destino para mostrarlo en pantalla sin revelar el dato completo. */
export function maskIdentifier(identifier: string, type: IdentifierType): string {
  if (type === 'phone')
    return `${identifier.slice(0, 3)}${'•'.repeat(identifier.length - 6)}${identifier.slice(-3)}`;
  const [local = '', domain = ''] = identifier.split('@');
  return `${local.slice(0, 1)}${'•'.repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

/** Busca un usuario por identificador dentro de un tenant (la unicidad es por tenant). */
export function findUser(
  ctx: AppContext,
  tenantId: string,
  identifier: string,
): UserRecord | undefined {
  for (const user of ctx.db.users.values()) {
    if (user.tenantId === tenantId && user.identifier === identifier) return user;
  }
  return undefined;
}

/** "Envía" un código: lo deja en la bandeja simulada y lo escribe en el log del servidor. */
export function sendCode(ctx: AppContext, to: string, type: IdentifierType, body: string): void {
  ctx.db.outbox.push({
    id: newId('msg'),
    to,
    channel: type === 'email' ? 'email' : 'sms',
    body,
    sentAt: ctx.now(),
  });
  // Solo en desarrollo: en producción el código jamás debe aparecer en los logs.
  if (ctx.config.devTools) console.warn(`[outbox] ${type} → ${to}: ${body}`);
}

/** Tokens listos para enviarse en cookies. */
export interface IssuedTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly session: SessionRecord;
}

async function issueAccessToken(
  ctx: AppContext,
  user: UserRecord,
  sessionId: string,
): Promise<string> {
  return signAccessToken(
    { userId: user.id, sessionId, tenantId: user.tenantId, role: user.role },
    ctx.config.jwtSecret,
    ctx.now(),
    ctx.config.accessTtlSec,
  );
}

/** Abre una sesión nueva. Si el usuario supera el máximo de dispositivos, se cierra la más antigua. */
export async function createSession(
  ctx: AppContext,
  user: UserRecord,
  meta: { readonly userAgent: string; readonly ip: string },
): Promise<IssuedTokens> {
  const active = activeSessions(ctx, user.id).sort((a, b) => a.lastUsedAt - b.lastUsedAt);
  while (active.length >= ctx.config.maxSessionsPerUser) {
    const oldest = active.shift();
    if (oldest) oldest.revokedAt = ctx.now();
  }

  const secret = randomToken();
  const now = ctx.now();
  const session: SessionRecord = {
    id: newId('ses'),
    userId: user.id,
    tenantId: user.tenantId,
    refreshHash: sha256(secret),
    previousRefreshHash: null,
    userAgent: meta.userAgent.slice(0, 200),
    ip: meta.ip,
    createdAt: now,
    lastUsedAt: now,
    expiresAt: now + ctx.config.refreshTtlSec * 1000,
    revokedAt: null,
  };
  ctx.db.sessions.set(session.id, session);

  return {
    accessToken: await issueAccessToken(ctx, user, session.id),
    refreshToken: `${session.id}.${secret}`,
    session,
  };
}

/** Resultado de rotar un refresh token. */
export type RotationResult =
  | { readonly ok: true; readonly tokens: IssuedTokens }
  | { readonly ok: false; readonly reason: 'invalid' | 'reused' };

/**
 * Rota el refresh token: cada uso emite uno nuevo e invalida el anterior.
 * Si llega un token ya rotado, alguien lo copió: se revoca la sesión entera (detección de reutilización).
 */
export async function rotateRefreshToken(
  ctx: AppContext,
  refreshToken: string,
): Promise<RotationResult> {
  const separator = refreshToken.indexOf('.');
  if (separator < 1) return { ok: false, reason: 'invalid' };
  const session = ctx.db.sessions.get(refreshToken.slice(0, separator));
  const presentedHash = sha256(refreshToken.slice(separator + 1));

  if (session?.revokedAt !== null || session.expiresAt <= ctx.now()) {
    return { ok: false, reason: 'invalid' };
  }
  if (session.previousRefreshHash === presentedHash) {
    session.revokedAt = ctx.now();
    return { ok: false, reason: 'reused' };
  }
  if (session.refreshHash !== presentedHash) return { ok: false, reason: 'invalid' };

  const user = ctx.db.users.get(session.userId);
  if (!user) return { ok: false, reason: 'invalid' };

  const secret = randomToken();
  session.previousRefreshHash = session.refreshHash;
  session.refreshHash = sha256(secret);
  session.lastUsedAt = ctx.now();

  return {
    ok: true,
    tokens: {
      accessToken: await issueAccessToken(ctx, user, session.id),
      refreshToken: `${session.id}.${secret}`,
      session,
    },
  };
}

/** Sesiones vigentes de un usuario. */
export function activeSessions(ctx: AppContext, userId: string): SessionRecord[] {
  return [...ctx.db.sessions.values()].filter(
    (session) =>
      session.userId === userId && session.revokedAt === null && session.expiresAt > ctx.now(),
  );
}

/** Representación pública del usuario (sin hash de contraseña). */
export function toPublicUser(user: UserRecord, tenant: Tenant) {
  return {
    id: user.id,
    name: user.name,
    identifier: user.identifier,
    role: user.role,
    tenant: { id: tenant.id, name: tenant.name },
  };
}
