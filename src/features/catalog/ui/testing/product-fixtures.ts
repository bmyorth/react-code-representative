import { products as productRecords } from '@/mocks/data/products';

import { type Product } from '../../domain/product';
import { toProduct } from '../../infrastructure/product-dto';

/**
 * Productos de ejemplo para historias y tests, construidos desde los datos de la
 * API simulada con el mismo mapper que usa la app: no hay datos duplicados.
 */
export const sampleProducts: readonly Product[] = productRecords.map(toProduct);

/** Devuelve un producto de ejemplo por posición, con los cambios indicados. */
export function sampleProduct(index = 0, overrides: Partial<Product> = {}): Product {
  const product = sampleProducts[index];
  if (!product) throw new Error(`No hay producto de ejemplo en la posición ${index}`);
  return { ...product, ...overrides };
}
