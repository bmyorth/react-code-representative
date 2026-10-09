import { type Hono } from 'hono';

import { createApp } from '../app';
import { type ServerConfig } from '../config';
import { type AppContext, type AppEnv } from '../context';
import { DEMO_PASSWORD } from '../db';

/** Reloj controlable: permite probar caducidades de tokens y códigos sin esperar. */
export interface FakeClock {
  now: () => number;
  advance: (ms: number) => void;
}

interface StoredCookie {
  readonly value: string;
  readonly path: string;
}

/** Respuesta ya leída: estado, cuerpo JSON y cabeceras. */
export interface ApiResponse {
  readonly status: number;
  readonly body: Record<string, any>;
  readonly headers: Headers;
  readonly setCookies: readonly string[];
}

/**
 * Cliente de pruebas con "jar" de cookies, como un navegador: guarda las `Set-Cookie`, respeta
 * `Path` y borrados, y añade solo el token CSRF a las peticiones que lo requieren.
 */
export class ApiClient {
  private readonly jar = new Map<string, StoredCookie>();

  constructor(
    private readonly app: Hono<AppEnv>,
    private readonly defaults: { tenant: string; origin: string; userAgent: string },
  ) {}

  cookie(name: string): string | undefined {
    return this.jar.get(name)?.value;
  }

  /** Elimina una cookie del jar (simula que el navegador la perdió o caducó). */
  dropCookie(name: string): void {
    this.jar.delete(name);
  }

  setCookieValue(name: string, value: string, path = '/'): void {
    this.jar.set(name, { value, path });
  }

  async request(
    method: string,
    path: string,
    options: {
      body?: unknown;
      headers?: Record<string, string>;
      csrf?: boolean;
      tenant?: string | null;
      raw?: string;
    } = {},
  ): Promise<ApiResponse> {
    const isMutation = !['GET', 'HEAD'].includes(method);
    if (isMutation && options.csrf !== false && !this.cookie('csrf_token')) {
      await this.request('GET', '/api/auth/csrf');
    }

    const headers: Record<string, string> = {
      Origin: this.defaults.origin,
      'User-Agent': this.defaults.userAgent,
      ...(options.tenant === null ? {} : { 'X-Tenant-Id': options.tenant ?? this.defaults.tenant }),
      ...options.headers,
    };
    if (isMutation && options.csrf !== false) {
      const token = this.cookie('csrf_token');
      if (token) headers['X-CSRF-Token'] ??= token;
    }
    const cookieHeader = [...this.jar.entries()]
      .filter(([, cookie]) => path.startsWith(cookie.path))
      .map(([name, cookie]) => `${name}=${cookie.value}`)
      .join('; ');
    if (cookieHeader) headers.Cookie = cookieHeader;

    const rawBody =
      options.raw ?? (options.body === undefined ? undefined : JSON.stringify(options.body));
    if (rawBody !== undefined) headers['Content-Type'] = 'application/json';

    const response = await this.app.request(path, {
      method,
      headers,
      ...(rawBody === undefined ? {} : { body: rawBody }),
    });
    const setCookies = response.headers.getSetCookie();
    this.storeCookies(setCookies);

    const text = await response.text();
    return {
      status: response.status,
      body: text ? (JSON.parse(text) as Record<string, never>) : {},
      headers: response.headers,
      setCookies,
    };
  }

  get = (path: string, options?: Parameters<ApiClient['request']>[2]) =>
    this.request('GET', path, options);
  post = (path: string, body?: unknown, options?: Parameters<ApiClient['request']>[2]) =>
    this.request('POST', path, { ...options, body });
  delete = (path: string, options?: Parameters<ApiClient['request']>[2]) =>
    this.request('DELETE', path, options);

  private storeCookies(setCookies: readonly string[]): void {
    for (const line of setCookies) {
      const [pair = '', ...attributes] = line.split(';').map((part) => part.trim());
      const separator = pair.indexOf('=');
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      const path = attributes.find((a) => a.toLowerCase().startsWith('path='))?.slice(5) ?? '/';
      const maxAge = attributes.find((a) => a.toLowerCase().startsWith('max-age='));
      if (value === '' || maxAge?.endsWith('=0')) this.jar.delete(name);
      else this.jar.set(name, { value, path });
    }
  }
}

/** Entorno de pruebas del backend: app, contexto, reloj y fábrica de "navegadores". */
export interface TestApi {
  readonly ctx: AppContext;
  readonly clock: FakeClock;
  readonly newClient: (options?: { tenant?: string; userAgent?: string }) => ApiClient;
  /** Último código de verificación enviado a un destino (lee la bandeja simulada). */
  readonly lastCode: (to: string) => string;
  readonly login: (
    client: ApiClient,
    identifier: string,
    password?: string,
  ) => Promise<ApiResponse>;
}

/** Crea una API aislada (sin latencia y con webhooks síncronos) para cada test. */
export async function createTestApi(config: Partial<ServerConfig> = {}): Promise<TestApi> {
  let current = Date.UTC(2026, 9, 9, 12, 0, 0);
  const clock: FakeClock = {
    now: () => current,
    advance: (ms) => {
      current += ms;
    },
  };
  const { app, ctx } = await createApp({
    now: clock.now,
    config: { latencyMs: 0, webhookDelayMs: 0, rateLimitPerMinute: 0, ...config },
  });

  const newClient: TestApi['newClient'] = (options = {}) =>
    new ApiClient(app, {
      tenant: options.tenant ?? 'acme',
      origin: 'http://localhost:5173',
      userAgent: options.userAgent ?? 'vitest',
    });

  return {
    ctx,
    clock,
    newClient,
    lastCode(to) {
      const message = [...ctx.db.outbox].reverse().find((item) => item.to === to);
      const code = /(\d{6})/.exec(message?.body ?? '')?.[1];
      if (!code) throw new Error(`No hay código enviado a ${to}`);
      return code;
    },
    login: (client, identifier, password = DEMO_PASSWORD) =>
      client.post('/api/auth/login', { identifier, password }),
  };
}
