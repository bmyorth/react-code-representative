type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Se suscribe a "la sesión ha terminado": el refresh falló o el servidor la revocó.
 * El cliente HTTP no conoce el router ni la caché: solo avisa, y la app decide qué hacer.
 * Devuelve la función para cancelar la suscripción.
 */
export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Notifica a todos los suscriptores. Lo usa el interceptor de respuestas. */
export function notifySessionExpired(): void {
  for (const listener of listeners) listener();
}
