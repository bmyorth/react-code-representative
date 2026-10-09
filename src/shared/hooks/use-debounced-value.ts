import { useEffect, useState } from 'react';

/**
 * Devuelve `value` tras `delayMs` sin cambios.
 * El temporizador se limpia en cada cambio y al desmontar: sin fugas de memoria.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [value, delayMs]);

  return debounced;
}
