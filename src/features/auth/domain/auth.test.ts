import { describe, expect, it } from 'vitest';

import {
  type AuthUser,
  describeUserAgent,
  evaluatePassword,
  hasRole,
  isPasswordAcceptable,
  sanitizeCode,
  secondsUntil,
} from './auth';

const user: AuthUser = {
  id: 'usr_1',
  name: 'Ana',
  identifier: 'ana@acme.test',
  role: 'customer',
  tenant: { id: 'acme', name: 'Acme Store' },
};

describe('hasRole', () => {
  it('es falso sin usuario', () => {
    expect(hasRole(null, 'admin', 'customer')).toBe(false);
  });

  it('comprueba que el rol del usuario esté entre los admitidos', () => {
    expect(hasRole(user, 'customer')).toBe(true);
    expect(hasRole(user, 'admin', 'customer')).toBe(true);
    expect(hasRole(user, 'admin')).toBe(false);
  });
});

describe('evaluatePassword', () => {
  it('marca cada requisito por separado', () => {
    const states = Object.fromEntries(evaluatePassword('abc').map((r) => [r.id, r.met]));

    expect(states).toEqual({ length: false, lowercase: true, uppercase: false, digit: false });
  });

  it('acepta una contraseña que cumple la política', () => {
    expect(isPasswordAcceptable('Contrasena-Segura-1')).toBe(true);
  });

  it.each(['Corta1a', 'sinmayusculas123', 'SINMINUSCULAS123', 'SinNumeroAlguno'])(
    'rechaza "%s"',
    (password) => {
      expect(isPasswordAcceptable(password)).toBe(false);
    },
  );
});

describe('sanitizeCode', () => {
  it('conserva solo dígitos y recorta a 6', () => {
    expect(sanitizeCode('123 456')).toBe('123456');
    expect(sanitizeCode('12-34-56-78')).toBe('123456');
    expect(sanitizeCode('abc')).toBe('');
  });
});

describe('secondsUntil', () => {
  const now = new Date('2026-10-09T12:00:00Z');

  it('redondea hacia arriba los segundos restantes', () => {
    expect(secondsUntil(new Date('2026-10-09T12:00:29.200Z'), now)).toBe(30);
  });

  it('nunca es negativo', () => {
    expect(secondsUntil(new Date('2026-10-09T11:59:00Z'), now)).toBe(0);
  });
});

describe('describeUserAgent', () => {
  it.each([
    ['Mozilla/5.0 (Windows NT 10.0) Chrome/130 Safari/537', 'Chrome en Windows'],
    ['Mozilla/5.0 (Windows NT 10.0) Chrome/130 Edg/130', 'Edge en Windows'],
    ['Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Firefox/130.0', 'Firefox en Linux'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 14) Safari/605', 'Safari en macOS'],
    ['Mozilla/5.0 (Linux; Android 14) Chrome/130', 'Chrome en Android'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17) Safari/604', 'Safari en iOS'],
  ])('describe %s', (userAgent, expected) => {
    expect(describeUserAgent(userAgent)).toBe(expected);
  });

  it('describe solo el sistema o solo el navegador si falta el otro dato', () => {
    expect(describeUserAgent('curl (Windows)')).toBe('Windows');
    expect(describeUserAgent('Firefox/130')).toBe('Firefox');
  });

  it('usa un texto neutro si no reconoce nada', () => {
    expect(describeUserAgent('vitest')).toBe('Dispositivo desconocido');
  });
});
