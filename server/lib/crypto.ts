import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/** Hash SHA-256 en hexadecimal. Sirve para guardar tokens y códigos sin conservarlos en claro. */
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

/** HMAC-SHA256 en hexadecimal (firma de webhooks). */
export const hmacSha256 = (secret: string, payload: string): string =>
  createHmac('sha256', secret).update(payload).digest('hex');

/** Token aleatorio criptográficamente seguro, apto para URLs y cookies. */
export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');

/** Identificador con prefijo legible (`usr_…`, `ses_…`), como hacen las APIs reales. */
export const newId = (prefix: string): string => `${prefix}_${randomBytes(12).toString('hex')}`;

/** Código numérico de 6 dígitos, con ceros a la izquierda. */
export const randomCode = (): string => randomInt(0, 1_000_000).toString().padStart(6, '0');

/** Comparación en tiempo constante: evita filtrar información por diferencias de tiempo. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
