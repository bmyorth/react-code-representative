import { type ProductCategory } from '../domain/product';

export const CATEGORY_LABELS: Readonly<Record<ProductCategory, string>> = {
  audio: 'Audio',
  wearables: 'Wearables',
  home: 'Hogar',
  accessories: 'Accesorios',
};
