/**
 * StockPro — Configuración local del navegador (residual del storage v2.1 legacy)
 *
 * Todos los demás módulos ya migraron a backend real (ver memoria de
 * integración frontend-backend) — lo único que sigue viviendo acá es la
 * configuración local que usa Configuracion.jsx (getConfig/saveConfig/
 * exportarDatos), único importador real de este archivo.
 */
import { AUDITORIA } from '../config/constants'
import { CONFIG_DEFAULT, CONFIGS_DEMO } from '../data/demoData'

const _tenantId = 'dlnorte'

function k(name) { return `sp_${_tenantId}_${name}` }

const SK = { session: 'sp_session' }

const KEYS = {
  get config()      { return k('config')      },
  get productos()   { return k('productos')   },
  get categorias()  { return k('categorias')  },
  get almacenes()   { return k('almacenes')   },
  get proveedores() { return k('proveedores') },
  get movimientos() { return k('movimientos') },
  get ordenes()     { return k('ordenes')     },
  get usuarios()    { return k('usuarios')    },
}

function _audit(accion, modulo, detalle, datos) {
  try {
    const ses   = JSON.parse(localStorage.getItem(SK.session) || 'null')
    const logs  = JSON.parse(localStorage.getItem(k('auditoria')) || '[]')
    const ahora = new Date()
    logs.unshift({
      id:            Math.random().toString(36).slice(2,10),
      timestamp:     ahora.toISOString(),
      fecha:         ahora.toISOString().split('T')[0],
      hora:          ahora.toTimeString().slice(0,8),
      usuarioId:     ses?.id     || 'sistema',
      usuarioNombre: ses?.nombre || 'Sistema',
      accion, modulo, detalle, datos: datos || null,
    })
    if (logs.length > AUDITORIA.MAX_LOGS) logs.splice(AUDITORIA.MAX_LOGS)
    localStorage.setItem(k('auditoria'), JSON.stringify(logs))
  } catch(e) { _log('Error al registrar auditoría interna', e) }
}

function _log(msg, detail) {
  if (import.meta.env.DEV) console.error(`[storage] ${msg}`, detail ?? '')
}

function leer(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') }
  catch (e) { _log(`Error al leer clave "${key}"`, e); return null }
}
function guardar(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); return true }
  catch (e) { _log(`Error al guardar clave "${key}"`, e); return false }
}
function ok(data)  { return { data, error: null } }

// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════
export function getConfig(){
  const stored = leer(KEYS.config)
  const base = { ...CONFIG_DEFAULT, ...(CONFIGS_DEMO[_tenantId] || {}) }
  if (!stored) guardar(KEYS.config, base)  // seed on first access
  return ok({ ...base, ...(stored || {}) })
}
export function saveConfig(cfg){
  const c=leer(KEYS.config)||{}
  guardar(KEYS.config,{...c,...cfg})
  _audit('UPDATE','configuracion','Configuración del sistema actualizada')
  return ok(true)
}

export function exportarDatos(){
  const d={}
  ;[KEYS.config,KEYS.productos,KEYS.categorias,KEYS.almacenes,KEYS.proveedores,
    KEYS.movimientos,KEYS.ordenes,KEYS.usuarios,
    k('ajustes'),k('devoluciones'),k('transferencias'),k('cotizaciones')
  ].forEach(key=>{try{d[key]=JSON.parse(localStorage.getItem(key)||'null')}catch{d[key]=null}})
  return ok(d)
}
