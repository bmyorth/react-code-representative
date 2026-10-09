import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/render';
import { server } from '@/test/msw-server';

import { LoginForm } from './login-form';

const user = {
  id: 'usr_1',
  name: 'Carlos',
  identifier: 'cliente@acme.test',
  role: 'customer',
  tenant: { id: 'acme', name: 'Acme Store' },
};

beforeEach(() => {
  document.cookie = 'csrf_token=token; path=/';
});

describe('LoginForm', () => {
  it('envía las credenciales y notifica el usuario autenticado', async () => {
    let body: unknown;
    server.use(
      http.post('/api/auth/login', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ user });
      }),
    );
    const onSuccess = vi.fn();
    const { user: events } = renderWithProviders(<LoginForm onSuccess={onSuccess} />);

    await events.type(screen.getByLabelText('Email o teléfono'), 'cliente@acme.test');
    await events.type(screen.getByLabelText('Contraseña'), 'Demo-Pass-2026');
    await events.click(screen.getByRole('button', { name: 'Entrar' }));

    await vi.waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ name: 'Carlos' }));
    });
    expect(body).toEqual({ identifier: 'cliente@acme.test', password: 'Demo-Pass-2026' });
  });

  it('muestra el error de credenciales sin revelar si la cuenta existe', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json(
          { error: { code: 'invalid_credentials', message: 'Credenciales incorrectas.' } },
          { status: 401 },
        ),
      ),
    );
    const onSuccess = vi.fn();
    const { user: events } = renderWithProviders(<LoginForm onSuccess={onSuccess} />);

    await events.type(screen.getByLabelText('Email o teléfono'), 'a@b.co');
    await events.type(screen.getByLabelText('Contraseña'), 'x');
    await events.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales incorrectas.');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('indica cuánto esperar cuando la cuenta está bloqueada', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json(
          { error: { code: 'account_locked', message: 'Cuenta bloqueada.', retryAfterSec: 600 } },
          { status: 429 },
        ),
      ),
    );
    const { user: events } = renderWithProviders(<LoginForm onSuccess={vi.fn()} />);

    await events.type(screen.getByLabelText('Email o teléfono'), 'a@b.co');
    await events.type(screen.getByLabelText('Contraseña'), 'x');
    await events.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('espera 600 s');
  });

  it('muestra los errores de validación junto a cada campo', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'Datos no válidos',
              fields: { identifier: 'Obligatorio.' },
            },
          },
          { status: 400 },
        ),
      ),
    );
    const { user: events } = renderWithProviders(<LoginForm onSuccess={vi.fn()} />);

    await events.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByLabelText('Email o teléfono')).toHaveAccessibleDescription(
      'Obligatorio.',
    );
  });

  it('muestra el aviso previo, por ejemplo cuando la sesión caducó', () => {
    renderWithProviders(<LoginForm onSuccess={vi.fn()} notice="Tu sesión ha caducado." />);

    expect(screen.getByText('Tu sesión ha caducado.')).toBeInTheDocument();
  });
});
