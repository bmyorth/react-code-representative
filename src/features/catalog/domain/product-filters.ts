import { isProductCategory, type ProductCategory } from './product';

/** Criterios de búsqueda del catálogo. */
export interface ProductFilters {
  readonly category?: ProductCategory;
  readonly search?: string;
}

const MAX_SEARCH_LENGTH = 80;

/**
 * Normaliza filtros procedentes de una fuente no fiable (la URL).
 * Los valores inválidos se descartan en lugar de propagarse.
 */
export function normalizeProductFilters(raw: {
  category?: string | null;
  search?: string | null;
}): ProductFilters {
  const search = raw.search?.trim().slice(0, MAX_SEARCH_LENGTH);
  return {
    ...(isProductCategory(raw.category) ? { category: raw.category } : {}),
    ...(search ? { search } : {}),
  };
}
