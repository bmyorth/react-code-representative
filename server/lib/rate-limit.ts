/** Ventana fija por clave. Suficiente para un backend local; en producción iría en Redis. */
export function createRateLimiter(options: {
  readonly limit: number;
  readonly windowMs: number;
  readonly now: () => number;
}) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    /** Registra una petición y devuelve si se permite y cuántos segundos faltan para reintentar. */
    hit(key: string): { allowed: boolean; retryAfterSec: number } {
      if (options.limit <= 0) return { allowed: true, retryAfterSec: 0 };
      const now = options.now();
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        hits.set(key, { count: 1, resetAt: now + options.windowMs });
        return { allowed: true, retryAfterSec: 0 };
      }
      entry.count += 1;
      return {
        allowed: entry.count <= options.limit,
        retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
      };
    },
  } as const;
}

/**
 * Bloqueo temporal tras N fallos de login consecutivos para una misma clave (IP + cuenta).
 * Frena la fuerza bruta sin permitir que un tercero bloquee cuentas de forma permanente.
 */
export function createLoginThrottle(options: {
  readonly maxAttempts: number;
  readonly lockoutMs: number;
  readonly now: () => number;
}) {
  const state = new Map<string, { failures: number; lockedUntil: number }>();

  return {
    /** Segundos restantes de bloqueo (0 si puede intentarlo). */
    lockedForSec(key: string): number {
      const entry = state.get(key);
      const remaining = (entry?.lockedUntil ?? 0) - options.now();
      return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
    },
    registerFailure(key: string): void {
      const entry = state.get(key) ?? { failures: 0, lockedUntil: 0 };
      entry.failures += 1;
      if (entry.failures >= options.maxAttempts) {
        entry.failures = 0;
        entry.lockedUntil = options.now() + options.lockoutMs;
      }
      state.set(key, entry);
    },
    reset(key: string): void {
      state.delete(key);
    },
  } as const;
}
