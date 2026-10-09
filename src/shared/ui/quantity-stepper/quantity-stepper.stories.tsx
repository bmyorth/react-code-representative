import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { QuantityStepper } from './quantity-stepper';

const meta = {
  title: 'Shared/QuantityStepper',
  component: QuantityStepper,
  args: { value: 2, max: 5, label: 'Taza de cerámica', onChange: fn() },
} satisfies Meta<typeof QuantityStepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AtMinimum: Story = { args: { value: 1 } };

export const AtMaximum: Story = { args: { value: 5 } };

/** Versión con estado: el componente es controlado, así que la historia guarda el valor. */
export const Interactive: Story = {
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <QuantityStepper {...args} value={value} onChange={setValue} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Añadir una unidad/ }));
    await expect(canvas.getByRole('group')).toHaveTextContent('3');
  },
};
