/**
 * initDemo.js — Inicializador de datos demo con versionado.
 *
 * Si la versión guardada en localStorage difiere de DEMO_VERSION,
 * limpia TODO el localStorage (excepto sesión) y recarga el dataset.
 *
 * Para forzar recarga manual: borrar 'sp_demo_version' en DevTools > Application > Storage
 */

const DEMO_VERSION = '2.5.0'   // ← incrementar cada vez que cambie el dataset demo

// Tenants de demo definidos en storage.js (DEMO_TENANTS)
const DEMO_TENANTS = ['dlnorte', 'acme']

// Entidades con prefijo de tenant — patrón: sp_{tenantId}_{entidad}
const TENANT_ENTITIES = [
  'config', 'productos', 'categorias', 'almacenes', 'proveedores',
  'movimientos', 'ordenes', 'usuarios', 'ajustes', 'devoluciones',
  'transferencias', 'cotizaciones', 'inv_fisico', 'notif',
  'alertas_leidas', 'clientes', 'despachos', 'transportistas',
  'rutas', 'cxc', 'proformas', 'empaques', 'flota',
  'listas_precios', 'auditoria', 'areas', 'pedidos_internos',
  'roles_custom',
]

// Genera las claves reales para todos los tenants demo
// NO incluye sp_session — el usuario no debe perder sesión
const ALL_KEYS = DEMO_TENANTS.flatMap(tid =>
  TENANT_ENTITIES.map(entity => `sp_${tid}_${entity}`)
)

export function initDemoData(storageFns) {
  const savedVersion = localStorage.getItem('sp_demo_version')

  if (savedVersion === DEMO_VERSION) return  // ya está al día, nada que hacer

  console.info(`[StockPro] Actualizando dataset demo ${savedVersion || '(sin versión)'} → v${DEMO_VERSION}`)

  // ── 1. Limpiar TODOS los datos anteriores ─────────────
  ALL_KEYS.forEach(k => localStorage.removeItem(k))

  // ── 2. Recargar cada entidad desde los datos iniciales ──
  // El patrón de cada función: si la clave no existe en localStorage,
  // escribe los datos demo y los devuelve.
  storageFns.getConfig()
  storageFns.getCategorias()
  storageFns.getAlmacenes()
  storageFns.getProveedores()
  storageFns.getProductos()
  storageFns.getMovimientos()
  storageFns.getOrdenes()
  storageFns.getUsuarios()
  storageFns.getAjustes()
  storageFns.getDevoluciones()
  storageFns.getTransferencias()
  storageFns.getCotizaciones()
  storageFns.getClientes()
  storageFns.getDespachos()
  storageFns.getTransportistas()
  storageFns.getRutas()
  storageFns.getCxC()
  storageFns.getProformas()

  // ── 3. Marcar versión instalada ───────────────────────
  localStorage.setItem('sp_demo_version', DEMO_VERSION)

  console.info('[StockPro] Dataset demo v' + DEMO_VERSION + ' cargado correctamente ✓')
}
