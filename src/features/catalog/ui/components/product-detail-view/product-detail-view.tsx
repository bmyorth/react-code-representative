import { type ReactNode } from 'react';
import { Link } from 'react-router';

import { isApiError } from '@/shared/api';
import { buildPath } from '@/shared/config/routes';
import { formatCurrency } from '@/shared/lib/format-currency';
import { Button, Spinner, StatusMessage } from '@/shared/ui';

import { isInStock, type Product, type ProductId } from '../../../domain/product';
import { CATEGORY_LABELS } from '../../category-labels';
import { useProduct } from '../../hooks/use-products';
import { ProductImage } from '../product-image/product-image';
import { Rating } from '../rating/rating';

import styles from './product-detail-view.module.css';

interface ProductDetailViewProps {
  readonly productId: ProductId;
  /** Slot para la acción de compra: se compone desde la página, no desde el catálogo. */
  readonly renderAction?: (product: Product) => ReactNode;
}

const LOW_STOCK_THRESHOLD = 5;

/** Ficha de producto con sus estados de carga, error y "no encontrado". */
export function ProductDetailView({ productId, renderAction }: ProductDetailViewProps) {
  const { data: product, isPending, isError, error, refetch } = useProduct(productId);

  if (isPending) return <Spinner label="Cargando producto…" />;

  if (isError) {
    return isApiError(error) && error.isNotFound ? (
      <ProductNotFound />
    ) : (
      <StatusMessage
        tone="error"
        title="No pudimos cargar el producto"
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
    );
  }

  const inStock = isInStock(product);

  return (
    <article className={styles.detail}>
      <div className={styles.media}>
        <ProductImage src={product.imageUrl} alt={product.name} priority />
      </div>
      <div className={styles.info}>
        <p className={styles.category}>{CATEGORY_LABELS[product.category]}</p>
        <h1 className={styles.name}>{product.name}</h1>
        <Rating value={product.rating} />
        <p className={styles.price}>{formatCurrency(product.priceInCents)}</p>
        <p className={styles.description}>{product.description}</p>
        <p className={styles.stock} data-available={inStock}>
          {inStock
            ? product.stock <= LOW_STOCK_THRESHOLD
              ? `¡Solo quedan ${product.stock}!`
              : 'En stock'
            : 'Agotado'}
        </p>
        {renderAction ? <div className={styles.action}>{renderAction(product)}</div> : null}
      </div>
    </article>
  );
}

/** Estado vacío para un producto inexistente o un id inválido. */
export function ProductNotFound() {
  return (
    <StatusMessage
      title="Producto no encontrado"
      description="Puede que el producto ya no exista o que el enlace sea incorrecto."
      action={<Link to={buildPath.catalog()}>Volver al catálogo</Link>}
    />
  );
}
