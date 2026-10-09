import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ApiClient, createTestApi, type TestApi } from '../../testing/api-client';

import { signWebhook } from './stripe-sim';

const PK = { Authorization: 'Bearer pk_test_simulado' };
const ITEMS = [{ productId: 'auriculares-inalambricos', quantity: 2 }];

let api: TestApi;
let customer: ApiClient;

beforeEach(async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  api = await createTestApi();
  customer = api.newClient();
  await api.login(customer, 'cliente@acme.test');
});

async function createIntent(client = customer, key = 'clave-idempotente-1', items = ITEMS) {
  return client.post('/api/payments/intents', { items }, { headers: { 'Idempotency-Key': key } });
}

/** Tokeniza una tarjeta contra el "Stripe" simulado, como haría el navegador. */
async function tokenize(number: string, overrides: Record<string, unknown> = {}) {
  const stripe = api.newClient();
  return stripe.post(
    '/api/stripe/v1/payment_methods',
    { card: { number, exp_month: 12, exp_year: 2030, cvc: '123', ...overrides } },
    { headers: PK, csrf: false },
  );
}

async function confirm(intent: Record<string, any>, paymentMethod: string) {
  return api
    .newClient()
    .post(
      `/api/stripe/v1/payment_intents/${intent.paymentIntentId as string}/confirm`,
      { client_secret: intent.clientSecret, payment_method: paymentMethod },
      { csrf: false },
    );
}

describe('creación del pago', () => {
  it('exige sesión, CSRF e Idempotency-Key', async () => {
    expect((await createIntent(api.newClient())).status).toBe(401);
    expect(
      (await customer.post('/api/payments/intents', { items: ITEMS }, { csrf: false })).status,
    ).toBe(403);
    const noKey = await customer.post('/api/payments/intents', { items: ITEMS });
    expect(noKey.status).toBe(400);
  });

  it('calcula el importe en el servidor con la lista de precios del tenant', async () => {
    const { body } = await createIntent();
    expect(body.amountInCents).toBe(12999 * 2);

    const globex = api.newClient({ tenant: 'globex' });
    await api.login(globex, 'admin@globex.test');
    const other = await createIntent(globex, 'clave-globex-0001');
    expect(other.body.amountInCents).toBe(11699 * 2);
  });

  it('ignora precios enviados por el cliente', async () => {
    const response = await customer.post(
      '/api/payments/intents',
      { items: [{ productId: 'auriculares-inalambricos', quantity: 1, priceInCents: 1 }] },
      { headers: { 'Idempotency-Key': 'clave-manipulada-1' } },
    );
    expect(response.body.amountInCents).toBe(12999);
  });

  it('rechaza cantidades sin stock y productos inexistentes', async () => {
    const noStock = await createIntent(customer, 'clave-sin-stock-1', [
      { productId: 'auriculares-deportivos', quantity: 1 },
    ]);
    expect(noStock.status).toBe(409);
    expect(noStock.body.error).toMatchObject({ code: 'insufficient_stock' });

    const unknown = await createIntent(customer, 'clave-desconocido-1', [
      { productId: 'no-existe', quantity: 1 },
    ]);
    expect(unknown.status).toBe(404);

    const invalid = await createIntent(customer, 'clave-invalida-001', [
      { productId: 'altavoz-bluetooth', quantity: 0 },
    ]);
    expect(invalid.status).toBe(400);
  });

  it('es idempotente: repetir la clave no duplica el pedido', async () => {
    const first = await createIntent();
    const second = await createIntent();

    expect(second.body).toEqual(first.body);
    expect(api.ctx.db.orders.size).toBe(1);
  });
});

describe('flujo de pago con Stripe simulado', () => {
  it('cobra con la tarjeta de pruebas, recibe el webhook y marca el pedido como pagado', async () => {
    const { body: intent } = await createIntent();
    const method = await tokenize('4242 4242 4242 4242');
    expect(method.body.card).toEqual({ brand: 'visa', last4: '4242' });

    const confirmed = await confirm(intent, method.body.id as string);
    expect(confirmed.body.status).toBe('succeeded');

    const order = await customer.get(`/api/orders/${intent.orderId as string}`);
    expect(order.body.status).toBe('paid');
    expect(api.ctx.db.stock.get('auriculares-inalambricos')).toBe(14 - 2);
  });

  it('nunca guarda el número de tarjeta', async () => {
    await tokenize('4242424242424242');
    expect(JSON.stringify([...api.ctx.db.paymentMethods.values()])).not.toContain(
      '4242424242424242',
    );
  });

  it('valida la tarjeta: Luhn, caducidad y CVC', async () => {
    expect((await tokenize('4242424242424241')).body.error).toMatchObject({
      code: 'incorrect_number',
    });
    expect((await tokenize('4242424242424242', { exp_year: 2020 })).body.error).toMatchObject({
      code: 'invalid_expiry',
    });
    expect((await tokenize('4242424242424242', { cvc: '1' })).body.error).toMatchObject({
      code: 'invalid_cvc',
    });
  });

  it('exige la clave publicable para tokenizar', async () => {
    const response = await api
      .newClient()
      .post(
        '/api/stripe/v1/payment_methods',
        { card: { number: '4242424242424242', exp_month: 12, exp_year: 2030, cvc: '123' } },
        { csrf: false },
      );
    expect(response.status).toBe(401);
  });

  it.each([
    ['4000000000000002', 'card_declined', 'generic_decline'],
    ['4000000000009995', 'card_declined', 'insufficient_funds'],
    ['4000000000000069', 'expired_card', undefined],
  ])('rechaza la tarjeta de prueba %s', async (number, code, declineCode) => {
    const { body: intent } = await createIntent();
    const method = await tokenize(number);

    const result = await confirm(intent, method.body.id as string);

    expect(result.status).toBe(402);
    expect(result.body.error).toMatchObject({
      code,
      ...(declineCode ? { decline_code: declineCode } : {}),
    });
    const order = await customer.get(`/api/orders/${intent.orderId as string}`);
    expect(order.body.status).toBe('pending_payment');
    expect(api.ctx.db.stock.get('auriculares-inalambricos')).toBe(14);
  });

  it('soporta 3D Secure: requiere autenticación y solo cobra si se completa', async () => {
    const { body: intent } = await createIntent();
    const method = await tokenize('4000002500003155');

    const confirmed = await confirm(intent, method.body.id as string);
    expect(confirmed.body).toMatchObject({ status: 'requires_action' });

    const stripe = api.newClient();
    const path = `/api/stripe/v1/payment_intents/${intent.paymentIntentId as string}/authenticate`;
    const failed = await stripe.post(
      path,
      { client_secret: intent.clientSecret, result: 'failure' },
      { csrf: false },
    );
    expect(failed.status).toBe(402);
    expect((await customer.get(`/api/orders/${intent.orderId as string}`)).body.status).toBe(
      'pending_payment',
    );

    await confirm(intent, method.body.id as string);
    const ok = await stripe.post(
      path,
      { client_secret: intent.clientSecret, result: 'success' },
      { csrf: false },
    );
    expect(ok.body.status).toBe('succeeded');
    expect((await customer.get(`/api/orders/${intent.orderId as string}`)).body.status).toBe(
      'paid',
    );
  });

  it('no deja confirmar con un client_secret incorrecto', async () => {
    const { body: intent } = await createIntent();
    const method = await tokenize('4242424242424242');
    const result = await confirm(
      { ...intent, clientSecret: 'pi_falso_secret_x' },
      method.body.id as string,
    );
    expect(result.status).toBe(404);
  });
});

describe('webhook', () => {
  const event = (id: string, intentId: string) =>
    JSON.stringify({
      id,
      type: 'payment_intent.succeeded',
      data: { object: { id: intentId } },
    });

  it('rechaza firmas inválidas, ausentes o antiguas (anti-replay)', async () => {
    const { body: intent } = await createIntent();
    const body = event('evt_1', intent.paymentIntentId as string);
    const client = api.newClient();
    const secret = api.ctx.config.stripeWebhookSecret;
    const now = Math.floor(api.clock.now() / 1000);

    const post = (signature?: string) =>
      client.request('POST', '/api/webhooks/stripe', {
        raw: body,
        csrf: false,
        ...(signature ? { headers: { 'Stripe-Signature': signature } } : {}),
      });

    expect((await post()).status).toBe(400);
    expect((await post(signWebhook('otro-secreto', body, now))).status).toBe(400);
    expect((await post(signWebhook(secret, body, now - 3600))).status).toBe(400);
    expect((await post(signWebhook(secret, body, now))).status).toBe(200);
  });

  it('es idempotente: un evento repetido no descuenta stock dos veces', async () => {
    const { body: intent } = await createIntent();
    const body = event('evt_dup', intent.paymentIntentId as string);
    const signature = signWebhook(
      api.ctx.config.stripeWebhookSecret,
      body,
      Math.floor(api.clock.now() / 1000),
    );
    const client = api.newClient();

    for (let delivery = 0; delivery < 2; delivery += 1) {
      await client.request('POST', '/api/webhooks/stripe', {
        raw: body,
        csrf: false,
        headers: { 'Stripe-Signature': signature },
      });
    }

    expect(api.ctx.db.stock.get('auriculares-inalambricos')).toBe(12);
  });
});

describe('pedidos', () => {
  it('un usuario no puede ver pedidos de otro ni de otro tenant (anti-IDOR)', async () => {
    const { body: intent } = await createIntent();
    const orderPath = `/api/orders/${intent.orderId as string}`;

    const otherCustomer = api.newClient();
    await api.login(otherCustomer, 'admin@acme.test');
    expect((await otherCustomer.get(orderPath)).status).toBe(404);

    const otherTenant = api.newClient({ tenant: 'globex' });
    await api.login(otherTenant, 'admin@globex.test');
    expect((await otherTenant.get(orderPath)).status).toBe(404);
    expect((await otherTenant.get('/api/admin/orders')).body.data).toEqual([]);
  });

  it('el administrador ve los pedidos de su tenant con el nombre del cliente', async () => {
    await createIntent();
    const admin = api.newClient();
    await api.login(admin, 'admin@acme.test');

    const { body } = await admin.get('/api/admin/orders');
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      customerName: 'Carlos Cliente',
      status: 'pending_payment',
    });
  });
});
