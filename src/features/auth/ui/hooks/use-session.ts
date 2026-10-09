import { useQuery } from '@tanstack/react-query';

import { authQueries } from '../../auth.container';
import { type AuthUser } from '../../domain/auth';

/** Estado de la sesión actual. `user` es `null` para un visitante y `undefined` mientras carga. */
export function useSession(): {
  readonly user: AuthUser | null | undefined;
  readonly isPending: boolean;
} {
  const { data, isPending } = useQuery(authQueries.session());
  return { user: data, isPending };
}
