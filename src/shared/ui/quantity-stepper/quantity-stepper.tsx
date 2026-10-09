import { memo } from 'react';

import styles from './quantity-stepper.module.css';

interface QuantityStepperProps {
  readonly value: number;
  readonly min?: number;
  readonly max: number;
  readonly onChange: (value: number) => void;
  /** Nombre del elemento, para que las etiquetas accesibles tengan contexto. */
  readonly label: string;
}

/** Control +/- de cantidad. Es controlado: no guarda estado propio. */
export const QuantityStepper = memo(function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label,
}: QuantityStepperProps) {
  return (
    <div className={styles.stepper} role="group" aria-label={`Cantidad de ${label}`}>
      <button
        type="button"
        className={styles.control}
        onClick={() => {
          onChange(value - 1);
        }}
        disabled={value <= min}
        aria-label={`Quitar una unidad de ${label}`}
      >
        −
      </button>
      <output className={styles.value} aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className={styles.control}
        onClick={() => {
          onChange(value + 1);
        }}
        disabled={value >= max}
        aria-label={`Añadir una unidad de ${label}`}
      >
        +
      </button>
    </div>
  );
});
