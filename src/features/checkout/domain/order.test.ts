import { describe, expect, it } from 'vitest';

import { describeOrderStatus, isAwaitingPayment } from './order';

describe('describeOrderStatus', () => {
  it('traduce cada estado', () => {
    expect(describeOrderStatus('paid')).toBe('Pagado');
    expect(describeOrderStatus('pending_payment')).toBe('Pendiente de pago');
  });
});

describe('isAwaitingPayment', () => {
  it('sigue esperando mientras el pedido no esté pagado o aún no se haya cargado', () => {
    expect(isAwaitingPayment(undefined)).toBe(true);
    expect(isAwaitingPayment({ status: 'pending_payment' })).toBe(true);
    expect(isAwaitingPayment({ status: 'paid' })).toBe(false);
  });
});
