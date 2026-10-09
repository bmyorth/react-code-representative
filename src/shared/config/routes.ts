/**
 * Rutas de la aplicación en un único lugar.
 * Nadie escribe URLs a mano: si una ruta cambia, se cambia solo aquí.
 */
export const routePaths = {
  catalog: '/',
  productDetail: '/products/:productId',
  cart: '/cart',
  login: '/login',
  register: '/register',
  account: '/account',
  checkout: '/checkout',
  orders: '/orders',
  orderDetail: '/orders/:orderId',
  adminOrders: '/admin/orders',
} as const;

/** Construye URLs concretas a partir de las rutas, codificando los parámetros. */
export const buildPath = {
  catalog: () => routePaths.catalog,
  productDetail: (productId: string) => `/products/${encodeURIComponent(productId)}`,
  cart: () => routePaths.cart,
  login: (options: { from?: string; expired?: boolean } = {}) => {
    const params = new URLSearchParams();
    if (options.from) params.set('from', options.from);
    if (options.expired) params.set('reason', 'expired');
    const query = params.toString();
    return query ? `${routePaths.login}?${query}` : routePaths.login;
  },
  register: () => routePaths.register,
  account: () => routePaths.account,
  checkout: () => routePaths.checkout,
  orders: () => routePaths.orders,
  orderDetail: (orderId: string) => `/orders/${encodeURIComponent(orderId)}`,
  adminOrders: () => routePaths.adminOrders,
} as const;
