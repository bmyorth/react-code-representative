import { describe, expect, it, vi } from 'vitest';

import { type CardDetails } from '../domain/card';
import { PaymentError, type PaymentGateway, type PaymentSession } from '../domain/payment-gateway';

import { payWithCard } from './pay-with-card';

const card: CardDetails = { number: '4242424242424242', expMonth: 12, expYear: 2030, cvc: '123' };
const session: PaymentSession = {
  orderId: 'ord_1',
  paymentIntentId: 'pi_1',
  clientSecret: 'secret',
  amountInCents: 5000,
  publishableKey: 'pk_test',
};

/** Pasarela falsa: expone los mocks por separado para poder comprobar las llamadas. */
function setup(overrides: Partial<Record<keyof PaymentGateway, ReturnType<typeof vi.fn>>> = {}) {
  const mocks = {
    createPayment: vi.fn().mockResolvedValue(session),
    tokenizeCard: vi.fn().mockResolvedValue('pm_1'),
    confirmPayment: vi.fn().mockResolvedValue('succeeded'),
    authenticatePayment: vi.fn().mockResolvedValue(undefined),
    getOrder: vi.fn(),
    listOrders: vi.fn(),
    listAllOrders: vi.fn(),
    ...overrides,
  };
  // Los mocks se pasan como funciones sueltas: el caso de uso no depende de `this`.
  const gateway: PaymentGateway = { ...mocks } as unknown as PaymentGateway;
  return { gateway, mocks };
}

const input = {
  lines: [{ productId: 'lamp', quantity: 2 }],
  card,
  idempotencyKey: 'clave-1234',
  requestThreeDSecure: vi.fn().mockResolvedValue(true),
};

describe('payWithCard', () => {
  it('crea el pago, tokeniza la tarjeta con la clave publicable y confirma', async () => {
    const { gateway, mocks } = setup();

    const result = await payWithCard(gateway, input);

    expect(result).toEqual({ orderId: 'ord_1', amountInCents: 5000 });
    expect(mocks.createPayment).toHaveBeenCalledWith(input.lines, 'clave-1234');
    expect(mocks.tokenizeCard).toHaveBeenCalledWith(card, 'pk_test');
    expect(mocks.confirmPayment).toHaveBeenCalledWith(session, 'pm_1');
    expect(mocks.authenticatePayment).not.toHaveBeenCalled();
  });

  it('completa el 3D Secure cuando el banco lo exige', async () => {
    const { gateway, mocks } = setup({
      confirmPayment: vi.fn().mockResolvedValue('requires_action'),
    });
    const requestThreeDSecure = vi.fn().mockResolvedValue(true);

    await payWithCard(gateway, { ...input, requestThreeDSecure });

    expect(requestThreeDSecure).toHaveBeenCalledOnce();
    expect(mocks.authenticatePayment).toHaveBeenCalledWith(session, true);
  });

  it('informa a la pasarela si el usuario rechaza el 3D Secure', async () => {
    const { gateway, mocks } = setup({
      confirmPayment: vi.fn().mockResolvedValue('requires_action'),
      authenticatePayment: vi
        .fn()
        .mockRejectedValue(new PaymentError('Autenticación fallida', 'x')),
    });

    await expect(
      payWithCard(gateway, { ...input, requestThreeDSecure: vi.fn().mockResolvedValue(false) }),
    ).rejects.toBeInstanceOf(PaymentError);
    expect(mocks.authenticatePayment).toHaveBeenCalledWith(session, false);
  });

  it('propaga el rechazo de la tarjeta sin llegar a autenticar', async () => {
    const declined = new PaymentError('Tu tarjeta ha sido rechazada.', 'card_declined');
    const { gateway, mocks } = setup({ confirmPayment: vi.fn().mockRejectedValue(declined) });

    await expect(payWithCard(gateway, input)).rejects.toBe(declined);
    expect(mocks.authenticatePayment).not.toHaveBeenCalled();
  });

  it('no tokeniza ni confirma si el servidor no pudo crear el pago', async () => {
    const { gateway, mocks } = setup({
      createPayment: vi.fn().mockRejectedValue(new Error('sin stock')),
    });

    await expect(payWithCard(gateway, input)).rejects.toThrow('sin stock');
    expect(mocks.tokenizeCard).not.toHaveBeenCalled();
  });

  it('PaymentError conserva el código de la pasarela', () => {
    const error = new PaymentError('Rechazada', 'card_declined');

    expect(error).toMatchObject({
      name: 'PaymentError',
      code: 'card_declined',
      message: 'Rechazada',
    });
  });
});
