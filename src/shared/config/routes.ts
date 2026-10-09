/**
 * Rutas de la aplicación en un único lugar.
 * Nadie escribe URLs a mano: si una ruta cambia, se cambia solo aquí.
 */
export const routePaths = {
  catalog: '/',
  productDetail: '/products/:productId',
  cart: '/cart',
} as const;

export const buildPath = {
  catalog: () => routePaths.catalog,
  productDetail: (productId: string) => `/products/${encodeURIComponent(productId)}`,
  cart: () => routePaths.cart,
} as const;
