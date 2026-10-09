import { AddToCartButton } from '@/features/cart';
import { ProductCatalog } from '@/features/catalog';

/**
 * Página = composición. Une features independientes (catálogo + carrito)
 * sin que ninguna conozca a la otra.
 */
export function CatalogPage() {
  return (
    <>
      <title>Catálogo · Tienda</title>
      <h1 className="page-title">Catálogo</h1>
      <ProductCatalog ProductAction={AddToCartButton} />
    </>
  );
}
