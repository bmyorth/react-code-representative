import { defineConfig } from 'vitest/config';

/**
 * Tests del backend local. Corren en Node (sin jsdom ni MSW) y atacan la app de Hono
 * directamente con `app.request`, sin abrir puertos: son rápidos y deterministas.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.ts'],
    restoreMocks: true,
    testTimeout: 15_000,
  },
});
