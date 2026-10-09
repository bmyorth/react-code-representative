import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';

import { buildPath } from '@/shared/config/routes';
import { Button } from '@/shared/ui';

import { authCommands } from '../../../auth.container';
import { hasRole } from '../../../domain/auth';
import { useSession } from '../../hooks/use-session';
import { TenantSelect } from '../tenant-select/tenant-select';

import styles from './user-menu.module.css';

/** Zona de usuario de la cabecera: acceso para visitantes y navegación por rol para usuarios. */
export function UserMenu() {
  const { user, isPending } = useSession();
  const navigate = useNavigate();
  const logout = useMutation({
    mutationFn: authCommands.logout,
    onSettled: () => {
      void navigate(buildPath.catalog());
    },
  });

  // Mientras se comprueba la sesión se reserva el hueco: evita que la cabecera "salte".
  if (isPending) return <div className={styles.menu} aria-hidden="true" />;

  if (!user) {
    return (
      <div className={styles.menu}>
        <TenantSelect />
        <Link to={buildPath.login()} className={styles.link}>
          Iniciar sesión
        </Link>
        <Link to={buildPath.register()} className={styles.link}>
          Crear cuenta
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.menu}>
      <Link to={buildPath.orders()} className={styles.link}>
        Mis pedidos
      </Link>
      {hasRole(user, 'admin') ? (
        <Link to={buildPath.adminOrders()} className={styles.link}>
          Administración
        </Link>
      ) : null}
      <Link to={buildPath.account()} className={styles.user}>
        <span>{user.name}</span>
        <span className={styles.badge}>
          {user.tenant.name} · {user.role === 'admin' ? 'Admin' : 'Cliente'}
        </span>
      </Link>
      <Button
        variant="ghost"
        size="sm"
        disabled={logout.isPending}
        onClick={() => {
          logout.mutate();
        }}
      >
        Salir
      </Button>
    </div>
  );
}
