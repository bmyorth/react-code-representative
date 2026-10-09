import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { env } from '@/shared/config/env';

import '@/shared/styles/global.css';

/** Arranca la API simulada. Solo se descarga cuando está activada. */
async function enableMocking(): Promise<void> {
  if (!env.enableMocks) return;
  const { worker } = await import('@/mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass', quiet: !env.isDev });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('No se encontró el elemento #root');

await enableMocking();

// La app se importa después de activar MSW: el router ejecuta los loaders de la ruta
// inicial al crearse, y esas peticiones deben llegar ya a la API simulada.
const { App } = await import('@/app/app');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
