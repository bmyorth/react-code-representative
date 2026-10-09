import { z } from 'zod';

/**
 * Variables de entorno validadas al arrancar la app.
 * Un valor inválido rompe el arranque de forma explícita en lugar de fallar en silencio.
 */
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1).default('/api'),
  VITE_ENABLE_MOCKS: z.enum(['true', 'false']).optional(),
  DEV: z.boolean(),
});

const parsed = envSchema.parse(import.meta.env);

/** Configuración de entorno ya validada y con nombres de dominio. */
export const env = {
  apiBaseUrl: parsed.VITE_API_BASE_URL,
  /** Si no se indica, la API simulada se activa solo en desarrollo. */
  enableMocks:
    parsed.VITE_ENABLE_MOCKS === undefined ? parsed.DEV : parsed.VITE_ENABLE_MOCKS === 'true',
  isDev: parsed.DEV,
} as const;
