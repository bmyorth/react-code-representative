import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { buildPath } from '@/shared/config/routes';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button, Spinner, StatusMessage } from '@/shared/ui';

import { authCommands, authQueries } from '../../../auth.container';
import { describeUserAgent } from '../../../domain/auth';
import { useSession } from '../../hooks/use-session';

import styles from './account-view.module.css';

const dateFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

/** Perfil del usuario y control de sesiones: ver los dispositivos conectados y cerrarlos. */
export function AccountView() {
  const { user } = useSession();
  const navigate = useNavigate();
  const sessions = useQuery(authQueries.sessions());
  const revoke = useMutation({ mutationFn: authCommands.revokeSession });
  const logoutAll = useMutation({
    mutationFn: authCommands.logoutAllDevices,
    onSuccess: () => {
      void navigate(buildPath.login());
    },
  });

  if (!user) return null;

  return (
    <div className={styles.layout}>
      <section className={styles.card} aria-labelledby="profile-title">
        <h2 id="profile-title" className={styles.title}>
          Perfil
        </h2>
        <dl className={styles.details}>
          <div>
            <dt>Nombre</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>Contacto</dt>
            <dd>{user.identifier}</dd>
          </div>
          <div>
            <dt>Tienda</dt>
            <dd>{user.tenant.name}</dd>
          </div>
          <div>
            <dt>Rol</dt>
            <dd>{user.role === 'admin' ? 'Administrador' : 'Cliente'}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.card} aria-labelledby="sessions-title">
        <h2 id="sessions-title" className={styles.title}>
          Dispositivos y sesiones
        </h2>
        {sessions.isPending ? <Spinner /> : null}
        {sessions.isError ? (
          <StatusMessage tone="error" title="No se pudieron cargar las sesiones" />
        ) : null}
        {sessions.data ? (
          <ul className={styles.sessions}>
            {sessions.data.map((session) => (
              <li key={session.id} className={styles.session}>
                <div>
                  <strong>{describeUserAgent(session.userAgent)}</strong>
                  {session.current ? (
                    <span className={styles.current}> · este dispositivo</span>
                  ) : null}
                  <p className={styles.meta}>
                    IP {session.ip} · última actividad {dateFormat.format(session.lastUsedAt)}
                  </p>
                </div>
                {session.current ? null : (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={revoke.isPending}
                    onClick={() => {
                      revoke.mutate(session.id);
                    }}
                  >
                    Cerrar sesión
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {revoke.isError ? (
          <p role="alert" className={styles.error}>
            {getErrorMessage(revoke.error)}
          </p>
        ) : null}
        <Button
          variant="secondary"
          disabled={logoutAll.isPending}
          onClick={() => {
            logoutAll.mutate();
          }}
        >
          Cerrar sesión en todos los dispositivos
        </Button>
      </section>
    </div>
  );
}
