/** Datos extra que la API puede adjuntar a un error (`fields`, `retryAfterSec`, `attemptsLeft`…). */
export type ApiErrorDetails = Readonly<Record<string, unknown>>;

interface ApiErrorOptions extends ErrorOptions {
  /** Código estable de la API (`invalid_credentials`, `token_expired`…): la UI decide con él, no con el texto. */
  readonly code?: string;
  readonly details?: ApiErrorDetails;
}

/** Error normalizado para cualquier fallo de comunicación con la API. */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly status: number;
  readonly code: string | undefined;
  readonly details: ApiErrorDetails;

  constructor(message: string, status: number, options: ApiErrorOptions = {}) {
    super(message, options);
    this.status = status;
    this.code = options.code;
    this.details = options.details ?? {};
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** Errores de validación por campo (`{ password: 'Mínimo 10 caracteres.' }`). */
  get fieldErrors(): Readonly<Record<string, string>> {
    const fields = this.details.fields;
    return typeof fields === 'object' && fields !== null
      ? (fields as Readonly<Record<string, string>>)
      : {};
  }

  /** Segundos de espera indicados por la API (límite de peticiones, bloqueo de cuenta). */
  get retryAfterSec(): number | undefined {
    const value = this.details.retryAfterSec;
    return typeof value === 'number' ? value : undefined;
  }
}

/** Type guard para distinguir errores de la API de cualquier otro error. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
