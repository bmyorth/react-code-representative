import { createProductQueries } from './application/product-queries';
import { httpProductRepository } from './infrastructure/http-product-repository';

/**
 * Raíz de composición de la feature: único punto donde se conecta
 * la implementación concreta (infraestructura) con los casos de uso (aplicación).
 */
export const productQueries = createProductQueries(httpProductRepository);
