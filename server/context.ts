import { type ServerConfig } from './config';
import { type Db, type Role, type Tenant } from './db';
import { type createLoginThrottle, type createRateLimiter } from './lib/rate-limit';

/** Dependencias compartidas por todos los módulos. Se inyectan para poder testear con un reloj falso. */
export interface AppContext {
  readonly config: ServerConfig;
  readonly db: Db;
  /** Reloj en milisegundos. Los tests lo adelantan para probar caducidades sin esperar. */
  readonly now: () => number;
  /** Bloqueo por IP + cuenta. */
  readonly loginThrottle: ReturnType<typeof createLoginThrottle>;
  /** Bloqueo por cuenta con independencia de la IP: frena la fuerza bruta distribuida. */
  readonly accountThrottle: ReturnType<typeof createLoginThrottle>;
  /** Tope de registros iniciados por destino y hora (limita los intentos de adivinar el código). */
  readonly registrationLimiter: ReturnType<typeof createRateLimiter>;
  readonly authRateLimiter: ReturnType<typeof createRateLimiter>;
}

/** Identidad ya verificada de la petición actual. */
export interface AuthInfo {
  readonly userId: string;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly role: Role;
}

/** Variables que los middlewares dejan disponibles en el contexto de Hono. */
export interface AppEnv {
  Variables: {
    tenant: Tenant;
    auth: AuthInfo;
    ip: string;
  };
}
