/**
 * initDemo.js — Inicializador de datos demo con versionado.
 *
 * Si la versión guardada en localStorage difiere de DEMO_VERSION,
 * limpia TODO el localStorage (excepto sesión) y recarga el dataset.
 *
 * Para forzar recarga manual: borrar 'sp_demo_version' en DevTools > Application > Storage
 */

const DEMO_VERSION = '2.5.0'   // ← incrementar cada vez que cambie el dataset demo

// ── TODAS las claves del sistema ───────────────────────
const ALL_KEYS = [
  'sp_config',
  'sp_productos',
  'sp_categorias',
  'sp_almacenes',
  'sp_proveedores',
  'sp_movimientos',
  'sp_ordenes',
  'sp_usuarios',
  'sp_ajustes',
  'sp_devoluciones',
  'sp_transferencias',
  'sp_cotizaciones',
  'sp_inv_fisico',
  'sp_notif',
  'sp_alertas_leidas',
  'sp_clientes',        // ← módulo Clientes
  'sp_despachos',       // ← módulo Despachos
  'sp_transportistas',  // ← módulo Transportistas
  'sp_rutas',           // ← módulo Rutas/Salidas
  // NO incluir 'sp_session' — el usuario no debe perder sesión
]

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
  storageFns.getClientes()       // ← nuevo
  storageFns.getDespachos()      // ← nuevo
  storageFns.getTransportistas() // ← nuevo
  storageFns.getRutas()          // ← nuevo

  // ── 3. Marcar versión instalada ───────────────────────
  localStorage.setItem('sp_demo_version', DEMO_VERSION)

  console.info('[StockPro] Dataset demo v' + DEMO_VERSION + ' cargado correctamente ✓')
}
