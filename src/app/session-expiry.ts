import { type createBrowserRouter } from 'react-router';

import { authCommands } from '@/features/auth';
import { onSessionExpired } from '@/shared/api';
import { buildPath } from '@/shared/config/routes';

interface RouteHandle {
  readonly requiresAuth?: boolean;
}

/**
 * Reacciona a "la sesión terminó" (refresh rechazado o sesión revocada desde otro dispositivo):
 * limpia la caché del usuario y, solo si estaba en una ruta privada, lo lleva a iniciar sesión.
 * Devuelve la función que cancela la suscripción.
 */
export function bindSessionExpiry(router: ReturnType<typeof createBrowserRouter>): () => void {
  return onSessionExpired(() => {
    authCommands.expireSession();

    const { matches, location } = router.state;
    const onPrivateRoute = matches.some(
      (match) => (match.route.handle as RouteHandle | undefined)?.requiresAuth,
    );
    if (onPrivateRoute) {
      const from = `${location.pathname}${location.search}`;
      void router.navigate(buildPath.login({ from, expired: true }), { replace: true });
    }
  });
}
