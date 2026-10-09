import { products, type ProductRecord } from '../src/mocks/data/products';

import { newId } from './lib/crypto';
import { hashPassword } from './lib/password';

/** Roles de la aplicación. Cada endpoint declara qué roles admite. */
export type Role = 'customer' | 'admin';
/**
 *
 */
export type IdentifierType = 'email' | 'phone';

/** Inquilino (tienda). Todos los datos de negocio pertenecen a exactamente uno. */
export interface Tenant {
  readonly id: string;
  readonly name: string;
  /** Cada tenant tiene su propia lista de precios: demuestra el aislamiento de datos. */
  readonly priceMultiplier: number;
}

/**
 *
 */
export interface UserRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly identifier: string;
  readonly identifierType: IdentifierType;
  readonly passwordHash: string;
  readonly role: Role;
  readonly createdAt: number;
}

/** Registro pendiente de confirmar el código de 6 dígitos. Aún no existe el usuario. */
export interface PendingRegistration {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly identifier: string;
  readonly identifierType: IdentifierType;
  readonly passwordHash: string;
  /**
   * `true` si la cuenta ya existía: el desafío es un señuelo indistinguible de uno real, pero nunca
   * puede completarse. Así registrar un destino ya usado no revela que existe.
   */
  readonly decoy: boolean;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  resends: number;
  lastSentAt: number;
}

/** Sesión de un dispositivo. El refresh token se guarda solo como hash y se rota en cada uso. */
export interface SessionRecord {
  readonly id: string;
  readonly userId: string;
  readonly tenantId: string;
  refreshHash: string;
  /** Hash del refresh anterior: si reaparece, alguien reutiliza un token robado. */
  previousRefreshHash: string | null;
  readonly userAgent: string;
  readonly ip: string;
  readonly createdAt: number;
  lastUsedAt: number;
  expiresAt: number;
  revokedAt: number | null;
}

/**
 *
 */
export interface OrderItem {
  readonly productId: string;
  readonly name: string;
  readonly unitPriceInCents: number;
  readonly quantity: number;
}

/**
 *
 */
export type OrderStatus = 'pending_payment' | 'paid';

/**
 *
 */
export interface OrderRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly items: readonly OrderItem[];
  readonly amountInCents: number;
  readonly currency: 'EUR';
  status: OrderStatus;
  readonly paymentIntentId: string;
  readonly createdAt: number;
  paidAt: number | null;
}

/**
 *
 */
export type PaymentIntentStatus = 'requires_payment_method' | 'requires_action' | 'succeeded';

/**
 *
 */
export interface PaymentIntentRecord {
  readonly id: string;
  readonly clientSecret: string;
  readonly tenantId: string;
  readonly orderId: string;
  readonly amountInCents: number;
  readonly currency: 'EUR';
  status: PaymentIntentStatus;
  paymentMethodId: string | null;
  /** Resultado que se aplicará al completar el 3D Secure. */
  pendingOutcome: 'succeeded' | null;
}

/**
 *
 */
export interface PaymentMethodRecord {
  readonly id: string;
  readonly brand: string;
  readonly last4: string;
  /** Tarjeta de pruebas completa: solo se usa para decidir el resultado; el PAN nunca se guarda. */
  readonly scenario: string;
}

/** Mensaje simulado (email o SMS) para poder "leer" el código de verificación en desarrollo. */
export interface OutboxMessage {
  readonly id: string;
  readonly to: string;
  readonly channel: 'email' | 'sms';
  readonly body: string;
  readonly sentAt: number;
}

/** "Base de datos" en memoria. Se reinicia con el servidor: ideal para demos y tests. */
export interface Db {
  readonly tenants: Map<string, Tenant>;
  readonly users: Map<string, UserRecord>;
  readonly pendingRegistrations: Map<string, PendingRegistration>;
  readonly sessions: Map<string, SessionRecord>;
  readonly orders: Map<string, OrderRecord>;
  readonly paymentIntents: Map<string, PaymentIntentRecord>;
  readonly paymentMethods: Map<string, PaymentMethodRecord>;
  readonly processedWebhookEvents: Set<string>;
  readonly idempotency: Map<string, unknown>;
  readonly outbox: OutboxMessage[];
  readonly catalog: readonly ProductRecord[];
  readonly stock: Map<string, number>;
}

/** Cuentas de demostración. La contraseña se documenta en el README. */
export const DEMO_PASSWORD = 'Demo-Pass-2026';

/** Crea la base de datos con tenants, usuarios de ejemplo y el stock inicial del catálogo. */
export async function createDb(): Promise<Db> {
  const tenants = new Map<string, Tenant>([
    ['acme', { id: 'acme', name: 'Acme Store', priceMultiplier: 1 }],
    ['globex', { id: 'globex', name: 'Globex Outlet', priceMultiplier: 0.9 }],
  ]);

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const seeds: readonly [string, string, string, Role][] = [
    ['acme', 'admin@acme.test', 'Ana Admin', 'admin'],
    ['acme', 'cliente@acme.test', 'Carlos Cliente', 'customer'],
    ['globex', 'admin@globex.test', 'Gema Admin', 'admin'],
  ];
  const users = new Map<string, UserRecord>();
  for (const [tenantId, identifier, name, role] of seeds) {
    const user: UserRecord = {
      id: newId('usr'),
      tenantId,
      name,
      identifier,
      identifierType: 'email',
      passwordHash,
      role,
      createdAt: Date.now(),
    };
    users.set(user.id, user);
  }

  return {
    tenants,
    users,
    pendingRegistrations: new Map(),
    sessions: new Map(),
    orders: new Map(),
    paymentIntents: new Map(),
    paymentMethods: new Map(),
    processedWebhookEvents: new Set(),
    idempotency: new Map(),
    outbox: [],
    catalog: products,
    stock: new Map(products.map((product) => [product.id, product.stock])),
  };
}
