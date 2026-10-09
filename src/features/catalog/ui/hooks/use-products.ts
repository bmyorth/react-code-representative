import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { productQueries } from '../../catalog.container';
import { type ProductId } from '../../domain/product';
import { type ProductFilters } from '../../domain/product-filters';

/** Lista de productos. Mantiene los resultados anteriores mientras llegan los nuevos (sin parpadeos). */
export function useProducts(filters: ProductFilters) {
  return useQuery({ ...productQueries.list(filters), placeholderData: keepPreviousData });
}

/** Detalle de un producto. Comparte caché con el loader de la ruta. */
export function useProduct(id: ProductId) {
  return useQuery(productQueries.detail(id));
}
