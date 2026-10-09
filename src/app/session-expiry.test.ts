import { createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { authQueries } from '@/features/auth';
import { notifySessionExpired } from '@/shared/api';
import { queryClient } from '@/shared/lib/query-client';

import { bindSessionExpiry } from './session-expiry';

const routes = [
  { path: '/', element: null },
  { path: '/login', element: null },
  { path: '/orders', element: null, handle: { requiresAuth: true } },
];

afterEach(() => {
  queryClient.clear();
});

describe('bindSessionExpiry', () => {
  it('en una ruta privada limpia la sesión y lleva al login indicando el motivo', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/orders?page=2'] });
    const unbind = bindSessionExpiry(router);

    notifySessionExpired();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(queryClient.getQueryData(authQueries.keys.session())).toBeNull();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toContain('reason=expired');
    expect(router.state.location.search).toContain('from=%2Forders%3Fpage%3D2');
    unbind();
  });

  it('en una ruta pública solo limpia la sesión, sin sacar al usuario de la página', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/'] });
    const unbind = bindSessionExpiry(router);

    notifySessionExpired();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(queryClient.getQueryData(authQueries.keys.session())).toBeNull();
    expect(router.state.location.pathname).toBe('/');
    unbind();
  });

  it('deja de reaccionar tras cancelar la suscripción', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/orders'] });
    bindSessionExpiry(router)();

    notifySessionExpired();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(router.state.location.pathname).toBe('/orders');
  });
});
