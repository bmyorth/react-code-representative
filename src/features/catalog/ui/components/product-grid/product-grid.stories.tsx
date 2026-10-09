import { type Meta, type StoryObj } from '@storybook/react-vite';

import { sampleProducts } from '../../testing/product-fixtures';

import { ProductGrid } from './product-grid';

const meta = {
  title: 'Catalog/ProductGrid',
  component: ProductGrid,
  args: { products: sampleProducts },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ProductGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SingleProduct: Story = { args: { products: sampleProducts.slice(0, 1) } };
