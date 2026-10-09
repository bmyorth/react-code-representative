import { type LoaderFunctionArgs } from 'react-router';

import { parseCatalogFilters, productQueries } from '@/features/catalog';
import { noop } from '@/shared/lib/noop';
import { queryClient } from '@/shared/lib/query-client';

/**
 * Inicia la petición en cuanto empieza la navegación, en paralelo con la descarga
 * del código de la página (sin cascadas). No espera: la página muestra su propio estado de carga.
 */
export function catalogLoader({ request }: LoaderFunctionArgs) {
  const filters = parseCatalogFilters(new URL(request.url));
  // Los errores se ignoran aquí: los gestiona la página con su propio estado de error.
  queryClient.query(productQueries.list(filters)).catch(noop);
  return null;
}
