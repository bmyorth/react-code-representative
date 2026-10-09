import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

import { safeEqual } from './crypto';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/** Hash con scrypt (memory-hard) y sal única por contraseña. Formato: `scrypt$sal$hash`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH);
  return `scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

/** Verifica una contraseña contra su hash en tiempo constante. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const derived = await scrypt(
    password.normalize('NFKC'),
    Buffer.from(salt, 'base64url'),
    KEY_LENGTH,
  );
  return safeEqual(derived.toString('base64url'), hash);
}

/**
 * Hash ficticio contra el que se compara cuando el usuario no existe: así, "usuario inexistente"
 * y "contraseña incorrecta" tardan lo mismo y no permiten enumerar cuentas por tiempo de respuesta.
 */
export const dummyHash: Promise<string> = hashPassword('contraseña-ficticia-no-usar');
