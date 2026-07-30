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

// ── Claves de storage ────────────────────────────────────────
const TOKEN_KEY         = 'sp_access_token'
const REFRESH_KEY       = 'sp_refresh_token'
const ADMIN_TOKEN_KEY   = 'sp_admin_access_token'
const ADMIN_REFRESH_KEY = 'sp_admin_refresh_token'
const PORTAL_TOKEN_KEY  = 'sp_portal_token'
const PORTAL_PROVEEDOR_TOKEN_KEY = 'sp_portal_proveedor_token'

export const tokenManager = {
  // Tenant
  getAccess:    () => localStorage.getItem(TOKEN_KEY),
  getRefresh:   () => localStorage.getItem(REFRESH_KEY),
  setTokens:    (access, refresh) => {
    localStorage.setItem(TOKEN_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clearTokens:  () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },

  // Platform Admin (sesión separada, nunca se mezcla con tenant)
  getAdminAccess:   () => localStorage.getItem(ADMIN_TOKEN_KEY),
  getAdminRefresh:  () => localStorage.getItem(ADMIN_REFRESH_KEY),
  setAdminTokens:   (access, refresh) => {
    localStorage.setItem(ADMIN_TOKEN_KEY, access)
    if (refresh) localStorage.setItem(ADMIN_REFRESH_KEY, refresh)
  },
  clearAdminTokens: () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ADMIN_REFRESH_KEY)
  },

  // Portal cliente (token único; soporta header Bearer o ?token= en query)
  getPortal:   () => localStorage.getItem(PORTAL_TOKEN_KEY),
  setPortal:   (token) => localStorage.setItem(PORTAL_TOKEN_KEY, token),
  clearPortal: () => localStorage.removeItem(PORTAL_TOKEN_KEY),

  // Portal proveedor B2B (mismo patrón, slot de storage propio para no
  // pisar una sesión de portal cliente abierta en el mismo navegador)
  getPortalProveedor:   () => localStorage.getItem(PORTAL_PROVEEDOR_TOKEN_KEY),
  setPortalProveedor:   (token) => localStorage.setItem(PORTAL_PROVEEDOR_TOKEN_KEY, token),
  clearPortalProveedor: () => localStorage.removeItem(PORTAL_PROVEEDOR_TOKEN_KEY),

  isExpired: (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000 < Date.now()
    } catch { return true }
  },
}

// ── Refresh interno ──────────────────────────────────────────
async function _refreshTenant() {
  const refresh = tokenManager.getRefresh()
  if (!refresh) return false
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: refresh }),
    })
    if (!res.ok) return false
    const json = await res.json()
    const tokens = json.data || json
    if (!tokens?.accessToken) return false
    // Rotación: guardar el refreshToken nuevo que emite el backend
    tokenManager.setTokens(tokens.accessToken, tokens.refreshToken || null)
    return true
  } catch { return false }
}

async function _refreshAdmin() {
  const refresh = tokenManager.getAdminRefresh()
  if (!refresh) return false
  try {
    const res = await fetch(`${BASE_URL}/admin/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: refresh }),
    })
    if (!res.ok) return false
    const json = await res.json()
    const tokens = json.data || json
    if (!tokens?.accessToken) return false
    tokenManager.setAdminTokens(tokens.accessToken, tokens.refreshToken || null)
    return true
  } catch { return false }
}

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
      const refreshed = await refreshFn()
      if (!refreshed) {
        authType === 'admin' ? tokenManager.clearAdminTokens() : tokenManager.clearTokens()
        return { data: null, error: 'Sesión expirada. Por favor inicia sesión nuevamente.', status: 401 }
      }
      access = authType === 'admin' ? tokenManager.getAdminAccess() : tokenManager.getAccess()
    }

    if (access) headers['Authorization'] = `Bearer ${access}`
  }

  const config = { method, headers }
  if (data !== null) config.body = JSON.stringify(data)

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, config)

    if (res.status === 401 && !intentoRefresh && !skipAuth && authType !== 'portal' && authType !== 'portal-proveedor') {
      const refreshFn = authType === 'admin' ? _refreshAdmin : _refreshTenant
      const refreshed = await refreshFn()
      if (refreshed) return _request(method, endpoint, data, { ...opts, intentoRefresh: true })
      authType === 'admin' ? tokenManager.clearAdminTokens() : tokenManager.clearTokens()
      return { data: null, error: 'Sesión expirada.', status: 401 }
    }

    if (res.status === 204) return { data: null, error: null, status: 204 }

    const json = await res.json()

    // El backend NestJS envuelve TODAS las respuestas en {data, error}
    // El HttpExceptionFilter envía error como objeto {statusCode, message} — normalizar a string
    if ('data' in json || 'error' in json) {
      const rawErr = json.error
      const error  = rawErr && typeof rawErr === 'object'
        ? (rawErr.message ?? String(rawErr.statusCode ?? 'Error'))
        : rawErr
      return { data: json.data, error, status: res.status }
    }

    if (!res.ok) return { data: null, error: json.message || `Error ${res.status}`, status: res.status }
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
        : (e.message || 'Error de red'),
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

  // Paso 2: autenticar usuario del tenant
  async login(empresaId, email, password) {
    const res = await _request('POST', '/auth/login', { empresaId, email, password }, { skipAuth: true })
    if (res.data?.accessToken) {
      tokenManager.setTokens(res.data.accessToken, res.data.refreshToken)
    }
    return res
  },

  // Acceso rápido de "modo desarrollo" (tarjetas del Login) — sin password;
  // el backend igual valida que la empresa sea demo y tenga el switch activo.
  async demoLogin(empresaId, usuarioId) {
    const res = await _request('POST', '/auth/demo-login', { empresaId, usuarioId }, { skipAuth: true })
    if (res.data?.accessToken) {
      tokenManager.setTokens(res.data.accessToken, res.data.refreshToken)
    }
    return res
  },

  // Login Platform Admin (sesión separada, Fase 7d)
  async loginAdmin(email, password) {
    const res = await _request('POST', '/admin/auth/login', { email, password }, { skipAuth: true })
    if (res.data?.accessToken) {
      tokenManager.setAdminTokens(res.data.accessToken, res.data.refreshToken)
    }
    return res
  },

  logout() {
    tokenManager.clearTokens()
  },

  logoutAdmin() {
    tokenManager.clearAdminTokens()
  },
}

export default api
