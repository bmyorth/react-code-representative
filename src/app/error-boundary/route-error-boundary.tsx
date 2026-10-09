import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

import { buildPath } from '@/shared/config/routes';
import { StatusMessage } from '@/shared/ui';

/**
 * Captura cualquier error de render, loader o carga diferida de una ruta.
 * Nunca muestra detalles técnicos al usuario; en desarrollo los deja en la consola.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();

  if (import.meta.env.DEV) console.error(error);

  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <main className="page">
      <StatusMessage
        tone={isNotFound ? 'neutral' : 'error'}
        title={isNotFound ? 'Página no encontrada' : 'Algo salió mal'}
        description={
          isNotFound
            ? 'La página que buscas no existe.'
            : 'Ha ocurrido un error inesperado. Vuelve a intentarlo en unos segundos.'
        }
        action={<Link to={buildPath.catalog()}>Volver al catálogo</Link>}
      />
    </main>
  );
}
