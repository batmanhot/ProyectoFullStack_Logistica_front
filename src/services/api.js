/**
 * api.js — Cliente HTTP centralizado para NestJS (StockPro backend)
 *
 * Autenticación: JWT emitido por /api/auth/login
 *   - El empresaId viaja DENTRO del JWT (no hay header X-Tenant-ID).
 *   - Refresh vía POST /api/auth/refresh con rotación de refreshToken.
 *   - Tres contextos de auth independientes: tenant | admin | portal.
 *
 * Envelope de respuesta: { data, error } en TODA la API.
 */

import { encolarOperacion } from './offlineQueue'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const METODOS_MUTANTES = ['POST', 'PUT', 'PATCH', 'DELETE']
const ACCION_POR_METODO = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' }

// ── Tokens (#5, 2026-09-10) ──────────────────────────────────
// El REFRESH token vive en una cookie httpOnly que pone el backend — el JS
// no lo ve, un XSS no lo puede robar. El ACCESS token (corto, 15 min) vive
// SOLO EN MEMORIA (variable de módulo): se pierde al recargar la pestaña, y
// se recupera al arrancar llamando a /auth/refresh (que usa la cookie).
// Portal: el token de link se canjea en /portal/session por una cookie httpOnly
// (`sp_portal_rt` / `sp_portal_prov_rt`) y NO se persiste en JS. Se guarda una
// copia SOLO EN MEMORIA para la carga de página actual (fast-path del header
// Bearer); al recargar se re-canjea desde el token de la URL /portal/:token.
// Empresa de ESTA pestaña. El refresh token del tenant va en la cookie httpOnly
// `sp_rt_<empresaId>` (una por negocio) — la pestaña tiene que decirle al
// backend a qué empresa pertenece para que lea la cookie correcta. sessionStorage
// = por pestaña: Acme y DL Norte conviven en el mismo navegador.
const TAB_EMPRESA_KEY = 'sp_tab_empresa'

let _access = null        // access token del tenant (en memoria)
let _adminAccess = null    // access token del SuperAdmin (en memoria)
let _portal = null         // token de link del portal cliente (en memoria, no se persiste)
let _portalProv = null     // token de link del portal proveedor (en memoria, no se persiste)

export const tokenManager = {
  // Tenant
  getAccess:    () => _access,
  setTokens:    (access) => { _access = access || null },
  setAccess:    (access) => { _access = access || null },
  clearTokens:  () => { _access = null },
  getRefresh:   () => null, // el refresh está en cookie httpOnly

  // Empresa de la pestaña (para elegir la cookie `sp_rt_<empresaId>` correcta)
  getTabEmpresa: () => { try { return sessionStorage.getItem(TAB_EMPRESA_KEY) } catch { return null } },
  setTabEmpresa: (id) => {
    try { id ? sessionStorage.setItem(TAB_EMPRESA_KEY, id) : sessionStorage.removeItem(TAB_EMPRESA_KEY) } catch { /* storage bloqueado */ }
  },

  // Platform Admin (sesión separada, nunca se mezcla con tenant)
  getAdminAccess:   () => _adminAccess,
  setAdminTokens:   (access) => { _adminAccess = access || null },
  setAdminAccess:   (access) => { _adminAccess = access || null },
  clearAdminTokens: () => { _adminAccess = null },
  getAdminRefresh:  () => null,

  // Portal cliente / proveedor — token de link SOLO EN MEMORIA. La credencial
  // persistente es la cookie httpOnly que pone /portal(-proveedor)/session.
  getPortal:   () => _portal,
  setPortal:   (token) => { _portal = token || null },
  clearPortal: () => { _portal = null },
  getPortalProveedor:   () => _portalProv,
  setPortalProveedor:   (token) => { _portalProv = token || null },
  clearPortalProveedor: () => { _portalProv = null },

  isExpired: (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000 < Date.now()
    } catch { return true }
  },
}

// ── Refresh interno ──────────────────────────────────────────
// El refresh token va en una cookie httpOnly (path-scoped). Se manda con
// `credentials: 'include'`, sin body. La respuesta trae el access token nuevo
// (en memoria) y los datos del usuario/admin.
//
// Devuelve SIEMPRE un objeto { ok, data, transient }:
//   - ok:false + transient:false → no hay sesión / revocada (401/403) → destruir sesión.
//   - ok:false + transient:true  → throttle (429), error 5xx o red caída → NO destruir
//     la sesión: es un problema pasajero, se reintenta.
async function _refreshCore(path, guardar, body) {
  try {
    const init = { method: 'POST', credentials: 'include' }
    if (body) {
      init.headers = { 'Content-Type': 'application/json' }
      init.body = JSON.stringify(body)
    }
    const res = await fetch(`${BASE_URL}${path}`, init)
    if (!res.ok) {
      const transient = res.status === 429 || res.status >= 500 || res.status === 0
      return { ok: false, data: null, transient }
    }
    const json = await res.json()
    const data = json.data || json
    if (!data?.accessToken) return { ok: false, data: null, transient: false }
    guardar(data.accessToken)
    return { ok: true, data, transient: false }
  } catch {
    // fetch rechaza → servidor caído / sin red / CORS → pasajero
    return { ok: false, data: null, transient: true }
  }
}

// Lock single-flight: TODOS los que piden refresh a la vez (StrictMode que
// monta el efecto 2 veces en dev, la ráfaga de queries que dan 401 al arrancar,
// el bootstrap) comparten UNA sola petición en vuelo. Sin esto, una recarga
// disparaba 20-30 POST /auth/refresh y reventaba el rate-limit del endpoint.
const _refreshEnVuelo = { tenant: null, admin: null }

function _refresh(kind) {
  if (!_refreshEnVuelo[kind]) {
    if (kind === 'admin') {
      _refreshEnVuelo.admin = _refreshCore('/admin/auth/refresh', tokenManager.setAdminAccess)
        .finally(() => { _refreshEnVuelo.admin = null })
    } else {
      // El backend necesita saber a qué empresa pertenece esta pestaña para leer
      // la cookie `sp_rt_<empresaId>` correcta. Sin empresa en la pestaña no hay
      // sesión que recuperar (fallo definitivo, no transitorio).
      const empresaId = tokenManager.getTabEmpresa()
      if (!empresaId) return Promise.resolve({ ok: false, data: null, transient: false })
      _refreshEnVuelo.tenant = _refreshCore('/auth/refresh', tokenManager.setAccess, { empresaId })
        .finally(() => { _refreshEnVuelo.tenant = null })
    }
  }
  return _refreshEnVuelo[kind]
}

const _refreshTenant = () => _refresh('tenant')
const _refreshAdmin  = () => _refresh('admin')

// ── Núcleo HTTP ───────────────────────────────────────────────
async function _request(method, endpoint, data = null, opts = {}) {
  const { skipAuth = false, intentoRefresh = false, authType = 'tenant' } = opts

  // Content-Type solo si hay body: Fastify (backend) rechaza con
  // FST_ERR_CTP_EMPTY_JSON_BODY cualquier request que declare
  // application/json pero mande el body vacío (p.ej. DELETE o un POST
  // de "acción" sin payload).
  const headers = data !== null ? { 'Content-Type': 'application/json' } : {}

  if (!skipAuth) {
    let access = authType === 'admin'
      ? tokenManager.getAdminAccess()
      : authType === 'portal'
        ? tokenManager.getPortal()
        : authType === 'portal-proveedor'
          ? tokenManager.getPortalProveedor()
          : tokenManager.getAccess()

    const refreshFn = authType === 'admin' ? _refreshAdmin : _refreshTenant
    const esPortal   = authType === 'portal' || authType === 'portal-proveedor'

    if (access && tokenManager.isExpired(access) && !intentoRefresh && !esPortal) {
      const r = await refreshFn()
      if (!r.ok) {
        // Solo se destruye la sesión si el refresh dijo "no autorizado".
        // Si fue throttle/5xx/red, se deja intacta: se recupera en el próximo intento.
        if (!r.transient) {
          authType === 'admin' ? tokenManager.clearAdminTokens() : tokenManager.clearTokens()
        }
        return {
          data: null,
          error: r.transient
            ? 'No se pudo renovar la sesión (servidor ocupado). Reintenta en unos segundos.'
            : 'Sesión expirada. Por favor inicia sesión nuevamente.',
          status: 401,
        }
      }
      access = authType === 'admin' ? tokenManager.getAdminAccess() : tokenManager.getAccess()
    }

    if (access) headers['Authorization'] = `Bearer ${access}`
  }

  // credentials: 'include' → manda la cookie httpOnly del refresh token en
  // /auth/* y /admin/auth/*. En el resto es inofensivo (no hay cookie con ese
  // path). Requiere CORS con Allow-Credentials + origin exacto (ya configurado).
  const config = { method, headers, credentials: 'include' }
  if (data !== null) config.body = JSON.stringify(data)

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, config)

    if (res.status === 401 && !intentoRefresh && !skipAuth && authType !== 'portal' && authType !== 'portal-proveedor') {
      const refreshFn = authType === 'admin' ? _refreshAdmin : _refreshTenant
      const r = await refreshFn()
      if (r.ok) return _request(method, endpoint, data, { ...opts, intentoRefresh: true })
      if (!r.transient) {
        authType === 'admin' ? tokenManager.clearAdminTokens() : tokenManager.clearTokens()
      }
      return {
        data: null,
        error: r.transient ? 'Sin conexión con el servidor de sesión.' : 'Sesión expirada.',
        status: 401,
      }
    }

    if (res.status === 204) return { data: null, error: null, status: 204 }

    const text = await res.text()
    let json = null

    if (text) {
      try {
        json = JSON.parse(text)
      } catch {
        if (!res.ok) {
          return { data: null, error: text.slice(0, 250) || `Error ${res.status}`, status: res.status }
        }
        return { data: null, error: 'La respuesta del servidor no está en formato JSON válido.', status: res.status }
      }
    }

    // El backend NestJS envuelve TODAS las respuestas en {data, error}
    // El HttpExceptionFilter envía error como objeto {statusCode, message} — normalizar a string
    if (json && ('data' in json || 'error' in json)) {
      const rawErr = json.error
      const error  = rawErr && typeof rawErr === 'object'
        ? (rawErr.message ?? String(rawErr.statusCode ?? 'Error'))
        : rawErr
      return { data: json.data, error, status: res.status }
    }

    if (!res.ok) return { data: null, error: json?.message || `Error ${res.status}`, status: res.status }
    return { data: json, error: null, status: res.status }

  } catch (e) {
    const offline = !navigator.onLine
    let encolado = false

    // Sin conexión + mutación de un módulo del tenant → se encola en IndexedDB
    // (ver services/offlineQueue.js) en vez de perderse; se reintenta sola al
    // volver la conexión (iniciarSyncAutomatico(), llamado desde AppContext).
    if (offline && authType === 'tenant' && !skipAuth && METODOS_MUTANTES.includes(method)) {
      const modulo = endpoint.split('?')[0].split('/').filter(Boolean)[0] || 'sistema'
      await encolarOperacion({
        modulo,
        accion:      ACCION_POR_METODO[method] || method,
        endpoint,
        method,
        payload:     data,
        descripcion: `${ACCION_POR_METODO[method] || method} en ${modulo}`,
      })
      encolado = true
    }

    return {
      data:    null,
      error:   offline
        ? (encolado ? 'Sin conexión — la operación se guardó y se sincronizará automáticamente' : 'Sin conexión a internet')
        : ('No se pudo conectar con el servidor. Verifica que el backend esté levantado.'),
      status:  0,
      offline,
      encolado,
    }
  }
}

// ── API pública ───────────────────────────────────────────────
export const api = {
  get:    (endpoint, opts)        => _request('GET',    endpoint, null, opts),
  post:   (endpoint, data, opts)  => _request('POST',   endpoint, data, opts),
  put:    (endpoint, data, opts)  => _request('PUT',    endpoint, data, opts),
  patch:  (endpoint, data, opts)  => _request('PATCH',  endpoint, data, opts),
  delete: (endpoint, opts)        => _request('DELETE', endpoint, null, opts),

  // Genérico: usado por offlineQueue.sincronizarConServidor() para reintentar
  // operaciones encoladas con el mismo (method, endpoint, payload) originales.
  request: (method, endpoint, data, opts) => _request(method, endpoint, data, opts),

  // Paso 1 del login: resolver empresa por código (endpoint público)
  buscarEmpresa: (codigo) =>
    _request('GET', `/empresas/${codigo}`, null, { skipAuth: true }),

  // Paso 2: autenticar usuario del tenant. El backend pone el refresh token en
  // una cookie httpOnly; en el body solo viene el access token (→ memoria).
  async login(empresaId, email, password) {
    const res = await _request('POST', '/auth/login', { empresaId, email, password }, { skipAuth: true })
    if (res.data?.accessToken) {
      tokenManager.setAccess(res.data.accessToken)
      tokenManager.setTabEmpresa(empresaId) // esta pestaña = este negocio
    }
    return res
  },

  // Acceso rápido de "modo desarrollo" (tarjetas del Login) — sin password;
  // el backend igual valida que la empresa sea demo y tenga el switch activo.
  async demoLogin(empresaId, usuarioId) {
    const res = await _request('POST', '/auth/demo-login', { empresaId, usuarioId }, { skipAuth: true })
    if (res.data?.accessToken) {
      tokenManager.setAccess(res.data.accessToken)
      tokenManager.setTabEmpresa(empresaId)
    }
    return res
  },

  // Login Platform Admin (sesión separada, Fase 7d)
  async loginAdmin(email, password) {
    const res = await _request('POST', '/admin/auth/login', { email, password }, { skipAuth: true })
    if (res.data?.accessToken) tokenManager.setAdminAccess(res.data.accessToken)
    return res
  },

  // Al arrancar la app: el access token vive en memoria y se perdió al recargar.
  // Se recupera con /auth/refresh (usa la cookie httpOnly). Comparte el lock
  // single-flight con el resto de refreshes. Devuelve { ok, data, transient }:
  // ok:false + transient:true → problema pasajero, NO destruir la sesión guardada.
  bootstrapTenant: () => _refreshTenant(),
  bootstrapAdmin:  () => _refreshAdmin(),

  async logout() {
    try { await _request('POST', '/auth/logout', null, {}) } catch { /* la cookie se limpia igual abajo */ }
    tokenManager.clearTokens()
    tokenManager.setTabEmpresa(null)
  },

  async logoutAdmin() {
    try { await _request('POST', '/admin/auth/logout', null, {}) } catch { /* idem */ }
    tokenManager.clearAdminTokens()
  },

  // Portal cliente / proveedor: canjea el token de link (viene en la URL
  // /portal/:token) por una cookie httpOnly. Se llama en cada carga del portal
  // (idempotente). El token NO se persiste en JS; queda una copia en memoria
  // para el fast-path del header Bearer durante esta carga.
  async portalSession(token) {
    const res = await _request('POST', '/portal/session', { token }, { skipAuth: true })
    if (!res.error) tokenManager.setPortal(token)
    return res
  },
  async portalProveedorSession(token) {
    const res = await _request('POST', '/portal-proveedor/session', { token }, { skipAuth: true })
    if (!res.error) tokenManager.setPortalProveedor(token)
    return res
  },
}

export default api
