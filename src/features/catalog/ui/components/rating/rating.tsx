import styles from './rating.module.css';

interface RatingProps {
  readonly value: number;
}

const MAX_RATING = 5;

export function Rating({ value }: RatingProps) {
  const rounded = Math.round(value * 10) / 10;
  return (
    <span className={styles.rating}>
      <span aria-hidden="true" className={styles.star}>
        ★
      </span>
      <span className="visually-hidden">Valoración:</span>
      {rounded.toFixed(1)}
      <span className="visually-hidden"> de {MAX_RATING}</span>
    </span>
  );
}
