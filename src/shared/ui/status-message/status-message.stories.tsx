import { type Meta, type StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Button } from '../button/button';

import { StatusMessage } from './status-message';

const meta = {
  title: 'Shared/StatusMessage',
  component: StatusMessage,
  args: {
    title: 'No hay resultados',
    description: 'Prueba con otra búsqueda u otra categoría.',
  },
} satisfies Meta<typeof StatusMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

/** El tono de error se anuncia a los lectores de pantalla (`role="alert"`). */
export const ErrorWithAction: Story = {
  args: {
    tone: 'error',
    title: 'No pudimos cargar los productos',
    description: 'Revisa tu conexión e inténtalo de nuevo.',
    action: (
      <Button variant="secondary" onClick={fn()}>
        Reintentar
      </Button>
    ),
  },
};
