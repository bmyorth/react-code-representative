import { type Meta, type StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Button } from './button';

const meta = {
  title: 'Shared/Button',
  component: Button,
  args: { children: 'Añadir al carrito', onClick: fn() },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'ghost'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: 'secondary', children: 'Reintentar' } };

export const Ghost: Story = { args: { variant: 'ghost', size: 'sm', children: 'Eliminar' } };

export const Disabled: Story = { args: { disabled: true, children: 'Agotado' } };

export const FullWidth: Story = { args: { fullWidth: true } };
