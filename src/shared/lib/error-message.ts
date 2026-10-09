import { isApiError } from '@/shared/api';

/**
 * Texto de error apto para mostrar al usuario. Los mensajes de la API ya vienen en español y
 * sin detalles técnicos; los fallos de red y los errores desconocidos reciben un texto genérico.
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 0) return 'No se pudo conectar con el servidor. Revisa tu conexión.';
    const wait = error.retryAfterSec;
    return wait === undefined ? error.message : `${error.message} (espera ${String(wait)} s)`;
  }
  return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
}
