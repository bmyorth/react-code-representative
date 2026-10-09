import { httpClient } from '@/shared/api';

import { type ProductRepository } from '../domain/product-repository';

import { productDtoSchema, productListDtoSchema, toProduct } from './product-dto';

/** Adaptador HTTP del puerto `ProductRepository`. */
export const httpProductRepository: ProductRepository = {
  async list(filters, signal) {
    const response = await httpClient.get('/products', {
      schema: productListDtoSchema,
      query: { category: filters.category, q: filters.search },
      ...(signal ? { signal } : {}),
    });
    return response.data.map(toProduct);
  },

  async getById(id, signal) {
    const dto = await httpClient.get(`/products/${encodeURIComponent(id)}`, {
      schema: productDtoSchema,
      ...(signal ? { signal } : {}),
    });
    return toProduct(dto);
  },
};
