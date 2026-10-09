import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryClient as appQueryClient } from '@/shared/lib/query-client';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';

import { RegistrationFlow } from './registration-flow';

const user = {
  id: 'usr_9',
  name: 'Nuevo',
  identifier: 'nuevo@acme.test',
  role: 'customer',
  tenant: { id: 'acme', name: 'Acme Store' },
};

const challenge = () => ({
  challengeId: 'chl_1',
  target: 'n••••@acme.test',
  expiresAt: Date.now() + 600_000,
  resendAvailableAt: Date.now() + 30_000,
});

afterEach(() => {
  appQueryClient.clear();
});

beforeEach(() => {
  document.cookie = 'csrf_token=token; path=/';
  // La bandeja de desarrollo consulta el backend: en estos tests no existe.
  server.use(http.get('/api/dev/outbox', () => HttpResponse.json({ data: [] })));
});

async function fillRegistration(events: ReturnType<typeof renderWithProviders>['user']) {
  await events.type(screen.getByLabelText('Nombre'), 'Nuevo');
  await events.type(screen.getByLabelText('Email o teléfono'), 'nuevo@acme.test');
  await events.type(screen.getByLabelText('Contraseña'), 'Contrasena-Segura-1');
}

describe('RegistrationFlow', () => {
  it('no deja continuar hasta que la contraseña cumple los requisitos', async () => {
    const { user: events } = renderWithProviders(<RegistrationFlow onRegistered={vi.fn()} />);
    const submit = screen.getByRole('button', { name: 'Continuar' });

    expect(submit).toBeDisabled();
    await events.type(screen.getByLabelText('Contraseña'), 'abc');
    expect(submit).toBeDisabled();
    expect(screen.getByText('Una mayúscula').closest('li')).toHaveAttribute('data-met', 'false');

    await events.clear(screen.getByLabelText('Contraseña'));
    await events.type(screen.getByLabelText('Contraseña'), 'Contrasena-Segura-1');
    expect(submit).toBeEnabled();
    expect(screen.getByText('Una mayúscula').closest('li')).toHaveAttribute('data-met', 'true');
  });

  it('completa el registro: datos, código de 6 dígitos y sesión iniciada', async () => {
    let verifyBody: unknown;
    server.use(
      http.post('/api/auth/register', () => HttpResponse.json(challenge(), { status: 202 })),
      http.post('/api/auth/verify', async ({ request }) => {
        verifyBody = await request.json();
        return HttpResponse.json({ user }, { status: 201 });
      }),
    );
    const onRegistered = vi.fn();
    const { user: events } = renderWithProviders(<RegistrationFlow onRegistered={onRegistered} />);

    await fillRegistration(events);
    await events.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('n••••@acme.test')).toBeInTheDocument();
    // Pegar el código con espacios también funciona.
    await events.type(screen.getByLabelText('Código de verificación'), '123 456');
    await events.click(screen.getByRole('button', { name: 'Verificar' }));

    await vi.waitFor(() => {
      expect(onRegistered).toHaveBeenCalledWith(expect.objectContaining({ name: 'Nuevo' }));
    });
    expect(verifyBody).toEqual({ challengeId: 'chl_1', code: '123456' });
    // La sesión queda en la caché sin pedir /auth/me otra vez.
    expect(appQueryClient.getQueryData(['auth', 'session'])).toMatchObject({ name: 'Nuevo' });
  });

  it('informa de los intentos restantes cuando el código es incorrecto', async () => {
    server.use(
      http.post('/api/auth/register', () => HttpResponse.json(challenge(), { status: 202 })),
      http.post('/api/auth/verify', () =>
        HttpResponse.json(
          {
            error: { code: 'invalid_code', message: 'El código no es correcto.', attemptsLeft: 4 },
          },
          { status: 400 },
        ),
      ),
    );
    const { user: events } = renderWithProviders(<RegistrationFlow onRegistered={vi.fn()} />);

    await fillRegistration(events);
    await events.click(screen.getByRole('button', { name: 'Continuar' }));
    await events.type(await screen.findByLabelText('Código de verificación'), '000000');
    await events.click(screen.getByRole('button', { name: 'Verificar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Intentos restantes: 4.');
  });

  it('permite volver a empezar cuando se agotan los intentos', async () => {
    server.use(
      http.post('/api/auth/register', () => HttpResponse.json(challenge(), { status: 202 })),
      http.post('/api/auth/verify', () =>
        HttpResponse.json(
          { error: { code: 'challenge_expired', message: 'Demasiados intentos.' } },
          { status: 400 },
        ),
      ),
    );
    const { user: events } = renderWithProviders(<RegistrationFlow onRegistered={vi.fn()} />);

    await fillRegistration(events);
    await events.click(screen.getByRole('button', { name: 'Continuar' }));
    await events.type(await screen.findByLabelText('Código de verificación'), '000000');
    await events.click(screen.getByRole('button', { name: 'Verificar' }));
    await events.click(await screen.findByRole('button', { name: 'Volver a empezar' }));

    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
  });

  it('bloquea el reenvío con una cuenta atrás hasta que pasa el tiempo de espera', async () => {
    server.use(
      http.post('/api/auth/register', () => HttpResponse.json(challenge(), { status: 202 })),
    );
    const { user: events } = renderWithProviders(<RegistrationFlow onRegistered={vi.fn()} />);

    await fillRegistration(events);
    await events.click(screen.getByRole('button', { name: 'Continuar' }));

    const resend = await screen.findByRole('button', { name: /Reenviar en \d+ s/ });
    expect(resend).toBeDisabled();
  });
});
