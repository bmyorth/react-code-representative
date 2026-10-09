import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { useCartStore } from '../../../cart.container';

import { AddToCartButton } from './add-to-cart-button';

const meta = {
  title: 'Cart/AddToCartButton',
  component: AddToCartButton,
  args: {
    product: {
      id: 'reloj-inteligente',
      name: 'Reloj inteligente',
      priceInCents: 19_900,
      imageUrl: 'https://picsum.photos/seed/watch/600/600',
      stock: 2,
    },
  },
  beforeEach: () => {
    useCartStore.getState().actions.clear();
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 280 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AddToCartButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OutOfStock: Story = {
  args: { product: { ...meta.args.product, stock: 0 } },
};

/** Al alcanzar el stock disponible, el botón se desactiva. */
export const LimitReached: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Añadir al carrito' }));
    await userEvent.click(canvas.getByRole('button', { name: /Añadir otra/ }));
    await expect(canvas.getByRole('button', { name: 'Máximo alcanzado' })).toBeDisabled();
  },
};
