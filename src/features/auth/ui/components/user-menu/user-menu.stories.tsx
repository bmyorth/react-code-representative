import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { authQueries } from '../../../auth.container';
import { type AuthUser } from '../../../domain/auth';

import { UserMenu } from './user-menu';

const customer: AuthUser = {
  id: 'usr_1',
  name: 'Carlos Cliente',
  identifier: 'cliente@acme.test',
  role: 'customer',
  tenant: { id: 'acme', name: 'Acme Store' },
};

const session = (user: AuthUser | null) => [[authQueries.keys.session(), user]];

const meta = { title: 'Auth/UserMenu', component: UserMenu } satisfies Meta<typeof UserMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Visitor: Story = {
  parameters: { queryData: session(null) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument();
    await expect(canvas.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument();
  },
};

export const Customer: Story = {
  parameters: { queryData: session(customer) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Acme Store · Cliente')).toBeInTheDocument();
    await expect(canvas.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument();
  },
};

export const Admin: Story = {
  parameters: { queryData: session({ ...customer, name: 'Ana Admin', role: 'admin' }) },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('link', { name: 'Administración' }),
    ).toBeInTheDocument();
  },
};
