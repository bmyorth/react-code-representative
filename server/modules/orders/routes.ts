import { Hono } from 'hono';

import { type AppContext, type AppEnv } from '../../context';
import { type OrderRecord } from '../../db';
import { errors } from '../../lib/errors';
import { authenticate, requireRole } from '../../middleware/security';

function toOrderDto(order: OrderRecord, customerName?: string) {
  return {
    id: order.id,
    status: order.status,
    amountInCents: order.amountInCents,
    currency: order.currency,
    items: order.items,
    createdAt: new Date(order.createdAt).toISOString(),
    paidAt: order.paidAt === null ? null : new Date(order.paidAt).toISOString(),
    ...(customerName ? { customerName } : {}),
  };
}

/** Pedidos del usuario autenticado. Siempre filtrados por tenant y propietario. */
export function orderRoutes(ctx: AppContext): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.use('*', authenticate(ctx));

  app.get('/', (c) => {
    const { userId, tenantId } = c.get('auth');
    const data = [...ctx.db.orders.values()]
      .filter((order) => order.tenantId === tenantId && order.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((order) => toOrderDto(order));
    return c.json({ data });
  });

  app.get('/:id', (c) => {
    const { userId, tenantId } = c.get('auth');
    const order = ctx.db.orders.get(c.req.param('id'));
    // Un pedido ajeno o de otro tenant se trata como inexistente: no se confirma que exista (anti-IDOR).
    if (order?.tenantId !== tenantId || order.userId !== userId) throw errors.notFound();
    return c.json(toOrderDto(order));
  });

  return app;
}

/** Panel de administración: pedidos de todo el tenant. Solo rol `admin`. */
export function adminRoutes(ctx: AppContext): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.use('*', authenticate(ctx), requireRole('admin'));

  app.get('/orders', (c) => {
    const { tenantId } = c.get('auth');
    const data = [...ctx.db.orders.values()]
      .filter((order) => order.tenantId === tenantId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((order) => toOrderDto(order, ctx.db.users.get(order.userId)?.name ?? 'Desconocido'));
    return c.json({ data });
  });

  return app;
}
