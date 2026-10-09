import { useMutation } from '@tanstack/react-query';
import { type SubmitEvent, useEffect, useState } from 'react';

import { isApiError } from '@/shared/api';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button, TextField } from '@/shared/ui';

import { authCommands } from '../../../auth.container';
import { type AuthUser, CODE_LENGTH, sanitizeCode, secondsUntil } from '../../../domain/auth';
import { type VerificationChallenge } from '../../../domain/auth-repository';
import styles from '../auth-form.module.css';

interface VerifyCodeFormProps {
  readonly challenge: VerificationChallenge;
  readonly onVerified: (user: AuthUser) => void;
  /** Vuelve al formulario de registro (el desafío caducó o se agotaron los intentos). */
  readonly onRestart: () => void;
}

/** Reloj en segundos que se actualiza una vez por segundo y se limpia al desmontar. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);
  return now;
}

/** Segundo paso del registro: confirmar el código de 6 dígitos, con reenvío y cuenta atrás. */
export function VerifyCodeForm({ challenge: initial, onVerified, onRestart }: VerifyCodeFormProps) {
  const [challenge, setChallenge] = useState(initial);
  const [code, setCode] = useState('');
  const now = useNow();
  const waitSec = secondsUntil(challenge.resendAvailableAt, now);

  const verify = useMutation({
    mutationFn: (value: string) => authCommands.verifyRegistration(challenge.challengeId, value),
    onSuccess: (user) => {
      onVerified(user);
    },
  });
  const resend = useMutation({
    mutationFn: () => authCommands.resendCode(challenge.challengeId),
    onSuccess: (next) => {
      setChallenge(next);
      setCode('');
      verify.reset();
    },
  });

  const failure = verify.error ?? resend.error;
  const isDead = isApiError(failure) && failure.code === 'challenge_expired';
  const attemptsLeft = isApiError(verify.error) ? verify.error.details.attemptsLeft : undefined;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length === CODE_LENGTH) verify.mutate(code);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.title}>Confirma tu código</h1>
      <p className={styles.lead}>
        Hemos enviado un código de {CODE_LENGTH} dígitos a <strong>{challenge.target}</strong>.
      </p>
      <TextField
        label="Código de verificación"
        name="code"
        value={code}
        onChange={(event) => {
          setCode(sanitizeCode(event.target.value));
        }}
        className={styles.codeInput}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH + 4}
        disabled={isDead}
        required
      />
      {failure ? (
        <p className={styles.error} role="alert">
          {getErrorMessage(failure)}
          {typeof attemptsLeft === 'number' ? ` Intentos restantes: ${String(attemptsLeft)}.` : ''}
        </p>
      ) : null}
      <div className={styles.actions}>
        {isDead ? (
          <Button onClick={onRestart}>Volver a empezar</Button>
        ) : (
          <>
            <Button type="submit" disabled={code.length !== CODE_LENGTH || verify.isPending}>
              {verify.isPending ? 'Verificando…' : 'Verificar'}
            </Button>
            <Button
              variant="secondary"
              disabled={waitSec > 0 || resend.isPending}
              onClick={() => {
                resend.mutate();
              }}
            >
              {waitSec > 0 ? `Reenviar en ${String(waitSec)} s` : 'Reenviar código'}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
