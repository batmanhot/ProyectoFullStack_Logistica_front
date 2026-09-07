# StockPro — Frontend

SPA de **StockPro**, un sistema de gestión logística multi-tenant
(inventario, almacenes, compras, ventas, despachos, transporte, portal
B2B, contabilidad ligera, panel SaaS). Este documento describe la
arquitectura actual del frontend: cómo está organizado, cómo se maneja el
estado, la autenticación, y cómo levantarlo en local.

> El backend (NestJS + Prisma + PostgreSQL) vive en `../../back/stockpro-api`
> — ver su propio README para la arquitectura del API. Este documento cubre
> solo el frontend.

---

## 1. Stack

| Pieza | Elección |
|---|---|
| Framework | React 19 |
| Bundler / dev server | Vite 7 |
| Routing | React Router DOM 7 (`BrowserRouter`, sin rutas anidadas — un único árbol `<Routes>` por "modo" de layout, ver §3) |
| Estado de servidor | **TanStack Query 5** — toda la data de negocio vive acá, no en Context |
| Estado de sesión/UI | Context API propio (`store/AppContext.jsx`) — solo sesión, toasts, online/offline |
| Estilos | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Gráficos | Recharts |
| Íconos | Lucide React |
| Fechas | date-fns |
| Exportación | jsPDF + jspdf-autotable (PDF), ExcelJS/xlsx (Excel) |
| PWA / offline | `vite-plugin-pwa` (Workbox) + cola propia en IndexedDB (`services/offlineQueue.js`) |
| Notificaciones | Web Push API (VAPID) — ver §2.9 |
| Tests | Vitest + Testing Library (jsdom) |

---

## 2. Arquitectura general

### 2.1 Server state vs. UI state — la separación clave

El proyecto migró de "todo en Context" a una separación estricta:

- **Datos de negocio** (productos, movimientos, despachos, usuarios, etc.)
  viven en **TanStack Query**, un hook por dominio en `src/queries/*.queries.js`
  (ver §2.4). Nunca se guardan en `AppContext`.
- **`AppContext`** (`src/store/AppContext.jsx`) solo expone: `sesion`
  (usuario logueado), `toast`/`toasts`, `online` (estado de conexión),
  `tienePermiso(modulo)` y `logout()`. Es deliberadamente delgado —
  `usePlanLimits.js` tiene un comentario explícito documentando un bug
  real que causó esta separación: antes `useApp()` exponía datos de
  negocio que nunca se actualizaban, y todo el uso reportado quedaba en 0.

### 2.2 Las tres identidades de autenticación (mismo modelo que el backend)

`services/api.js` maneja **tres contextos de auth independientes**, cada
uno con su propio par de tokens en `localStorage` y su propio flujo de
refresh — nunca se mezclan:

| Contexto | Claves de `localStorage` | Se usa en |
|---|---|---|
| `tenant` (default) | `sp_access_token` / `sp_refresh_token` | Toda la app autenticada normal |
| `admin` | `sp_admin_access_token` / `sp_admin_refresh_token` | `AdminSaaS` (panel SaaS, login separado en `/superadmin`) |
| `portal` / `portal-proveedor` | `sp_portal_token` / `sp_portal_proveedor_token` | `PortalPublico` / `PortalProveedorPublico` — visitante externo con link firmado, sin cuenta de Usuario |

Cada llamada (`api.get/post/put/delete`) recibe `{ authType: 'tenant' | 'admin' | 'portal' | 'portal-proveedor' }`
y adjunta el token correspondiente como `Authorization: Bearer <token>`.
El `empresaId` del tenant viaja **dentro del JWT**, nunca como header
aparte. `sp_session` (localStorage) guarda el objeto de sesión (usuario +
rol + empresa) que `AppContext` restaura al montar.

### 2.3 Modos de layout (`App.jsx`)

`AppLayout` decide qué árbol de rutas renderizar según la URL, **antes**
de cualquier chequeo de sesión — el orden importa:

1. `/landing` → `LandingPage`, siempre pública, sin sidebar.
2. `/portal/:token` y `/portal-proveedor/:token` → páginas públicas con
   su propio JWT (portal cliente / portal proveedor B2B).
3. `/app/:orgId` → `Login` de un tenant específico (siempre visible,
   incluso con sesión activa de otro tenant).
4. Sesión con rol `saas_admin` → `SuperAdminLayout` (solo `AdminSaaS`,
   sin datos de ninguna empresa).
5. Plan de la empresa vencido/suspendido/cancelado → `PlanVencidoScreen`
   (bloquea toda la app salvo logout).
6. Sin sesión → landing/login públicos, cualquier otra ruta cae a landing.
7. Sesión normal de tenant → `Sidebar` + `PageHeader` +
   `PlanVencimientoBanner` (aviso si el plan vence en ≤7 días) + rutas de
   negocio (todas lazy-loaded con `React.lazy`).

Un `ErrorBoundary` envuelve cada árbol de rutas — un error en un módulo
no tumba toda la app, muestra una pantalla de recuperación con botón
"Recargar".

**Agrupación del menú, sin fuente única**: `Sidebar.jsx` (`NAV`, los
`divider`) agrupa las páginas por sección (Inventario, Despachos, Ventas…
ver §5). La misma taxonomía de módulos (mismos `modulo`/`id`) está
**duplicada a mano** en `pages/Usuarios/constants.js` (`MODULOS_GRUPOS`)
para el editor de permisos por rol — no hay una fuente única entre las
dos. Si se agrega, quita o reagrupa un módulo en el Sidebar, replicar el
mismo cambio ahí o el editor de roles queda con una clasificación
distinta a la del menú real (ya pasó una vez).

Un ítem del `NAV` puede llevar además `ocultarPara: ['codigoRol', …]` —
lo oculta para ese rol puntual sin tocar el permiso de módulo (que puede
seguir haciendo falta para otra pantalla que comparte el mismo `modulo`,
o para llamadas de API de otras vistas). Ejemplo real: el rol `chofer`
tiene el permiso `despachos` (lo necesita para "Trazabilidad Pedidos" y
para que `Transportes`/`Panel de Chofer` lean datos de despacho
embebidos), pero no debe ver la pantalla completa de "Despachos" — se
oculta con `ocultarPara: ['chofer']` en vez de quitarle el permiso.

### 2.4 Capa de datos (`src/queries/`)

Un archivo por dominio (`productos.queries.js`, `despachos.queries.js`,
…), cada uno exporta hooks `useXxxList`/`useXxx`/`useCrearXxx`/etc. sobre
`useQuery`/`useMutation` de TanStack Query, con `queryKey` centralizadas.
Ver `src/queries/README.md` para el patrón exacto a seguir al agregar un
dominio nuevo. `QueryClient` (en `main.jsx`) usa `staleTime: 60s`,
`retry: 1`, sin refetch al volver el foco de la ventana.

### 2.5 Modo offline

`services/offlineQueue.js` guarda en IndexedDB (`stockpro_offline`) las
mutaciones (POST/PUT/DELETE) hechas sin conexión. `AppContext` dispara
`iniciarSyncAutomatico()` al montar (si hay sesión) y sincroniza apenas
vuelve la conexión (`window.addEventListener('online', …)`), notificando
por toast cuántas operaciones se sincronizaron o fallaron. `OfflineBanner`
y `OfflineQueueModal` (`components/ui/`) exponen el estado al usuario;
`pages/ColaSincronizacion.jsx` es la vista de detalle/reintento manual.

### 2.6 Planes SaaS y límites

`services/planLimits.js` es una función pura de comparación
(`actual` vs `maximo`, `-1` = ilimitado); los límites reales vienen de
`GET /configuracion` (resueltos server-side contra `PlanSaaS`). El hook
`usePlanLimits()` combina eso con los conteos reales (`useProductosList`,
`useUsuariosList`, etc.) para decidir si un formulario de "crear" debe
bloquearse y mostrar el aviso de límite alcanzado.

`config/constants.js` exporta además `PLAN_META` (label + color por plan:
`trial`/`basico`/`profesional`/`empresarial`) para mostrar el plan vigente
del tenant en cualquier pantalla (`Sidebar`, `Configuracion/TabEmpresa`) —
el plan real (`sesion.plan`) se persiste recién al login, tomado de
`GET /empresas/:codigo` (ver `Login.jsx`).

### 2.7 Temas

`hooks/useTheme.js` — 7 temas (`light`, `oscuro`, `ocean`, `forest`,
`sunset`, `midnight`, `nature`), persistidos en `localStorage`, aplicados
vía atributo en el root (consumido por `index.css`). El diseño se cuida en
ambos extremos claro/oscuro — ver memoria del proyecto sobre el fix de
contraste en modo claro (colores nunca hardcodeados vía `style` inline,
siempre a través del sistema de temas).

### 2.8 PWA

`vite-plugin-pwa` (`registerType: 'autoUpdate'`) genera un service worker
con precache de assets y runtime caching de Google Fonts. `devOptions.enabled: true`
lo activa también en `npm run dev`. `pages/PWA.jsx`/`PWAMovil.jsx` son las
pantallas de instalación guiada.

### 2.9 Notificaciones Web Push

`utils/push.js` (boilerplate de suscripción del navegador) +
`queries/push.queries.js` (`usePushSubscribe`/`usePushUnsubscribe`) —
botón "Activar notificaciones" en `DashboardAlmacenero/AlertasTab.jsx`.
`VITE_VAPID_PUBLIC_KEY` debe coincidir exactamente con `VAPID_PUBLIC_KEY`
del backend. El envío real (cron cada 30 min, alertas de stock/vencimiento)
corre en el backend — ver su propio README, §3.

### 2.10 Envío de documentos por correo

`components/ui/PdfSharePanel.jsx` es el panel "Compartir" usado en
Despachos (Guía de Remisión), Órdenes de Compra y Cotizaciones (RFQ). Con
un `destinatario.email` y `getHtml`/`asunto`, el botón "Correo" envía de
verdad vía `queries/email.queries.js` (`POST /email/enviar-documento` —
el backend re-renderiza el mismo HTML a PDF con Puppeteer y lo adjunta,
ver README del backend). Sin esos datos, cae a un link `mailto:` sin
destinatario precargado. `pdfTemplates.js` separa la construcción del
HTML (`armarHtmlXxx`) de la acción de imprimir (`imprimirXxx`) justo para
poder reenviar ese mismo HTML al backend sin duplicar la plantilla.

---

## 3. Seguridad

- **Content-Security-Policy**: se inyecta **solo en el build de
  producción** (`vite.config.js`, plugin `htmlSecurityHeaders`,
  `apply: 'build'`). En dev se omite a propósito — `@vitejs/plugin-react`
  inyecta un `<script>` inline (preámbulo de React Fast Refresh) que una
  CSP con `script-src 'self'` bloquearía, rompiendo `npm run dev`.
  `connect-src` apunta al origin de `VITE_API_URL` — si se cambia la URL
  de la API en producción, la CSP se recalcula sola en el build.
- Tokens JWT en `localStorage` (no cookies) — es el modelo estándar para
  una SPA con Bearer tokens; la mitigación real de robo por XSS es la CSP
  de arriba + que la app no tiene `dangerouslySetInnerHTML`/`eval` en
  ningún componente.
- El gating de rutas en `App.jsx` (sesión, rol `saas_admin`, plan vencido)
  es **solo UX** — la autorización real ocurre en el backend en cada
  request (JWT + `PermisosGuard`). Nunca asumir que ocultar un botón o
  redirigir una ruta alcanza como control de acceso.

---

## 4. Estructura del proyecto

```
src/
├── main.jsx                 # bootstrap: QueryClientProvider + React Query Devtools (solo dev)
├── App.jsx                  # BrowserRouter, AppProvider, los 7 modos de layout (§2.3)
├── App.css / index.css      # estilos globales, sistema de temas
│
├── store/
│   └── AppContext.jsx       # sesión, toasts, online/offline, tienePermiso() — NO datos de negocio
│
├── services/
│   ├── api.js                # cliente HTTP: 3 contextos de auth, refresh, envelope {data,error}
│   ├── offlineQueue.js        # cola IndexedDB para mutaciones sin conexión
│   ├── planLimits.js          # comparación de uso vs. límites de plan
│   ├── storage.js             # residual legacy — solo Configuracion.jsx (config local del navegador)
│   └── validators.js          # validaciones de formularios reutilizables
│
├── queries/                  # un archivo por dominio — hooks TanStack Query (ver README propio)
│
├── hooks/
│   ├── usePlanLimits.js       # combina planLimits.js + queries reales
│   └── useTheme.js            # gestión de tema con persistencia
│
├── config/
│   └── constants.js           # constantes de negocio (umbrales de stock, motivos, paginación…)
│
├── data/
│   ├── demoData.js            # datos demo usados por storage.js / Configuracion
│   ├── initialData.js         # snapshot inicial legacy
│   └── distritosPeruanos.js   # catálogo estático de distritos (Perú)
│
├── components/
│   ├── layout/                # Layout.jsx, Sidebar.jsx
│   └── ui/                    # componentes reutilizables (modales, inputs, StatCard,
│                                #   BarcodeScanner, OfflineBanner/Modal, exportación PDF, etc.)
│
├── pages/                    # una carpeta o archivo por vista — ver §5
│
└── utils/
    ├── exportPDF.js / pdfTemplates.js / exportPreview.jsx   # generación de reportes PDF
    ├── exportXLSX.js                                          # exportación Excel
    ├── helpers.js / valorizacion.js                           # utilidades y cálculos de negocio
    └── storageMonitor.js                                      # monitoreo de cuota de localStorage
```

---

## 5. Páginas (`src/pages/`)

Agrupadas igual que el menú lateral real (`Sidebar.jsx` → `NAV`) — 8
secciones más Dashboard/Alertas sueltos arriba de todo:

| Grupo (Sidebar) | Páginas |
|---|---|
| *(sin sección, tope del menú)* | `Dashboard`, `Alertas` |
| Inventario | `Inventario`, `Kardex`, `Movimientos`, `InventarioFisico` |
| Operaciones | `Entradas`, `Salidas`, `Ajustes`, `Devoluciones`, `Transferencias` |
| Despachos | `Clientes`, `Despachos`, `PedidosInternos/`, `PortalPedidos`, `Empaque`, `Transportes/`, `Flota/`, `TrazabilidadPedidos` |
| Ventas | `ListaPrecios`, `Proformas`, `Sunat`, `CuentasPorCobrar` |
| Compras | `Ordenes`, `Cotizaciones`, `Proveedores`, `PortalProveedoresB2B` |
| Almacén | `MapaAlmacen/`, `LotesSeries` |
| Análisis | `Vencimientos`, `PuntoReorden`, `Prevision`, `Reportes`, `KPIsOperativos`, `ContabilidadReportes`, `Financiero` |
| Administración | `Usuarios/`, `Auditoria`, `PanelAuditoria`, `Incidencias`, `ColaSincronizacion`, `Configuracion/` |

Fuera del Sidebar normal:

| Categoría | Páginas |
|---|---|
| Panel SaaS (login propio, `/superadmin`) | `AdminSaaS/` (negocios, planes, renovaciones, alertas, landing) |
| Público, sin sidebar (link firmado, sin cuenta) | `PortalPublico` (`/portal/:token`), `PortalProveedorPublico` (`/portal-proveedor/:token`), `LandingPage/` |
| Ruteada pero sin entrada en el menú | `Maestros` (`/maestros` — categorías/almacenes, acceso solo por URL directa) |
| **No ruteadas actualmente** (código presente, sin `<Route>` en `App.jsx`) | `PWA.jsx`, `PWAMovil.jsx` |

`Dashboard.jsx` no es una sola vista: según `sesion.rol?.codigo` renderiza
el panel genérico, o delega en `DashboardAlmacenero/` (rol `almacenero`) o
`DashboardChofer/` (rol `chofer`, panel de rutas propias — ver README del
backend §2.3 para el resto de restricciones de ese rol).

Las carpetas (`AdminSaaS/`, `Configuracion/`, `DashboardAlmacenero/`,
`DashboardChofer/`, `Flota/`, `MapaAlmacen/`,
`PedidosInternos/`, `Transportes/`, `Usuarios/`, `LandingPage/`) dividen
páginas grandes en sub-componentes/tabs — patrón aplicado a las páginas
que crecieron demasiado como archivo único.

---

## 6. Puesta en marcha

### 6.1 Requisitos

- Node.js 20+
- El backend corriendo (ver `../../back/stockpro-api/README.md`) — el
  frontend no funciona standalone, necesita la API real.

### 6.2 Variables de entorno

Copiar a `.env`:

```bash
VITE_API_URL=http://localhost:3000/api
```

> Vite solo expone variables prefijadas con `VITE_`. Este valor también
> se usa para calcular `connect-src` en la CSP del build de producción
> (§3) — actualizarlo antes de un despliegue real.

### 6.3 Instalación y arranque

```bash
npm install
npm run dev        # http://localhost:5173
```

---

## 7. Scripts disponibles

```bash
npm run dev         # servidor de desarrollo (Vite + HMR)
npm run build        # build de producción a dist/ (incluye la CSP, §3)
npm run preview       # sirve dist/ localmente para validar el build
npm run lint            # ESLint sobre todo el proyecto
npm test                 # vitest run
npm run test:watch       # vitest en watch
```

---

## 8. Testing

Vitest + Testing Library en entorno `jsdom` (`vite.config.js → test`).
Cobertura configurada sobre `src/utils/helpers.js` y
`src/utils/valorizacion.js` (umbral 70-80% según métrica). `test/setup.js`
carga `@testing-library/jest-dom`.

```bash
npm test
```

---

## 9. Convenciones de código

- Componentes de página en PascalCase, un archivo por vista (o carpeta
  con `index.jsx` cuando la vista se divide en tabs/sub-componentes).
- Nunca hardcodear colores vía `style` inline — pasa por el sistema de
  temas (`index.css` + `useTheme`), para que modo claro/oscuro funcionen
  correctamente en toda la app.
- Toda llamada a la API pasa por un hook de `src/queries/`, nunca se
  llama a `services/api.js` directo desde un componente de página (salvo
  `Login.jsx`, que orquesta el flujo de login antes de que exista sesión).
- `AppContext` no crece con datos de negocio — eso es responsabilidad de
  TanStack Query (§2.1).
- El formulario de un `Modal` debería vivir en un subcomponente propio
  (ej. `ModalXxx` separado, patrón usado en Proformas/CxC), no en el
  mismo componente que también lista los datos (patrón usado hoy en
  `AdminSaaS/*`). Motivo: `useDialogA11y` (hook interno de
  `components/ui/index.jsx` que usan `Modal`/`ConfirmDialog`) enfoca el
  diálogo al abrir; si el formulario vive en el componente que renderiza
  el `Modal`, cada tecla tipeada re-renderiza ese componente entero y le
  perdía el foco al input activo — bug crítico real, ya corregido en el
  hook, pero aislar el formulario en un subcomponente evita depender de
  ese detalle interno y sigue el mismo patrón que el resto de la app.
