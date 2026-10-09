import { composeStories, setProjectAnnotations } from '@storybook/react-vite';
import { type ComposedStoryFn } from 'storybook/internal/types';
import { describe, it } from 'vitest';

import previewAnnotations from '../../.storybook/preview';

/**
 * Smoke test de todas las historias de Storybook.
 * Cada historia se renderiza con la configuración global de Storybook y ejecuta
 * su función `play`: si una historia se rompe, la CI lo detecta sin abrir Storybook.
 */
const storyModules = import.meta.glob<Parameters<typeof composeStories>[0]>('../**/*.stories.tsx', {
  eager: true,
});

// Se registra antes de componer las historias: `composeStories` lee la configuración global al llamarse.
setProjectAnnotations(previewAnnotations);

describe.each(Object.entries(storyModules))('%s', (_, storyModule) => {
  const stories: [string, ComposedStoryFn][] = Object.entries(composeStories(storyModule));

  it.each(stories)('%s', async (_name, Story) => {
    await Story.run();
  });
});
