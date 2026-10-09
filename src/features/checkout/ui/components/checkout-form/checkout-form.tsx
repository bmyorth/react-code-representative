import { useMutation } from '@tanstack/react-query';
import { type SubmitEvent, useState } from 'react';

import { getErrorMessage } from '@/shared/lib/error-message';
import { formatCurrency } from '@/shared/lib/format-currency';
import { Button, Dialog, TextField } from '@/shared/ui';

import { payCart } from '../../../checkout.container';
import {
  type CardErrors,
  detectBrand,
  formatCardNumber,
  formatExpiry,
  TEST_CARDS,
  toCardDetails,
  validateCard,
} from '../../../domain/card';
import { type CheckoutLine, PaymentError } from '../../../domain/payment-gateway';

import styles from './checkout-form.module.css';

/** Línea del carrito tal y como se muestra en el resumen del pago. */
export interface CheckoutLineView extends CheckoutLine {
  readonly name: string;
  readonly unitPriceInCents: number;
}

interface CheckoutFormProps {
  readonly lines: readonly CheckoutLineView[];
  /** Se llama cuando la pasarela confirma el pago. El pedido pasa a "pagado" al llegar el webhook. */
  readonly onPaid: (orderId: string) => void;
}

interface PendingThreeDSecure {
  readonly resolve: (approved: boolean) => void;
}

const BRAND_LABELS = { visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex', unknown: '' } as const;

/**
 * Formulario de pago con tarjeta. Simula Stripe Elements: valida mientras se escribe, tokeniza la
 * tarjeta contra la pasarela y gestiona el 3D Secure en un diálogo. El importe lo fija el servidor.
 */
export function CheckoutForm({ lines, onPaid }: CheckoutFormProps) {
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '' });
  const [errors, setErrors] = useState<CardErrors>({});
  const [threeDSecure, setThreeDSecure] = useState<PendingThreeDSecure | null>(null);

  // Una clave por carrito: reintentar tras un rechazo reutiliza el mismo pedido en el servidor.
  const linesSignature = JSON.stringify(
    lines.map(({ productId, quantity }) => [productId, quantity]),
  );
  const [attempt, setAttempt] = useState(() => ({
    signature: linesSignature,
    key: crypto.randomUUID(),
  }));
  if (attempt.signature !== linesSignature) {
    // "Ajustar estado al cambiar una prop": React descarta este render y repite con la clave nueva.
    setAttempt({ signature: linesSignature, key: crypto.randomUUID() });
  }

  const total = lines.reduce((sum, line) => sum + line.unitPriceInCents * line.quantity, 0);

  const pay = useMutation({
    mutationFn: () => {
      const details = toCardDetails(card);
      if (!details) throw new PaymentError('La fecha de caducidad no es válida.', 'invalid_expiry');
      return payCart({
        lines: lines.map(({ productId, quantity }) => ({ productId, quantity })),
        card: details,
        idempotencyKey: attempt.key,
        requestThreeDSecure: () =>
          new Promise<boolean>((resolve) => {
            setThreeDSecure({ resolve });
          }),
      });
    },
    onSuccess: ({ orderId }) => {
      onPaid(orderId);
    },
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateCard(card, new Date());
    setErrors(found);
    if (Object.keys(found).length === 0) pay.mutate();
  }

  function answerThreeDSecure(approved: boolean) {
    threeDSecure?.resolve(approved);
    setThreeDSecure(null);
  }

  const brand = BRAND_LABELS[detectBrand(card.number)];
  const failure = pay.error;

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <h2 className={styles.title}>Pago con tarjeta</h2>
        <TextField
          label={brand ? `Número de tarjeta (${brand})` : 'Número de tarjeta'}
          name="cc-number"
          autoComplete="cc-number"
          inputMode="numeric"
          value={card.number}
          onChange={(event) => {
            setCard((current) => ({ ...current, number: formatCardNumber(event.target.value) }));
          }}
          error={errors.number}
        />
        <div className={styles.row}>
          <TextField
            label="Caducidad"
            name="cc-exp"
            autoComplete="cc-exp"
            inputMode="numeric"
            placeholder="MM/AA"
            value={card.expiry}
            onChange={(event) => {
              setCard((current) => ({ ...current, expiry: formatExpiry(event.target.value) }));
            }}
            error={errors.expiry}
          />
          <TextField
            label="CVC"
            name="cc-csc"
            autoComplete="cc-csc"
            inputMode="numeric"
            maxLength={4}
            value={card.cvc}
            onChange={(event) => {
              setCard((current) => ({ ...current, cvc: event.target.value.replace(/\D/g, '') }));
            }}
            error={errors.cvc}
          />
        </div>

        {failure ? (
          <p className={styles.error} role="alert">
            {failure instanceof PaymentError ? failure.message : getErrorMessage(failure)}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={pay.isPending} fullWidth>
          {pay.isPending ? 'Procesando pago…' : `Pagar ${formatCurrency(total)}`}
        </Button>
        <p className={styles.legal}>
          Pago simulado: no se realiza ningún cargo real. El importe definitivo lo calcula el
          servidor.
        </p>

        <details className={styles.testCards}>
          <summary>Tarjetas de prueba</summary>
          <ul>
            {TEST_CARDS.map((testCard) => (
              <li key={testCard.number}>
                <button
                  type="button"
                  className={styles.testCard}
                  onClick={() => {
                    setCard({ number: testCard.number, expiry: '12/30', cvc: '123' });
                    setErrors({});
                  }}
                >
                  <code>{testCard.number}</code> · {testCard.label}
                </button>
              </li>
            ))}
          </ul>
          <p>Caducidad 12/30 y CVC 123 en todas.</p>
        </details>
      </form>

      <Dialog open={threeDSecure !== null} title="Autenticación 3D Secure">
        <p className={styles.dialogText}>
          Tu banco solicita confirmar el pago de {formatCurrency(total)}. Esta es una pantalla
          simulada.
        </p>
        <div className={styles.dialogActions}>
          <Button
            onClick={() => {
              answerThreeDSecure(true);
            }}
          >
            Autorizar pago
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              answerThreeDSecure(false);
            }}
          >
            Rechazar
          </Button>
        </div>
      </Dialog>
    </>
  );
}
