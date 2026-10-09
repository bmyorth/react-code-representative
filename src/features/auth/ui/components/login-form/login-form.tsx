import { useMutation } from '@tanstack/react-query';
import { type SubmitEvent } from 'react';

import { isApiError } from '@/shared/api';
import { getErrorMessage } from '@/shared/lib/error-message';
import { formString } from '@/shared/lib/form-data';
import { Button, TextField } from '@/shared/ui';

import { authCommands } from '../../../auth.container';
import { type AuthUser } from '../../../domain/auth';
import styles from '../auth-form.module.css';

interface LoginFormProps {
  /** Se llama con el usuario ya autenticado. La navegación la decide quien compone el formulario. */
  readonly onSuccess: (user: AuthUser) => void;
  /** Aviso previo al formulario (p. ej. "tu sesión ha caducado"). */
  readonly notice?: string;
}

/** Formulario de inicio de sesión con email o teléfono. Muestra errores del servidor por campo. */
export function LoginForm({ onSuccess, notice }: LoginFormProps) {
  const login = useMutation({
    mutationFn: authCommands.login,
    onSuccess: (user) => {
      onSuccess(user);
    },
  });
  const fieldErrors = isApiError(login.error) ? login.error.fieldErrors : {};
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    login.mutate({
      identifier: formString(data, 'identifier'),
      password: formString(data, 'password'),
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.title}>Iniciar sesión</h1>
      {notice ? <p className={styles.notice}>{notice}</p> : null}
      <TextField
        label="Email o teléfono"
        name="identifier"
        autoComplete="username"
        inputMode="email"
        required
        error={fieldErrors.identifier}
      />
      <TextField
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={fieldErrors.password}
      />
      {login.isError && !hasFieldErrors ? (
        <p className={styles.error} role="alert">
          {getErrorMessage(login.error)}
        </p>
      ) : null}
      <Button type="submit" disabled={login.isPending} fullWidth>
        {login.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
      <details className={styles.demo}>
        <summary>Cuentas de demostración</summary>
        <p>
          <code>cliente@acme.test</code> (cliente), <code>admin@acme.test</code> (administrador),{' '}
          <code>admin@globex.test</code> (otra tienda). Contraseña: <code>Demo-Pass-2026</code>
        </p>
      </details>
    </form>
  );
}
