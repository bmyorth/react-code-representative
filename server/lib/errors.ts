import { type ContentfulStatusCode } from 'hono/utils/http-status';

/** Error de la API con código estable (`code`) que el cliente puede interpretar. */
export class HttpError extends Error {
  override readonly name = 'HttpError';

  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
  }
}

/** Atajos para los errores más habituales. */
export const errors = {
  validation: (fields: Record<string, string>) =>
    new HttpError(400, 'validation_error', 'Hay campos con datos no válidos.', { fields }),
  unauthenticated: () => new HttpError(401, 'unauthenticated', 'Debes iniciar sesión.'),
  forbidden: (message = 'No tienes permiso para esta acción.') =>
    new HttpError(403, 'forbidden', message),
  notFound: (message = 'Recurso no encontrado.') => new HttpError(404, 'not_found', message),
  conflict: (code: string, message: string, details?: Record<string, unknown>) =>
    new HttpError(409, code, message, details),
  tooMany: (retryAfterSec: number) =>
    new HttpError(429, 'too_many_requests', 'Demasiados intentos. Inténtalo más tarde.', {
      retryAfterSec,
    }),
} as const;
