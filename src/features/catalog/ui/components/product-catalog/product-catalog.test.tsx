import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';

import { ProductCatalog } from './product-catalog';

/** La API simulada tiene latencia; se da margen a las esperas. */
const API_TIMEOUT = { timeout: 3_000 };

const productNames = () =>
  screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);

describe('ProductCatalog', () => {
  it('carga y muestra los productos', async () => {
    renderWithProviders(<ProductCatalog />);

    expect(screen.getByRole('status')).toHaveTextContent('Cargando productos…');
    expect(await screen.findByText(/productos encontrados/, {}, API_TIMEOUT)).toBeInTheDocument();
    expect(productNames().length).toBeGreaterThan(1);
  });

  it('aplica el filtro de categoría de la URL', async () => {
    renderWithProviders(<ProductCatalog />, { route: '/?category=audio' });

    await screen.findByText(/productos encontrados/, {}, API_TIMEOUT);

    expect(screen.getByRole('button', { name: 'Audio' })).toHaveAttribute('aria-pressed', 'true');
    expect(productNames()).toEqual([
      'Auriculares inalámbricos',
      'Altavoz Bluetooth',
      'Auriculares deportivos',
    ]);
  });

  it('busca productos al escribir', async () => {
    const { user } = renderWithProviders(<ProductCatalog />);
    await screen.findByText(/productos encontrados/, {}, API_TIMEOUT);

    await user.type(screen.getByRole('searchbox', { name: 'Buscar productos' }), 'altavoz');

    expect(await screen.findByText('1 productos encontrados', {}, API_TIMEOUT)).toBeInTheDocument();
    expect(productNames()).toEqual(['Altavoz Bluetooth']);
  });

  it('muestra un estado vacío si no hay resultados', async () => {
    renderWithProviders(<ProductCatalog />, { route: '/?q=nada-que-encontrar' });

    expect(
      await screen.findByRole('heading', { name: 'No hay resultados' }, API_TIMEOUT),
    ).toBeInTheDocument();
  });

  it('muestra el error y permite reintentar', async () => {
    server.use(
      http.get('/api/products', () => HttpResponse.json({}, { status: 500 }), { once: true }),
    );
    const { user } = renderWithProviders(<ProductCatalog />);

    const alert = await screen.findByRole('alert', {}, API_TIMEOUT);
    expect(alert).toHaveTextContent('No pudimos cargar los productos');

    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText(/productos encontrados/, {}, API_TIMEOUT)).toBeInTheDocument();
  });
});
