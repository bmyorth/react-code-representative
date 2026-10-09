import { queryOptions } from '@tanstack/react-query';

import { type ProductId } from '../domain/product';
import { type ProductFilters } from '../domain/product-filters';
import { type ProductRepository } from '../domain/product-repository';

/**
 * Casos de uso de lectura del catálogo expresados como `queryOptions`.
 * Centralizan claves de caché y funciones de carga: componentes y loaders del router
 * comparten exactamente la misma definición, sin claves duplicadas.
 */
export function createProductQueries(repository: ProductRepository) {
  const keys = {
    all: ['products'] as const,
    lists: () => [...keys.all, 'list'] as const,
    list: (filters: ProductFilters) => [...keys.lists(), filters] as const,
    details: () => [...keys.all, 'detail'] as const,
    detail: (id: ProductId) => [...keys.details(), id] as const,
  };

  return {
    keys,
    list: (filters: ProductFilters) =>
      queryOptions({
        queryKey: keys.list(filters),
        queryFn: ({ signal }) => repository.list(filters, signal),
      }),
    detail: (id: ProductId) =>
      queryOptions({
        queryKey: keys.detail(id),
        queryFn: ({ signal }) => repository.getById(id, signal),
      }),
  } as const;
}

/** Conjunto de `queryOptions` del catálogo ya conectado a un repositorio. */
export type ProductQueries = ReturnType<typeof createProductQueries>;
