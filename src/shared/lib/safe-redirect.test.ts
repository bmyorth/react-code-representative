import { describe, expect, it } from 'vitest';

import { safeRedirectPath } from './safe-redirect';

describe('safeRedirectPath', () => {
  it('acepta rutas internas con parámetros', () => {
    expect(safeRedirectPath('/checkout?a=1#x')).toBe('/checkout?a=1#x');
  });

  it.each([
    'https://sitio-malicioso.example',
    '//sitio-malicioso.example',
    '/\\sitio-malicioso.example',
    'javascript:alert(1)',
    'checkout',
  ])('rechaza "%s"', (candidate) => {
    expect(safeRedirectPath(candidate)).toBe('/');
  });

  it('usa el valor por defecto si no hay ruta', () => {
    expect(safeRedirectPath(null)).toBe('/');
    expect(safeRedirectPath(undefined, '/cuenta')).toBe('/cuenta');
    expect(safeRedirectPath('')).toBe('/');
  });
});
