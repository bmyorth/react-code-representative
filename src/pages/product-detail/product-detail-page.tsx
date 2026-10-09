import { Link, useParams } from 'react-router';

import { AddToCartButton } from '@/features/cart';
import {
  type Product,
  ProductDetailView,
  ProductNotFound,
  parseProductId,
} from '@/features/catalog';
import { buildPath } from '@/shared/config/routes';

const renderAddToCart = (product: Product) => <AddToCartButton product={product} size="lg" />;

/** Página `/products/:productId`: une la ficha del catálogo con el botón del carrito. */
export function ProductDetailPage() {
  const productId = parseProductId(useParams().productId);

  return (
    <>
      <title>Producto · Tienda</title>
      <Link to={buildPath.catalog()} className="back-link">
        ← Volver al catálogo
      </Link>
      {productId ? (
        <ProductDetailView productId={productId} renderAction={renderAddToCart} />
      ) : (
        <ProductNotFound />
      )}
    </>
  );
}
