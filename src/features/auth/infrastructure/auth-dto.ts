import { z } from 'zod';

import { type AuthUser, type DeviceSession } from '../domain/auth';
import { type DevMessage, type VerificationChallenge } from '../domain/auth-repository';

/** Contratos de la API de autenticación, validados con Zod en el borde de la aplicación. */
export const userDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  identifier: z.string(),
  role: z.enum(['customer', 'admin']),
  tenant: z.object({ id: z.string(), name: z.string() }),
});

/** Respuesta con un usuario (`/auth/me`, `/auth/login`, `/auth/verify`). */
export const userResponseSchema = z.object({ user: userDtoSchema });

/** Desafío de verificación devuelto por `/auth/register` y `/auth/resend`. */
export const challengeDtoSchema = z.object({
  challengeId: z.string(),
  target: z.string(),
  expiresAt: z.number(),
  resendAvailableAt: z.number(),
});

/** Lista de sesiones por dispositivo. */
export const sessionsResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      userAgent: z.string(),
      ip: z.string(),
      createdAt: z.iso.datetime(),
      lastUsedAt: z.iso.datetime(),
      current: z.boolean(),
    }),
  ),
});

/** Bandeja de mensajes simulados (solo desarrollo). */
export const devMessagesResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      to: z.string(),
      channel: z.enum(['email', 'sms']),
      body: z.string(),
    }),
  ),
});

/** Traduce el DTO del usuario al modelo de dominio. */
export function toAuthUser(dto: z.infer<typeof userDtoSchema>): AuthUser {
  return { ...dto };
}

/** Traduce el DTO del desafío (fechas en milisegundos) al modelo de dominio. */
export function toChallenge(dto: z.infer<typeof challengeDtoSchema>): VerificationChallenge {
  return {
    challengeId: dto.challengeId,
    target: dto.target,
    expiresAt: new Date(dto.expiresAt),
    resendAvailableAt: new Date(dto.resendAvailableAt),
  };
}

/** Traduce las sesiones de dispositivo (fechas ISO) al modelo de dominio. */
export function toDeviceSessions(
  dto: z.infer<typeof sessionsResponseSchema>,
): readonly DeviceSession[] {
  return dto.data.map((session) => ({
    ...session,
    createdAt: new Date(session.createdAt),
    lastUsedAt: new Date(session.lastUsedAt),
  }));
}

/** Traduce los mensajes de la bandeja de desarrollo. */
export function toDevMessages(
  dto: z.infer<typeof devMessagesResponseSchema>,
): readonly DevMessage[] {
  return dto.data;
}
