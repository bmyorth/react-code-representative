import { type AuthUser, type DeviceSession } from './auth';

/** Credenciales de inicio de sesión. */
export interface LoginInput {
  readonly identifier: string;
  readonly password: string;
}

/** Datos del formulario de registro. */
export interface RegisterInput extends LoginInput {
  readonly name: string;
}

/** Desafío de verificación: el código de 6 dígitos se ha enviado a `target`. */
export interface VerificationChallenge {
  readonly challengeId: string;
  /** Destino enmascarado (`a•••@acme.test`). */
  readonly target: string;
  readonly expiresAt: Date;
  readonly resendAvailableAt: Date;
}

/** Mensaje simulado (email/SMS) de la bandeja de desarrollo. */
export interface DevMessage {
  readonly id: string;
  readonly to: string;
  readonly channel: 'email' | 'sms';
  readonly body: string;
}

/** Puerto de autenticación: el dominio/aplicación no saben si detrás hay HTTP, cookies o un mock. */
export interface AuthRepository {
  /** Usuario de la sesión actual, o `null` si no hay sesión. */
  getSession(signal?: AbortSignal): Promise<AuthUser | null>;
  login(input: LoginInput): Promise<AuthUser>;
  startRegistration(input: RegisterInput): Promise<VerificationChallenge>;
  verifyRegistration(challengeId: string, code: string): Promise<AuthUser>;
  resendCode(challengeId: string): Promise<VerificationChallenge>;
  logout(): Promise<void>;
  logoutAllDevices(): Promise<void>;
  listSessions(signal?: AbortSignal): Promise<readonly DeviceSession[]>;
  revokeSession(sessionId: string): Promise<void>;
  /** Solo desarrollo: lee los últimos mensajes que el backend "ha enviado". */
  readDevMessages(signal?: AbortSignal): Promise<readonly DevMessage[]>;
}
