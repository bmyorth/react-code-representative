import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { QuantityStepper } from './quantity-stepper';

describe('QuantityStepper', () => {
  it('muestra el valor y notifica los cambios', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuantityStepper value={2} max={5} onChange={onChange} label="Taza" />);

    expect(screen.getByRole('group', { name: 'Cantidad de Taza' })).toHaveTextContent('2');

    await user.click(screen.getByRole('button', { name: 'Añadir una unidad de Taza' }));
    await user.click(screen.getByRole('button', { name: 'Quitar una unidad de Taza' }));

    expect(onChange.mock.calls).toEqual([[3], [1]]);
  });

  it('desactiva los botones en los límites', () => {
    render(<QuantityStepper value={1} max={1} onChange={vi.fn()} label="Taza" />);

    expect(screen.getByRole('button', { name: /Quitar/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Añadir/ })).toBeDisabled();
  });
});
