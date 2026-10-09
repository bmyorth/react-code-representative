import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { LoginForm } from './login-form';

const meta = {
  title: 'Auth/LoginForm',
  component: LoginForm,
  args: { onSuccess: fn() },
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Email o teléfono'), 'cliente@acme.test');
    await expect(canvas.getByLabelText('Email o teléfono')).toHaveValue('cliente@acme.test');
  },
};

export const SessionExpired: Story = {
  args: { notice: 'Tu sesión ha caducado. Inicia sesión de nuevo.' },
};
