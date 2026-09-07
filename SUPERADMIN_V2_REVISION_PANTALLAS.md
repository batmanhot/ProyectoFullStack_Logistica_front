# StockPro — Revisión y reorganización de pantallas del SuperAdmin V2

> **Fecha:** 2026-08-30  
> **Alcance:** maqueta `src/superadmin-v2-preview/`  
> **Objetivo:** ordenar la arquitectura de información antes de continuar con funcionalidades e integración.

> **Estado de aplicación (2026-08-30):** propuesta pendiente de migración
> incremental. Se probó una entrada reorganizada en
> `src/superadmin-v2-preview/app/main.jsx`, pero se retiró como entrada activa
> porque no conservaba paridad funcional con la maqueta avanzada. La versión
> activa vuelve a ser `src/superadmin-v2-preview/main.jsx`.

> **Refinamiento UX/UI:** después de aplicar la primera arquitectura se realizó
> una segunda reducción para evitar que las propias pestañas se convirtieran en
> sobrecarga. La arquitectura final siguiente reemplaza las listas extensas de
> pestañas propuestas inicialmente en este documento.

## Arquitectura final simplificada

| Módulo | Pestañas definitivas | Objetivo principal |
|---|---|---|
| Dashboard | Sin pestañas | Detectar qué requiere atención |
| Negocios | Todos · Requieren atención | Encontrar y priorizar clientes |
| Usuarios | Administradores · Roles · Accesos | Controlar responsables y permisos |
| Soporte | Casos · Accesos · Políticas | Resolver casos con acceso controlado |
| Planes | Catálogo · Capacidades · Comparación | Mantener una oferta comercial clara |
| Suscripciones | Resumen · Renovaciones · Facturación y pagos | Supervisar ingresos y vigencia |
| Operación SaaS | Estado general · Incidentes · Continuidad | Mantener disponible el servicio |
| Alertas | Bandeja · Reglas | Atender y configurar alertas |
| Auditoría | Eventos · Exportaciones · Política | Consultar trazabilidad y gobierno |
| Administradores | Cuentas · Seguridad · Actividad | Proteger accesos privilegiados |
| Configuración | General · Integraciones · Funciones experimentales | Ajustar la plataforma |
| Landing Page | Contenido · SEO · Publicación | Editar y publicar el sitio público |
| Analytics | Resumen · Adquisición · Privacidad | Entender crecimiento responsable |

Decisiones de simplificación aplicadas:

- Ciclo de vida, límites y seguridad específica del tenant pasarán al detalle de
  cada negocio, no a pestañas globales.
- Sesiones, MFA y reglas se presentan dentro de “Accesos” o “Seguridad” según el
  tipo de administrador.
- Historial se resuelve mediante filtros en listados, no como pestaña separada.
- Backups forma parte de Continuidad.
- Facturación y pagos forman un mismo flujo financiero.
- Vista previa forma parte del proceso de Publicación de la Landing.
- Guías y procedimientos se muestran como ayuda contextual o Políticas.

## Diagnóstico general

La maqueta contiene funcionalidades y conceptos valiosos, pero actualmente la
navegación no representa con claridad las responsabilidades de cada módulo.
El problema no es únicamente visual: varias rutas comparten la misma sección,
algunas pantallas repiten encabezados y otras acumulan listado, registro,
configuración, reglas, sesiones y documentación en una sola página vertical.

### Hallazgos principales

1. **Usuarios está sobrecargada.** En una sola vista aparecen controles
   recomendados, mapa de roles, registro de administradores, gobierno de roles,
   plantillas, reglas de cupo y sesiones.
2. **Rutas diferentes muestran el mismo contenido.** `renovaciones` y
   `facturacion` resuelven ambas a `suscripciones`; `planes` y `limites` resuelven
   a `plan-management`. El menú parece ofrecer destinos independientes, pero no
   existen pantallas diferenciadas.
3. **Hay dos capas de contenido mezcladas.** La operación real se intercala con
   explicaciones de diseño, decisiones futuras y guías “cómo funciona”.
4. **Las acciones no tienen un lugar estable.** Crear, editar, restablecer datos
   demo y cambiar estados aparecen arriba, abajo o después del contenido.
5. **El detalle 360° del negocio es un modal extenso.** Para una entidad central
   debería ser una vista identificable y navegable, con pestañas propias.
6. **El archivo principal concentra casi toda la aplicación.** `main.jsx` contiene
   navegación, datos, estado, formularios, modales y renderizado de la mayoría de
   módulos. Esto dificulta implementar y probar funcionalidades por separado.
7. **Los nombres no siempre coinciden con el contenido.** “Configuración” muestra
   gates de integración; “Administradores” muestra seguridad; “Usuarios” mezcla
   usuarios de tenant con roles y sesiones.
8. **Falta una convención común.** No todas las pantallas tienen encabezado,
   acciones, pestañas, filtros, contenido, estados vacíos y aviso de maqueta en
   el mismo orden.

## Convención propuesta para todas las pantallas

Cada módulo debería seguir esta estructura:

```text
Breadcrumb / categoría
Título + descripción breve                       Acción principal
Estado del módulo: Demo | Parcial | Integrado | Backend pendiente
Pestañas del módulo
Filtros y búsqueda de la pestaña activa
Contenido
Estados: carga | vacío | error | sin permisos
```

Reglas:

- Una pestaña representa una responsabilidad reconocible, no un filtro.
- Los filtros permanecen dentro de la pestaña correspondiente.
- Crear y editar se realiza en modal o página de detalle, pero no se mezcla con
  documentación extensa del módulo.
- Las explicaciones “cómo funciona” deben ir en una ayuda contextual colapsable,
  no ocupar permanentemente el final de cada pantalla.
- Cada pestaña debe tener URL propia para poder compartirla y volver a ella:
  `#/usuarios/administradores`, `#/usuarios/roles`, etc.
- El estado de maqueta o backend pendiente debe mostrarse mediante un componente
  común, no con mensajes diferentes escritos manualmente en cada pantalla.

## Arquitectura de navegación recomendada

### 1. Dashboard

Ruta base: `#/dashboard`

No necesita pestañas. Debe conservar únicamente:

- Indicadores globales.
- Elementos que requieren atención.
- Actividad reciente resumida.
- Acciones rápidas que naveguen a una pantalla concreta.

Eliminar del dashboard las explicaciones largas sobre límites de la maqueta;
reemplazarlas por un indicador compacto de entorno de demostración.

### 2. Negocios

Ruta base: `#/negocios`

| Pestaña | Ruta | Contenido |
|---|---|---|
| Todos | `#/negocios/listado` | Búsqueda, filtros, tabla y alta de negocio |
| Ciclo de vida | `#/negocios/ciclo` | Trial, vigencia, gracia, suspensión, cancelación y archivo |
| Riesgos | `#/negocios/riesgos` | Vencimientos, capacidad, inactividad y salud |

El botón **Ver 360°** debe navegar a `#/negocios/:id/resumen`, no abrir un modal
con toda la información.

Detalle de negocio:

| Pestaña | Contenido |
|---|---|
| Resumen | Identidad, estado, plan, responsables y actividad |
| Suscripción | Plan, vigencia, pagos, renovación y cambios |
| Uso y límites | Usuarios, productos, almacenes y consumo |
| Administradores | Owner, Admin Tenant y estados de acceso |
| Seguridad | Sesiones, bloqueos e incidencias |
| Auditoría | Historial filtrado exclusivamente para ese negocio |
| Soporte | Casos e intervenciones asociados |

### 3. Usuarios y accesos

Ruta base: `#/usuarios`

Esta es la pantalla que requiere mayor reorganización.

| Pestaña | Ruta | Contenido |
|---|---|---|
| Administradores de tenant | `#/usuarios/administradores-tenant` | Listado, búsqueda, alta y edición de Owner/Admin Tenant |
| Roles fijos | `#/usuarios/roles` | Catálogo, versiones, publicación y archivo |
| Asignaciones | `#/usuarios/asignaciones` | Qué usuario tiene qué rol en cada negocio |
| Sesiones | `#/usuarios/sesiones` | Dispositivos, último acceso y revocación |
| Solicitudes | `#/usuarios/solicitudes` | Solicitudes de roles o accesos pendientes |
| Reglas | `#/usuarios/reglas` | Owner protegido, cupos y políticas de acceso |

Cambios concretos:

- **Nuevo administrador** solo aparece en “Administradores de tenant”.
- **Nuevo rol fijo** solo aparece en “Roles fijos”.
- El registro se abre como modal de la pestaña correspondiente.
- Las tarjetas informativas de Owner/Admin Tenant se trasladan a “Reglas” o a
  una ayuda contextual.
- La tabla de sesiones no debe aparecer debajo del editor de roles.
- El mapa de roles de ejemplo desaparece cuando exista el catálogo real.

### 4. Soporte

Ruta base: `#/soporte`

| Pestaña | Ruta | Contenido |
|---|---|---|
| Casos | `#/soporte/casos` | Listado, filtros, prioridad, responsable y creación |
| Intervenciones | `#/soporte/intervenciones` | Solicitudes de acceso, aprobación, alcance y duración |
| Accesos activos | `#/soporte/accesos` | Tenant, operador, tiempo restante y revocación |
| Historial | `#/soporte/historial` | Casos cerrados y resultados |
| Procedimiento | `#/soporte/procedimiento` | Flujo obligatorio y políticas de recuperación |

El aviso **backend pendiente** se mantiene visible en todas las pestañas hasta
completar la integración. La guía del proceso se mueve a “Procedimiento”.

### 5. Planes y capacidades

Ruta base: `#/planes`

| Pestaña | Ruta | Contenido |
|---|---|---|
| Catálogo | `#/planes/catalogo` | Planes disponibles, estado y acciones |
| Capacidades | `#/planes/capacidades` | Límites cuantitativos por plan |
| Módulos | `#/planes/modulos` | Funcionalidades incluidas y dependencias |
| Comparación | `#/planes/comparacion` | Matriz comercial entre planes |
| Historial | `#/planes/historial` | Versiones y cambios publicados |

No deben existir dos destinos del menú que terminen silenciosamente en el mismo
componente. “Límites” se convierte en pestaña de Planes, no en ruta duplicada.

### 6. Suscripciones

Ruta base: `#/suscripciones`

| Pestaña | Ruta | Contenido |
|---|---|---|
| Resumen | `#/suscripciones/resumen` | MRR, distribución por plan y tendencias |
| Renovaciones | `#/suscripciones/renovaciones` | Calendario, próximas renovaciones y estados |
| Facturación | `#/suscripciones/facturacion` | Documentos, cobros y conciliación futura |
| Pagos | `#/suscripciones/pagos` | Estado de pago, intentos y regularización |

“Renovaciones” y “Facturación” dejan de ser alias de una misma pantalla. Mientras
no exista integración, cada pestaña muestra su estado pendiente específico.

### 7. Operación SaaS

Ruta base: `#/operacion`

| Pestaña | Ruta | Contenido |
|---|---|---|
| Salud | `#/operacion/salud` | Disponibilidad y servicios críticos |
| Incidentes | `#/operacion/incidentes` | Incidentes activos y ciclo de resolución |
| Backups | `#/operacion/backups` | Ejecuciones, verificación y restauraciones |
| Continuidad | `#/operacion/continuidad` | Runbooks, responsables y pruebas |

La referencia a soporte debe navegar al módulo Soporte; no debe mezclarse con
backups dentro de una tarjeta genérica.

### 8. Alertas

Ruta base: `#/alertas`

| Pestaña | Ruta | Contenido |
|---|---|---|
| Bandeja | `#/alertas/bandeja` | Alertas abiertas, asignación y prioridad |
| Reglas | `#/alertas/reglas` | Fuentes, umbrales y escalamiento |
| Historial | `#/alertas/historial` | Resueltas, descartadas y tiempos |

Suscripción, Límites, Seguridad y Operación continúan como filtros de la Bandeja,
no como pestañas.

### 9. Auditoría

Ruta base: `#/auditoria`

| Pestaña | Ruta | Contenido |
|---|---|---|
| Eventos | `#/auditoria/eventos` | Tabla, búsqueda y filtros avanzados |
| Exportaciones | `#/auditoria/exportaciones` | Solicitudes, motivo, alcance y descarga |
| Retención | `#/auditoria/retencion` | Política y almacenamiento |
| Integridad | `#/auditoria/integridad` | Verificaciones y estado append-only |

Las tarjetas “qué registrar” y “qué no permitir” pertenecen a documentación o a
la pestaña Retención/Integridad, no al final de la tabla principal.

### 10. Administradores de plataforma

Ruta base: `#/administradores`

| Pestaña | Ruta | Contenido |
|---|---|---|
| Cuentas | `#/administradores/cuentas` | Alta, estado, roles internos y edición |
| Sesiones | `#/administradores/sesiones` | Dispositivos y revocación |
| MFA | `#/administradores/mfa` | Enrolamiento, recuperación y cumplimiento |
| Actividad | `#/administradores/actividad` | Acciones recientes y alertas de seguridad |

La pantalla debe llamarse “Administradores de plataforma”, no “Seguridad de
plataforma”, porque seguridad es una responsabilidad más amplia.

### 11. Configuración

Ruta base: `#/configuracion`

| Pestaña | Ruta | Contenido |
|---|---|---|
| General | `#/configuracion/general` | Identidad de plataforma y valores generales |
| Seguridad | `#/configuracion/seguridad` | Políticas globales configurables |
| Integraciones | `#/configuracion/integraciones` | Servicios externos y credenciales protegidas |
| Notificaciones | `#/configuracion/notificaciones` | Canales y remitentes |
| Funciones experimentales | `#/configuracion/experimentos` | Feature flags y gates |

ACE, Approval Engine, shadow mode y rollout pertenecen a “Funciones
experimentales” o a un módulo técnico separado. No deben ocupar por sí solos la
pantalla denominada Configuración.

### 12. Landing Page

Ruta base: `#/landing`

| Pestaña | Ruta | Contenido |
|---|---|---|
| Contenido | `#/landing/contenido` | Hero, beneficios, prueba social y contacto |
| Planes públicos | `#/landing/planes` | Presentación comercial de planes |
| SEO y redes | `#/landing/seo` | Metadatos, Open Graph y compartir |
| Vista previa | `#/landing/vista-previa` | Previsualización antes de publicar |
| Publicación | `#/landing/publicacion` | Borrador, versión publicada e historial |

### 13. Analytics

Ruta base: `#/analytics`

| Pestaña | Ruta | Contenido |
|---|---|---|
| Resumen | `#/analytics/resumen` | Indicadores principales |
| Adquisición | `#/analytics/adquisicion` | Fuentes y campañas |
| Conversión | `#/analytics/conversion` | Visita, demo, trial y cliente |
| Consentimiento | `#/analytics/consentimiento` | Cookies, privacidad y estado de medición |

La edición de Landing y las métricas de Analytics deben seguir separadas: una
administra contenido y la otra analiza comportamiento.

## Reorganización técnica recomendada

```text
src/superadmin-v2-preview/
├── app/
│   ├── SuperAdminV2App.jsx
│   ├── navigation.js
│   └── routes.js
├── components/
│   ├── ModuleHeader.jsx
│   ├── ModuleTabs.jsx
│   ├── DemoStatusBanner.jsx
│   ├── EmptyState.jsx
│   └── HelpPanel.jsx
├── modules/
│   ├── dashboard/
│   ├── negocios/
│   ├── usuarios/
│   ├── soporte/
│   ├── planes/
│   ├── suscripciones/
│   ├── operacion/
│   ├── alertas/
│   ├── auditoria/
│   ├── administradores/
│   ├── configuracion/
│   ├── landing/
│   └── analytics/
└── demo/
    ├── seeds.js
    └── useDemoStore.js
```

Cada módulo debe contener su página contenedora, pestañas, componentes y pruebas.
`main.jsx` debe quedar reducido al arranque de React y proveedores globales.

## Prioridad de ejecución

### Fase 1 — Base común

- Crear `ModuleHeader`, `ModuleTabs`, `DemoStatusBanner` y `HelpPanel`.
- Definir rutas anidadas y persistencia de pestaña en la URL.
- Separar datos demo del renderizado.

### Fase 2 — Pantallas más desordenadas

1. Usuarios y accesos.
2. Negocios y detalle 360°.
3. Planes y suscripciones.
4. Soporte.

### Fase 3 — Operación y administración

1. Operación SaaS.
2. Alertas.
3. Auditoría.
4. Administradores de plataforma.
5. Configuración.

### Fase 4 — Marketing

1. Landing Page.
2. Analytics.

### Fase 5 — Validación

- Responsive móvil, tablet y escritorio.
- Navegación por teclado y foco visible.
- URLs compartibles y botón Atrás funcional.
- Estados demo/backend pendiente consistentes.
- Pruebas de componentes y revisión visual.

## Resultado y corrección de enfoque

- [x] Arquitectura objetivo y componentes comunes diseñados como referencia.
- [x] Prueba técnica de rutas y pestañas realizada en una entrada separada.
- [x] Regresión detectada: la sustitución completa perdió formularios, reglas y
  flujos ya disponibles en la maqueta original.
- [x] Maqueta original restaurada como entrada activa para conservar todo el avance.
- [ ] Migrar un único módulo por vez, comenzando por Usuarios.
- [ ] Crear una matriz de paridad antes de migrar cada módulo: acciones, formularios,
  validaciones, persistencia local, confirmaciones, estados y auditoría demo.
- [ ] No activar una pantalla reorganizada hasta superar su prueba de paridad.

## Aplicación de la auditoría V5 — 2026-08-30

La maqueta activa fue reorganizada sin modificar contratos de backend ni datos reales.

- La entrada activa es `src/superadmin-v2-preview/main-refined.jsx` y compone
  `SuperAdminV2RefinedApp.jsx`.
- Se incorporaron rutas con pestañas propias para Negocios, Usuarios, Soporte,
  Planes, Suscripciones, Operación, Alertas, Auditoría, Administradores,
  Configuración, Landing y Analytics.
- El detalle 360° de Negocios dejó de estar incrustado en el listado: ahora usa
  una URL propia y pestañas de contexto.
- Usuarios separa Administradores, Roles fijos, Asignaciones, Sesiones y Reglas.
- Planes separa Catálogo, Capacidades, Módulos y Comparación.
- Las guías de módulo son colapsables y ya no ocupan espacio permanente.
- El listado de Negocios y la Auditoría incorporan ordenamiento; Negocios también
  incluye búsqueda, paginación, estado sin resultados y menú contextual por fila.
- Los formularios nuevos protegen cambios sin guardar ante X, Escape y click fuera.
- Se mantiene la persistencia local de demostración, las validaciones y las
  confirmaciones de cambios de estado.

Pendiente de una fase técnica independiente: adopción completa de TypeScript,
shadcn/ui, React Hook Form + Zod, TanStack Table, Sonner y theming Light/Dark/System.

La siguiente etapa debe ser incremental. La mejora visual no puede eliminar ni
simplificar silenciosamente capacidades ya aprobadas.
