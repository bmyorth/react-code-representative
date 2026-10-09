import { act, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { useCartStore } from '../../../cart.container';
import { type CartProduct } from '../../../domain/cart';

import { CartView } from './cart-view';

const lamp: CartProduct = {
  id: 'lampara',
  name: 'Lámpara',
  priceInCents: 3_500,
  imageUrl: 'https://example.com/lamp.jpg',
  stock: 4,
};

const mug: CartProduct = {
  id: 'taza',
  name: 'Taza',
  priceInCents: 1_200,
  imageUrl: 'https://example.com/mug.jpg',
  stock: 10,
};

const actions = () => useCartStore.getState().actions;

describe('CartView', () => {
  afterEach(() => {
    act(() => {
      actions().clear();
    });
  });

  it('muestra el estado vacío con un enlace al catálogo', () => {
    renderWithProviders(<CartView />);

    expect(screen.getByRole('heading', { name: 'Tu carrito está vacío' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al catálogo' })).toHaveAttribute('href', '/');
  });

  it('lista las líneas y calcula el total', () => {
    act(() => {
      actions().add(lamp, 2);
      actions().add(mug, 1);
    });

    renderWithProviders(<CartView />);

    const lines = within(screen.getByRole('list', { name: 'Productos en el carrito' }));
    expect(lines.getAllByRole('listitem')).toHaveLength(2);

    const summary = within(screen.getByRole('complementary', { name: 'Resumen' }));
    expect(summary.getByText('3')).toBeInTheDocument();
    expect(summary.getByText('82,00 €')).toBeInTheDocument();
  });

  it('cambia la cantidad y elimina líneas', async () => {
    act(() => {
      actions().add(lamp, 1);
      actions().add(mug, 1);
    });
    const { user } = renderWithProviders(<CartView />);

    await user.click(screen.getByRole('button', { name: 'Añadir una unidad de Lámpara' }));
    expect(screen.getByRole('group', { name: 'Cantidad de Lámpara' })).toHaveTextContent('2');

    await user.click(screen.getByRole('button', { name: 'Eliminar Taza del carrito' }));
    expect(screen.queryByRole('link', { name: 'Taza' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Eliminar Lámpara del carrito' }));
    expect(screen.getByRole('heading', { name: 'Tu carrito está vacío' })).toBeInTheDocument();
  });
});
