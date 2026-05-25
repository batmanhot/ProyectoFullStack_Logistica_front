/**
 * offlineQueue.js — Cola de operaciones offline con IndexedDB
 *
 * Cuando no hay internet, las operaciones mutantes (POST/PUT/DELETE)
 * se guardan aquí. Al recuperar la conexión se sincronizan en orden.
 *
 * Coexiste con localStorage: no lo reemplaza.
 * Requiere backend activo para sincronizar (USE_BACKEND = true).
 */

const DB_NAME    = 'stockpro_offline'
const DB_VERSION = 1
const STORE      = 'cola_operaciones'

// ── Abrir / crear la base IndexedDB ──────────────────────
function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
        store.createIndex('estado',    'estado',    { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('modulo',    'modulo',    { unique: false })
      }
    }

    req.onsuccess  = () => resolve(req.result)
    req.onerror    = () => reject(req.error)
  })
}

// ── Encolar una operación pendiente ──────────────────────
/**
 * @param {object} operacion
 *   modulo    — 'productos' | 'movimientos' | 'ordenes' | etc.
 *   accion    — 'CREATE' | 'UPDATE' | 'DELETE'
 *   endpoint  — '/api/productos/' (para cuando haya backend)
 *   method    — 'POST' | 'PUT' | 'PATCH' | 'DELETE'
 *   payload   — datos a enviar al servidor
 *   descripcion — texto legible para mostrar al usuario
 */
export async function encolarOperacion(operacion) {
  try {
    const db = await abrirDB()
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      const item  = {
        ...operacion,
        estado:      'PENDIENTE',
        timestamp:   new Date().toISOString(),
        intentos:    0,
        ultimoError: null,
      }
      const req = store.add(item)
      req.onsuccess = () => resolve(req.result)
      req.onerror   = () => reject(req.error)
    })
  } catch (e) {
    console.warn('[OfflineQueue] No se pudo encolar operación:', e)
    return null
  }
}

// ── Obtener operaciones pendientes ────────────────────────
export async function getPendientes() {
  try {
    const db = await abrirDB()
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE, 'readonly')
      const store = tx.objectStore(STORE)
      const idx   = store.index('estado')
      const req   = idx.getAll('PENDIENTE')
      req.onsuccess = () => resolve(req.result || [])
      req.onerror   = () => reject(req.error)
    })
  } catch { return [] }
}

// ── Contar operaciones pendientes ─────────────────────────
export async function contarPendientes() {
  const lista = await getPendientes()
  return lista.length
}

// ── Marcar como sincronizado ──────────────────────────────
export async function marcarSincronizado(id) {
  try {
    const db = await abrirDB()
    return new Promise((resolve) => {
      const tx    = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      const get   = store.get(id)
      get.onsuccess = () => {
        if (get.result) {
          store.put({ ...get.result, estado: 'SINCRONIZADO', sincronizadoAt: new Date().toISOString() })
        }
        resolve()
      }
      get.onerror = () => resolve()
    })
  } catch { /* silencioso */ }
}

// ── Marcar como fallido (incrementar intentos) ────────────
export async function marcarFallido(id, error) {
  try {
    const db = await abrirDB()
    return new Promise((resolve) => {
      const tx    = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      const get   = store.get(id)
      get.onsuccess = () => {
        if (get.result) {
          const item = get.result
          item.intentos    = (item.intentos || 0) + 1
          item.ultimoError = error
          // Después de 5 intentos fallidos, marcar como error permanente
          if (item.intentos >= 5) item.estado = 'ERROR'
          store.put(item)
        }
        resolve()
      }
      get.onerror = () => resolve()
    })
  } catch { /* silencioso */ }
}

// ── Limpiar operaciones ya sincronizadas ──────────────────
export async function limpiarSincronizados() {
  try {
    const db = await abrirDB()
    const tx    = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const idx   = store.index('estado')
    const req   = idx.openCursor(IDBKeyRange.only('SINCRONIZADO'))
    req.onsuccess = (e) => {
      const cursor = e.target.result
      if (cursor) { cursor.delete(); cursor.continue() }
    }
  } catch { /* silencioso */ }
}

// ── Sincronizar con el servidor ───────────────────────────
// Se activa cuando USE_BACKEND = true y hay conexión a internet.
// Por ahora solo registra en consola; se completa al integrar Django.
export async function sincronizarConServidor(apiFn) {
  if (!navigator.onLine) return { sincronizados: 0, errores: 0 }

  const pendientes = await getPendientes()
  if (!pendientes.length) return { sincronizados: 0, errores: 0 }

  let sincronizados = 0
  let errores = 0

  for (const op of pendientes) {
    try {
      const res = await apiFn(op.method, op.endpoint, op.payload)
      if (res.error) {
        await marcarFallido(op.id, res.error)
        errores++
      } else {
        await marcarSincronizado(op.id)
        sincronizados++
      }
    } catch (e) {
      await marcarFallido(op.id, e.message)
      errores++
    }
  }

  if (sincronizados > 0) await limpiarSincronizados()
  return { sincronizados, errores }
}

// ── Detectar conexión y auto-sincronizar ──────────────────
let _syncHandler = null

export function iniciarSyncAutomatico(apiFn, onSyncComplete) {
  if (_syncHandler) return // ya iniciado

  _syncHandler = async () => {
    if (navigator.onLine) {
      const resultado = await sincronizarConServidor(apiFn)
      if (resultado.sincronizados > 0 && onSyncComplete) {
        onSyncComplete(resultado)
      }
    }
  }

  window.addEventListener('online', _syncHandler)
}

export function detenerSyncAutomatico() {
  if (_syncHandler) {
    window.removeEventListener('online', _syncHandler)
    _syncHandler = null
  }
}

// ── Obtener TODAS las operaciones (para el monitor de cola) ──
export async function getTodasOperaciones() {
  try {
    const db = await abrirDB()
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE, 'readonly')
      const store = tx.objectStore(STORE)
      const req   = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror   = () => reject(req.error)
    })
  } catch { return [] }
}

// ── Volver a PENDIENTE las operaciones con ERROR ──────────────
export async function reintentarFallidos() {
  try {
    const db      = await abrirDB()
    const errores = await new Promise(resolve => {
      const tx  = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).index('estado').getAll('ERROR')
      req.onsuccess = () => resolve(req.result || [])
      req.onerror   = () => resolve([])
    })
    if (!errores.length) return
    const tx2    = db.transaction(STORE, 'readwrite')
    const store2 = tx2.objectStore(STORE)
    errores.forEach(item =>
      store2.put({ ...item, estado: 'PENDIENTE', intentos: 0, ultimoError: null })
    )
  } catch { /* silencioso */ }
}

// ── Vaciar toda la cola ───────────────────────────────────────
export async function vaciarCola() {
  try {
    const db = await abrirDB()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
  } catch { /* silencioso */ }
}
