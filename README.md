# Tienda React · proyecto de referencia

Tienda online (catálogo, detalle, carrito, **registro con código, login, sesiones, multi-tenant,
roles y pago con tarjeta**) construida para mostrar buenas prácticas de arquitectura, rendimiento
y seguridad en React. Incluye un **backend local real** (Node + Hono) que emite cookies `HttpOnly`,
rota tokens, protege contra CSRF y simula Stripe, de modo que todo se puede probar sin servicios
externos.

## Puesta en marcha

```bash
nvm use          # Node 22.22.2+ (ver .nvmrc)
npm install
npm run dev      # web en http://localhost:5173 + API en http://localhost:3001
```

`npm run dev` arranca **dos procesos** (con `concurrently`): la API local (`dev:api`) y Vite
(`dev:web`). Vite reenvía `/api/*` a la API, así que el navegador solo habla con un origen y las
cookies son _same-site_. Los datos viven en memoria: **al reiniciar la API se reinician usuarios,
pedidos y stock**.

| Script                    | Qué hace                                                      |
| ------------------------- | ------------------------------------------------------------- |
| `npm run dev`             | Web + API local a la vez                                      |
| `npm run dev:web`         | Solo Vite (la API debe estar arrancada aparte)                |
| `npm run dev:api`         | Solo la API local, con recarga automática                     |
| `npm run start:api`       | La API local sin recarga                                      |
| `npm run build`           | Comprobación de tipos + build de producción                   |
| `npm run preview`         | Sirve `dist/` con cabeceras de seguridad y CSP estricta       |
| `npm run typecheck`       | Solo comprobación de tipos (web, config y backend)            |
| `npm run lint`            | ESLint (sin warnings permitidos)                              |
| `npm run format:check`    | Prettier en modo verificación                                 |
| `npm test`                | Vitest (web) en modo watch                                    |
| `npm run test:api`        | Tests del backend (una pasada)                                |
| `npm run test:api:watch`  | Tests del backend en modo watch                               |
| `npm run test:coverage`   | Tests web una vez, con informe de cobertura en `coverage/`    |
| `npm run storybook`       | Storybook en http://localhost:6006                            |
| `npm run build-storybook` | Storybook estático en `storybook-static/`                     |
| `npm run validate`        | Formato + lint + tipos + todos los tests (lo mismo que la CI) |

Variables de entorno (ver `.env.example`):

| Variable                | Por defecto                                   | Para qué                                                                |
| ----------------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| `VITE_API_BASE_URL`     | `/api`                                        | URL base de la API que usa el navegador                                 |
| `VITE_ENABLE_MOCKS`     | `false`                                       | `true` activa MSW en el navegador (solo catálogo; sin login ni pagos)   |
| `API_PORT`              | `3001`                                        | Puerto de la API local                                                  |
| `JWT_SECRET`            | aleatorio por arranque                        | Secreto de los access tokens. **Obligatorio en producción** (32+ chars) |
| `ALLOWED_ORIGINS`       | `http://localhost:5173,http://localhost:4173` | Orígenes autorizados a hacer peticiones que modifican datos (CSRF)      |
| `STRIPE_WEBHOOK_SECRET` | aleatorio por arranque                        | Secreto con el que el Stripe simulado firma sus webhooks                |

> **¿Por qué un backend real y no solo MSW?** Un service worker no puede fijar cookies `HttpOnly`
> (el navegador prohíbe `Set-Cookie` en sus respuestas). Para demostrar autenticación con tokens
> en cookies hace falta un servidor HTTP de verdad. MSW sigue usándose en los **tests** y en
> Storybook.

## Cómo probar el proyecto (guía paso a paso)

Arranca con `npm run dev` y abre http://localhost:5173.

### Cuentas de demostración

Contraseña de todas: **`Demo-Pass-2026`**

| Cuenta              | Tienda (tenant) | Rol           |
| ------------------- | --------------- | ------------- |
| `cliente@acme.test` | Acme Store      | Cliente       |
| `admin@acme.test`   | Acme Store      | Administrador |
| `admin@globex.test` | Globex Outlet   | Administrador |

### 1. Registro con código de 6 dígitos

1. **Crear cuenta** → nombre, email (o teléfono `+34 600 111 222`) y contraseña (mín. 10
   caracteres, mayúscula, minúscula y número; los requisitos se marcan en vivo).
2. El backend "envía" un código de 6 dígitos. Como no hay email ni SMS reales, aparece en la
   **bandeja simulada** que se muestra bajo el formulario (solo en desarrollo) y en la consola de
   la API.
3. Introdúcelo. Pruebas interesantes:
   - Código incorrecto → muestra los intentos restantes; al 5.º se invalida el desafío.
   - **Reenviar** está bloqueado 30 s (cuenta atrás) y permite 3 reenvíos como máximo.
   - El código caduca a los 10 minutos.
4. Al confirmar se crea la cuenta (siempre con rol `customer`) y se abre la sesión.

### 2. Login, sesiones y seguridad

- **Iniciar sesión** con una cuenta de demo. Prueba 5 contraseñas incorrectas seguidas: la cuenta
  se bloquea 15 minutos (`429` con `Retry-After`).
- **Mi cuenta** → _Dispositivos y sesiones_: lista de sesiones por dispositivo (navegador, IP,
  última actividad). Abre otra ventana de incógnito, inicia sesión y ciérrala desde la primera;
  o usa _Cerrar sesión en todos los dispositivos_.
- **Caducidad del access token** (10 min) y **refresh transparente**: cuando caduca, el
  interceptor del cliente HTTP refresca la sesión y reintenta la petición sin que el usuario
  note nada. Si el refresh falla (p. ej. sesión revocada desde otro dispositivo), te lleva a
  `/login?reason=expired` _solo_ si estabas en una ruta privada.
- Entra a `/checkout` sin sesión: redirige a `/login?from=/checkout` y, al entrar, vuelve.

### 3. Tenants (multi-tienda)

- Como visitante, el selector **Tienda** de la cabecera cambia entre _Acme_ y _Globex_. Cada una
  tiene su **propia lista de precios** (Globex aplica un 10 % menos): compara el mismo producto.
- Un usuario pertenece a una sola tienda; no puede iniciar sesión en la otra con las mismas
  credenciales ni operar sobre sus datos (`403 tenant_mismatch`).

### 4. Roles

- `cliente@acme.test` no ve el enlace **Administración**. Si abre `/admin/orders` a mano, la ruta
  responde _Acceso denegado_ (y el backend devuelve `403` aunque se salte la interfaz).
- `admin@acme.test` ve **Administración** → pedidos de **toda su tienda** con el nombre del
  cliente. `admin@globex.test` solo ve los de Globex.

### 5. Pago con tarjeta (Stripe simulado)

1. Inicia sesión, añade productos al carrito → **Ir a pagar**.
2. Despliega **Tarjetas de prueba** y elige una (caducidad `12/30`, CVC `123`):

| Tarjeta               | Resultado                                            |
| --------------------- | ---------------------------------------------------- |
| `4242 4242 4242 4242` | Pago correcto                                        |
| `4000 0025 0000 3155` | Pide **3D Secure** (diálogo para autorizar/rechazar) |
| `4000 0000 0000 0002` | Rechazada                                            |
| `4000 0000 0000 9995` | Fondos insuficientes                                 |
| `4000 0000 0000 0069` | Tarjeta caducada                                     |

3. Tras pagar llegas al pedido, que muestra _"Esperando la confirmación del banco…"_ hasta que
   llega el **webhook** firmado (≈ 0,6 s) y pasa a _Pago confirmado_. El stock del catálogo baja.
4. Un pago rechazado deja el pedido pendiente; puedes reintentar con otra tarjeta y se reutiliza
   el mismo pedido (idempotencia).

### 6. Probar la API a mano

```bash
curl -c jar -b jar http://localhost:5173/api/auth/csrf          # obtiene la cookie csrf_token
CSRF=$(grep csrf_token jar | awk '{print $7}')
curl -c jar -b jar -H "X-CSRF-Token: $CSRF" -H "Origin: http://localhost:5173" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"cliente@acme.test","password":"Demo-Pass-2026"}' \
  http://localhost:5173/api/auth/login
curl -b jar http://localhost:5173/api/auth/me
curl http://localhost:5173/api/dev/outbox                        # mensajes simulados (solo desarrollo)
```

## Backend local (`server/`)

API en **Hono** sobre Node, escrita en TypeScript y ejecutada con `tsx`. Se testea con
`app.request(...)` sin abrir puertos. Los datos están en memoria (`server/db.ts`).

```
server/
├── main.ts                 # Arranque HTTP (127.0.0.1:3001)
├── app.ts                  # Composición: middlewares globales, módulos y errores
├── config.ts               # Configuración y valores por defecto seguros
├── db.ts                   # "Base de datos" en memoria + datos de demo
├── lib/                    # crypto, password (scrypt), tokens (JWT), rate-limit, cookies, errores
├── middleware/security.ts  # CSRF, autenticación, tenant, roles, rate limit, cabeceras
├── modules/
│   ├── auth/               # registro, verificación, login, refresh, sesiones
│   ├── catalog/            # productos con precios por tenant
│   ├── orders/             # pedidos del usuario y panel de administración
│   └── payments/           # creación del pago, Stripe simulado y webhook
└── testing/api-client.ts   # Cliente con "jar" de cookies y reloj falso para los tests
```

### Endpoints

| Método y ruta                                                      | Acceso          | Descripción                                         |
| ------------------------------------------------------------------ | --------------- | --------------------------------------------------- |
| `GET /api/auth/csrf`                                               | público         | Emite la cookie CSRF                                |
| `POST /api/auth/register`                                          | público         | Inicia el registro y "envía" el código de 6 dígitos |
| `POST /api/auth/verify`                                            | público         | Confirma el código, crea el usuario y abre sesión   |
| `POST /api/auth/resend`                                            | público         | Reenvía el código (cooldown y máximo)               |
| `POST /api/auth/login`                                             | público         | Inicia sesión                                       |
| `POST /api/auth/refresh`                                           | refresh token   | Rota el refresh token y emite un access token nuevo |
| `POST /api/auth/logout` / `logout-all`                             | sesión          | Cierra esta sesión / todas                          |
| `GET /api/auth/me`                                                 | sesión          | Usuario actual                                      |
| `GET/DELETE /api/auth/sessions[/:id]`                              | sesión          | Lista y cierra sesiones por dispositivo             |
| `GET /api/products[/:id]`                                          | público         | Catálogo con los precios del tenant                 |
| `POST /api/payments/intents`                                       | sesión          | Crea pedido + pago (importe calculado en servidor)  |
| `GET /api/orders[/:id]`                                            | sesión          | Pedidos propios                                     |
| `GET /api/admin/orders`                                            | `admin`         | Pedidos de todo el tenant                           |
| `POST /api/stripe/v1/payment_methods`                              | clave pública   | _Stripe simulado_: tokeniza la tarjeta              |
| `POST /api/stripe/v1/payment_intents/:id/confirm` · `authenticate` | `client_secret` | _Stripe simulado_: confirma / 3D Secure             |
| `POST /api/webhooks/stripe`                                        | firma HMAC      | Receptor del webhook `payment_intent.succeeded`     |
| `GET /api/dev/outbox`                                              | solo dev        | Bandeja de SMS/emails simulados                     |

Los errores tienen siempre la forma `{ "error": { "code": "...", "message": "...", ...detalles } }`;
la interfaz decide por `code`, nunca por el texto.

## Seguridad: qué se implementa y dónde

| Amenaza / necesidad         | Medida                                                                                                                                        | Dónde                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Robo de tokens por XSS      | Tokens **solo en cookies `HttpOnly`** + `SameSite=Strict` (+ `Secure` en producción). JavaScript nunca los ve                                 | `server/lib/http.ts`              |
| Access token robado         | Vida corta (10 min), JWT HS256 con `iss`/`aud`, y comprobación de que la **sesión sigue activa** en cada petición (revocación inmediata)      | `lib/tokens.ts`, `middleware`     |
| Refresh token robado        | **Rotación** en cada uso, guardado solo como hash y con **detección de reutilización** (si reaparece un token ya rotado, se revoca la sesión) | `modules/auth/service.ts`         |
| CSRF                        | Comprobación de `Origin` + **double-submit** (`X-CSRF-Token` = cookie `csrf_token`) en toda petición que modifica datos                       | `middleware/security.ts`          |
| Contraseñas                 | **scrypt** con sal única por usuario, comparación en tiempo constante; política de complejidad                                                | `lib/password.ts`                 |
| Enumeración de usuarios     | Mismo mensaje y mismo tiempo (hash ficticio) para usuario inexistente y contraseña errónea; el registro de una cuenta existente no lo revela  | `modules/auth/routes.ts`          |
| Fuerza bruta                | Bloqueo temporal tras 5 fallos por IP + cuenta, límite global por IP y límite específico en endpoints de auth, `Retry-After`                  | `lib/rate-limit.ts`               |
| Códigos de verificación     | 6 dígitos aleatorios (`crypto.randomInt`), guardados como hash, TTL 10 min, 5 intentos, reenvíos limitados                                    | `modules/auth/routes.ts`          |
| Sesiones                    | Una por dispositivo, máximo 5 simultáneas (se cierra la más antigua), listado y revocación individual o global                                | `modules/auth/routes.ts`          |
| Aislamiento entre tenants   | El tenant sale **del token**; una cabecera distinta es `403`. Todas las consultas filtran por tenant                                          | `middleware/security.ts`          |
| Autorización                | RBAC por middleware (`requireRole`). El rol nunca lo elige el cliente; los pedidos ajenos devuelven `404` (anti-IDOR)                         | `middleware`, `modules/orders`    |
| Manipulación de precios     | El importe lo **calcula el servidor** con el catálogo del tenant; los precios del cliente se ignoran                                          | `modules/payments/routes.ts`      |
| Doble cobro                 | `Idempotency-Key` obligatoria: reintentar devuelve el mismo pedido                                                                            | `modules/payments/routes.ts`      |
| Datos de tarjeta            | El navegador tokeniza **contra la pasarela**; el backend nunca recibe ni guarda el número                                                     | `modules/payments/stripe-sim.ts`  |
| Webhooks falsos o repetidos | Firma HMAC con marca de tiempo (anti-replay) y procesamiento idempotente por id de evento                                                     | `modules/payments/*`              |
| Open redirect tras el login | `?from=` solo admite rutas internas                                                                                                           | `src/shared/lib/safe-redirect.ts` |
| Otros                       | Cabeceras de seguridad, `Cache-Control: no-store`, límite de tamaño del cuerpo, validación de toda entrada con Zod                            | `app.ts`                          |

> Es un backend de demostración: usa almacenamiento en memoria, un único proceso y no sustituye
> a un servicio de autenticación real. Los límites de peticiones tampoco leen `X-Forwarded-For`
> (no hay proxy de confianza): en producción, detrás de un balanceador, hay que configurarlo.

## Interceptores del cliente HTTP

`src/shared/api/http-client.ts` centraliza toda petición a la API:

- **Interceptores de petición** (lista ordenada de funciones): añaden `X-Tenant-Id`, y el token
  `X-CSRF-Token` en las peticiones que modifican datos (pidiendo la cookie si aún no existe, una
  sola vez aunque haya varias peticiones a la vez).
- **Interceptor de respuesta**: si el servidor responde `401 token_expired`, hace un **único
  refresh** (_single-flight_: diez peticiones caducadas comparten un solo refresh) y reintenta la
  original una vez. Si el refresh es rechazado avisa con `onSessionExpired`; si no hay conexión,
  **no** cierra la sesión.
- **Errores normalizados** (`ApiError` con `code`, `status`, `fieldErrors`, `retryAfterSec`).
- Las llamadas a terceros (la pasarela) usan `authenticated: false`: sin cookies, tenant ni CSRF.
- La capa de aplicación decide qué hacer al terminar la sesión (`src/app/session-expiry.ts`): el
  cliente HTTP no conoce el router.

## Stack

| Necesidad           | Elección                                                            | Por qué                                                             |
| ------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Build               | Vite                                                                | Arranque instantáneo y build optimizado                             |
| UI                  | React 19 + TypeScript estricto                                      | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`  |
| Rutas               | React Router 7 (data router)                                        | Loaders, guardas de ruta y carga diferida por ruta                  |
| Estado del servidor | TanStack Query                                                      | Caché, cancelación, reintentos; **la sesión vive aquí**             |
| Estado del cliente  | Zustand                                                             | Suscripción por selector: solo re-renderiza quien lee el dato       |
| Validación          | Zod                                                                 | Respuestas de la API, `localStorage`, entorno y entradas del server |
| Backend local       | Hono + `jose` + `node:crypto`                                       | API real con cookies `HttpOnly`, JWT y scrypt                       |
| Pagos               | Stripe simulado (PaymentIntents)                                    | Mismo flujo que Stripe: tokenizar, confirmar, 3DS y webhook         |
| API simulada (test) | MSW                                                                 | Intercepta `fetch` en la red en tests y Storybook                   |
| Estilos             | CSS Modules + design tokens                                         | Sin runtime y sin colisiones de clases                              |
| Calidad             | ESLint (typescript-eslint strict, react-hooks, jsx-a11y) + Prettier | Reglas de tipos, hooks y accesibilidad                              |
| Tests               | Vitest + Testing Library + MSW                                      | Mismo pipeline que Vite; se prueba como usa la app el usuario       |
| Catálogo de UI      | Storybook 10 (docs + a11y)                                          | Componentes aislados, documentados y con pruebas de interacción     |
| Documentación       | JSDoc (obligatorio vía `eslint-plugin-jsdoc`)                       | Toda API pública explica su porqué                                  |
| CI                  | GitHub Actions                                                      | Cada PR pasa formato, lint, tipos, auditoría, tests y builds        |

## Arquitectura

Estructura **feature-first** con **Clean Architecture** dentro de cada feature:

```
src/
├── app/                 # Arranque: providers, router, layout, error boundary, aviso de sesión caducada
├── pages/               # Composición de features por ruta (+ loaders y guardas: guards.ts)
├── features/
│   ├── catalog/         # Catálogo y detalle
│   ├── cart/            # Carrito (Zustand + localStorage)
│   ├── auth/            # Registro con código, login, sesión, cuenta y dispositivos
│   │   ├── domain/          # Roles, política de contraseña, puertos. TypeScript puro
│   │   ├── application/     # queryOptions y casos de uso que cambian la sesión
│   │   ├── infrastructure/  # Adaptador HTTP, DTO y mapeo con Zod
│   │   ├── ui/              # Componentes y hooks de React
│   │   ├── auth.container.ts  # Raíz de composición (inyección de dependencias)
│   │   └── index.ts         # API pública de la feature
│   └── checkout/        # Pago con tarjeta (+ 3DS) y pedidos. Misma estructura
├── shared/              # Código genérico: ui, api (cliente HTTP + interceptores), config, lib, hooks
├── mocks/               # Datos de ejemplo y handlers MSW (tests y Storybook)
└── test/                # Configuración de Vitest, servidor MSW y utilidades de render
server/                  # Backend local (ver arriba)
```

Los tests (`*.test.ts[x]`) y las historias (`*.stories.tsx`) viven **junto al archivo que
prueban o documentan**.

### Reglas de dependencia

- `domain` no depende de nada: ni React, ni HTTP, ni otras capas (lo impone ESLint).
- `application` depende de `domain` y de **puertos** (interfaces), nunca de implementaciones.
- `infrastructure` implementa los puertos. El `*.container.ts` es el único sitio que conecta ambas.
- Las features **no se importan entre sí**. Desde fuera solo se usa su `index.ts`
  (ESLint bloquea `@/features/<feature>/<interno>`).
- `pages` compone features: por ejemplo, la página de pago toma las líneas del carrito (`cart`) y
  se las pasa al formulario de pago (`checkout`), que no sabe que el carrito existe.
- `shared/api` no conoce ninguna feature: avisa de eventos (`onSessionExpired`) y la app decide.

### Principios aplicados

- **Alta cohesión y bajo acoplamiento**: cada feature agrupa todo lo suyo; se comunican por
  su API pública y por composición.
- **Encapsulamiento**: `index.ts` decide qué es público; DTOs y stores son detalles internos.
- **Composite**: páginas → vistas → componentes pequeños con huecos para componer.
- **Puertos y adaptadores**: la pasarela de pago y la autenticación son interfaces; el caso de uso
  `payWithCard` se prueba con una pasarela falsa, sin red.

## Rendimiento

- **Código y datos en paralelo**: los loaders del router son ligeros y se cargan de inmediato;
  lanzan la petición mientras se descarga el chunk de la página (`lazy`). Sin cascadas.
- **Renders mínimos**:
  - Cada línea del carrito lee su propio dato del store; cambiar una cantidad no repinta las demás.
  - La lista del carrito solo se suscribe a los ids (`useShallow`).
  - `ProductCard` está memorizada y TanStack Query conserva las referencias de los datos que no
    cambian (structural sharing).
  - El buscador guarda el texto en estado local con debounce: escribir no repinta el catálogo.
  - Las acciones del store tienen referencia estable.
- **Sin fugas**: las peticiones se cancelan con `AbortSignal` al desmontar o cambiar de filtro;
  los temporizadores (cuenta atrás de reenvío, polling del pedido) se limpian al desmontar.
- **Bundle**: chunks por ruta y por proveedor; las devtools y MSW solo se descargan cuando se usan.
- **Imágenes**: dimensiones fijas (sin saltos de layout), `loading="lazy"` y `fetchPriority="high"`
  en las visibles al cargar.

## Seguridad en el cliente

- Toda entrada externa se valida con Zod: respuestas de la API, `localStorage`, parámetros de
  URL y variables de entorno. Los datos inválidos se descartan sin romper la app.
- Los tokens nunca pasan por JavaScript: no hay `localStorage` ni estado con tokens.
- Las guardas de ruta (`requireSession`, `requireRole`) mejoran la experiencia, pero **la
  autorización real es siempre la del servidor**.
- Sin `dangerouslySetInnerHTML`; React escapa todo el contenido.
- CSP estricta (`script-src 'self'`, `frame-ancestors 'none'`…) y cabeceras de seguridad en
  `vite preview` (ver `vite.config.ts`); en producción deben replicarse en el servidor o CDN.
- Los errores nunca muestran detalles técnicos al usuario.

## Accesibilidad

Enlace "Saltar al contenido", foco visible, etiquetas accesibles en los controles, errores de
formulario enlazados con `aria-describedby` y anunciados con `role="alert"`, diálogo modal sobre
`<dialog>` nativo (3D Secure), `aria-live` en resultados y cantidades, soporte de
`prefers-reduced-motion` y modo oscuro.

## Tests

[Vitest](https://vitest.dev/) reutiliza la configuración de Vite (alias, plugins) y
[Testing Library](https://testing-library.com/) prueba los componentes como los usa una persona:
por rol y texto accesible, nunca por clases CSS ni detalles internos.

```bash
npm test                 # web, modo watch
npm run test:api         # backend, una pasada
npm run test:coverage    # web + cobertura (coverage/index.html)
npm run validate         # todo lo anterior + formato, lint y tipos
```

Qué se prueba en cada capa:

| Capa             | Ejemplo                                                           | Qué demuestra                                                                            |
| ---------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Dominio          | `cart.test.ts`, `card.test.ts`, `auth.test.ts`                    | Reglas de negocio puras, sin mocks. **Cobertura exigida: 100 %**                         |
| Aplicación       | `cart-store.test.ts`, `pay-with-card.test.ts`                     | Orquestación con puertos falseados (pasarela de pago, persistencia)                      |
| Cliente HTTP     | `http-client.test.ts`                                             | Interceptores: CSRF, tenant, refresh _single-flight_, sesión terminada                   |
| Infraestructura  | `http-product-repository.test.ts`                                 | Contrato de la API, errores normalizados y cancelación                                   |
| Backend: auth    | `server/modules/auth/auth.test.ts`                                | Registro con código, bloqueos, CSRF, rotación y reutilización de refresh, tenants, roles |
| Backend: pagos   | `server/modules/payments/payments.test.ts`                        | Importe en servidor, idempotencia, tarjetas de prueba, 3DS, firma de webhooks, anti-IDOR |
| Seguridad        | `local-storage-cart-persistence.test.ts`, `safe-redirect.test.ts` | Datos manipulados y redirecciones abiertas se descartan                                  |
| Rendimiento      | `use-cart.test.ts`                                                | Cambiar una línea del carrito **no re-renderiza** las demás                              |
| Integración UI   | `registration-flow.test.tsx`, `checkout-form.test.tsx`            | Flujos completos contra handlers MSW: registro, pago, rechazo y 3D Secure                |
| Guardas y sesión | `guards.test.ts`, `session-expiry.test.ts`                        | Redirecciones por sesión y rol; qué pasa al caducar la sesión                            |
| Historias        | `src/test/stories.test.tsx`                                       | Cada historia de Storybook se renderiza y ejecuta su `play`                              |

Los tests web usan MSW (`msw/node`); cualquier petición sin handler hace fallar el test, de modo
que ninguno depende de la red real. Los del backend usan un **reloj falso** para probar
caducidades (tokens, códigos, bloqueos) sin esperar.

## Storybook

```bash
npm run storybook        # http://localhost:6006
```

- Cada componente de UI tiene su historia junto a él (`*.stories.tsx`), con documentación
  generada automáticamente (`autodocs`) a partir de los tipos y del JSDoc.
- El addon de accesibilidad (axe) revisa cada historia.
- Las historias interactivas incluyen una función `play` que se ejecuta también en Vitest.
- Cada historia recibe un `QueryClient` propio que puede sembrarse con
  `parameters.queryData` (ver `UserMenu` y `OrderStatusView`), sin depender de la red.

## Documentación del código

Toda función, componente, tipo o constante **exportada** lleva un comentario JSDoc que explica
su propósito y, sobre todo, el porqué de las decisiones. ESLint (`eslint-plugin-jsdoc`) lo exige
y valida su sintaxis. Los tipos no se repiten en el JSDoc: ya los aporta TypeScript.

## Integración continua

`.github/workflows/ci.yml` se ejecuta en cada PR y en cada push a `main`, con tres trabajos en
paralelo:

1. **Calidad**: Prettier, ESLint, TypeScript (web, config y backend) y `npm audit` de las
   dependencias de producción.
2. **Tests**: Vitest web con cobertura (el informe se publica como artefacto) y tests del backend.
3. **Build**: build de producción de la app y de Storybook (publicado como artefacto).

La CI usa permisos de solo lectura, cancela ejecuciones obsoletas y toma la versión de Node de
`.nvmrc`. Dependabot propone cada semana las actualizaciones de npm y de las acciones.
