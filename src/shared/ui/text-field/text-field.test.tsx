import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TextField } from './text-field';

describe('TextField', () => {
  it('asocia la etiqueta con el campo', () => {
    render(<TextField label="Nombre" />);

    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
  });

  it('enlaza la ayuda y el error con aria-describedby y marca el campo como inválido', () => {
    render(<TextField label="Contraseña" hint="Mínimo 10 caracteres" error="Demasiado corta" />);

    const input = screen.getByLabelText('Contraseña');
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription('Mínimo 10 caracteres Demasiado corta');
    expect(screen.getByRole('alert')).toHaveTextContent('Demasiado corta');
  });

  it('sin error no marca el campo como inválido', () => {
    render(<TextField label="Nombre" />);

    expect(screen.getByLabelText('Nombre')).toBeValid();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
