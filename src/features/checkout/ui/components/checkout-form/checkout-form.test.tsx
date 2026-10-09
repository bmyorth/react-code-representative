import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';

import { CheckoutForm } from './checkout-form';

const lines = [{ productId: 'lamp', name: 'Lámpara', quantity: 2, unitPriceInCents: 3500 }];

const session = {
  orderId: 'ord_1',
  paymentIntentId: 'pi_1',
  clientSecret: 'pi_1_secret',
  amountInCents: 7000,
  publishableKey: 'pk_test',
};

beforeEach(() => {
  document.cookie = 'csrf_token=token; path=/';
});

/** Handlers de nuestro backend y de la pasarela simulada. */
function stubPayment(confirm: () => Response) {
  const calls: string[] = [];
  server.use(
    http.post('/api/payments/intents', ({ request }) => {
      calls.push(`intent:${request.headers.get('Idempotency-Key') ?? ''}`);
      return HttpResponse.json(session, { status: 201 });
    }),
    http.post('/api/stripe/v1/payment_methods', ({ request }) => {
      // La tarjeta va a la pasarela, nunca a nuestro backend, y sin cookies ni CSRF.
      calls.push(
        `tokenize:${request.headers.get('Authorization') ?? ''}:${String(request.headers.has('X-CSRF-Token'))}`,
      );
      return HttpResponse.json({ id: 'pm_1' });
    }),
    http.post('/api/stripe/v1/payment_intents/pi_1/confirm', () => {
      calls.push('confirm');
      return confirm();
    }),
  );
  return calls;
}

async function fillCard(
  events: ReturnType<typeof renderWithProviders>['user'],
  number = '4242424242424242',
) {
  await events.type(screen.getByLabelText(/Número de tarjeta/), number);
  await events.type(screen.getByLabelText('Caducidad'), '1230');
  await events.type(screen.getByLabelText('CVC'), '123');
}

describe('CheckoutForm', () => {
  it('muestra el total y formatea el número y la caducidad mientras se escribe', async () => {
    const { user: events } = renderWithProviders(<CheckoutForm lines={lines} onPaid={vi.fn()} />);

    await fillCard(events);

    expect(screen.getByRole('button', { name: /Pagar 70,00/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Número de tarjeta (Visa)')).toHaveValue('4242 4242 4242 4242');
    expect(screen.getByLabelText('Caducidad')).toHaveValue('12/30');
  });

  it('valida la tarjeta antes de enviar nada al servidor', async () => {
    const calls = stubPayment(() => HttpResponse.json({ id: 'pi_1', status: 'succeeded' }));
    const { user: events } = renderWithProviders(<CheckoutForm lines={lines} onPaid={vi.fn()} />);

    await events.type(screen.getByLabelText(/Número de tarjeta/), '4242424242424241');
    await events.click(screen.getByRole('button', { name: /Pagar/ }));

    expect(screen.getByLabelText(/Número de tarjeta/)).toHaveAccessibleDescription(
      'El número de tarjeta no es válido.',
    );
    expect(screen.getByLabelText('Caducidad')).toBeInvalid();
    expect(screen.getByLabelText('CVC')).toBeInvalid();
    expect(calls).toEqual([]);
  });

  it('paga: crea el pedido, tokeniza contra la pasarela y confirma', async () => {
    const calls = stubPayment(() => HttpResponse.json({ id: 'pi_1', status: 'succeeded' }));
    const onPaid = vi.fn();
    const { user: events } = renderWithProviders(<CheckoutForm lines={lines} onPaid={onPaid} />);

    await fillCard(events);
    await events.click(screen.getByRole('button', { name: /Pagar/ }));

    await vi.waitFor(() => {
      expect(onPaid).toHaveBeenCalledWith('ord_1');
    });
    expect(calls).toEqual([
      expect.stringMatching(/^intent:.{8,}/),
      'tokenize:Bearer pk_test:false',
      'confirm',
    ]);
  });

  it('muestra el motivo cuando la tarjeta es rechazada y no da el pago por hecho', async () => {
    stubPayment(() =>
      HttpResponse.json(
        {
          error: {
            type: 'card_error',
            code: 'card_declined',
            message: 'Tu tarjeta ha sido rechazada.',
          },
        },
        { status: 402 },
      ),
    );
    const onPaid = vi.fn();
    const { user: events } = renderWithProviders(<CheckoutForm lines={lines} onPaid={onPaid} />);

    await fillCard(events, '4000000000000002');
    await events.click(screen.getByRole('button', { name: /Pagar/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Tu tarjeta ha sido rechazada.');
    expect(onPaid).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Pagar/ })).toBeEnabled();
  });

  it('reutiliza la misma Idempotency-Key al reintentar el mismo carrito', async () => {
    const calls = stubPayment(() =>
      HttpResponse.json(
        { error: { code: 'card_declined', message: 'Rechazada' } },
        { status: 402 },
      ),
    );
    const { user: events } = renderWithProviders(<CheckoutForm lines={lines} onPaid={vi.fn()} />);

    await fillCard(events);
    await events.click(screen.getByRole('button', { name: /Pagar/ }));
    await screen.findByRole('alert');
    await events.click(screen.getByRole('button', { name: /Pagar/ }));
    await vi.waitFor(() => {
      expect(calls.filter((call) => call.startsWith('intent:'))).toHaveLength(2);
    });

    const keys = calls.filter((call) => call.startsWith('intent:'));
    expect(new Set(keys).size).toBe(1);
  });

  it('rellena una tarjeta de prueba al elegirla', async () => {
    const { user: events } = renderWithProviders(<CheckoutForm lines={lines} onPaid={vi.fn()} />);

    await events.click(screen.getByText('Tarjetas de prueba'));
    await events.click(screen.getByRole('button', { name: /Rechazada/ }));

    expect(screen.getByLabelText(/Número de tarjeta/)).toHaveValue('4000 0000 0000 0002');
    expect(screen.getByLabelText('CVC')).toHaveValue('123');
  });

  it('pide el 3D Secure en un diálogo y solo cobra si el usuario lo autoriza', async () => {
    const authenticate = vi.fn();
    stubPayment(() => HttpResponse.json({ id: 'pi_1', status: 'requires_action' }));
    server.use(
      http.post('/api/stripe/v1/payment_intents/pi_1/authenticate', async ({ request }) => {
        authenticate(await request.json());
        return HttpResponse.json({ id: 'pi_1', status: 'succeeded' });
      }),
    );
    const onPaid = vi.fn();
    const { user: events } = renderWithProviders(<CheckoutForm lines={lines} onPaid={onPaid} />);

    await fillCard(events, '4000002500003155');
    await events.click(screen.getByRole('button', { name: /Pagar/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Autenticación 3D Secure' });
    expect(dialog).toBeInTheDocument();
    expect(onPaid).not.toHaveBeenCalled();

    await events.click(screen.getByRole('button', { name: 'Autorizar pago' }));

    await vi.waitFor(() => {
      expect(onPaid).toHaveBeenCalledWith('ord_1');
    });
    expect(authenticate).toHaveBeenCalledWith({ client_secret: 'pi_1_secret', result: 'success' });
  });

  it('si el usuario rechaza el 3D Secure el pago falla', async () => {
    stubPayment(() => HttpResponse.json({ id: 'pi_1', status: 'requires_action' }));
    server.use(
      http.post('/api/stripe/v1/payment_intents/pi_1/authenticate', () =>
        HttpResponse.json(
          {
            error: {
              code: 'payment_intent_authentication_failure',
              message: 'La autenticación 3D Secure ha fallado.',
            },
          },
          { status: 402 },
        ),
      ),
    );
    const onPaid = vi.fn();
    const { user: events } = renderWithProviders(<CheckoutForm lines={lines} onPaid={onPaid} />);

    await fillCard(events, '4000002500003155');
    await events.click(screen.getByRole('button', { name: /Pagar/ }));
    await events.click(await screen.findByRole('button', { name: 'Rechazar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La autenticación 3D Secure ha fallado.',
    );
    expect(onPaid).not.toHaveBeenCalled();
  });
});
