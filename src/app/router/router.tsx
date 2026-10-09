import { createBrowserRouter } from 'react-router';

import { catalogLoader } from '@/pages/catalog/catalog-loader';
import { redirectIfAuthenticated, requireRole, requireSession } from '@/pages/guards';
import { productDetailLoader } from '@/pages/product-detail/product-detail-loader';
import { routePaths } from '@/shared/config/routes';
import { Spinner } from '@/shared/ui';

import { RouteErrorBoundary } from '../error-boundary/route-error-boundary';
import { RootLayout } from '../layouts/root-layout/root-layout';

/**
 * Rutas de la aplicación.
 * - Los loaders son ligeros y se cargan de inmediato: lanzan la petición de datos al instante.
 * - Los componentes de página se cargan bajo demanda (`lazy`): cada página es un chunk propio.
 * Así código y datos se descargan en paralelo, sin cascadas.
 */
export const router = createBrowserRouter([
  {
    path: routePaths.catalog,
    Component: RootLayout,
    ErrorBoundary: RouteErrorBoundary,
    // Se muestra mientras se descarga el código de la primera ruta.
    HydrateFallback: Spinner,
    children: [
      {
        index: true,
        loader: catalogLoader,
        lazy: {
          Component: async () => (await import('@/pages/catalog/catalog-page')).CatalogPage,
        },
      },
      {
        path: routePaths.productDetail,
        loader: productDetailLoader,
        lazy: {
          Component: async () =>
            (await import('@/pages/product-detail/product-detail-page')).ProductDetailPage,
        },
      },
      {
        path: routePaths.cart,
        lazy: {
          Component: async () => (await import('@/pages/cart/cart-page')).CartPage,
        },
      },
      {
        path: routePaths.login,
        loader: redirectIfAuthenticated,
        lazy: { Component: async () => (await import('@/pages/login/login-page')).LoginPage },
      },
      {
        path: routePaths.register,
        loader: redirectIfAuthenticated,
        lazy: {
          Component: async () => (await import('@/pages/register/register-page')).RegisterPage,
        },
      },
      // Rutas privadas: `handle.requiresAuth` permite al aviso de sesión caducada saber si debe redirigir.
      {
        path: routePaths.account,
        loader: requireSession,
        handle: { requiresAuth: true },
        lazy: {
          Component: async () => (await import('@/pages/account/account-page')).AccountPage,
        },
      },
      {
        path: routePaths.checkout,
        loader: requireSession,
        handle: { requiresAuth: true },
        lazy: {
          Component: async () => (await import('@/pages/checkout/checkout-page')).CheckoutPage,
        },
      },
      {
        path: routePaths.orders,
        loader: requireSession,
        handle: { requiresAuth: true },
        lazy: {
          Component: async () => (await import('@/pages/orders/orders-page')).OrdersPage,
        },
      },
      {
        path: routePaths.orderDetail,
        loader: requireSession,
        handle: { requiresAuth: true },
        lazy: {
          Component: async () => (await import('@/pages/orders/order-page')).OrderPage,
        },
      },
      {
        path: routePaths.adminOrders,
        loader: requireRole('admin'),
        handle: { requiresAuth: true },
        lazy: {
          Component: async () => (await import('@/pages/admin/admin-orders-page')).AdminOrdersPage,
        },
      },
      {
        path: '*',
        lazy: {
          Component: async () => (await import('@/pages/not-found/not-found-page')).NotFoundPage,
        },
      },
    ],
  },
]);
