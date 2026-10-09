import { Link, useNavigate, useSearchParams } from 'react-router';

import { LoginForm } from '@/features/auth';
import { buildPath } from '@/shared/config/routes';
import { safeRedirectPath } from '@/shared/lib/safe-redirect';

import styles from '../auth-page.module.css';

/** Página `/login`. Tras entrar vuelve a la ruta de origen (`?from=`), validada contra open redirect. */
export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const destination = safeRedirectPath(params.get('from'), buildPath.catalog());
  const expired = params.get('reason') === 'expired';

  return (
    <div className={styles.page}>
      <title>Iniciar sesión · Tienda</title>
      <LoginForm
        {...(expired ? { notice: 'Tu sesión ha caducado. Inicia sesión de nuevo.' } : {})}
        onSuccess={() => {
          void navigate(destination, { replace: true });
        }}
      />
      <p className={styles.alt}>
        ¿No tienes cuenta? <Link to={buildPath.register()}>Regístrate</Link>
      </p>
    </div>
  );
}
