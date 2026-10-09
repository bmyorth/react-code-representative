import { z } from 'zod';

import { env } from '@/shared/config/env';

import { ApiError } from './api-error';
import { notifySessionExpired } from './session-events';
import { getTenantId } from './tenant';

type QueryValue = string | number | boolean | undefined;
type Method = 'GET' | 'POST' | 'DELETE';

interface RequestOptions<TSchema extends z.ZodType> {
  /** Esquema que valida la respuesta: nunca se confía en datos externos sin validar. */
  readonly schema: TSchema;
  readonly query?: Readonly<Record<string, QueryValue>>;
  /** Cuerpo JSON (solo POST). */
  readonly body?: unknown;
  /** Cabeceras extra, p. ej. `Idempotency-Key`. */
  readonly headers?: Readonly<Record<string, string>>;
  /** Permite cancelar la petición (TanStack Query lo pasa al desmontar o invalidar). */
  readonly signal?: AbortSignal;
  /**
   * `false` para llamadas a terceros (el "Stripe" simulado): sin cookies, sin CSRF, sin tenant
   * y sin refresco de sesión. Por defecto es una petición autenticada a nuestra API.
   */
  readonly authenticated?: boolean;
  /** Evita el refresco automático. Lo usa el propio refresco para no entrar en bucle. */
  readonly skipRefresh?: boolean;
}

/** Petición ya construida: es lo que reciben y devuelven los interceptores de petición. */
interface PreparedRequest {
  readonly url: string;
  readonly method: Method;
  readonly headers: Headers;
  readonly body: string | undefined;
  readonly authenticated: boolean;
}

type RequestInterceptor = (request: PreparedRequest) => PreparedRequest | Promise<PreparedRequest>;

/** Respuesta vacía (204): el esquema que se pasa a las llamadas sin cuerpo. */
export const emptyResponseSchema = z.undefined();

const CSRF_COOKIE = 'csrf_token';
const SESSION_LOST_CODES = new Set(['session_revoked', 'invalid_token', 'refresh_reuse_detected']);

function buildUrl(path: string, query?: Readonly<Record<string, QueryValue>>): string {
  const url = new URL(`${env.apiBaseUrl}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function readCookie(name: string): string | undefined {
  const prefix = `${name}=`;
  const entry = document.cookie.split('; ').find((cookie) => cookie.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : undefined;
}

let pendingCsrf: Promise<string | undefined> | null = null;

/** Devuelve el token CSRF; si todavía no hay cookie, la pide una sola vez aunque haya varias peticiones. */
async function ensureCsrfToken(): Promise<string | undefined> {
  const existing = readCookie(CSRF_COOKIE);
  if (existing) return existing;
  pendingCsrf ??= fetch(buildUrl('/auth/csrf'), { credentials: 'same-origin' })
    .then(() => readCookie(CSRF_COOKIE))
    .finally(() => {
      pendingCsrf = null;
    });
  return pendingCsrf;
}

/**
 * Interceptores de petición, en orden. Cada uno recibe la petición y devuelve la versión enriquecida.
 * Añadir una cabecera transversal es añadir una función aquí, sin tocar a quien hace la llamada.
 */
const requestInterceptors: readonly RequestInterceptor[] = [
  // Tenant: toda petición a nuestra API indica en qué tienda opera.
  (request) => {
    if (request.authenticated) request.headers.set('X-Tenant-Id', getTenantId());
    return request;
  },
  // CSRF: las peticiones que modifican datos llevan el token de la cookie en una cabecera.
  async (request) => {
    if (request.authenticated && request.method !== 'GET') {
      const token = await ensureCsrfToken();
      if (token) request.headers.set('X-CSRF-Token', token);
    }
    return request;
  },
];

async function applyRequestInterceptors(initial: PreparedRequest): Promise<PreparedRequest> {
  let request = initial;
  for (const interceptor of requestInterceptors) request = await interceptor(request);
  return request;
}

/** Convierte una respuesta de error en `ApiError`, conservando el código y los detalles de la API. */
async function toApiError(response: Response): Promise<ApiError> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }
  const parsed = z
    .object({
      error: z.looseObject({ code: z.string().optional(), message: z.string().optional() }),
    })
    .safeParse(payload);
  if (!parsed.success) {
    return new ApiError(`La petición falló (${String(response.status)}).`, response.status);
  }
  const { code, message, ...details } = parsed.data.error;
  return new ApiError(
    message ?? `La petición falló (${String(response.status)}).`,
    response.status,
    {
      ...(code ? { code } : {}),
      details,
    },
  );
}

async function dispatch(request: PreparedRequest, signal?: AbortSignal): Promise<Response> {
  const prepared = await applyRequestInterceptors(request);
  try {
    return await fetch(prepared.url, {
      method: prepared.method,
      headers: prepared.headers,
      credentials: prepared.authenticated ? 'same-origin' : 'omit',
      ...(prepared.body === undefined ? {} : { body: prepared.body }),
      ...(signal ? { signal } : {}),
    });
  } catch (cause) {
    // Una cancelación no es un fallo de la API: se propaga tal cual para que TanStack Query la ignore.
    if (signal?.aborted) throw cause;
    throw new ApiError('No se pudo conectar con el servidor.', 0, { cause });
  }
}

type RefreshOutcome = 'refreshed' | 'rejected' | 'unavailable';
let pendingRefresh: Promise<RefreshOutcome> | null = null;

/**
 * Refresca la sesión con el refresh token (cookie HttpOnly). Es "single-flight": si diez peticiones
 * caducan a la vez, se hace un único refresh y todas esperan su resultado. Si el servidor lo rechaza
 * la sesión ha terminado; si no se puede contactar, se conserva (podría ser un corte de red).
 */
function refreshSession(): Promise<RefreshOutcome> {
  pendingRefresh ??= (async (): Promise<RefreshOutcome> => {
    try {
      const response = await dispatch({
        url: buildUrl('/auth/refresh'),
        method: 'POST',
        headers: new Headers({ Accept: 'application/json' }),
        body: undefined,
        authenticated: true,
      });
      return response.ok ? 'refreshed' : 'rejected';
    } catch {
      return 'unavailable';
    }
  })().finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

async function request<TSchema extends z.ZodType>(
  method: Method,
  path: string,
  options: RequestOptions<TSchema>,
): Promise<z.infer<TSchema>> {
  const authenticated = options.authenticated ?? true;
  const headers = new Headers({ Accept: 'application/json', ...options.headers });
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  if (body !== undefined) headers.set('Content-Type', 'application/json');

  const prepared: PreparedRequest = {
    url: buildUrl(path, options.query),
    method,
    headers,
    body,
    authenticated,
  };

  let response = await dispatch(prepared, options.signal);

  // Interceptor de respuesta: access token caducado → refresh transparente y un único reintento.
  if (response.status === 401 && authenticated && !options.skipRefresh) {
    const error = await toApiError(response.clone());
    if (error.code === 'token_expired') {
      const outcome = await refreshSession();
      if (outcome === 'refreshed') {
        response = await dispatch(prepared, options.signal);
      } else {
        if (outcome === 'rejected') notifySessionExpired();
        throw error;
      }
    }
  }

  if (!response.ok) {
    const error = await toApiError(response);
    if (authenticated && error.code && SESSION_LOST_CODES.has(error.code)) notifySessionExpired();
    throw error;
  }

  const payload: unknown = response.status === 204 ? undefined : await response.json();
  const result = options.schema.safeParse(payload);
  if (!result.success) {
    throw new ApiError('La respuesta del servidor no tiene el formato esperado.', 502, {
      cause: result.error,
    });
  }
  return result.data;
}

/**
 * Cliente HTTP de la aplicación. Toda petición a la API pasa por aquí.
 * Responsabilidades: construir la URL, cancelar, normalizar errores, validar la respuesta y aplicar
 * los interceptores (tenant, CSRF, refresh transparente de la sesión).
 */
export const httpClient = {
  get: <TSchema extends z.ZodType>(path: string, options: RequestOptions<TSchema>) =>
    request('GET', path, options),
  post: <TSchema extends z.ZodType>(path: string, options: RequestOptions<TSchema>) =>
    request('POST', path, options),
  delete: <TSchema extends z.ZodType>(path: string, options: RequestOptions<TSchema>) =>
    request('DELETE', path, options),
} as const;
