/**
 * Dominio de autenticación: tipos y reglas puras. Sin React, sin red.
 * Las reglas de contraseña replican las del servidor para dar feedback inmediato;
 * la validación que cuenta siempre es la del servidor.
 */

/** Roles de la aplicación. */
export type Role = 'customer' | 'admin';

/** Tienda (tenant) a la que pertenece el usuario. */
export interface TenantInfo {
  readonly id: string;
  readonly name: string;
}

/** Usuario autenticado, tal y como lo necesita la interfaz. */
export interface AuthUser {
  readonly id: string;
  readonly name: string;
  readonly identifier: string;
  readonly role: Role;
  readonly tenant: TenantInfo;
}

/** Sesión de un dispositivo, para la pantalla "Dispositivos y sesiones". */
export interface DeviceSession {
  readonly id: string;
  readonly userAgent: string;
  readonly ip: string;
  readonly createdAt: Date;
  readonly lastUsedAt: Date;
  /** `true` si es la sesión desde la que se está consultando. */
  readonly current: boolean;
}

/** Indica si el usuario tiene alguno de los roles dados. Sin usuario, nunca. */
export function hasRole(user: AuthUser | null, ...roles: readonly Role[]): boolean {
  return user !== null && roles.includes(user.role);
}

/** Requisito de contraseña con su estado de cumplimiento. */
export interface PasswordRequirement {
  readonly id: 'length' | 'lowercase' | 'uppercase' | 'digit';
  readonly label: string;
  readonly met: boolean;
}

/** Longitud mínima de contraseña, igual que en el servidor. */
export const MIN_PASSWORD_LENGTH = 10;

/** Evalúa cada requisito de la política de contraseñas. */
export function evaluatePassword(password: string): readonly PasswordRequirement[] {
  return [
    {
      id: 'length',
      label: `Al menos ${String(MIN_PASSWORD_LENGTH)} caracteres`,
      met: password.length >= MIN_PASSWORD_LENGTH,
    },
    { id: 'lowercase', label: 'Una minúscula', met: /[a-z]/.test(password) },
    { id: 'uppercase', label: 'Una mayúscula', met: /[A-Z]/.test(password) },
    { id: 'digit', label: 'Un número', met: /\d/.test(password) },
  ];
}

/** `true` si la contraseña cumple todos los requisitos. */
export function isPasswordAcceptable(password: string): boolean {
  return evaluatePassword(password).every((requirement) => requirement.met);
}

/** Número de dígitos del código de verificación. */
export const CODE_LENGTH = 6;

/** Deja solo dígitos y recorta al largo del código: tolera pegar "123 456" o "123-456". */
export function sanitizeCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

/** Segundos que faltan hasta una fecha (nunca negativos). Alimenta la cuenta atrás de "reenviar". */
export function secondsUntil(target: Date, now: Date): number {
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 1000));
}

function detectBrowser(userAgent: string): string | null {
  if (userAgent.includes('Edg/')) return 'Edge';
  if (userAgent.includes('Firefox/')) return 'Firefox';
  if (userAgent.includes('Chrome/')) return 'Chrome';
  if (userAgent.includes('Safari/')) return 'Safari';
  return null;
}

function detectSystem(userAgent: string): string | null {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Android')) return 'Android';
  if (/iPhone|iPad/.test(userAgent)) return 'iOS';
  if (userAgent.includes('Mac OS X')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  return null;
}

/** Resumen legible de un `User-Agent` ("Chrome en Windows") para la lista de dispositivos. */
export function describeUserAgent(userAgent: string): string {
  const browser = detectBrowser(userAgent);
  const system = detectSystem(userAgent);
  if (browser && system) return `${browser} en ${system}`;
  return browser ?? system ?? 'Dispositivo desconocido';
}
