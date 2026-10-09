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

  // jsdom no implementa `<dialog>.showModal()` ni `close()`: se simulan con el atributo `open`.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
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
