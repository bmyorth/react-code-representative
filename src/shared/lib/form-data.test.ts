import { describe, expect, it } from 'vitest';

import { formString } from './form-data';

describe('formString', () => {
  it('devuelve el texto del campo', () => {
    const data = new FormData();
    data.set('nombre', 'Ana');

    expect(formString(data, 'nombre')).toBe('Ana');
  });

  it('devuelve cadena vacía si el campo no existe o no es texto', () => {
    const data = new FormData();
    data.set('archivo', new File(['x'], 'x.txt'));

    expect(formString(data, 'falta')).toBe('');
    expect(formString(data, 'archivo')).toBe('');
  });
});
