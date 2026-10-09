import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './button';

describe('Button', () => {
  it('es type="button" por defecto para no enviar formularios por accidente', () => {
    render(<Button>Guardar</Button>);

    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveAttribute('type', 'button');
  });

  it('respeta el type y las props nativas', () => {
    render(
      <Button type="submit" disabled aria-describedby="ayuda">
        Enviar
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Enviar' });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-describedby', 'ayuda');
  });
});
