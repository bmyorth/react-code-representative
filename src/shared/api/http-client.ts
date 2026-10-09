import { type z } from 'zod';

import { env } from '@/shared/config/env';

import { ApiError } from './api-error';

type QueryValue = string | number | boolean | undefined;

interface RequestOptions<TSchema extends z.ZodType> {
  /** Esquema que valida la respuesta: nunca se confía en datos externos sin validar. */
  readonly schema: TSchema;
  readonly query?: Readonly<Record<string, QueryValue>>;
  /** Permite cancelar la petición (TanStack Query lo pasa al desmontar o invalidar). */
  readonly signal?: AbortSignal;
}

function buildUrl(path: string, query?: Readonly<Record<string, QueryValue>>): string {
  const url = new URL(`${env.apiBaseUrl}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/**
 * Cliente HTTP mínimo sobre `fetch`.
 * Responsabilidades: construir la URL, cancelar, normalizar errores y validar la respuesta.
 */
async function get<TSchema extends z.ZodType>(
  path: string,
  { schema, query, signal }: RequestOptions<TSchema>,
): Promise<z.infer<TSchema>> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      ...(signal ? { signal } : {}),
    });
  } catch (cause) {
    // Una cancelación no es un fallo de la API: se propaga tal cual para que TanStack Query la ignore.
    if (signal?.aborted) throw cause;
    throw new ApiError('No se pudo conectar con el servidor.', 0, { cause });
  }

  if (!response.ok) {
    throw new ApiError(`La petición falló (${response.status}).`, response.status);
  }

  const result = schema.safeParse(await response.json());
  if (!result.success) {
    throw new ApiError('La respuesta del servidor no tiene el formato esperado.', 502, {
      cause: result.error,
    });
  }
  return result.data;
}

/** Cliente HTTP de la aplicación. Toda petición a la API pasa por aquí. */
export const httpClient = { get } as const;
