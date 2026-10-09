import { type Product, type ProductId } from './product';
import { type ProductFilters } from './product-filters';

/**
 * Puerto (interfaz) de acceso a productos.
 * La capa de aplicación depende de esta abstracción, no de HTTP: se puede sustituir
 * por otra implementación (GraphQL, caché local, tests) sin tocar el resto.
 */
export interface ProductRepository {
  list(filters: ProductFilters, signal?: AbortSignal): Promise<readonly Product[]>;
  getById(id: ProductId, signal?: AbortSignal): Promise<Product>;
}
