import { RouterProvider } from 'react-router';

import { AppProviders } from './providers/app-providers';
import { router } from './router/router';

/** Componente raíz: monta los providers globales y el router. */
export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
