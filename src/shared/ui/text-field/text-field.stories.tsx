import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { TextField } from './text-field';

const meta = {
  title: 'Shared/TextField',
  component: TextField,
  args: { label: 'Correo electrónico', type: 'email', autoComplete: 'email' },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Correo electrónico');
    await userEvent.type(input, 'ana@acme.test');
    await expect(input).toHaveValue('ana@acme.test');
  },
};

export const WithHint: Story = { args: { hint: 'También puedes usar un teléfono (+34…).' } };

export const WithError: Story = {
  args: { error: 'Introduce un correo válido.', defaultValue: 'no-es-un-correo' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText('Correo electrónico')).toBeInvalid();
    await expect(canvas.getByRole('alert')).toHaveTextContent('Introduce un correo válido.');
  },
};

export const Disabled: Story = { args: { disabled: true, defaultValue: 'ana@acme.test' } };
