import { memo, useEffect, useId, useRef, useState } from 'react';

import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';

import styles from './search-box.module.css';

interface SearchBoxProps {
  readonly defaultValue: string;
  readonly onSearch: (value: string) => void;
}

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Buscador con estado local: escribir solo re-renderiza este componente.
 * El valor se propaga con debounce, así no se lanza una petición por tecla.
 */
export const SearchBox = memo(function SearchBox({ defaultValue, onSearch }: SearchBoxProps) {
  const inputId = useId();
  const [value, setValue] = useState(defaultValue);
  const debouncedValue = useDebouncedValue(value, SEARCH_DEBOUNCE_MS);

  // Se guarda la última versión del callback sin convertirlo en dependencia del efecto.
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  // Solo se notifica cuando el valor realmente cambia (evita navegaciones redundantes).
  const lastEmittedRef = useRef(defaultValue);
  useEffect(() => {
    if (debouncedValue === lastEmittedRef.current) return;
    lastEmittedRef.current = debouncedValue;
    onSearchRef.current(debouncedValue);
  }, [debouncedValue]);

  return (
    <div className={styles.search}>
      <label htmlFor={inputId} className="visually-hidden">
        Buscar productos
      </label>
      <input
        id={inputId}
        className={styles.input}
        type="search"
        name="q"
        placeholder="Buscar productos…"
        autoComplete="off"
        spellCheck={false}
        maxLength={80}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
      />
    </div>
  );
});
