import { type QueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';

import { authQueries } from '../../../auth.container';
import { type AuthUser } from '../../../domain/auth';

import { UserMenu } from './user-menu';

const customer: AuthUser = {
  id: 'usr_1',
  name: 'Carlos Cliente',
  identifier: 'cliente@acme.test',
  role: 'customer',
  tenant: { id: 'acme', name: 'Acme Store' },
};

const withSession = (user: AuthUser | null) => ({
  seed: (queryClient: QueryClient) => {
    queryClient.setQueryData(authQueries.keys.session(), user);
  },
});

describe('UserMenu', () => {
  it('ofrece iniciar sesión, crear cuenta y elegir tienda a los visitantes', () => {
    renderWithProviders(<UserMenu />, withSession(null));

    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/register');
    expect(screen.getByLabelText('Tienda')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument();
  });

  it('muestra nombre, tienda y rol al usuario autenticado, sin enlace de administración', () => {
    renderWithProviders(<UserMenu />, withSession(customer));

    expect(screen.getByText('Carlos Cliente')).toBeInTheDocument();
    expect(screen.getByText('Acme Store · Cliente')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mis pedidos' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tienda')).not.toBeInTheDocument();
  });

  it('muestra el acceso de administración solo al rol admin', () => {
    renderWithProviders(<UserMenu />, withSession({ ...customer, role: 'admin' }));

    expect(screen.getByRole('link', { name: 'Administración' })).toHaveAttribute(
      'href',
      '/admin/orders',
    );
    expect(screen.getByText('Acme Store · Admin')).toBeInTheDocument();
  });

  it('cierra la sesión en el servidor al pulsar "Salir"', async () => {
    let loggedOut = false;
    server.use(
      http.post('/api/auth/logout', () => {
        loggedOut = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    document.cookie = 'csrf_token=token; path=/';
    const { user } = renderWithProviders(<UserMenu />, withSession(customer));

    await user.click(screen.getByRole('button', { name: 'Salir' }));

    await expect.poll(() => loggedOut).toBe(true);
  });
});
