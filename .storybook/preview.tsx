import { type Preview } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';

import '@/shared/styles/global.css';

/**
 * Configuración común a todas las historias.
 * Los componentes usan `<Link>`, así que cada historia se envuelve en un router en memoria.
 */
const preview: Preview = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
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
