import { describe, expect, it } from 'vitest';

import { isInStock, isProductCategory, parseProductId, PRODUCT_CATEGORIES } from './product';

describe('parseProductId', () => {
  it.each(['auriculares-inalambricos', 'abc', 'a1-b2', 'x'.repeat(64)])('acepta "%s"', (value) => {
    expect(parseProductId(value)).toBe(value);
  });

  it.each([
    ['vacío', ''],
    ['con mayúsculas', 'Auriculares'],
    ['con path traversal', '../admin'],
    ['con espacios', 'mi producto'],
    ['con HTML', '<script>'],
    ['demasiado largo', 'x'.repeat(65)],
    ['que no es texto', 42],
    ['nulo', null],
    ['indefinido', undefined],
  ])('rechaza un id %s', (_, value) => {
    expect(parseProductId(value)).toBeNull();
  });
});

describe('isProductCategory', () => {
  it.each(PRODUCT_CATEGORIES)('acepta la categoría "%s"', (category) => {
    expect(isProductCategory(category)).toBe(true);
  });

  it.each(['', 'AUDIO', 'toys', null, undefined, 1])('rechaza %j', (value) => {
    expect(isProductCategory(value)).toBe(false);
  });
});

describe('isInStock', () => {
  it('es verdadero si quedan unidades', () => {
    expect(isInStock({ stock: 1 })).toBe(true);
  });

  it('es falso sin unidades', () => {
    expect(isInStock({ stock: 0 })).toBe(false);
  });
});
