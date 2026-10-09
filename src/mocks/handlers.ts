import { delay, http, HttpResponse } from 'msw';

import { env } from '@/shared/config/env';

import { products } from './data/products';

const api = (path: string) => `${env.apiBaseUrl}${path}`;

/** Latencia simulada para que los estados de carga sean visibles y realistas. */
const NETWORK_DELAY_MS = 400;

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export const handlers = [
  http.get(api('/products'), async ({ request }) => {
    await delay(NETWORK_DELAY_MS);
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const search = normalize(url.searchParams.get('q') ?? '');

    const data = products.filter(
      (product) =>
        (!category || product.category === category) &&
        (!search || normalize(`${product.name} ${product.description}`).includes(search)),
    );

    return HttpResponse.json({ data });
  }),

  http.get(api('/products/:productId'), async ({ params }) => {
    await delay(NETWORK_DELAY_MS);
    const product = products.find((item) => item.id === params.productId);
    return product
      ? HttpResponse.json(product)
      : HttpResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
  }),
];
