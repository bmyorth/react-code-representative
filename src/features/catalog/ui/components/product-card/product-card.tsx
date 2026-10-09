import { type ComponentType, memo } from 'react';
import { Link } from 'react-router';

import { buildPath } from '@/shared/config/routes';
import { formatCurrency } from '@/shared/lib/format-currency';

import { isInStock, type Product } from '../../../domain/product';
import { CATEGORY_LABELS } from '../../category-labels';
import { ProductImage } from '../product-image/product-image';
import { Rating } from '../rating/rating';

import styles from './product-card.module.css';

interface ProductCardProps {
  readonly product: Product;
  readonly priority?: boolean;
  /**
   * Componente de acción (p. ej. "Añadir al carrito"). La tarjeta no sabe qué hace.
   * Se recibe como componente, no como elemento, para que su referencia sea estable
   * y `memo` siga evitando renders innecesarios.
   */
  readonly Action?: ComponentType<{ readonly product: Product }> | undefined;
}

/**
 * Tarjeta de producto. Está memorizada: TanStack Query conserva la referencia de los
 * productos que no cambian (structural sharing), así que solo se re-renderiza la tarjeta
 * cuyos datos cambiaron.
 */
export const ProductCard = memo(function ProductCard({
  product,
  priority = false,
  Action,
}: ProductCardProps) {
  const inStock = isInStock(product);

  return (
    <article className={styles.card}>
      <Link to={buildPath.productDetail(product.id)} className={styles.link}>
        <ProductImage src={product.imageUrl} alt="" priority={priority} />
        <div className={styles.body}>
          <p className={styles.category}>{CATEGORY_LABELS[product.category]}</p>
          <h3 className={styles.name}>{product.name}</h3>
          <div className={styles.meta}>
            <span className={styles.price}>{formatCurrency(product.priceInCents)}</span>
            <Rating value={product.rating} />
          </div>
          {inStock ? null : <p className={styles.outOfStock}>Agotado</p>}
        </div>
      </Link>
      {Action ? (
        <div className={styles.action}>
          <Action product={product} />
        </div>
      ) : null}
    </article>
  );
});
