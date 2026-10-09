import { QueryClient, QueryClientProvider, type QueryKey } from '@tanstack/react-query';
import { type Preview } from '@storybook/react-vite';
import { type ReactNode, useState } from 'react';
import { MemoryRouter } from 'react-router';

import '@/shared/styles/global.css';

/** Datos de caché que una historia declara en `parameters.queryData` para no depender de la red. */
type SeededQuery = readonly [queryKey: QueryKey, data: unknown];

function StoryProviders({
  children,
  queryData,
}: {
  readonly children: ReactNode;
  readonly queryData: readonly SeededQuery[];
}) {
  // Un QueryClient por historia, sembrado una sola vez: así cada historia es independiente.
  const [client] = useState(() => {
    const created = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    for (const [key, data] of queryData) created.setQueryData(key, data);
    return created;
  });

  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

/**
 * Configuración común a todas las historias.
 * Los componentes usan `<Link>` y TanStack Query, así que cada historia se envuelve en un router
 * en memoria y en un QueryClient propio, que puede sembrarse con `parameters.queryData`.
 */
const preview: Preview = {
  decorators: [
    (Story, context) => (
      <StoryProviders queryData={(context.parameters.queryData as SeededQuery[] | undefined) ?? []}>
        <Story />
      </StoryProviders>
    ),
  ],
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    // Las violaciones de accesibilidad (axe) se muestran como error en el panel.
    a11y: { test: 'error' },
  },
  tags: ['autodocs'],
};

export default preview;
