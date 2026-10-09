import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

import { server } from './msw-server';

/**
 * Configuración global de los tests:
 * - La API simulada (MSW) responde a `fetch` igual que en el navegador.
 * - Cualquier petición sin handler hace fallar el test: nada sale a la red real.
 * - Tras cada test se restauran los mocks, se desmonta el DOM y se limpian handlers y almacenamiento.
 */
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  // Se restauran los mocks antes de limpiar: un test puede haber bloqueado localStorage.
  vi.restoreAllMocks();
  cleanup();
  server.resetHandlers();
  window.localStorage.clear();
});

afterAll(() => {
  server.close();
});
