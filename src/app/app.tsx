import { useEffect } from 'react';
import { RouterProvider } from 'react-router';

import { AppProviders } from './providers/app-providers';
import { router } from './router/router';
import { bindSessionExpiry } from './session-expiry';

/** Componente raíz: monta los providers globales y el router. */
export function App() {
  // El cliente HTTP avisa cuando la sesión termina; aquí se decide qué hace la aplicación.
  useEffect(() => bindSessionExpiry(router), []);

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
