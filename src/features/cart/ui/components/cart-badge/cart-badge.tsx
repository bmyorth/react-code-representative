import { Link } from 'react-router';

import { buildPath } from '@/shared/config/routes';

import { useCartItemCount } from '../../hooks/use-cart';

import styles from './cart-badge.module.css';

/** Acceso al carrito con contador. Solo se re-renderiza cuando cambia el número de unidades. */
export function CartBadge() {
  const count = useCartItemCount();
  const label = count === 1 ? '1 producto' : `${count} productos`;

  return (
    <Link to={buildPath.cart()} className={styles.badge} aria-label={`Carrito, ${label}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" className={styles.icon}>
        <path
          d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="20.5" r="1.3" fill="currentColor" />
        <circle cx="17" cy="20.5" r="1.3" fill="currentColor" />
      </svg>
      {count > 0 ? (
        <span className={styles.count} aria-hidden="true">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
