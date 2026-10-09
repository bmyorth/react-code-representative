import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

/** Service worker de MSW para la API simulada en el navegador. */
export const worker = setupWorker(...handlers);
