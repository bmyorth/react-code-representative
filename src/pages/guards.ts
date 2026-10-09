import { type LoaderFunctionArgs, redirect } from 'react-router';

import { authQueries, hasRole, type Role } from '@/features/auth';
import { buildPath } from '@/shared/config/routes';
import { queryClient } from '@/shared/lib/query-client';

/**
 * Sesión actual desde la caché. `staleTime: 'static'` evita volver a pedirla en cada navegación:
 * la sesión se actualiza explícitamente al iniciar/cerrar sesión o al caducar.
 */
const currentUser = () => queryClient.query({ ...authQueries.session(), staleTime: 'static' });

/** Ruta actual (con query) para volver a ella tras iniciar sesión. */
function currentPath(request: Request): string {
  const url = new URL(request.url);
  return `${url.pathname}${url.search}`;
}

/**
 * Guarda de ruta: exige sesión. Sin ella redirige a `/login` recordando a dónde quería ir.
 * Es una mejora de experiencia: la seguridad real la aplica el servidor en cada endpoint.
 */
export async function requireSession({ request }: LoaderFunctionArgs) {
  const user = await currentUser();
  return user ? null : redirect(buildPath.login({ from: currentPath(request) }));
}

/** Guarda de ruta: exige sesión y alguno de los roles dados. Con otro rol responde 403. */
export function requireRole(...roles: readonly Role[]) {
  return async (args: LoaderFunctionArgs) => {
    const unauthenticated = await requireSession(args);
    if (unauthenticated) return unauthenticated;
    if (!hasRole(await currentUser(), ...roles)) {
      // React Router espera que un loader "lance" la Response para mostrar el ErrorBoundary de la ruta.
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw new Response('Forbidden', { status: 403, statusText: 'Forbidden' });
    }
    return null;
  };
}

/** Guarda de ruta para login/registro: quien ya tiene sesión no necesita verlas. */
export async function redirectIfAuthenticated() {
  const user = await currentUser();
  return user ? redirect(buildPath.catalog()) : null;
}
