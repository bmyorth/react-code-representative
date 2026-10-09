import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useCartStore } from '../../cart.container';
import { type CartProduct } from '../../domain/cart';

import { useCartItem, useCartItemCount, useCartItemIds } from './use-cart';

const product = (id: string): CartProduct => ({
  id,
  name: id,
  priceInCents: 1_000,
  imageUrl: `https://example.com/${id}.jpg`,
  stock: 10,
});

const actions = () => useCartStore.getState().actions;

/** Renderiza un hook y cuenta cuántas veces se ejecuta su componente. */
function renderCounted<T>(hook: () => T) {
  const counter = { renders: 0 };
  const rendered = renderHook(() => {
    counter.renders += 1;
    return hook();
  });
  return { ...rendered, counter };
}

describe('selectores del carrito', () => {
  afterEach(() => {
    act(() => {
      actions().clear();
    });
  });

  it('cambiar una línea no re-renderiza a quien lee otra línea', () => {
    act(() => {
      actions().add(product('a'));
      actions().add(product('b'));
    });
    const { result, counter } = renderCounted(() => useCartItem('b'));
    const before = counter.renders;

    act(() => {
      actions().setQuantity('a', 5);
    });

    expect(counter.renders).toBe(before);
    expect(result.current?.quantity).toBe(1);
  });

  it('la lista de ids no se re-renderiza al cambiar cantidades', () => {
    act(() => {
      actions().add(product('a'));
    });
    const { result, counter } = renderCounted(useCartItemIds);
    const before = counter.renders;

    act(() => {
      actions().setQuantity('a', 3);
    });
    expect(counter.renders).toBe(before);

    act(() => {
      actions().add(product('b'));
    });
    expect(counter.renders).toBe(before + 1);
    expect(result.current).toEqual(['a', 'b']);
  });

  it('el contador se actualiza al añadir unidades', () => {
    const { result } = renderHook(useCartItemCount);

    act(() => {
      actions().add(product('a'), 2);
      actions().add(product('b'), 3);
    });

    expect(result.current).toBe(5);
  });
});
