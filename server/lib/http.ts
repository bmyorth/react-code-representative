import { type Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { type z } from 'zod';

import { type AppContext, type AppEnv } from '../context';

import { randomToken } from './crypto';
import { errors } from './errors';

/** Nombres de las cookies. Solo `csrf_token` es legible desde JavaScript (patrón double-submit). */
export const COOKIES = {
  access: 'access_token',
  refresh: 'refresh_token',
  csrf: 'csrf_token',
} as const;

/** Ruta del refresh token: el navegador solo lo envía a los endpoints de autenticación. */
export const REFRESH_COOKIE_PATH = '/api/auth';

/** Valida el cuerpo JSON con Zod. Cualquier fallo es un 400 con el detalle por campo. */
export async function parseJson<TSchema extends z.ZodType>(
  c: Context<AppEnv>,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw errors.validation({ body: 'El cuerpo debe ser JSON válido.' });
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || 'body';
      fields[key] ??= issue.message;
    }
    throw errors.validation(fields);
  }
  return result.data;
}

/** Entrega los tokens de sesión en cookies `HttpOnly`: JavaScript nunca los ve (mitiga el robo por XSS). */
export function setSessionCookies(
  c: Context<AppEnv>,
  ctx: AppContext,
  tokens: { readonly accessToken: string; readonly refreshToken: string },
): void {
  const base = { httpOnly: true, secure: ctx.config.cookieSecure, sameSite: 'Strict' } as const;
  setCookie(c, COOKIES.access, tokens.accessToken, {
    ...base,
    path: '/',
    maxAge: ctx.config.accessTtlSec,
  });
  setCookie(c, COOKIES.refresh, tokens.refreshToken, {
    ...base,
    path: REFRESH_COOKIE_PATH,
    maxAge: ctx.config.refreshTtlSec,
  });
  issueCsrfCookie(c, ctx);
}

/** Emite (o renueva) la cookie CSRF legible por el cliente. */
export function issueCsrfCookie(c: Context<AppEnv>, ctx: AppContext, token?: string): string {
  const value = token ?? getCookie(c, COOKIES.csrf) ?? randomToken(24);
  setCookie(c, COOKIES.csrf, value, {
    httpOnly: false,
    secure: ctx.config.cookieSecure,
    sameSite: 'Strict',
    path: '/',
    maxAge: ctx.config.refreshTtlSec,
  });
  return value;
}

/** Borra las cookies de sesión (logout o sesión inválida). */
export function clearSessionCookies(c: Context<AppEnv>): void {
  deleteCookie(c, COOKIES.access, { path: '/' });
  deleteCookie(c, COOKIES.refresh, { path: REFRESH_COOKIE_PATH });
}
