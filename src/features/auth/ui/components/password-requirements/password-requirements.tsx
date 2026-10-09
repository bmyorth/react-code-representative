import { memo } from 'react';

import { evaluatePassword } from '../../../domain/auth';
import styles from '../auth-form.module.css';

interface PasswordRequirementsProps {
  readonly password: string;
}

/** Lista en vivo de requisitos de la contraseña. Es feedback: la validación real es la del servidor. */
export const PasswordRequirements = memo(function PasswordRequirements({
  password,
}: PasswordRequirementsProps) {
  return (
    <ul className={styles.requirements} aria-label="Requisitos de la contraseña">
      {evaluatePassword(password).map((requirement) => (
        <li key={requirement.id} data-met={requirement.met}>
          {requirement.label}
        </li>
      ))}
    </ul>
  );
});
