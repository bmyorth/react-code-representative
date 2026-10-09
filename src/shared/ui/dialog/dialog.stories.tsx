import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Button } from '../button/button';

import { Dialog } from './dialog';

const meta = {
  title: 'Shared/Dialog',
  component: Dialog,
  args: {
    open: true,
    title: 'Autenticación 3D Secure',
    onClose: fn(),
    children: (
      <>
        <p>Tu banco solicita confirmar el pago.</p>
        <Button>Autorizar</Button>
      </>
    ),
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  play: async ({ canvasElement }) => {
    // El diálogo modal se pinta en la capa superior del documento, fuera del canvas de la historia.
    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog', {
      name: 'Autenticación 3D Secure',
    });
    await expect(dialog).toBeVisible();
    await userEvent.keyboard('{Escape}');
  },
};

export const Closed: Story = { args: { open: false } };
