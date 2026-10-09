import { type ComponentPropsWithRef } from 'react';

import { cn } from '@/shared/lib/cn';

import styles from './button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

/** Props del botón: las de `<button>` nativo más variante, tamaño y ancho completo. */
export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly fullWidth?: boolean;
}

/** Botón base del design system. Es `type="button"` por defecto para evitar envíos accidentales. */
export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        className,
      )}
      {...props}
    />
  );
}
