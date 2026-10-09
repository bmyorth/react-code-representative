import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { checkoutQueries } from '../../../checkout.container';
import { type Order } from '../../../domain/order';

import { OrderStatusView } from './order-status-view';

const order: Order = {
  id: 'ord_1',
  status: 'paid',
  amountInCents: 9598,
  lines: [
    { productId: 'lamp', name: 'Lámpara de escritorio', unitPriceInCents: 4599, quantity: 1 },
    { productId: 'case', name: 'Funda para tablet', unitPriceInCents: 2499, quantity: 2 },
  ],
  createdAt: new Date('2026-10-09T12:00:00Z'),
  paidAt: new Date('2026-10-09T12:00:01Z'),
};

const seed = (value: Order) => [[checkoutQueries.keys.detail('ord_1'), value]];

const meta = {
  title: 'Checkout/OrderStatusView',
  component: OrderStatusView,
  args: { orderId: 'ord_1' },
} satisfies Meta<typeof OrderStatusView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Paid: Story = {
  parameters: { queryData: seed(order) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/Pago confirmado/)).toBeInTheDocument();
  },
};
