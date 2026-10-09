import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Button } from '@/shared/ui';

import { sampleProduct } from '../../testing/product-fixtures';

import { ProductCard } from './product-card';

const meta = {
  title: 'Catalog/ProductCard',
  component: ProductCard,
  args: { product: sampleProduct(0) },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 280 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProductCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OutOfStock: Story = { args: { product: sampleProduct(1, { stock: 0 }) } };

/** La acción se inyecta como componente: la tarjeta no sabe que existe un carrito. */
export const WithAction: Story = {
  args: {
    Action: ({ product }) => <Button fullWidth>Comprar {product.name}</Button>,
  },
};
