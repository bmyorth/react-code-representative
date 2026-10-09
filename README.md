# Tienda React · proyecto de referencia

Pequeña tienda online (catálogo, detalle de producto y carrito) construida para mostrar
buenas prácticas de arquitectura, rendimiento y seguridad en React. La API está simulada
con [MSW](https://mswjs.io/), así que funciona sin backend.

## Puesta en marcha

```bash
nvm use          # Node 22 (ver .nvmrc)
npm install
npm run dev      # http://localhost:5173
```

| Script                 | Qué hace                                                |
| ---------------------- | ------------------------------------------------------- |
| `npm run dev`          | Servidor de desarrollo con la API simulada              |
| `npm run build`        | Comprobación de tipos + build de producción             |
| `npm run preview`      | Sirve `dist/` con cabeceras de seguridad y CSP estricta |
| `npm run typecheck`    | Solo comprobación de tipos                              |
| `npm run lint`         | ESLint (sin warnings permitidos)                        |
| `npm run format:check` | Prettier en modo verificación                           |

Variables de entorno (ver `.env.example`):

- `VITE_API_BASE_URL`: URL base de la API (por defecto `/api`).
- `VITE_ENABLE_MOCKS`: `true` para usar la API simulada. Por defecto solo en desarrollo;
  para desplegar la demo sin backend, constrúyela con `VITE_ENABLE_MOCKS=true`.

## Stack

| Necesidad           | Elección                                                            | Por qué                                                            |
| ------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Build               | Vite                                                                | Arranque instantáneo y build optimizado                            |
| UI                  | React 19 + TypeScript estricto                                      | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| Rutas               | React Router 7 (data router)                                        | Loaders + carga diferida por ruta                                  |
| Estado del servidor | TanStack Query                                                      | Caché, cancelación, reintentos y deduplicación                     |
| Estado del cliente  | Zustand                                                             | Suscripción por selector: solo re-renderiza quien lee el dato      |
| Validación          | Zod                                                                 | Respuestas de la API, `localStorage` y variables de entorno        |
| API simulada        | MSW                                                                 | Intercepta `fetch` en la red: el código no sabe que es simulada    |
| Estilos             | CSS Modules + design tokens                                         | Sin runtime y sin colisiones de clases                             |
| Calidad             | ESLint (typescript-eslint strict, react-hooks, jsx-a11y) + Prettier | Reglas de tipos, hooks y accesibilidad                             |

## Arquitectura

Estructura **feature-first** con **Clean Architecture** dentro de cada feature:

```
src/
├── app/                 # Arranque: providers, router, layout y error boundary
├── pages/               # Composición de features por ruta (+ loaders)
├── features/
│   ├── catalog/
│   │   ├── domain/          # Entidades, reglas y puertos. TypeScript puro
│   │   ├── application/     # Casos de uso (queryOptions)
│   │   ├── infrastructure/  # Adaptadores: HTTP, DTO y mapeo con Zod
│   │   ├── ui/              # Componentes y hooks de React
│   │   ├── catalog.container.ts  # Raíz de composición (inyección de dependencias)
│   │   └── index.ts         # API pública de la feature
│   └── cart/                # Misma estructura
├── shared/              # Código genérico sin lógica de negocio (ui, api, config, lib, hooks)
└── mocks/               # API simulada (MSW)
```

### Reglas de dependencia

- `domain` no depende de nada: ni React, ni HTTP, ni otras capas (lo impone ESLint).
- `application` depende de `domain` y de **puertos** (interfaces), nunca de implementaciones.
- `infrastructure` implementa los puertos. El `*.container.ts` es el único sitio que conecta ambas.
- Las features **no se importan entre sí**. Desde fuera solo se usa su `index.ts`
  (ESLint bloquea `@/features/<feature>/<interno>`).
- `pages` compone features: por ejemplo, el catálogo recibe el botón del carrito como
  componente inyectado, sin saber que el carrito existe.

### Principios aplicados

- **Alta cohesión y bajo acoplamiento**: cada feature agrupa todo lo suyo; se comunican por
  su API pública y por composición.
- **Encapsulamiento**: `index.ts` decide qué es público; DTOs y stores son detalles internos.
- **Composite**: páginas → vistas → componentes pequeños con huecos para componer
  (`ProductAction`, `renderAction`, `action`).
- **Divide y vencerás**: cada archivo tiene una única responsabilidad (entidad, caso de uso,
  adaptador, componente).

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
  los temporizadores se limpian en el `cleanup` de los efectos.
- **Bundle**: chunks por ruta y por proveedor; las devtools y MSW solo se descargan cuando se usan.
- **Imágenes**: dimensiones fijas (sin saltos de layout), `loading="lazy"` y `fetchPriority="high"`
  en las visibles al cargar.

## Seguridad

- Toda entrada externa se valida con Zod: respuestas de la API, `localStorage`, parámetros de
  URL y variables de entorno. Los datos inválidos se descartan sin romper la app.
- Los ids de ruta se validan antes de llegar a la API y se codifican con `encodeURIComponent`.
- Sin `dangerouslySetInnerHTML`; React escapa todo el contenido.
- CSP estricta (`script-src 'self'`, `frame-ancestors 'none'`…) y cabeceras de seguridad en
  `vite preview` (ver `vite.config.ts`); en producción deben replicarse en el servidor o CDN.
- Los errores nunca muestran detalles técnicos al usuario.

## Accesibilidad

Enlace "Saltar al contenido", foco visible, etiquetas accesibles en los controles, `aria-live` en
resultados y cantidades, `aria-pressed` en los filtros, soporte de `prefers-reduced-motion` y modo
oscuro.
