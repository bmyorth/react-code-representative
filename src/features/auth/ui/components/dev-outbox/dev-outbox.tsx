import { useQuery } from '@tanstack/react-query';

import { authQueries } from '../../../auth.container';

import styles from './dev-outbox.module.css';

const POLL_INTERVAL_MS = 2000;

/**
 * Bandeja de SMS/emails simulados. Solo para desarrollo: sustituye al móvil o al correo para
 * poder leer el código de verificación. Si el endpoint no existe (producción), no pinta nada.
 */
export function DevOutbox() {
  const { data } = useQuery({
    ...authQueries.devMessages(),
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
  });

  if (!data) return null;

  return (
    <aside className={styles.outbox} aria-label="Bandeja simulada (solo desarrollo)">
      <h2 className={styles.title}>Bandeja simulada · solo desarrollo</h2>
      {data.length === 0 ? (
        <p className={styles.empty}>Aún no se ha enviado ningún mensaje.</p>
      ) : (
        <ul className={styles.list}>
          {data.map((message) => (
            <li key={message.id} className={styles.message}>
              <span className={styles.meta}>
                {message.channel === 'sms' ? 'SMS' : 'Email'} → {message.to}
              </span>
              <span>{message.body}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
