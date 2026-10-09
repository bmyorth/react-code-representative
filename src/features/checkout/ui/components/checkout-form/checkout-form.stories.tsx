import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { CheckoutForm } from './checkout-form';

const meta = {
  title: 'Checkout/CheckoutForm',
  component: CheckoutForm,
  args: {
    onPaid: fn(),
    lines: [
      { productId: 'lamp', name: 'Lámpara de escritorio', quantity: 1, unitPriceInCents: 4599 },
      { productId: 'case', name: 'Funda para tablet', quantity: 2, unitPriceInCents: 2499 },
    ],
  },
} satisfies Meta<typeof CheckoutForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Validación en cliente: una tarjeta con Luhn incorrecto no llega a enviarse. */
export const InvalidCard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/Número de tarjeta/), '4242424242424241');
    await userEvent.click(canvas.getByRole('button', { name: /Pagar/ }));
    await expect(canvas.getByLabelText(/Número de tarjeta/)).toBeInvalid();
    await expect(canvas.getByLabelText('CVC')).toBeInvalid();
  },
};

/** El formato se aplica mientras se escribe. */
export const Formatting: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/Número de tarjeta/), '4242424242424242');
    await userEvent.type(canvas.getByLabelText('Caducidad'), '1230');
    await expect(canvas.getByLabelText('Número de tarjeta (Visa)')).toHaveValue(
      '4242 4242 4242 4242',
    );
    await expect(canvas.getByLabelText('Caducidad')).toHaveValue('12/30');
  },
};
