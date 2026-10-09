import { type Meta, type StoryObj } from '@storybook/react-vite';

import { useCartStore } from '../../../cart.container';
import { type CartProduct } from '../../../domain/cart';

import { CartView } from './cart-view';

const products: readonly CartProduct[] = [
  {
    id: 'auriculares-inalambricos',
    name: 'Auriculares inalámbricos',
    priceInCents: 12_999,
    imageUrl: 'https://picsum.photos/seed/headphones/600/600',
    stock: 14,
  },
  {
    id: 'altavoz-bluetooth',
    name: 'Altavoz Bluetooth',
    priceInCents: 5_999,
    imageUrl: 'https://picsum.photos/seed/speaker/600/600',
    stock: 3,
  },
];

/** Prepara el store real del carrito antes de cada historia y lo vacía al terminar. */
function seedCart(items: readonly (readonly [CartProduct, number])[]) {
  return () => {
    const { actions } = useCartStore.getState();
    actions.clear();
    for (const [product, quantity] of items) actions.add(product, quantity);
    return () => {
      actions.clear();
    };
  };
}

const meta = {
  title: 'Cart/CartView',
  component: CartView,
} satisfies Meta<typeof CartView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { beforeEach: seedCart([]) };

export const WithItems: Story = {
  beforeEach: seedCart(products.map((product, index) => [product, index + 1] as const)),
};
