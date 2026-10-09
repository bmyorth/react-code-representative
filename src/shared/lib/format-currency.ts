const LOCALE = 'es-ES';
const CURRENCY = 'EUR';

// El formateador se crea una sola vez: instanciar Intl en cada render es costoso.
const currencyFormatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY });

/** Formatea un importe expresado en céntimos (enteros, sin errores de coma flotante). */
export function formatCurrency(amountInCents: number): string {
  return currencyFormatter.format(amountInCents / 100);
}
