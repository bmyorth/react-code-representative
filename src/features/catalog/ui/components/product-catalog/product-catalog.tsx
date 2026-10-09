import { type ComponentType } from 'react';

import { Button, Spinner, StatusMessage } from '@/shared/ui';

import { type Product } from '../../../domain/product';
import { useCatalogFilters } from '../../hooks/use-catalog-filters';
import { useProducts } from '../../hooks/use-products';
import { CategoryFilter } from '../category-filter/category-filter';
import { ProductGrid } from '../product-grid/product-grid';
import { SearchBox } from '../search-box/search-box';

import styles from './product-catalog.module.css';

interface ProductCatalogProps {
  readonly ProductAction?: ComponentType<{ readonly product: Product }>;
}

/** Catálogo completo: filtros + estados de carga/error/vacío + rejilla. */
export function ProductCatalog({ ProductAction }: ProductCatalogProps) {
  const { filters, setCategory, setSearch } = useCatalogFilters();
  const { data: products, isPending, isError, isPlaceholderData, refetch } = useProducts(filters);

  return (
    <div className={styles.catalog}>
      <div className={styles.toolbar}>
        <CategoryFilter value={filters.category} onChange={setCategory} />
        <SearchBox defaultValue={filters.search ?? ''} onSearch={setSearch} />
      </div>

      {isPending ? (
        <Spinner label="Cargando productos…" />
      ) : isError ? (
        <StatusMessage
          tone="error"
          title="No pudimos cargar los productos"
          description="Revisa tu conexión e inténtalo de nuevo."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                void refetch();
              }}
            >
              Reintentar
            </Button>
          }
        />
      ) : products.length === 0 ? (
        <StatusMessage
          title="No hay resultados"
          description="Prueba con otra búsqueda u otra categoría."
        />
      ) : (
        <div
          aria-busy={isPlaceholderData}
          className={styles.results}
          data-stale={isPlaceholderData}
        >
          <p className="visually-hidden" aria-live="polite">
            {products.length} productos encontrados
          </p>
          <ProductGrid products={products} {...(ProductAction ? { ProductAction } : {})} />
        </div>
      )}
    </div>
  );
}
