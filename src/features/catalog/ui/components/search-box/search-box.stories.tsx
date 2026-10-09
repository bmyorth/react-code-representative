import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { SearchBox } from './search-box';

const meta = {
  title: 'Catalog/SearchBox',
  component: SearchBox,
  args: { defaultValue: '', onSearch: fn() },
} satisfies Meta<typeof SearchBox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithValue: Story = { args: { defaultValue: 'auriculares' } };

/** `onSearch` se llama una sola vez tras dejar de escribir (debounce), no por cada tecla. */
export const Debounced: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('searchbox'), 'reloj');
    await waitFor(() => expect(args.onSearch).toHaveBeenCalledTimes(1));
    await expect(args.onSearch).toHaveBeenCalledWith('reloj');
  },
};
