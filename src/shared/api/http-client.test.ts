import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { server } from '@/test/msw-server';

import { isApiError } from './api-error';
import { emptyResponseSchema, httpClient } from './http-client';
import { onSessionExpired } from './session-events';
import { setTenantId } from './tenant';

const okSchema = z.object({ ok: z.boolean() });

function setCsrfCookie(value: string | null) {
  document.cookie = `csrf_token=${value ?? ''}; path=/${value === null ? '; max-age=0' : ''}`;
}

beforeEach(() => {
  setCsrfCookie('token-csrf');
});

afterEach(() => {
  setCsrfCookie(null);
  window.localStorage.clear();
});

describe('interceptores de petición', () => {
  it('añade la cabecera del tenant activo a las peticiones a la API', async () => {
    setTenantId('globex');
    let tenant: string | null = null;
    server.use(
      http.get('/api/ping', ({ request }) => {
        tenant = request.headers.get('X-Tenant-Id');
        return HttpResponse.json({ ok: true });
      }),
    );

    await httpClient.get('/ping', { schema: okSchema });

    expect(tenant).toBe('globex');
  });

  it('envía el token CSRF solo en peticiones que modifican datos', async () => {
    const seen: Record<string, string | null> = {};
    server.use(
      http.get('/api/ping', ({ request }) => {
        seen.get = request.headers.get('X-CSRF-Token');
        return HttpResponse.json({ ok: true });
      }),
      http.post('/api/ping', async ({ request }) => {
        seen.post = request.headers.get('X-CSRF-Token');
        seen.body = JSON.stringify(await request.json());
        return HttpResponse.json({ ok: true });
      }),
    );

    await httpClient.get('/ping', { schema: okSchema });
    await httpClient.post('/ping', { schema: okSchema, body: { a: 1 } });

    expect(seen.get).toBeNull();
    expect(seen.post).toBe('token-csrf');
    expect(seen.body).toBe('{"a":1}');
  });

  it('pide la cookie CSRF una sola vez cuando todavía no existe', async () => {
    setCsrfCookie(null);
    const csrfRequests = vi.fn();
    server.use(
      http.get('/api/auth/csrf', () => {
        csrfRequests();
        document.cookie = 'csrf_token=recien-emitido; path=/';
        return HttpResponse.json({ ok: true });
      }),
      http.post('/api/ping', ({ request }) =>
        HttpResponse.json({ ok: request.headers.get('X-CSRF-Token') === 'recien-emitido' }),
      ),
    );

    const results = await Promise.all([
      httpClient.post('/ping', { schema: okSchema }),
      httpClient.post('/ping', { schema: okSchema }),
    ]);

    expect(results).toEqual([{ ok: true }, { ok: true }]);
    expect(csrfRequests).toHaveBeenCalledTimes(1);
  });

  it('las llamadas a terceros no llevan tenant ni CSRF', async () => {
    let headers: Headers | undefined;
    server.use(
      http.post('/api/tercero', ({ request }) => {
        headers = request.headers;
        return HttpResponse.json({ ok: true });
      }),
    );

    await httpClient.post('/tercero', { schema: okSchema, authenticated: false });

    expect(headers?.get('X-Tenant-Id')).toBeNull();
    expect(headers?.get('X-CSRF-Token')).toBeNull();
  });
});

describe('interceptor de respuesta: refresh transparente', () => {
  const expired = () =>
    HttpResponse.json({ error: { code: 'token_expired', message: 'Caducado' } }, { status: 401 });

  it('refresca la sesión y reintenta la petición original una vez', async () => {
    let calls = 0;
    const refresh = vi.fn();
    server.use(
      http.get('/api/privado', () => {
        calls += 1;
        return calls === 1 ? expired() : HttpResponse.json({ ok: true });
      }),
      http.post('/api/auth/refresh', () => {
        refresh();
        return HttpResponse.json({ ok: true });
      }),
    );

    await expect(httpClient.get('/privado', { schema: okSchema })).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('con varias peticiones caducadas a la vez hace un único refresh (single-flight)', async () => {
    const fresh = new Set<string>();
    const refresh = vi.fn();
    server.use(
      http.get('/api/privado/:id', ({ params }) => {
        const id = String(params.id);
        if (fresh.has(id)) return HttpResponse.json({ ok: true });
        fresh.add(id);
        return expired();
      }),
      http.post('/api/auth/refresh', () => {
        refresh();
        return HttpResponse.json({ ok: true });
      }),
    );

    const results = await Promise.all(
      ['a', 'b', 'c'].map((id) => httpClient.get(`/privado/${id}`, { schema: okSchema })),
    );

    expect(results).toHaveLength(3);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('si el refresh es rechazado avisa de que la sesión terminó y propaga el error', async () => {
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);
    server.use(
      http.get('/api/privado', expired),
      http.post('/api/auth/refresh', () =>
        HttpResponse.json({ error: { code: 'invalid_refresh_token' } }, { status: 401 }),
      ),
    );

    const error = await httpClient.get('/privado', { schema: okSchema }).catch((e: unknown) => e);

    expect(isApiError(error) && error.code).toBe('token_expired');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('si no se puede contactar para refrescar no cierra la sesión', async () => {
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);
    server.use(
      http.get('/api/privado', expired),
      http.post('/api/auth/refresh', () => HttpResponse.error()),
    );

    await expect(httpClient.get('/privado', { schema: okSchema })).rejects.toMatchObject({
      code: 'token_expired',
    });
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('no entra en bucle: si tras refrescar vuelve a caducar, devuelve el error', async () => {
    const refresh = vi.fn();
    server.use(
      http.get('/api/privado', expired),
      http.post('/api/auth/refresh', () => {
        refresh();
        return HttpResponse.json({ ok: true });
      }),
    );

    await expect(httpClient.get('/privado', { schema: okSchema })).rejects.toMatchObject({
      status: 401,
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('avisa cuando el servidor revoca la sesión', async () => {
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);
    server.use(
      http.get('/api/privado', () =>
        HttpResponse.json({ error: { code: 'session_revoked' } }, { status: 401 }),
      ),
    );

    await expect(httpClient.get('/privado', { schema: okSchema })).rejects.toMatchObject({
      code: 'session_revoked',
    });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('un 401 sin sesión (unauthenticated) no dispara el aviso de sesión terminada', async () => {
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);
    server.use(
      http.get('/api/privado', () =>
        HttpResponse.json({ error: { code: 'unauthenticated' } }, { status: 401 }),
      ),
    );

    await expect(httpClient.get('/privado', { schema: okSchema })).rejects.toMatchObject({
      status: 401,
    });
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});

describe('normalización de errores y respuestas', () => {
  it('conserva el código, el mensaje y los detalles del error de la API', async () => {
    server.use(
      http.post('/api/login', () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'Datos no válidos',
              fields: { password: 'Muy corta' },
              retryAfterSec: 30,
            },
          },
          { status: 400 },
        ),
      ),
    );

    const error = await httpClient.post('/login', { schema: okSchema }).catch((e: unknown) => e);

    expect(isApiError(error)).toBe(true);
    if (!isApiError(error)) return;
    expect(error).toMatchObject({
      status: 400,
      code: 'validation_error',
      message: 'Datos no válidos',
    });
    expect(error.fieldErrors).toEqual({ password: 'Muy corta' });
    expect(error.retryAfterSec).toBe(30);
  });

  it('usa un mensaje genérico si el error no tiene el formato de la API', async () => {
    server.use(
      http.get('/api/roto', () => new HttpResponse('<html>Bad gateway</html>', { status: 502 })),
    );

    await expect(httpClient.get('/roto', { schema: okSchema })).rejects.toMatchObject({
      status: 502,
      message: 'La petición falló (502).',
    });
  });

  it('convierte los fallos de red en un ApiError con estado 0', async () => {
    server.use(http.get('/api/caido', () => HttpResponse.error()));

    await expect(httpClient.get('/caido', { schema: okSchema })).rejects.toMatchObject({
      status: 0,
    });
  });

  it('rechaza respuestas que no cumplen el esquema', async () => {
    server.use(http.get('/api/mal', () => HttpResponse.json({ ok: 'no es booleano' })));

    await expect(httpClient.get('/mal', { schema: okSchema })).rejects.toMatchObject({
      status: 502,
    });
  });

  it('admite respuestas vacías (204)', async () => {
    server.use(http.post('/api/vacio', () => new HttpResponse(null, { status: 204 })));

    await expect(
      httpClient.post('/vacio', { schema: emptyResponseSchema }),
    ).resolves.toBeUndefined();
  });

  it('propaga la cancelación sin convertirla en error de la API', async () => {
    server.use(http.get('/api/lento', () => HttpResponse.json({ ok: true })));
    const controller = new AbortController();
    controller.abort();

    const error = await httpClient
      .get('/lento', { schema: okSchema, signal: controller.signal })
      .catch((e: unknown) => e);

    expect(isApiError(error)).toBe(false);
  });
});
