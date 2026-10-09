/** Error normalizado para cualquier fallo de comunicación con la API. */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly status: number;

  constructor(message: string, status: number, options?: ErrorOptions) {
    super(message, options);
    this.status = status;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

/** Type guard para distinguir errores de la API de cualquier otro error. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
