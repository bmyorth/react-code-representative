import { z } from 'zod';

import { PRODUCT_CATEGORIES, type Product, type ProductId } from '../domain/product';

/**
 * Contrato de la API (DTO). Vive en infraestructura: si la API cambia,
 * solo cambia este archivo y el mapeo, nunca el dominio ni la UI.
 */
export const productDtoSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,64}$/),
  name: z.string().min(1).max(120),
  description: z.string().max(2000),
  category: z.enum(PRODUCT_CATEGORIES),
  price: z.object({
    amount: z.number().int().nonnegative(),
    currency: z.literal('EUR'),
  }),
  image: z.url({ protocol: /^https$/ }),
  stock: z.number().int().nonnegative(),
  rating: z.number().min(0).max(5),
});

export const productListDtoSchema = z.object({
  data: z.array(productDtoSchema),
});

export type ProductDto = z.infer<typeof productDtoSchema>;

export function toProduct(dto: ProductDto): Product {
  return {
    id: dto.id as ProductId,
    name: dto.name,
    description: dto.description,
    category: dto.category,
    priceInCents: dto.price.amount,
    imageUrl: dto.image,
    stock: dto.stock,
    rating: dto.rating,
  };
}
