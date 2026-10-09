import { QueryClient } from '@tanstack/react-query';

import { isApiError } from '@/shared/api';

const MAX_RETRIES = 2;

/**
 * Instancia única de QueryClient, compartida por los providers y los loaders del router
 * para que la precarga de rutas y los componentes usen la misma caché.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      // Los errores 4xx no se reintentan: repetirlos no cambia el resultado.
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
        return failureCount < MAX_RETRIES;
      },
    },
  },
});
