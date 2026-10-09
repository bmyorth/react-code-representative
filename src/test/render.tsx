import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { type ReactElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router';

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** URL inicial del router en memoria (p. ej. `/?category=audio`). */
  readonly route?: string;
  /** Prepara la caché antes del primer render (p. ej. sembrar la sesión) para no depender de la red. */
  readonly seed?: (queryClient: QueryClient) => void;
}

/**
 * Renderiza un componente con los mismos providers que la app (router y TanStack Query).
 * Cada test recibe un `QueryClient` nuevo, sin reintentos, para que no compartan caché.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', seed, ...options }: RenderWithProvidersOptions = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  seed?.(queryClient);

  function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return {
    user: userEvent.setup(),
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...options }),
  };
}
