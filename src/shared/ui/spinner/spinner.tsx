import styles from './spinner.module.css';

interface SpinnerProps {
  /** Texto accesible que anuncian los lectores de pantalla. */
  readonly label?: string;
}

export function Spinner({ label = 'Cargando…' }: SpinnerProps) {
  return (
    <div className={styles.wrapper} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}
