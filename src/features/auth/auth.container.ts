import { queryClient } from '@/shared/lib/query-client';

import { createAuthCommands, createAuthQueries } from './application/auth-queries';
import { httpAuthRepository } from './infrastructure/http-auth-repository';

/**
 * Raíz de composición de la feature: conecta el adaptador HTTP con los casos de uso.
 * Es el único sitio que conoce la implementación concreta.
 */
export const authQueries = createAuthQueries(httpAuthRepository);

/** Casos de uso que cambian la sesión (login, registro, logout…). */
export const authCommands = createAuthCommands(httpAuthRepository, authQueries, queryClient);
