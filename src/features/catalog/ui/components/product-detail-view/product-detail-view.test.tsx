import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { type ProductId } from '../../../domain/product';

import { ProductDetailView } from './product-detail-view';

const API_TIMEOUT = { timeout: 3_000 };
const productId = (value: string) => value as ProductId;

describe('ProductDetailView', () => {
  it('muestra la ficha y compone la acción recibida', async () => {
    renderWithProviders(
      <ProductDetailView
        productId={productId('altavoz-bluetooth')}
        renderAction={(product) => <button type="button">Comprar {product.name}</button>}
      />,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Altavoz Bluetooth' }, API_TIMEOUT),
    ).toBeInTheDocument();
    expect(screen.getByText('¡Solo quedan 3!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comprar Altavoz Bluetooth' })).toBeInTheDocument();
  });

  it('muestra "no encontrado" ante un 404', async () => {
    renderWithProviders(<ProductDetailView productId={productId('no-existe')} />);

    expect(
      await screen.findByRole('heading', { name: 'Producto no encontrado' }, API_TIMEOUT),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al catálogo' })).toHaveAttribute('href', '/');
  });
});
