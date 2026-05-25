# STOCKPRO — Pendientes para el Backend (Django REST Framework)

> **Fecha:** 2026-05-25  
> **Estado actual:** El frontend opera completamente con `localStorage` / `IndexedDB`.  
> El cliente HTTP (`api.js`) y la cola offline (`offlineQueue.js`) ya están listos;  
> solo falta activar `USE_BACKEND = true` en `storageAdapter.js` y conectar los endpoints.

---

## 1. Configuración inicial

| # | Tarea | Archivo |
|---|-------|---------|
| 1.1 | Crear variable de entorno `VITE_API_URL` en `.env` apuntando al servidor Django | `.env` |
| 1.2 | Activar flag `USE_BACKEND = true` en `storageAdapter.js` cuando el backend esté disponible | `src/services/storageAdapter.js` |
| 1.3 | Configurar CORS en Django para permitir el origen del frontend | `settings.py` (backend) |
| 1.4 | Instalar y configurar `djangorestframework-simplejwt` para autenticación JWT | `requirements.txt` (backend) |

---

## 2. Autenticación y sesión

| # | Endpoint Django | Descripción | Archivo frontend que lo consume |
|---|-----------------|-------------|----------------------------------|
| 2.1 | `POST /api/auth/token/` | Login — retorna `access` + `refresh` JWT | `src/services/api.js` → `api.login()` |
| 2.2 | `POST /api/auth/token/refresh/` | Renovar access token con refresh token | `src/services/api.js` → `_refreshToken()` |
| 2.3 | `POST /api/auth/logout/` *(blacklist)* | Invalidar refresh token al cerrar sesión | `src/services/storage.js` → `logout()` |
| 2.4 | Reemplazar `loginUsuario()` en `storage.js` para que llame a `api.login()` | Actualmente compara contraseñas en texto plano | `src/services/storage.js:243` |

---

## 3. Endpoints de entidades (CRUD completo)

Todos estos endpoints deben mapear 1:1 con las funciones de `src/services/storage.js`.

### 3.1 Catálogos maestros

| # | Endpoint | Métodos | Función frontend |
|---|----------|---------|-----------------|
| 3.1.1 | `/api/categorias/` | GET, POST | `getCategorias()`, `saveCategoria()` |
| 3.1.2 | `/api/categorias/{id}/` | PUT, DELETE | `saveCategoria()`, `deleteCategoria()` |
| 3.1.3 | `/api/almacenes/` | GET, POST | `getAlmacenes()`, `saveAlmacen()` |
| 3.1.4 | `/api/almacenes/{id}/` | PUT, DELETE | `saveAlmacen()`, `deleteAlmacen()` |
| 3.1.5 | `/api/proveedores/` | GET, POST | `getProveedores()`, `saveProveedor()` |
| 3.1.6 | `/api/proveedores/{id}/` | PUT, DELETE | `saveProveedor()`, `deleteProveedor()` |
| 3.1.7 | `/api/areas/` | GET, POST | `getAreas()`, `saveArea()` |
| 3.1.8 | `/api/areas/{id}/` | PUT, DELETE | `saveArea()`, `deleteArea()` |

### 3.2 Inventario y productos

| # | Endpoint | Métodos | Función frontend |
|---|----------|---------|-----------------|
| 3.2.1 | `/api/productos/` | GET, POST | `getProductos()`, `saveProducto()` |
| 3.2.2 | `/api/productos/{id}/` | GET, PUT, DELETE | `getProductoById()`, `saveProducto()`, `deleteProducto()` |
| 3.2.3 | `/api/productos/{id}/stock/` | PATCH | `_actualizarBatchesProducto()` — actualizar batches y stock actual |
| 3.2.4 | `/api/stock-reservado/` | GET | `getStockReservado()` |
| 3.2.5 | `/api/stock-disponible/{productoId}/` | GET | `getStockDisponible()` |

### 3.3 Movimientos y kardex

| # | Endpoint | Métodos | Función frontend |
|---|----------|---------|-----------------|
| 3.3.1 | `/api/movimientos/` | GET (filtros: productoId, tipo, desde, hasta), POST | `getMovimientos()`, `registrarMovimiento()` |
| 3.3.2 | `/api/kardex/{productoId}/` | GET | `getKardex()` — movimientos + transferencias consolidados |
| 3.3.3 | `/api/ajustes/` | GET, POST | `getAjustes()`, `registrarAjuste()` |
| 3.3.4 | `/api/transferencias/` | GET, POST | `getTransferencias()`, `registrarTransferencia()` |
| 3.3.5 | `/api/devoluciones/` | GET, POST | `getDevoluciones()`, `registrarDevolucion()` |
| 3.3.6 | `/api/lotes/{productoId}/` | GET | `getLotesProducto()` |

### 3.4 Órdenes de compra

| # | Endpoint | Métodos | Función frontend |
|---|----------|---------|-----------------|
| 3.4.1 | `/api/ordenes/` | GET (filtro: estado), POST | `getOrdenes()`, `saveOrden()` |
| 3.4.2 | `/api/ordenes/{id}/` | GET, PUT, PATCH | `getOrdenById()`, `saveOrden()` |

### 3.5 Despachos y logística

| # | Endpoint | Métodos | Función frontend |
|---|----------|---------|-----------------|
| 3.5.1 | `/api/despachos/` | GET (filtros: estado, clienteId, desde), POST | `getDespachos()`, `saveDespacho()` |
| 3.5.2 | `/api/despachos/{id}/` | GET, PUT, PATCH | `getDespachoById()`, `saveDespacho()` |
| 3.5.3 | `/api/transportistas/` | GET, POST | `getTransportistas()`, `saveTransportista()` |
| 3.5.4 | `/api/transportistas/{id}/` | PUT, DELETE | `saveTransportista()`, `deleteTransportista()` |
| 3.5.5 | `/api/rutas/` | GET (filtros: estado, transportistaId, fecha), POST | `getRutas()`, `saveRuta()` |
| 3.5.6 | `/api/rutas/{id}/` | PUT, PATCH | `saveRuta()` |

### 3.6 Clientes y ventas

| # | Endpoint | Métodos | Función frontend |
|---|----------|---------|-----------------|
| 3.6.1 | `/api/clientes/` | GET (filtro: busqueda), POST | `getClientes()`, `saveCliente()` |
| 3.6.2 | `/api/clientes/{id}/` | PUT, DELETE | `saveCliente()`, `deleteCliente()` |
| 3.6.3 | `/api/cotizaciones/` | GET (filtro: estado), POST | `getCotizaciones()`, `saveCotizacion()` |
| 3.6.4 | `/api/cotizaciones/{id}/` | PUT | `saveCotizacion()` |
| 3.6.5 | `/api/proformas/` | GET, POST | `getProformas()`, `saveProforma()` |
| 3.6.6 | `/api/proformas/{id}/` | PUT, DELETE | `saveProforma()`, `deleteProforma()` |
| 3.6.7 | `/api/cxc/` | GET, POST | `getCxC()`, `saveCxC()` |
| 3.6.8 | `/api/cxc/{id}/` | PUT, DELETE | `saveCxC()`, `deleteCxC()` |

### 3.7 Pedidos internos

| # | Endpoint | Métodos | Función frontend |
|---|----------|---------|-----------------|
| 3.7.1 | `/api/pedidos-internos/` | GET (filtros: estado, areaId, prioridad, desde, hasta), POST | `getPedidosInternos()`, `savePedidoInterno()` |
| 3.7.2 | `/api/pedidos-internos/{id}/` | GET, PUT | `getPedidoInternoById()`, `savePedidoInterno()` |
| 3.7.3 | `/api/pedidos-internos/{id}/enviar/` | POST | `enviarPedidoInterno()` |
| 3.7.4 | `/api/pedidos-internos/{id}/aprobar/` | POST | `aprobarPedidoInterno()` |
| 3.7.5 | `/api/pedidos-internos/{id}/rechazar/` | POST | `rechazarPedidoInterno()` |
| 3.7.6 | `/api/pedidos-internos/{id}/picking/` | POST | `marcarPickingPI()` |
| 3.7.7 | `/api/pedidos-internos/{id}/entregar/` | POST | `entregarPedidoInterno()` |
| 3.7.8 | `/api/pedidos-internos/{id}/confirmar-recibo/` | POST | `confirmarReciboPedido()` |
| 3.7.9 | `/api/pedidos-internos/{id}/` | DELETE | `deletePedidoInterno()` |

### 3.8 Usuarios y roles

| # | Endpoint | Métodos | Función frontend |
|---|----------|---------|-----------------|
| 3.8.1 | `/api/usuarios/` | GET, POST | `getUsuarios()`, `saveUsuario()` |
| 3.8.2 | `/api/usuarios/{id}/` | PUT, DELETE | `saveUsuario()`, `deleteUsuario()` |
| 3.8.3 | `/api/roles/` | GET | `getRoles()` |
| 3.8.4 | `/api/permisos/verificar/` | GET | `tienePermiso(rol, modulo)` |

### 3.9 Configuración

| # | Endpoint | Métodos | Función frontend |
|---|----------|---------|-----------------|
| 3.9.1 | `/api/configuracion/` | GET, PATCH | `getConfig()`, `saveConfig()` |
| 3.9.2 | `/api/empresas/` | GET, POST | `getEmpresas()`, `registrarEmpresa()` |

### 3.10 Auditoría y notificaciones

| # | Endpoint | Métodos | Función frontend |
|---|----------|---------|-----------------|
| 3.10.1 | `/api/auditoria/` | GET (filtros: usuarioId, modulo, accion, desde, hasta, busqueda) | `getAuditoria()` |
| 3.10.2 | `/api/auditoria/limpiar/` | DELETE | `limpiarAuditoria()` |
| 3.10.3 | `/api/notificaciones/` | GET, POST | `getNotificaciones()`, `saveNotificacion()` |
| 3.10.4 | `/api/notificaciones/{id}/leer/` | PATCH | `marcarNotifLeida()` |
| 3.10.5 | `/api/notificaciones/leer-todas/` | PATCH | `marcarTodasLeidas()` |

### 3.11 Inventario físico

| # | Endpoint | Métodos | Función frontend |
|---|----------|---------|-----------------|
| 3.11.1 | `/api/inventario-fisico/` | GET, POST | `getInventariosFisicos()`, `saveInventarioFisico()` |
| 3.11.2 | `/api/inventario-fisico/{id}/` | PUT | `saveInventarioFisico()` |

---

## 4. Multi-tenant ✅ Operativo en frontend

> **Estado:** Implementado y funcionando en la aplicación de desarrollo.  
> El frontend ya aísla datos por empresa usando el prefijo `sp_{tenantId}_{entidad}` en localStorage.  
> Lo que queda pendiente es **replicar esta lógica en el backend Django**.

| # | Tarea backend pendiente | Detalle |
|---|-------------------------|---------|
| 4.1 | Implementar aislamiento por tenant en Django | El frontend usa `setTenant()` / `getTenant()` (`storage.js`). En el backend: campo `tenant_id` en cada modelo o esquemas separados por empresa. |
| 4.2 | Incluir `tenant_id` en el JWT o como header `X-Tenant-ID` | Para que cada request al backend sepa a qué empresa pertenece sin parámetro adicional. |
| 4.3 | Endpoint `/api/empresas/` filtrando por usuario autenticado | El frontend ya gestiona el registro de empresas con `getEmpresas()` / `registrarEmpresa()` en `storage.js:88`. |

---

## 5. Cola offline (sincronización diferida)

| # | Tarea | Archivo |
|---|-------|---------|
| 5.1 | Conectar `sincronizarConServidor(apiFn)` pasando `api.request` como función | `src/services/offlineQueue.js:150` |
| 5.2 | Llamar `iniciarSyncAutomatico(api.request, callback)` al iniciar la app | `src/store/AppContext.jsx` o `src/App.jsx` |
| 5.3 | Mostrar contador de operaciones pendientes en el `StorageWidget` cuando hay cola offline | `src/components/ui/StorageWidget.jsx` |
| 5.4 | En cada operación mutante (CREATE/UPDATE/DELETE) encolar con `encolarOperacion()` si `!navigator.onLine` | Afecta a `storage.js` — todas las funciones `save*` y `delete*` |

---

## 6. Ajustes de seguridad

| # | Tarea | Detalle |
|---|-------|---------|
| 6.1 | **Eliminar contraseñas en texto plano** — `loginUsuario()` en `storage.js:244` compara `password` directamente | El backend debe usar `bcrypt` / `argon2`. El frontend nunca debe almacenar ni comparar passwords. |
| 6.2 | Guardar solo el JWT en `localStorage`, no el objeto usuario completo con password | `src/services/storage.js` → `loginUsuario()` guarda toda la sesión incluyendo el campo `password` |
| 6.3 | Validar permisos en el servidor, no solo en el cliente | `tienePermiso()` en `storage.js:267` es validación de UI — debe replicarse en Django con `DRF permissions` |
| 6.4 | HTTPS obligatorio en producción | Variable `VITE_API_URL` debe apuntar a `https://` en producción |

---

## 7. Datos que dejan de usarse al migrar

Una vez que el backend esté activo, los siguientes archivos/funciones ya no serán la fuente de verdad:

- `src/data/demoData.js` — dataset de demostración (quedará solo para seeding inicial en Django)
- `src/data/initialData.js` — catálogo semilla (ídem)
- Las funciones `demo()` y `demoUsr()` en `storage.js`
- El `SEED_VERSION` / `runStorageMigration()` en `storageAdapter.js` (solo aplica a localStorage)

---

## 8. Orden de implementación sugerido

```
Fase 1 — Auth
  └── Endpoints JWT (2.1, 2.2, 2.3) + modelo Usuario con roles

Fase 2 — Catálogos maestros
  └── Categorías, Almacenes, Proveedores, Áreas (3.1)

Fase 3 — Inventario core
  └── Productos (3.2) + Movimientos/Kardex (3.3)

Fase 4 — Compras y ventas
  └── Órdenes de compra (3.4) + Clientes + Cotizaciones (3.5-3.6)

Fase 5 — Logística
  └── Despachos, Transportistas, Rutas (3.5)

Fase 6 — Módulos adicionales
  └── Pedidos internos (3.7) + CxC + Proformas + Auditoría (3.8-3.10)

Fase 7 — Offline & Multi-tenant
  └── Cola offline (5) + aislamiento tenant (4)
```

---

> **Nota para el equipo backend:**  
> El cliente HTTP en `src/services/api.js` ya maneja refresh automático de JWT,  
> errores de red, y modo offline. Al conectar un endpoint, solo hay que cambiar  
> el cuerpo de la función correspondiente en `src/services/storage.js`  
> de `leer(KEYS.xxx)` a `await api.get('/api/xxx/')`.  
> Los contextos y páginas no requieren ningún cambio.
