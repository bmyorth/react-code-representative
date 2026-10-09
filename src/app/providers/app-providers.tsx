import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, type ReactNode, Suspense } from 'react';

import { env } from '@/shared/config/env';
import { queryClient } from '@/shared/lib/query-client';

// Las devtools solo se descargan en desarrollo; no forman parte del bundle de producción.
const ReactQueryDevtools = env.isDev
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((module) => ({
        default: module.ReactQueryDevtools,
      })),
    )
  : null;

interface AppProvidersProps {
  readonly children: ReactNode;
}

/** Providers globales de la aplicación. Cada feature gestiona su propio estado local. */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {ReactQueryDevtools ? (
        <Suspense fallback={null}>
          <ReactQueryDevtools buttonPosition="bottom-left" />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  );
}
