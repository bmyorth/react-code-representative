import { setupServer } from 'msw/node';

import { handlers } from '@/mocks/handlers';

/** Servidor MSW para Node: reutiliza los mismos handlers que el navegador. */
export const server = setupServer(...handlers);
