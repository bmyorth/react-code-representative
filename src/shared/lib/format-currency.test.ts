import { describe, expect, it } from 'vitest';

import { formatCurrency } from './format-currency';

describe('formatCurrency', () => {
  it('formatea céntimos como euros en español', () => {
    // Intl usa un espacio duro (U+00A0) antes del símbolo.
    expect(formatCurrency(12_999)).toBe('129,99\u00a0€');
    expect(formatCurrency(0)).toBe('0,00\u00a0€');
  });
});
