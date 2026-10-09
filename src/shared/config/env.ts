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
  /**
   * MSW intercepta el catálogo en el navegador. Está desactivado por defecto: la API real
   * (backend local) es la que emite las cookies HttpOnly, algo que un service worker no puede hacer.
   */
  enableMocks: parsed.VITE_ENABLE_MOCKS === 'true',
  isDev: parsed.DEV,
} as const;
