import { memo } from 'react';

import { cn } from '@/shared/lib/cn';

import { PRODUCT_CATEGORIES, type ProductCategory } from '../../../domain/product';
import { CATEGORY_LABELS } from '../../category-labels';

import styles from './category-filter.module.css';

interface CategoryFilterProps {
  readonly value: ProductCategory | undefined;
  readonly onChange: (category: ProductCategory | undefined) => void;
}

const OPTIONS: readonly { value: ProductCategory | undefined; label: string }[] = [
  { value: undefined, label: 'Todo' },
  ...PRODUCT_CATEGORIES.map((category) => ({ value: category, label: CATEGORY_LABELS[category] })),
];

/** Filtro de categorías como botones conmutables (`aria-pressed`). Es controlado y está memorizado. */
export const CategoryFilter = memo(function CategoryFilter({
  value,
  onChange,
}: CategoryFilterProps) {
  return (
    <nav aria-label="Categorías">
      <ul className={styles.list}>
        {OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <li key={option.label}>
              <button
                type="button"
                className={cn(styles.chip, selected && styles.selected)}
                aria-pressed={selected}
                onClick={() => {
                  onChange(option.value);
                }}
              >
                {option.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
});
