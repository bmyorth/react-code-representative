import { useState } from 'react';

import { env } from '@/shared/config/env';

import { type AuthUser } from '../../../domain/auth';
import { type VerificationChallenge } from '../../../domain/auth-repository';
import { DevOutbox } from '../dev-outbox/dev-outbox';
import { RegisterForm } from '../register-form/register-form';
import { VerifyCodeForm } from '../verify-code-form/verify-code-form';

import styles from './registration-flow.module.css';

interface RegistrationFlowProps {
  readonly onRegistered: (user: AuthUser) => void;
}

/** Registro en dos pasos: datos de la cuenta y confirmación del código de 6 dígitos. */
export function RegistrationFlow({ onRegistered }: RegistrationFlowProps) {
  const [challenge, setChallenge] = useState<VerificationChallenge | null>(null);

  return (
    <div className={styles.flow}>
      {challenge ? (
        <VerifyCodeForm
          challenge={challenge}
          onVerified={onRegistered}
          onRestart={() => {
            setChallenge(null);
          }}
        />
      ) : (
        <RegisterForm
          onChallenge={(next) => {
            setChallenge(next);
          }}
        />
      )}
      {env.isDev ? <DevOutbox /> : null}
    </div>
  );
}
