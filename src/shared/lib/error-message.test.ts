import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api';

import { getErrorMessage } from './error-message';

describe('getErrorMessage', () => {
  it('muestra el mensaje de la API', () => {
    expect(getErrorMessage(new ApiError('Credenciales incorrectas.', 401))).toBe(
      'Credenciales incorrectas.',
    );
  });

  it('añade la espera cuando la API la indica', () => {
    const error = new ApiError('Cuenta bloqueada.', 429, { details: { retryAfterSec: 90 } });

    expect(getErrorMessage(error)).toBe('Cuenta bloqueada. (espera 90 s)');
  });

  it('explica los fallos de conexión', () => {
    expect(getErrorMessage(new ApiError('x', 0))).toMatch(/No se pudo conectar/);
  });

  it('usa un texto genérico para errores desconocidos, sin filtrar detalles', () => {
    expect(getErrorMessage(new Error('TypeError: secreto interno'))).toBe(
      'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
    );
  });
});
