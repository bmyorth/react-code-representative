import { type ProductCategory } from '../domain/product';

/** Textos visibles de cada categoría. Es presentación, por eso vive en `ui` y no en el dominio. */
export const CATEGORY_LABELS: Readonly<Record<ProductCategory, string>> = {
  audio: 'Audio',
  wearables: 'Wearables',
  home: 'Hogar',
  accessories: 'Accesorios',
};
