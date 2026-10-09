import { createCheckoutQueries } from './application/checkout-queries';
import { payWithCard, type PayWithCardInput } from './application/pay-with-card';
import { httpPaymentGateway } from './infrastructure/http-payment-gateway';

/** Raíz de composición de la feature: conecta la pasarela concreta con los casos de uso. */
export const checkoutQueries = createCheckoutQueries(httpPaymentGateway);

/** Caso de uso "pagar con tarjeta" ya conectado a la pasarela HTTP. */
export const payCart = (input: PayWithCardInput) => payWithCard(httpPaymentGateway, input);
