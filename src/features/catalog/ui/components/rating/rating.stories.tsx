import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Rating } from './rating';

const meta = {
  title: 'Catalog/Rating',
  component: Rating,
  args: { value: 4.6 },
  argTypes: { value: { control: { type: 'range', min: 0, max: 5, step: 0.1 } } },
} satisfies Meta<typeof Rating>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Perfect: Story = { args: { value: 5 } };
