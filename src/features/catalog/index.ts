/**
 * API pública de la feature Catálogo.
 * Todo lo que no se exporta aquí es un detalle interno (encapsulamiento).
 */
export { productQueries } from './catalog.container';
export { parseProductId, type Product, type ProductId } from './domain/product';
export { parseCatalogFilters } from './ui/hooks/use-catalog-filters';
export { ProductCatalog } from './ui/components/product-catalog/product-catalog';
export {
  ProductDetailView,
  ProductNotFound,
} from './ui/components/product-detail-view/product-detail-view';
