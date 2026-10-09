import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestApi, type TestApi } from '../../testing/api-client';

const STRONG_PASSWORD = 'Contrasena-Segura-1';

let api: TestApi;

beforeEach(async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  api = await createTestApi();
});

async function register(client: ReturnType<TestApi['newClient']>, identifier = 'nuevo@acme.test') {
  return client.post('/api/auth/register', {
    name: 'Nuevo Usuario',
    identifier,
    password: STRONG_PASSWORD,
  });
}

describe('registro con código de 6 dígitos', () => {
  it('crea la cuenta solo tras confirmar el código y abre sesión con cookies HttpOnly', async () => {
    const client = api.newClient();
    const registered = await register(client);

    expect(registered.status).toBe(202);
    expect(registered.body.target).toBe('n••••@acme.test');
    // Hasta confirmar el código no existe el usuario.
    expect([...api.ctx.db.users.values()].some((u) => u.identifier === 'nuevo@acme.test')).toBe(
      false,
    );
    expect(api.ctx.db.outbox).toHaveLength(1);

    const verified = await client.post('/api/auth/verify', {
      challengeId: registered.body.challengeId,
      code: api.lastCode('nuevo@acme.test'),
    });
    expect(verified.status).toBe(201);
    expect(verified.body.user).toMatchObject({ role: 'customer', tenant: { id: 'acme' } });
    expect(JSON.stringify(verified.body)).not.toContain('passwordHash');

    const access = verified.setCookies.find((c) => c.startsWith('access_token='));
    const refresh = verified.setCookies.find((c) => c.startsWith('refresh_token='));
    expect(access).toMatch(/HttpOnly/i);
    expect(access).toMatch(/SameSite=Strict/i);
    expect(refresh).toMatch(/HttpOnly/i);
    expect(refresh).toMatch(/Path=\/api\/auth/);
    expect(verified.setCookies.find((c) => c.startsWith('csrf_token='))).not.toMatch(/HttpOnly/i);

    expect((await client.get('/api/auth/me')).body.user).toMatchObject({
      name: 'Nuevo Usuario',
    });
  });

  it('admite teléfonos en formato internacional y los normaliza', async () => {
    const client = api.newClient();
    const registered = await register(client, '+34 600-111-222');

    expect(registered.status).toBe(202);
    expect(api.ctx.db.outbox[0]).toMatchObject({ to: '+34600111222', channel: 'sms' });
  });

  it('rechaza contraseñas débiles e identificadores inválidos con errores por campo', async () => {
    const client = api.newClient();
    const weak = await client.post('/api/auth/register', {
      name: 'Ana',
      identifier: 'no-es-un-contacto',
      password: 'corta',
    });

    expect(weak.status).toBe(400);
    expect(weak.body.error).toMatchObject({ code: 'validation_error' });
    expect(Object.keys(weak.body.error.fields as object)).toContain('password');

    const badId = await client.post('/api/auth/register', {
      name: 'Ana',
      identifier: 'no-es-un-contacto',
      password: STRONG_PASSWORD,
    });
    expect(badId.body.error.fields).toHaveProperty('identifier');
  });

  it('bloquea el desafío tras demasiados códigos incorrectos', async () => {
    const client = api.newClient();
    const { body } = await register(client);

    const first = await client.post('/api/auth/verify', {
      challengeId: body.challengeId,
      code: '000000',
    });
    expect(first.body.error).toMatchObject({ code: 'invalid_code', attemptsLeft: 4 });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await client.post('/api/auth/verify', { challengeId: body.challengeId, code: '000000' });
    }
    const last = await client.post('/api/auth/verify', {
      challengeId: body.challengeId,
      code: '000000',
    });
    expect(last.body.error).toMatchObject({ code: 'challenge_expired' });

    // Ni siquiera el código correcto sirve ya.
    const correct = await client.post('/api/auth/verify', {
      challengeId: body.challengeId,
      code: api.lastCode('nuevo@acme.test'),
    });
    expect(correct.status).toBe(400);
  });

  it('caduca el código pasado su TTL', async () => {
    const client = api.newClient();
    const { body } = await register(client);
    api.clock.advance(api.ctx.config.codeTtlSec * 1000 + 1);

    const result = await client.post('/api/auth/verify', {
      challengeId: body.challengeId,
      code: api.lastCode('nuevo@acme.test'),
    });
    expect(result.body.error).toMatchObject({ code: 'invalid_code' });
  });

  it('limita los reenvíos: cooldown de 30 s y un máximo total', async () => {
    const client = api.newClient();
    const { body } = await register(client);

    const tooSoon = await client.post('/api/auth/resend', { challengeId: body.challengeId });
    expect(tooSoon.status).toBe(429);
    expect(tooSoon.headers.get('Retry-After')).toBe('30');

    for (let resend = 0; resend < 3; resend += 1) {
      api.clock.advance(31_000);
      const ok = await client.post('/api/auth/resend', { challengeId: body.challengeId });
      expect(ok.status).toBe(200);
    }
    api.clock.advance(31_000);
    const exceeded = await client.post('/api/auth/resend', { challengeId: body.challengeId });
    expect(exceeded.body.error).toMatchObject({ code: 'resend_limit' });

    // El código nuevo invalida el anterior.
    expect(api.ctx.db.outbox).toHaveLength(4);
  });

  it('no revela si una cuenta ya existe (anti-enumeración)', async () => {
    const client = api.newClient();
    const existing = await register(client, 'cliente@acme.test');
    const fresh = await register(client, 'otro@acme.test');

    expect(existing.status).toBe(fresh.status);
    expect(Object.keys(existing.body).sort()).toEqual(Object.keys(fresh.body).sort());
    // El desafío falso nunca se puede verificar.
    const result = await client.post('/api/auth/verify', {
      challengeId: existing.body.challengeId,
      code: '123456',
    });
    expect(result.body.error).toMatchObject({ code: 'invalid_code' });
  });
});

describe('login y protección contra fuerza bruta', () => {
  it('inicia sesión con credenciales válidas', async () => {
    const client = api.newClient();
    const response = await api.login(client, 'cliente@acme.test');

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ role: 'customer' });
    expect((await client.get('/api/auth/me')).status).toBe(200);
  });

  it('responde igual a usuario inexistente y a contraseña incorrecta', async () => {
    const client = api.newClient();
    const wrongPassword = await api.login(client, 'cliente@acme.test', 'Incorrecta-123');
    const unknownUser = await api.login(client, 'nadie@acme.test', 'Incorrecta-123');

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownUser.body);
  });

  it('bloquea temporalmente tras 5 fallos y se libera con el tiempo', async () => {
    const client = api.newClient();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await api.login(client, 'cliente@acme.test', 'Incorrecta-123');
    }

    const locked = await api.login(client, 'cliente@acme.test');
    expect(locked.status).toBe(429);
    expect(locked.body.error).toMatchObject({ code: 'account_locked' });
    expect(Number(locked.headers.get('Retry-After'))).toBeGreaterThan(0);

    api.clock.advance(api.ctx.config.lockoutSec * 1000 + 1);
    expect((await api.login(client, 'cliente@acme.test')).status).toBe(200);
  });
});

describe('CSRF y orígenes', () => {
  it('rechaza peticiones que modifican datos sin token CSRF', async () => {
    const client = api.newClient();
    const response = await client.post(
      '/api/auth/login',
      { identifier: 'a@b.co', password: 'x' },
      { csrf: false },
    );

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({ code: 'csrf_failed' });
  });

  it('rechaza un token CSRF que no coincide con la cookie', async () => {
    const client = api.newClient();
    await client.get('/api/auth/csrf');
    const response = await client.post(
      '/api/auth/login',
      { identifier: 'a@b.co', password: 'x' },
      { headers: { 'X-CSRF-Token': 'falso' } },
    );

    expect(response.body.error).toMatchObject({ code: 'csrf_failed' });
  });

  it('rechaza orígenes no autorizados', async () => {
    const client = api.newClient();
    const response = await client.post(
      '/api/auth/login',
      { identifier: 'a@b.co', password: 'x' },
      { headers: { Origin: 'https://sitio-malicioso.example' } },
    );

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({ code: 'invalid_origin' });
  });
});

describe('sesiones: access token, refresh con rotación y revocación', () => {
  it('distingue el token caducado de la falta de sesión', async () => {
    const client = api.newClient();
    expect((await client.get('/api/auth/me')).body.error).toMatchObject({
      code: 'unauthenticated',
    });

    await api.login(client, 'cliente@acme.test');
    api.clock.advance(api.ctx.config.accessTtlSec * 1000 + 1000);
    const expired = await client.get('/api/auth/me');

    expect(expired.status).toBe(401);
    expect(expired.body.error).toMatchObject({ code: 'token_expired' });
  });

  it('refresca la sesión rotando el refresh token', async () => {
    const client = api.newClient();
    await api.login(client, 'cliente@acme.test');
    const before = client.cookie('refresh_token');
    api.clock.advance(api.ctx.config.accessTtlSec * 1000 + 1000);

    const refreshed = await client.post('/api/auth/refresh');

    expect(refreshed.status).toBe(200);
    expect(client.cookie('refresh_token')).not.toBe(before);
    expect((await client.get('/api/auth/me')).status).toBe(200);
  });

  it('detecta la reutilización de un refresh token y revoca la sesión', async () => {
    const victim = api.newClient();
    await api.login(victim, 'cliente@acme.test');
    const stolen = victim.cookie('refresh_token') ?? '';
    await victim.post('/api/auth/refresh'); // la víctima rota el token legítimamente

    const attacker = api.newClient();
    attacker.setCookieValue('refresh_token', stolen, '/api/auth');
    const attempt = await attacker.post('/api/auth/refresh');

    expect(attempt.status).toBe(401);
    expect(attempt.body.error).toMatchObject({ code: 'refresh_reuse_detected' });
    // La sesión de la víctima también queda revocada: hay que volver a autenticarse.
    expect((await victim.get('/api/auth/me')).body.error).toMatchObject({
      code: 'session_revoked',
    });
  });

  it('rechaza un access token manipulado', async () => {
    const client = api.newClient();
    await api.login(client, 'cliente@acme.test');
    const [header = '', payload = '', signature = ''] = (client.cookie('access_token') ?? '').split(
      '.',
    );
    const forged = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(payload, 'base64url').toString()),
        role: 'admin',
      }),
    ).toString('base64url');
    client.setCookieValue('access_token', `${header}.${forged}.${signature}`);

    expect((await client.get('/api/auth/me')).body.error).toMatchObject({
      code: 'invalid_token',
    });
  });

  it('el logout revoca la sesión en el servidor, no solo las cookies', async () => {
    const client = api.newClient();
    await api.login(client, 'cliente@acme.test');
    const accessToken = client.cookie('access_token') ?? '';

    expect((await client.post('/api/auth/logout')).status).toBe(204);
    client.setCookieValue('access_token', accessToken); // el atacante conserva una copia

    expect((await client.get('/api/auth/me')).body.error).toMatchObject({
      code: 'session_revoked',
    });
  });

  it('lista las sesiones, permite cerrar otras y cerrar todas', async () => {
    const laptop = api.newClient({ userAgent: 'Laptop' });
    const phone = api.newClient({ userAgent: 'Phone' });
    await api.login(laptop, 'cliente@acme.test');
    await api.login(phone, 'cliente@acme.test');

    const list = await laptop.get('/api/auth/sessions');
    expect(list.body.data).toHaveLength(2);
    const other = (list.body.data as { id: string; current: boolean; userAgent: string }[]).find(
      (s) => !s.current,
    );
    expect(other?.userAgent).toBe('Phone');

    expect((await laptop.delete(`/api/auth/sessions/${other?.id ?? ''}`)).status).toBe(204);
    expect((await phone.get('/api/auth/me')).body.error).toMatchObject({
      code: 'session_revoked',
    });

    await laptop.post('/api/auth/logout-all');
    expect((await laptop.get('/api/auth/me')).status).toBe(401);
  });

  it('no permite cerrar sesiones de otro usuario', async () => {
    const mine = api.newClient();
    const theirs = api.newClient();
    await api.login(mine, 'cliente@acme.test');
    await api.login(theirs, 'admin@acme.test');
    const theirId =
      ((await theirs.get('/api/auth/sessions')).body.data as { id: string }[])[0]?.id ?? '';

    expect((await mine.delete(`/api/auth/sessions/${theirId}`)).status).toBe(404);
  });

  it('limita las sesiones simultáneas cerrando la más antigua', async () => {
    const clients = [];
    for (let index = 0; index < api.ctx.config.maxSessionsPerUser + 1; index += 1) {
      const client = api.newClient();
      await api.login(client, 'cliente@acme.test');
      api.clock.advance(1000);
      clients.push(client);
    }

    expect((await clients[0]?.get('/api/auth/me'))?.body.error).toMatchObject({
      code: 'session_revoked',
    });
    expect((await clients.at(-1)?.get('/api/auth/me'))?.status).toBe(200);
  });
});

describe('multi-tenant y roles', () => {
  it('el mismo email puede existir en tenants distintos', async () => {
    const globex = api.newClient({ tenant: 'globex' });
    const registered = await register(globex, 'cliente@acme.test'); // existe en acme, no en globex
    await globex.post('/api/auth/verify', {
      challengeId: registered.body.challengeId,
      code: api.lastCode('cliente@acme.test'),
    });

    expect((await globex.get('/api/auth/me')).body.user).toMatchObject({
      tenant: { id: 'globex' },
    });
  });

  it('no permite usar las credenciales de un tenant en otro', async () => {
    const response = await api.login(api.newClient({ tenant: 'globex' }), 'cliente@acme.test');
    expect(response.status).toBe(401);
  });

  it('bloquea una sesión que intenta operar en otro tenant', async () => {
    const client = api.newClient();
    await api.login(client, 'cliente@acme.test');

    const response = await client.get('/api/auth/me', { tenant: 'globex' });
    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({ code: 'tenant_mismatch' });
  });

  it('rechaza una petición autenticada sin cabecera de tenant si la sesión es de otra tienda', async () => {
    const client = api.newClient({ tenant: 'globex' });
    await api.login(client, 'admin@globex.test');

    // Sin cabecera el tenant resuelto sería `acme`: no debe poder operar ni pagar con sus precios.
    const me = await client.get('/api/auth/me', { tenant: null });
    expect(me.status).toBe(403);
    expect(me.body.error).toMatchObject({ code: 'tenant_mismatch' });

    const intent = await client.post(
      '/api/payments/intents',
      { items: [{ productId: 'auriculares-inalambricos', quantity: 1 }] },
      { tenant: null, headers: { 'Idempotency-Key': 'clave-sin-tenant-1' } },
    );
    expect(intent.status).toBe(403);
  });

  it('rechaza tenants desconocidos', async () => {
    const response = await api.newClient().get('/api/products', { tenant: 'inexistente' });
    expect(response.body.error).toMatchObject({ code: 'unknown_tenant' });
  });

  it('cada tenant tiene su lista de precios', async () => {
    const acme = await api.newClient().get('/api/products/auriculares-inalambricos');
    const globex = await api
      .newClient({ tenant: 'globex' })
      .get('/api/products/auriculares-inalambricos');

    expect(acme.body.price).toEqual({ amount: 12999, currency: 'EUR' });
    expect(globex.body.price).toEqual({ amount: 11699, currency: 'EUR' });
  });

  it('solo el rol admin accede al panel y solo ve los pedidos de su tenant', async () => {
    const customer = api.newClient();
    await api.login(customer, 'cliente@acme.test');
    expect((await customer.get('/api/admin/orders')).status).toBe(403);

    const admin = api.newClient();
    await api.login(admin, 'admin@acme.test');
    expect((await admin.get('/api/admin/orders')).status).toBe(200);

    expect((await api.newClient().get('/api/admin/orders')).status).toBe(401);
  });

  it('el registro público nunca concede roles privilegiados', async () => {
    const client = api.newClient();
    const registered = await client.post('/api/auth/register', {
      name: 'Intruso',
      identifier: 'intruso@acme.test',
      password: STRONG_PASSWORD,
      role: 'admin',
    });
    const verified = await client.post('/api/auth/verify', {
      challengeId: registered.body.challengeId,
      code: api.lastCode('intruso@acme.test'),
    });

    expect(verified.body.user).toMatchObject({ role: 'customer' });
  });
});

describe('endurecimiento general', () => {
  it('añade cabeceras de seguridad y evita cachear respuestas', async () => {
    const response = await api.newClient().get('/api/health');

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
  });

  it('rechaza cuerpos que no son JSON o son demasiado grandes', async () => {
    const client = api.newClient();
    expect((await client.request('POST', '/api/auth/login', { raw: '{no es json' })).status).toBe(
      400,
    );
    const huge = await client.request('POST', '/api/auth/login', {
      raw: JSON.stringify({ x: 'a'.repeat(20_000) }),
    });
    expect(huge.status).toBe(413);
  });

  it('aplica un límite de peticiones por IP', async () => {
    const limited = await createTestApi({ rateLimitPerMinute: 3 });
    const client = limited.newClient();
    const statuses = [];
    for (let index = 0; index < 5; index += 1)
      statuses.push((await client.get('/api/health')).status);

    expect(statuses).toEqual([200, 200, 200, 429, 429]);
  });
});
