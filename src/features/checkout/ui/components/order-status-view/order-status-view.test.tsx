import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';

import { OrderStatusView } from './order-status-view';

const order = (status: 'pending_payment' | 'paid') => ({
  id: 'ord_1',
  status,
  amountInCents: 7000,
  items: [{ productId: 'lamp', name: 'Lámpara', unitPriceInCents: 3500, quantity: 2 }],
  createdAt: '2026-10-09T12:00:00.000Z',
  paidAt: status === 'paid' ? '2026-10-09T12:00:01.000Z' : null,
});

describe('OrderStatusView', () => {
  it('sigue consultando hasta que el webhook confirma el cobro y entonces avisa una vez', async () => {
    let requests = 0;
    server.use(
      http.get('/api/orders/ord_1', () => {
        requests += 1;
        return HttpResponse.json(order(requests >= 2 ? 'paid' : 'pending_payment'));
      }),
    );
    const onPaid = vi.fn();

    renderWithProviders(<OrderStatusView orderId="ord_1" onPaid={onPaid} />);

    expect(await screen.findByText('Esperando la confirmación del banco…')).toBeInTheDocument();
    expect(
      await screen.findByText(/Pago confirmado/, undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('2 × Lámpara')).toBeInTheDocument();
    expect(onPaid).toHaveBeenCalledTimes(1);

    // Ya pagado: deja de consultar.
    const settled = requests;
    await new Promise((resolve) => setTimeout(resolve, 1300));
    expect(requests).toBe(settled);
  });

  it('muestra un error si el pedido no existe o no es del usuario', async () => {
    server.use(
      http.get('/api/orders/ord_x', () =>
        HttpResponse.json(
          { error: { code: 'not_found', message: 'Recurso no encontrado.' } },
          { status: 404 },
        ),
      ),
    );

    renderWithProviders(<OrderStatusView orderId="ord_x" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró el pedido');
  });
});
