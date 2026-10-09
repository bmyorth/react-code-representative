import { describe, expect, it } from 'vitest';

import {
  detectBrand,
  digitsOnly,
  formatCardNumber,
  formatExpiry,
  isExpired,
  isLuhnValid,
  parseExpiry,
  toCardDetails,
  validateCard,
} from './card';

const now = new Date(2026, 9, 9); // 9 de octubre de 2026

describe('isLuhnValid', () => {
  it('acepta números válidos aunque lleven espacios', () => {
    expect(isLuhnValid('4242 4242 4242 4242')).toBe(true);
    expect(isLuhnValid('5555555555554444')).toBe(true);
  });

  it('rechaza números con un dígito cambiado o vacíos', () => {
    expect(isLuhnValid('4242 4242 4242 4241')).toBe(false);
    expect(isLuhnValid('')).toBe(false);
  });
});

describe('detectBrand', () => {
  it.each([
    ['4242424242424242', 'visa'],
    ['5555555555554444', 'mastercard'],
    ['378282246310005', 'amex'],
    ['6011111111111117', 'unknown'],
  ])('%s → %s', (number, brand) => {
    expect(detectBrand(number)).toBe(brand);
  });
});

describe('formateo', () => {
  it('agrupa el número de 4 en 4 y limita la longitud', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatCardNumber('4242a42')).toBe('4242 42');
    expect(formatCardNumber('')).toBe('');
    expect(formatCardNumber('1'.repeat(30))).toBe('1111 1111 1111 1111 111');
  });

  it('formatea la caducidad con barra', () => {
    expect(formatExpiry('1')).toBe('1');
    expect(formatExpiry('12')).toBe('12');
    expect(formatExpiry('1230')).toBe('12/30');
    expect(formatExpiry('123099')).toBe('12/30');
  });

  it('digitsOnly elimina todo lo que no es un dígito', () => {
    expect(digitsOnly('12 a-3')).toBe('123');
  });
});

describe('parseExpiry e isExpired', () => {
  it('interpreta años de dos y cuatro dígitos', () => {
    expect(parseExpiry('12/30')).toEqual({ month: 12, year: 2030 });
    expect(parseExpiry('01 / 2031')).toEqual({ month: 1, year: 2031 });
  });

  it.each(['13/30', '00/30', '1230', 'ab/cd', '12/3'])('rechaza "%s"', (value) => {
    expect(parseExpiry(value)).toBeNull();
  });

  it('una tarjeta vale hasta el final del mes indicado', () => {
    expect(isExpired({ month: 10, year: 2026 }, now)).toBe(false);
    expect(isExpired({ month: 9, year: 2026 }, now)).toBe(true);
    expect(isExpired({ month: 1, year: 2025 }, now)).toBe(true);
    expect(isExpired({ month: 1, year: 2027 }, now)).toBe(false);
  });
});

describe('validateCard', () => {
  it('no devuelve errores para una tarjeta correcta', () => {
    expect(
      validateCard({ number: '4242 4242 4242 4242', expiry: '12/30', cvc: '123' }, now),
    ).toEqual({});
  });

  it('devuelve un error por cada campo incorrecto', () => {
    const errors = validateCard({ number: '1234', expiry: '99/99', cvc: '1' }, now);

    expect(Object.keys(errors).sort()).toEqual(['cvc', 'expiry', 'number']);
  });

  it('distingue formato de caducidad y tarjeta caducada', () => {
    const valid = { number: '4242424242424242', cvc: '123' };

    expect(validateCard({ ...valid, expiry: 'xx' }, now).expiry).toBe('Usa el formato MM/AA.');
    expect(validateCard({ ...valid, expiry: '01/20' }, now).expiry).toBe('La tarjeta ha caducado.');
  });

  it('American Express exige un CVC de 4 dígitos', () => {
    const amex = { number: '378282246310005', expiry: '12/30' };

    expect(validateCard({ ...amex, cvc: '123' }, now).cvc).toBe('El CVC tiene 4 dígitos.');
    expect(validateCard({ ...amex, cvc: '1234' }, now)).toEqual({});
  });
});

describe('toCardDetails', () => {
  it('normaliza la tarjeta para la pasarela', () => {
    expect(toCardDetails({ number: '4242 4242 4242 4242', expiry: '12/30', cvc: '123' })).toEqual({
      number: '4242424242424242',
      expMonth: 12,
      expYear: 2030,
      cvc: '123',
    });
  });

  it('devuelve null si la caducidad no es interpretable', () => {
    expect(toCardDetails({ number: '4242', expiry: 'mal', cvc: '123' })).toBeNull();
  });
});
