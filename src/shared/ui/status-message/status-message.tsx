import { type ReactNode } from 'react';

import styles from './status-message.module.css';

interface StatusMessageProps {
  readonly title: string;
  readonly description?: string;
  readonly tone?: 'neutral' | 'error';
  /** Acción opcional (reintentar, volver…). Se compone desde fuera: el componente no la conoce. */
  readonly action?: ReactNode;
}

/** Mensaje de estado vacío o de error, reutilizable en cualquier pantalla. */
export function StatusMessage({
  title,
  description,
  tone = 'neutral',
  action,
}: StatusMessageProps) {
  return (
    <section
      className={styles.status}
      data-tone={tone}
      role={tone === 'error' ? 'alert' : undefined}
    >
      <h2 className={styles.title}>{title}</h2>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </section>
  );
}
