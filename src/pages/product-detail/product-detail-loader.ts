import { type LoaderFunctionArgs } from 'react-router';

import { parseProductId, productQueries } from '@/features/catalog';
import { noop } from '@/shared/lib/noop';
import { queryClient } from '@/shared/lib/query-client';

/** Precarga el producto en paralelo con el código de la página. Los ids inválidos no llegan a la API. */
export function productDetailLoader({ params }: LoaderFunctionArgs) {
  const productId = parseProductId(params.productId);
  if (productId) {
    // Los errores se ignoran aquí: los gestiona la página con su propio estado de error.
    queryClient.query(productQueries.detail(productId)).catch(noop);
  }
  return null;
}
