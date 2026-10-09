import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { isApiError } from '@/shared/api';
import { server } from '@/test/msw-server';

import { type ProductId } from '../domain/product';

import { httpProductRepository } from './http-product-repository';

const productId = (value: string) => value as ProductId;

describe('httpProductRepository', () => {
  it('devuelve los productos mapeados al dominio', async () => {
    const products = await httpProductRepository.list({});

    expect(products.length).toBeGreaterThan(0);
    expect(products[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String) as unknown,
        priceInCents: expect.any(Number) as unknown,
        imageUrl: expect.stringMatching(/^https:\/\//) as unknown,
      }),
    );
  });

  it('envía los filtros a la API', async () => {
    const products = await httpProductRepository.list({ category: 'audio', search: 'altavoz' });

    expect(products.map((product) => product.id)).toEqual(['altavoz-bluetooth']);
  });

  it('obtiene un producto por id', async () => {
    const product = await httpProductRepository.getById(productId('altavoz-bluetooth'));

    expect(product).toMatchObject({ id: 'altavoz-bluetooth', category: 'audio' });
  });

  it('lanza un ApiError 404 si el producto no existe', async () => {
    const error: unknown = await httpProductRepository
      .getById(productId('no-existe'))
      .catch((caught: unknown) => caught);

    expect(isApiError(error) && error.isNotFound).toBe(true);
  });

  it('rechaza respuestas que no cumplen el contrato', async () => {
    server.use(
      http.get('/api/products', () =>
        HttpResponse.json({ data: [{ id: 'x', name: 'Sin precio' }] }),
      ),
    );

    await expect(httpProductRepository.list({})).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
    });
  });

  it('normaliza los errores de red', async () => {
    server.use(http.get('/api/products', () => HttpResponse.error()));

    await expect(httpProductRepository.list({})).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
    });
  });

  it('propaga la cancelación sin convertirla en error de la API', async () => {
    const controller = new AbortController();
    const request = httpProductRepository.list({}, controller.signal);

    controller.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });
});
