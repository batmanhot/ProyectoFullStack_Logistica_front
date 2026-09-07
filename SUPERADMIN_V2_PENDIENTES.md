# StockPro — Pendientes del nuevo SuperAdmin V2

> **Fecha de creación:** 2026-08-30  
> **Frontend de referencia:** `src/superadmin-v2-preview/`  
> **Backend vigente:** NestJS 11 + Fastify + Prisma 6 + PostgreSQL  
> **Estado:** maqueta funcional en evaluación; no sustituye todavía al SuperAdmin operativo.

## Propósito

Este documento concentra exclusivamente los pendientes del nuevo SuperAdmin V2.
No debe mezclarse con `BACKEND_PENDIENTES.md`, porque ese archivo pertenece a una
etapa histórica del proyecto y conserva referencias al backend Django inicialmente
propuesto.

La interfaz V2 puede usar datos locales para validar experiencia de usuario, reglas
y flujos. Ninguna simulación en `localStorage` constituye una validación de seguridad
ni debe activarse en producción sin su implementación autoritativa en el backend.

La revisión integral se encuentra en `SUPERADMIN_V2_REVISION_PANTALLAS.md`.
La reorganización se migrará de forma incremental: la prueba de sustitución total
se retiró porque no conservaba paridad con las funcionalidades de la maqueta. Cada
módulo nuevo deberá demostrar que mantiene formularios, validaciones, estados,
persistencia y acciones antes de reemplazar su versión anterior.

## Estados utilizados

- **Frontend pendiente:** falta construir o terminar la experiencia visual.
- **Backend pendiente:** la interfaz existe, pero requiere persistencia o reglas del servidor.
- **Integración pendiente:** ambas partes existen por separado y falta conectarlas.
- **Decisión pendiente:** se necesita una definición funcional o de negocio.
- **Bloqueado por seguridad:** no se debe habilitar solo desde el frontend.
- **Completado:** implementado y verificado.

## 1. Casos, recuperación y modo soporte

### Situación actual

- La pantalla está representada en `src/superadmin-v2-preview/main.jsx`.
- Los casos, indicadores y tiempos son datos de demostración escritos en el frontend.
- El botón **Nuevo caso** está deshabilitado.
- No existen endpoints ni modelos Prisma para gestionar casos de soporte.
- El modo soporte no puede iniciar una sesión ni acceder a información de un tenant.

### 1.1 Frontend pendiente

- [ ] Extraer la pantalla a `SupportManagement.jsx` para evitar ampliar `main.jsx`.
- [ ] Habilitar el formulario **Nuevo caso** con empresa, solicitante, contacto,
  asunto, motivo, prioridad y descripción de evidencia.
- [ ] Implementar listado, filtros, búsqueda, detalle e historial del caso.
- [ ] Representar la máquina de estados acordada y mostrar qué acción habilita la
  siguiente transición.
- [ ] Añadir formularios para verificación de identidad, aprobación, alcance,
  duración, resultado y cierre.
- [ ] Mostrar un banner persistente y un contador cuando exista un acceso de soporte.
- [ ] Añadir acción explícita para terminar anticipadamente un acceso.
- [ ] Tratar evidencias como metadatos durante la maqueta; no almacenar documentos
  sensibles en `localStorage`.
- [ ] Incorporar estados de carga, vacío, error, expiración y acceso revocado.
- [ ] Añadir pruebas de componente y accesibilidad del flujo completo.

### 1.2 Backend pendiente

- [ ] Crear modelos Prisma `CasoSoporte`, `AccesoSoporte` y
  `EventoAuditoriaSoporte`.
- [ ] Relacionar cada caso con `Empresa`, solicitante y `PlatformAdmin` responsable.
- [ ] Implementar una máquina de estados autoritativa. El frontend no puede saltar
  directamente de un caso abierto a una intervención aprobada.
- [ ] Implementar endpoints administrativos para listar, crear, consultar, asignar,
  verificar, aprobar y cerrar casos.
- [ ] Emitir credenciales de soporte de corta duración con un secreto o mecanismo
  separado de las identidades existentes.
- [ ] Incluir como mínimo `scope: support`, `casoId`, `empresaId`, administrador,
  alcance, permisos y expiración.
- [ ] Crear `SupportAccessGuard` y comenzar con operaciones exclusivamente de lectura.
- [ ] Obtener siempre el tenant desde la credencial verificada; nunca confiar en un
  `empresaId` enviado libremente por el navegador.
- [ ] Ejecutar el acceso mediante `PrismaService.withTenant(empresaId)` para mantener
  las políticas RLS.
- [ ] Implementar revocación manual, expiración automática y cierre forzado del
  acceso cuando se cierre el caso.
- [ ] Auditar también las lecturas realizadas en modo soporte, no solamente las
  mutaciones cubiertas por la auditoría general actual.
- [ ] Guardar actor, tenant, caso, recurso, acción, resultado, fecha del servidor,
  dirección protegida, `request_id` y `correlation_id`.
- [ ] Prohibir que los eventos de auditoría se editen o eliminen desde las APIs normales.
- [ ] Añadir rate limiting y autorización exclusiva para PlatformAdmin.

### 1.3 Integración pendiente

- [ ] Crear una capa de queries/mutations de TanStack Query para soporte.
- [ ] Sustituir los datos de demostración por respuestas paginadas del backend.
- [ ] Habilitar **Iniciar modo soporte** únicamente después de recibir una
  autorización temporal válida del servidor.
- [ ] Mantener separadas la sesión PlatformAdmin y la credencial temporal de soporte.
- [ ] Limpiar la credencial y la caché asociada al expirar, revocar o cerrar el acceso.
- [ ] Mostrar al operador el tenant, caso, alcance y tiempo restante en todo momento.
- [ ] Bloquear navegación o acciones no incluidas en el alcance concedido.
- [ ] Refrescar en vivo estado, revocación y eventos sin asumir que el navegador es
  la fuente de verdad.

### 1.4 Contrato API inicial sugerido

```text
GET    /api/admin/soporte/casos
POST   /api/admin/soporte/casos
GET    /api/admin/soporte/casos/:id
PATCH  /api/admin/soporte/casos/:id/asignar
POST   /api/admin/soporte/casos/:id/verificar-identidad
POST   /api/admin/soporte/casos/:id/aprobar
POST   /api/admin/soporte/casos/:id/iniciar-acceso
POST   /api/admin/soporte/accesos/:id/revocar
POST   /api/admin/soporte/casos/:id/cerrar
GET    /api/admin/soporte/casos/:id/auditoria
```

Este contrato es preliminar. Antes de implementarlo deben cerrarse la máquina de
estados, los permisos y la política de aprobación.

### 1.5 Pruebas obligatorias

- [ ] Un PlatformAdmin no puede iniciar acceso sin caso aprobado.
- [ ] No se puede cambiar el tenant manipulando parámetros o el cuerpo HTTP.
- [ ] El token de soporte no funciona como token de tenant, admin o portal.
- [ ] El alcance de solo lectura rechaza cualquier mutación.
- [ ] Expiración y revocación invalidan el acceso inmediatamente.
- [ ] Cerrar el caso revoca todos sus accesos activos.
- [ ] Dos accesos concurrentes no pueden superar las reglas acordadas.
- [ ] Todas las consultas y acciones dejan auditoría vinculada al caso.
- [ ] Tokens, secretos y datos sensibles no aparecen en logs ni auditoría.
- [ ] Las pruebas con PostgreSQL real confirman el aislamiento RLS entre tenants.

## 2. Pendientes transversales del SuperAdmin V2

Los siguientes temas ya fueron identificados en `docs/MEJORAS-DIFERIDAS.md` y
deben coordinarse con este nuevo panel:

- [ ] Enforcement cuantitativo de límites de planes en backend.
- [ ] Sesiones reales y revocables para administradores.
- [ ] Auditoría inmutable de acciones del SuperAdmin.
- [ ] Reglas autoritativas de acceso comercial, suspensión y propietarios.
- [ ] Catálogo global y versionado de roles fijos.
- [ ] Sustituir los stores de demostración del V2 por APIs reales sin mezclar datos
  con el AdminSaaS operativo durante la transición.
- [ ] Definir feature flag y estrategia de migración del SuperAdmin actual al V2.
- [ ] Ejecutar pruebas de regresión del panel actual antes de habilitar el V2.

## 3. Decisiones funcionales pendientes

- [ ] Quién puede crear, verificar, aprobar y cerrar un caso.
- [ ] Si una intervención requiere una o dos personas aprobadoras.
- [ ] Canales aceptados para verificar identidad del solicitante.
- [ ] Alcances disponibles y permisos prohibidos incluso durante soporte.
- [ ] Duración máxima de una sesión y posibilidad de renovación.
- [ ] Si puede existir más de un acceso simultáneo por caso o tenant.
- [ ] Política de conservación de casos, evidencias, IP y eventos de auditoría.
- [ ] Procedimiento de recuperación crítica y comunicación al cliente.
- [ ] Qué acciones requieren consentimiento explícito del Admin Owner.

## 4. Orden recomendado

1. Aprobar la experiencia del frontend y la máquina de estados.
2. Definir permisos, aprobación, retención y recuperación crítica.
3. Implementar casos de soporte sin acceso al tenant.
4. Integrar listado, creación, verificación y cierre con el backend.
5. Implementar auditoría inmutable y credenciales temporales.
6. Habilitar un piloto de modo soporte exclusivamente de lectura.
7. Ejecutar pruebas de seguridad, RLS, revocación y expiración.
8. Evaluar acciones limitadas de escritura solo después del piloto.

## 5. Criterio para considerar terminado el módulo

El módulo no se considerará completado porque la pantalla permita recorrer el
flujo. Deben cumplirse conjuntamente estas condiciones:

- Persistencia autoritativa en PostgreSQL.
- Transiciones validadas por NestJS.
- Acceso temporal de alcance mínimo y revocable.
- Aislamiento RLS verificado con base de datos real.
- Auditoría de lecturas y mutaciones vinculada al caso.
- Pruebas automáticas de seguridad e integración aprobadas.
- Interfaz sin datos de demostración ni dependencias de `localStorage`.
- Procedimiento operativo y de recuperación documentado.

## Actualización UX/UI V5 — 2026-08-30

- [x] Reorganizar la navegación del SuperAdmin por módulos y pestañas con URLs propias.
- [x] Separar el detalle de negocio en una vista dedicada para conservar el contexto del listado.
- [x] Separar usuarios, suscripciones, planes, operación, alertas, auditoría y configuración en vistas enfocadas.
- [x] Reducir la densidad inicial: guías colapsables, tablas con búsqueda, orden y paginación, y acciones secundarias agrupadas.
- [x] Proteger formularios de demostración contra cierre accidental con cambios sin guardar.
- [ ] Incorporar preferencia de tema claro, oscuro y sistema al SuperAdmin.
- [ ] Migrar la base técnica de la maqueta a TypeScript, shadcn/ui, React Hook Form + Zod, TanStack Table y Sonner.
- [ ] Sustituir la persistencia local de demostración por APIs, permisos y auditoría del backend.
