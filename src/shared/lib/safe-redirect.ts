/**
 * Valida una ruta de retorno (`?from=`) antes de navegar a ella.
 * Solo se aceptan rutas internas: una URL absoluta o `//otro-sitio` sería un "open redirect"
 * que permitiría enviar al usuario a un sitio malicioso tras iniciar sesión.
 */
export function safeRedirectPath(candidate: string | null | undefined, fallback = '/'): string {
  if (!candidate) return fallback;
  const isInternal =
    candidate.startsWith('/') && !candidate.startsWith('//') && !candidate.includes('\\');
  return isInternal ? candidate : fallback;
}
