import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { type ProductCategory } from '../../domain/product';
import { normalizeProductFilters, type ProductFilters } from '../../domain/product-filters';

const PARAM = { category: 'category', search: 'q' } as const;

/**
 * Los filtros viven en la URL (fuente única de verdad): se pueden compartir,
 * sobreviven a recargas y funcionan con atrás/adelante del navegador.
 */
export function useCatalogFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawCategory = searchParams.get(PARAM.category);
  const rawSearch = searchParams.get(PARAM.search);
  // Se memoriza por valores primitivos para que la clave de caché sea estable.
  const filters = useMemo<ProductFilters>(
    () => normalizeProductFilters({ category: rawCategory, search: rawSearch }),
    [rawCategory, rawSearch],
  );

  const updateParam = useCallback(
    (key: string, value: string | undefined) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setCategory = useCallback(
    (category: ProductCategory | undefined) => {
      updateParam(PARAM.category, category);
    },
    [updateParam],
  );

  const setSearch = useCallback(
    (search: string) => {
      updateParam(PARAM.search, search.trim() || undefined);
    },
    [updateParam],
  );

  return { filters, setCategory, setSearch } as const;
}

/** Filtros a partir de una URL, para usarlos fuera de React (loaders del router). */
export function parseCatalogFilters(url: URL): ProductFilters {
  return normalizeProductFilters({
    category: url.searchParams.get(PARAM.category),
    search: url.searchParams.get(PARAM.search),
  });
}
