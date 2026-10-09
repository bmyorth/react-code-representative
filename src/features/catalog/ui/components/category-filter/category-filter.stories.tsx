import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { type ProductCategory } from '../../../domain/product';

import { CategoryFilter } from './category-filter';

const meta = {
  title: 'Catalog/CategoryFilter',
  component: CategoryFilter,
  args: { value: undefined, onChange: fn() },
} satisfies Meta<typeof CategoryFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllSelected: Story = {};

export const AudioSelected: Story = { args: { value: 'audio' } };

/** Versión con estado para probar la selección. */
export const Interactive: Story = {
  render: function Render(args) {
    const [value, setValue] = useState<ProductCategory | undefined>(args.value);
    return <CategoryFilter value={value} onChange={setValue} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const hogar = canvas.getByRole('button', { name: 'Hogar' });
    await userEvent.click(hogar);
    await expect(hogar).toHaveAttribute('aria-pressed', 'true');
  },
};
