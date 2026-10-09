import { Hono } from 'hono';

import { type AppContext, type AppEnv } from '../../context';
import { type Tenant } from '../../db';
import { errors } from '../../lib/errors';
import { type ProductRecord } from '../../../src/mocks/data/products';

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Precio de un producto para un tenant concreto, en céntimos. */
export function priceFor(product: ProductRecord, tenant: Tenant): number {
  return Math.round(product.price.amount * tenant.priceMultiplier);
}

/** Catálogo público: cada tenant ve su propia lista de precios y el stock vivo. */
export function catalogRoutes(ctx: AppContext): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  const toDto = (product: ProductRecord, tenant: Tenant) => ({
    ...product,
    price: { amount: priceFor(product, tenant), currency: product.price.currency },
    stock: ctx.db.stock.get(product.id) ?? 0,
  });

  app.get('/', (c) => {
    const tenant = c.get('tenant');
    const category = c.req.query('category');
    const search = normalize(c.req.query('q') ?? '');
    const data = ctx.db.catalog
      .filter(
        (product) =>
          (!category || product.category === category) &&
          (!search || normalize(`${product.name} ${product.description}`).includes(search)),
      )
      .map((product) => toDto(product, tenant));
    return c.json({ data });
  });

  app.get('/:productId', (c) => {
    const product = ctx.db.catalog.find((item) => item.id === c.req.param('productId'));
    if (!product) throw errors.notFound('Producto no encontrado');
    return c.json(toDto(product, c.get('tenant')));
  });

  return app;
}
