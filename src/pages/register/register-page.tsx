import { Link, useNavigate } from 'react-router';

import { RegistrationFlow } from '@/features/auth';
import { buildPath } from '@/shared/config/routes';

import styles from '../auth-page.module.css';

/** Página `/register`: registro con confirmación de código de 6 dígitos. */
export function RegisterPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <title>Crear cuenta · Tienda</title>
      <RegistrationFlow
        onRegistered={() => {
          void navigate(buildPath.catalog(), { replace: true });
        }}
      />
      <p className={styles.alt}>
        ¿Ya tienes cuenta? <Link to={buildPath.login()}>Inicia sesión</Link>
      </p>
    </div>
  );
}
