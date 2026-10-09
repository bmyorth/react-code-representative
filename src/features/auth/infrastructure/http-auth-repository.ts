import { emptyResponseSchema, httpClient, isApiError } from '@/shared/api';

import { type AuthRepository } from '../domain/auth-repository';

import {
  challengeDtoSchema,
  devMessagesResponseSchema,
  sessionsResponseSchema,
  toAuthUser,
  toChallenge,
  toDeviceSessions,
  toDevMessages,
  userResponseSchema,
} from './auth-dto';

const optionalSignal = (signal?: AbortSignal) => (signal ? { signal } : {});

/**
 * Adaptador HTTP del puerto `AuthRepository`.
 * Los tokens viajan en cookies HttpOnly: este código nunca los ve ni los guarda.
 */
export const httpAuthRepository: AuthRepository = {
  async getSession(signal) {
    try {
      const { user } = await httpClient.get('/auth/me', {
        schema: userResponseSchema,
        ...optionalSignal(signal),
      });
      return toAuthUser(user);
    } catch (error) {
      // Sin sesión no es un fallo: es el estado "visitante".
      if (isApiError(error) && error.isUnauthorized) return null;
      throw error;
    }
  },

  async login(input) {
    const { user } = await httpClient.post('/auth/login', {
      schema: userResponseSchema,
      body: input,
    });
    return toAuthUser(user);
  },

  async startRegistration(input) {
    return toChallenge(
      await httpClient.post('/auth/register', { schema: challengeDtoSchema, body: input }),
    );
  },

  async verifyRegistration(challengeId, code) {
    const { user } = await httpClient.post('/auth/verify', {
      schema: userResponseSchema,
      body: { challengeId, code },
    });
    return toAuthUser(user);
  },

  async resendCode(challengeId) {
    return toChallenge(
      await httpClient.post('/auth/resend', { schema: challengeDtoSchema, body: { challengeId } }),
    );
  },

  async logout() {
    await httpClient.post('/auth/logout', { schema: emptyResponseSchema });
  },

  async logoutAllDevices() {
    await httpClient.post('/auth/logout-all', { schema: emptyResponseSchema });
  },

  async listSessions(signal) {
    return toDeviceSessions(
      await httpClient.get('/auth/sessions', {
        schema: sessionsResponseSchema,
        ...optionalSignal(signal),
      }),
    );
  },

  async revokeSession(sessionId) {
    await httpClient.delete(`/auth/sessions/${encodeURIComponent(sessionId)}`, {
      schema: emptyResponseSchema,
    });
  },

  async readDevMessages(signal) {
    return toDevMessages(
      await httpClient.get('/dev/outbox', {
        schema: devMessagesResponseSchema,
        ...optionalSignal(signal),
      }),
    );
  },
};
