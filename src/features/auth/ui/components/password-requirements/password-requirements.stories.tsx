import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { PasswordRequirements } from './password-requirements';

const meta = {
  title: 'Auth/PasswordRequirements',
  component: PasswordRequirements,
  args: { password: '' },
} satisfies Meta<typeof PasswordRequirements>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Partial: Story = { args: { password: 'contrasena' } };

export const AllMet: Story = {
  args: { password: 'Contrasena-Segura-1' },
  play: async ({ canvasElement }) => {
    const items = within(canvasElement).getAllByRole('listitem');
    for (const item of items) await expect(item).toHaveAttribute('data-met', 'true');
  },
};
