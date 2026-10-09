import { useMutation } from '@tanstack/react-query';
import { type SubmitEvent, useState } from 'react';

import { isApiError } from '@/shared/api';
import { getErrorMessage } from '@/shared/lib/error-message';
import { formString } from '@/shared/lib/form-data';
import { Button, TextField } from '@/shared/ui';

import { authCommands } from '../../../auth.container';
import { isPasswordAcceptable } from '../../../domain/auth';
import { type VerificationChallenge } from '../../../domain/auth-repository';
import styles from '../auth-form.module.css';
import { PasswordRequirements } from '../password-requirements/password-requirements';

interface RegisterFormProps {
  /** Se llama cuando el servidor ha "enviado" el código y hay que pedirlo al usuario. */
  readonly onChallenge: (challenge: VerificationChallenge, identifier: string) => void;
}

/** Primer paso del registro: datos de la cuenta. El segundo paso confirma el código de 6 dígitos. */
export function RegisterForm({ onChallenge }: RegisterFormProps) {
  const [password, setPassword] = useState('');
  const register = useMutation({
    mutationFn: authCommands.startRegistration,
    onSuccess: (challenge, variables) => {
      onChallenge(challenge, variables.identifier);
    },
  });
  const fieldErrors = isApiError(register.error) ? register.error.fieldErrors : {};
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    register.mutate({
      name: formString(data, 'name'),
      identifier: formString(data, 'identifier'),
      password,
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.title}>Crear cuenta</h1>
      <TextField label="Nombre" name="name" autoComplete="name" required error={fieldErrors.name} />
      <TextField
        label="Email o teléfono"
        name="identifier"
        autoComplete="username"
        required
        hint="Te enviaremos un código de 6 dígitos. Teléfono en formato internacional (+34…)."
        error={fieldErrors.identifier}
      />
      <div>
        <TextField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
          error={fieldErrors.password}
        />
        <PasswordRequirements password={password} />
      </div>
      {register.isError && !hasFieldErrors ? (
        <p className={styles.error} role="alert">
          {getErrorMessage(register.error)}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={register.isPending || !isPasswordAcceptable(password)}
        fullWidth
      >
        {register.isPending ? 'Enviando código…' : 'Continuar'}
      </Button>
    </form>
  );
}
