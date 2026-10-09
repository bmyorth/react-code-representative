import { describe, expect, it } from 'vitest';

import { normalizeProductFilters } from './product-filters';

describe('normalizeProductFilters', () => {
  it('conserva una categoría válida y una búsqueda', () => {
    expect(normalizeProductFilters({ category: 'audio', search: 'altavoz' })).toEqual({
      category: 'audio',
      search: 'altavoz',
    });
  });

  it('devuelve filtros vacíos si no hay parámetros', () => {
    expect(normalizeProductFilters({ category: null, search: null })).toEqual({});
    expect(normalizeProductFilters({})).toEqual({});
  });

  it('descarta una categoría desconocida', () => {
    expect(normalizeProductFilters({ category: 'juguetes' })).toEqual({});
  });

  it('recorta los espacios de la búsqueda', () => {
    expect(normalizeProductFilters({ search: '  reloj  ' })).toEqual({ search: 'reloj' });
  });

  it('descarta una búsqueda que solo tiene espacios', () => {
    expect(normalizeProductFilters({ search: '   ' })).toEqual({});
  });

  it('limita la búsqueda a 80 caracteres', () => {
    const { search } = normalizeProductFilters({ search: 'a'.repeat(200) });

    expect(search).toHaveLength(80);
  });
});
