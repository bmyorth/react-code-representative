/**
 * Dominio de pago: validación de tarjeta y reglas puras. Sin React, sin red.
 * Es validación de usabilidad (feedback inmediato); quien decide es siempre la pasarela de pago.
 */

/** Datos de tarjeta tal y como los escribe el usuario. */
export interface CardInput {
  readonly number: string;
  /** `MM/AA` o `MM/AAAA`. */
  readonly expiry: string;
  readonly cvc: string;
}

/** Tarjeta normalizada, lista para enviarse a la pasarela. */
export interface CardDetails {
  readonly number: string;
  readonly expMonth: number;
  readonly expYear: number;
  readonly cvc: string;
}

/** Errores por campo. Un campo sin error no aparece. */
export type CardErrors = Partial<Record<keyof CardInput, string>>;

/** Deja solo los dígitos de un texto. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Algoritmo de Luhn: detecta errores de tecleo en números de tarjeta. */
export function isLuhnValid(number: string): boolean {
  const digits = digitsOnly(number);
  if (digits.length === 0) return false;
  let sum = 0;
  for (let index = 0; index < digits.length; index += 1) {
    let digit = Number(digits[digits.length - 1 - index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** Marca de la tarjeta según su prefijo. */
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'unknown';

/** Detecta la marca por el prefijo del número. */
export function detectBrand(number: string): CardBrand {
  const digits = digitsOnly(number);
  if (digits.startsWith('4')) return 'visa';
  if (/^5[1-5]/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  return 'unknown';
}

/** Agrupa el número de 4 en 4 mientras se escribe (`4242 4242 4242 4242`). */
export function formatCardNumber(raw: string): string {
  return (
    digitsOnly(raw)
      .slice(0, 19)
      .match(/.{1,4}/g)
      ?.join(' ') ?? ''
  );
}

/** Formatea la caducidad mientras se escribe (`1230` → `12/30`). */
export function formatExpiry(raw: string): string {
  const digits = digitsOnly(raw).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

/** Interpreta `MM/AA` o `MM/AAAA`. Devuelve `null` si no tiene un formato válido. */
export function parseExpiry(expiry: string): { month: number; year: number } | null {
  const match = /^(\d{2})\s*\/\s*(\d{2}|\d{4})$/.exec(expiry.trim());
  if (!match) return null;
  const month = Number(match[1]);
  const rawYear = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { month, year: rawYear < 100 ? 2000 + rawYear : rawYear };
}

/** `true` si el mes/año ya ha pasado (la tarjeta vale hasta el final del mes indicado). */
export function isExpired(expiry: { month: number; year: number }, now: Date): boolean {
  const currentYear = now.getFullYear();
  return (
    expiry.year < currentYear || (expiry.year === currentYear && expiry.month < now.getMonth() + 1)
  );
}

/** Valida los campos de la tarjeta y devuelve un mensaje por cada campo incorrecto. */
export function validateCard(input: CardInput, now: Date): CardErrors {
  const errors: { -readonly [K in keyof CardErrors]: string } = {};
  const number = digitsOnly(input.number);

  if (number.length < 13 || number.length > 19 || !isLuhnValid(number)) {
    errors.number = 'El número de tarjeta no es válido.';
  }

  const expiry = parseExpiry(input.expiry);
  if (!expiry) errors.expiry = 'Usa el formato MM/AA.';
  else if (isExpired(expiry, now)) errors.expiry = 'La tarjeta ha caducado.';

  const cvcLength = detectBrand(number) === 'amex' ? 4 : 3;
  if (!new RegExp(`^\\d{${String(cvcLength)}}$`).test(input.cvc)) {
    errors.cvc = `El CVC tiene ${String(cvcLength)} dígitos.`;
  }

  return errors;
}

/** Convierte una tarjeta ya validada en los datos que espera la pasarela. */
export function toCardDetails(input: CardInput): CardDetails | null {
  const expiry = parseExpiry(input.expiry);
  if (!expiry) return null;
  return {
    number: digitsOnly(input.number),
    expMonth: expiry.month,
    expYear: expiry.year,
    cvc: input.cvc,
  };
}

/** Tarjetas de prueba que entiende el "Stripe" simulado, para mostrarlas en la interfaz. */
export const TEST_CARDS = [
  { number: '4242 4242 4242 4242', label: 'Pago correcto' },
  { number: '4000 0025 0000 3155', label: 'Requiere 3D Secure' },
  { number: '4000 0000 0000 0002', label: 'Rechazada' },
  { number: '4000 0000 0000 9995', label: 'Fondos insuficientes' },
] as const;
