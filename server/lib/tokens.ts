import { errors as joseErrors, jwtVerify, SignJWT } from 'jose';

import { type Role } from '../db';

const ISSUER = 'tienda-api';
const AUDIENCE = 'tienda-web';

/** Datos que viajan firmados en el access token. */
export interface AccessClaims {
  readonly userId: string;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly role: Role;
}

/** Resultado de verificar un access token: válido, caducado o inválido. */
export type AccessTokenResult =
  | { readonly status: 'valid'; readonly claims: AccessClaims }
  | { readonly status: 'expired' }
  | { readonly status: 'invalid' };

/** Firma un access token de vida corta (HS256). Lleva `sid` para poder revocar la sesión al instante. */
export async function signAccessToken(
  claims: AccessClaims,
  secret: Uint8Array,
  nowMs: number,
  ttlSec: number,
): Promise<string> {
  const issuedAt = Math.floor(nowMs / 1000);
  return new SignJWT({ sid: claims.sessionId, tid: claims.tenantId, role: claims.role })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ttlSec)
    .sign(secret);
}

/** Verifica firma, algoritmo, emisor, audiencia y caducidad. Nunca lanza: devuelve el motivo. */
export async function verifyAccessToken(
  token: string,
  secret: Uint8Array,
  nowMs: number,
): Promise<AccessTokenResult> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: AUDIENCE,
      currentDate: new Date(nowMs),
    });
    const { sub, sid, tid, role } = payload;
    if (
      typeof sub !== 'string' ||
      typeof sid !== 'string' ||
      typeof tid !== 'string' ||
      (role !== 'customer' && role !== 'admin')
    ) {
      return { status: 'invalid' };
    }
    return { status: 'valid', claims: { userId: sub, sessionId: sid, tenantId: tid, role } };
  } catch (error) {
    return error instanceof joseErrors.JWTExpired ? { status: 'expired' } : { status: 'invalid' };
  }
}
