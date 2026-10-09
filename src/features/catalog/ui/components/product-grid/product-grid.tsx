import { type ComponentType } from 'react';

import { type Product } from '../../../domain/product';
import { ProductCard } from '../product-card/product-card';

import styles from './product-grid.module.css';

/** Número de tarjetas iniciales que se cargan con prioridad (visibles sin hacer scroll). */
const PRIORITY_IMAGES = 4;

interface ProductGridProps {
  readonly products: readonly Product[];
  /** Acción por producto, inyectada desde fuera para no acoplar el catálogo al carrito. */
  readonly ProductAction?: ComponentType<{ readonly product: Product }>;
}

export function ProductGrid({ products, ProductAction }: ProductGridProps) {
  return (
    <ul className={styles.grid}>
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            priority={index < PRIORITY_IMAGES}
            Action={ProductAction}
          />
        </li>
      ))}
    </ul>
  );
}
