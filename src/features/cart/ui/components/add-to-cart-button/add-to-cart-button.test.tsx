import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { useCartStore } from '../../../cart.container';
import { type CartProduct } from '../../../domain/cart';

import { AddToCartButton } from './add-to-cart-button';

const product: CartProduct = {
  id: 'reloj',
  name: 'Reloj',
  priceInCents: 19_900,
  imageUrl: 'https://example.com/watch.jpg',
  stock: 2,
};

describe('AddToCartButton', () => {
  afterEach(() => {
    act(() => {
      useCartStore.getState().actions.clear();
    });
  });

  it('añade unidades hasta agotar el stock', async () => {
    const user = userEvent.setup();
    render(<AddToCartButton product={product} />);

    await user.click(screen.getByRole('button', { name: 'Añadir al carrito' }));
    await user.click(screen.getByRole('button', { name: 'Añadir otra (1 en el carrito)' }));

    expect(screen.getByRole('button', { name: 'Máximo alcanzado' })).toBeDisabled();
  });

  it('está desactivado si el producto está agotado', () => {
    render(<AddToCartButton product={{ ...product, stock: 0 }} />);

    expect(screen.getByRole('button', { name: 'Agotado' })).toBeDisabled();
  });
});
