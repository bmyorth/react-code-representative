import { type QueryClient, queryOptions } from '@tanstack/react-query';

import { type AuthUser } from '../domain/auth';
import {
  type AuthRepository,
  type LoginInput,
  type RegisterInput,
} from '../domain/auth-repository';

const SESSION_STALE_TIME_MS = 5 * 60_000;

/**
 * Lecturas de autenticación como `queryOptions`. La sesión es estado del servidor:
 * vive en la caché de TanStack Query, no en un store del cliente ni en localStorage.
 */
export function createAuthQueries(repository: AuthRepository) {
  const keys = {
    all: ['auth'] as const,
    session: () => [...keys.all, 'session'] as const,
    sessions: () => [...keys.all, 'sessions'] as const,
    devMessages: () => [...keys.all, 'dev-messages'] as const,
  };

  return {
    keys,
    session: () =>
      queryOptions({
        queryKey: keys.session(),
        queryFn: ({ signal }) => repository.getSession(signal),
        staleTime: SESSION_STALE_TIME_MS,
        // Un fallo de red no debe reintentarse en bucle al arrancar: se muestra como visitante.
        retry: false,
      }),
    sessions: () =>
      queryOptions({
        queryKey: keys.sessions(),
        queryFn: ({ signal }) => repository.listSessions(signal),
      }),
    devMessages: () =>
      queryOptions({
        queryKey: keys.devMessages(),
        queryFn: ({ signal }) => repository.readDevMessages(signal),
        staleTime: 0,
      }),
  } as const;
}

/** Conjunto de lecturas de autenticación ya conectado a un repositorio. */
export type AuthQueries = ReturnType<typeof createAuthQueries>;

/**
 * Casos de uso que cambian la sesión. Cada uno llama al repositorio y deja la caché coherente:
 * la sesión actual se escribe directamente (sin esperar a otra petición) y, al salir,
 * se descarta todo lo que pertenecía al usuario anterior.
 */
export function createAuthCommands(
  repository: AuthRepository,
  queries: AuthQueries,
  queryClient: QueryClient,
) {
  const startSession = (user: AuthUser): AuthUser => {
    queryClient.setQueryData(queries.keys.session(), user);
    return user;
  };

  const endSession = (): void => {
    queryClient.clear();
    queryClient.setQueryData(queries.keys.session(), null);
  };

  return {
    login: async (input: LoginInput) => startSession(await repository.login(input)),
    startRegistration: (input: RegisterInput) => repository.startRegistration(input),
    verifyRegistration: async (challengeId: string, code: string) =>
      startSession(await repository.verifyRegistration(challengeId, code)),
    resendCode: (challengeId: string) => repository.resendCode(challengeId),
    logout: async () => {
      try {
        await repository.logout();
      } finally {
        // Aunque el servidor no responda, en este navegador la sesión se da por terminada.
        endSession();
      }
    },
    logoutAllDevices: async () => {
      await repository.logoutAllDevices();
      endSession();
    },
    revokeSession: async (sessionId: string) => {
      await repository.revokeSession(sessionId);
      await queryClient.invalidateQueries({ queryKey: queries.keys.sessions() });
    },
    /** Cierra la sesión localmente cuando el servidor ya la ha invalidado. */
    expireSession: endSession,
  } as const;
}

/** Casos de uso de sesión ya conectados. */
export type AuthCommands = ReturnType<typeof createAuthCommands>;
