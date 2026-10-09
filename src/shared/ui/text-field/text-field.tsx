import { type ComponentPropsWithRef, useId } from 'react';

import { cn } from '@/shared/lib/cn';

import styles from './text-field.module.css';

/** Props del campo: las de `<input>` más etiqueta, ayuda y mensaje de error. */
export interface TextFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'id'> {
  readonly label: string;
  /** Texto de ayuda bajo el campo. */
  readonly hint?: string;
  /** Mensaje de error. Si existe, el campo se marca como inválido y se asocia para lectores de pantalla. */
  readonly error?: string | undefined;
}

/**
 * Campo de formulario accesible: etiqueta visible, ayuda y error enlazados con `aria-describedby`.
 * Los errores se anuncian con `role="alert"` cuando aparecen.
 */
export function TextField({ label, hint, error, className, ...props }: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={cn(styles.field, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...props}
      />
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
