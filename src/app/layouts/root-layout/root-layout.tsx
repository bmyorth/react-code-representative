import { Link, Outlet, ScrollRestoration, useNavigation } from 'react-router';

import { CartBadge } from '@/features/cart';
import { buildPath } from '@/shared/config/routes';

import styles from './root-layout.module.css';

/** Layout común: cabecera, contenido de la ruta activa y pie. */
export function RootLayout() {
  const navigation = useNavigation();
  const isNavigating = navigation.state !== 'idle';

  return (
    <>
      <a href="#main-content" className={styles.skipLink}>
        Saltar al contenido
      </a>
      <div className={styles.progress} data-active={isNavigating} aria-hidden="true" />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to={buildPath.catalog()} className={styles.brand}>
            Tienda<span className={styles.brandAccent}>.</span>
          </Link>
          <nav aria-label="Principal">
            <CartBadge />
          </nav>
        </div>
      </header>
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <p>Proyecto de demostración. Los datos provienen de una API simulada.</p>
      </footer>
      <ScrollRestoration />
    </>
  );
}
