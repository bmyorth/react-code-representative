import { type ReactNode, useEffect, useRef } from 'react';

import styles from './dialog.module.css';

interface DialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly children: ReactNode;
  /** Se llama al cerrar con Escape. Si no se pasa, el diálogo solo se cierra desde dentro. */
  readonly onClose?: () => void;
}

/**
 * Diálogo modal sobre `<dialog>` nativo: el navegador gestiona el foco, el atrapado del foco,
 * la capa de fondo y la tecla Escape. Solo se sincroniza el estado `open` de React con `showModal()`.
 */
export function Dialog({ open, title, children, onClose }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose?.();
      }}
    >
      <h2 id="dialog-title" className={styles.title}>
        {title}
      </h2>
      {children}
    </dialog>
  );
}
