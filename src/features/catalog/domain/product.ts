/**
 * Entidad Producto del catálogo.
 * El dominio es TypeScript puro: no conoce React, HTTP ni el formato de la API.
 */

declare const productIdBrand: unique symbol;

/** Identificador tipado: impide pasar por error cualquier `string` donde se espera un id. */
export type ProductId = string & { readonly [productIdBrand]: true };

/** Categorías válidas. Es la única fuente de verdad para tipos, validación y filtros. */
export const PRODUCT_CATEGORIES = ['audio', 'wearables', 'home', 'accessories'] as const;

/** Categoría de producto, derivada de `PRODUCT_CATEGORIES`. */
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Producto tal y como lo entiende el dominio (independiente del formato de la API). */
export interface Product {
  readonly id: ProductId;
  readonly name: string;
  readonly description: string;
  readonly category: ProductCategory;
  /** Precio en céntimos para evitar errores de coma flotante. */
  readonly priceInCents: number;
  readonly imageUrl: string;
  readonly stock: number;
  /** Valoración media entre 0 y 5. */
  readonly rating: number;
}

const PRODUCT_ID_PATTERN = /^[a-z0-9-]{1,64}$/;

/** Valida y convierte un valor no fiable (p. ej. un parámetro de URL) en `ProductId`. */
export function parseProductId(value: unknown): ProductId | null {
  return typeof value === 'string' && PRODUCT_ID_PATTERN.test(value) ? (value as ProductId) : null;
}

/** Type guard: comprueba que un valor no fiable es una categoría conocida. */
export function isProductCategory(value: unknown): value is ProductCategory {
  return PRODUCT_CATEGORIES.includes(value as ProductCategory);
}

/** Indica si quedan unidades disponibles. */
export function isInStock(product: Pick<Product, 'stock'>): boolean {
  return product.stock > 0;
}
