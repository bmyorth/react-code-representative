import { type LoaderFunctionArgs } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { authQueries, type AuthUser } from '@/features/auth';
import { queryClient } from '@/shared/lib/query-client';

import { redirectIfAuthenticated, requireRole, requireSession } from './guards';

const customer: AuthUser = {
  id: 'usr_1',
  name: 'Carlos',
  identifier: 'cliente@acme.test',
  role: 'customer',
  tenant: { id: 'acme', name: 'Acme Store' },
};

const args = (path: string) =>
  ({
    request: new Request(`http://localhost${path}`),
    params: {},
    context: {},
  }) as unknown as LoaderFunctionArgs;

const locationOf = (result: unknown) =>
  result instanceof Response ? result.headers.get('Location') : null;

const setSession = (user: AuthUser | null) => {
  queryClient.setQueryData(authQueries.keys.session(), user);
};

afterEach(() => {
  queryClient.clear();
});

describe('requireSession', () => {
  it('deja pasar a quien tiene sesión', async () => {
    setSession(customer);

    expect(await requireSession(args('/checkout'))).toBeNull();
  });

  it('redirige al login recordando a dónde quería ir', async () => {
    setSession(null);

    const result = await requireSession(args('/orders?page=2'));

    expect(locationOf(result)).toBe('/login?from=%2Forders%3Fpage%3D2');
  });
});

describe('requireRole', () => {
  it('permite el acceso con el rol adecuado', async () => {
    setSession({ ...customer, role: 'admin' });

    expect(await requireRole('admin')(args('/admin/orders'))).toBeNull();
  });

  it('responde 403 a un usuario sin el rol', async () => {
    setSession(customer);

    await expect(requireRole('admin')(args('/admin/orders'))).rejects.toMatchObject({
      status: 403,
    });
  });

  it('un visitante es enviado al login antes que rechazado', async () => {
    setSession(null);

    const result = await requireRole('admin')(args('/admin/orders'));

    expect(locationOf(result)).toContain('/login');
  });
});

describe('redirectIfAuthenticated', () => {
  it('lleva al catálogo a quien ya tiene sesión', async () => {
    setSession(customer);

    const result = await redirectIfAuthenticated();

    expect(locationOf(result)).toBe('/');
  });

  it('deja ver login/registro a los visitantes', async () => {
    setSession(null);

    expect(await redirectIfAuthenticated()).toBeNull();
  });
});
