/**
 * api.js — Cliente HTTP centralizado para Django REST Framework
 *
 * Autenticación : JWT con djangorestframework-simplejwt
 *   POST /api/auth/token/         → obtener access + refresh
 *   POST /api/auth/token/refresh/ → renovar access con refresh
 *
 * Multitenancy  : Header X-Tenant-ID enviado automáticamente en cada request.
 *   El backend usa este header para aislar datos por empresa.
 *   Fuente: localStorage 'sp_session' → campo empresaId
 *
 * Variables de entorno (.env):
 *   VITE_API_URL=http://localhost:8000/api
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const TOKEN_KEY   = 'sp_access_token'
const REFRESH_KEY = 'sp_refresh_token'
const SESSION_KEY = 'sp_session'

// ── Gestión de tokens JWT ─────────────────────────────────
export const tokenManager = {
  getAccess:   () => localStorage.getItem(TOKEN_KEY),
  getRefresh:  () => localStorage.getItem(REFRESH_KEY),
  setTokens:   (a, r) => {
    localStorage.setItem(TOKEN_KEY, a)
    if (r) localStorage.setItem(REFRESH_KEY, r)
  },
  clearTokens: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
  isExpired: (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000 < Date.now()
    } catch { return true }
  },
}

// ── Tenant activo ─────────────────────────────────────────
function getTenantId() {
  try {
    const ses = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    return ses?.empresaId || null
  } catch { return null }
}

// ── Núcleo HTTP ───────────────────────────────────────────
async function _request(method, endpoint, data = null, intentoRefresh = false) {
  const headers = { 'Content-Type': 'application/json' }

  // Header de tenant para aislamiento multitenant en el backend
  const tenantId = getTenantId()
  if (tenantId) headers['X-Tenant-ID'] = tenantId

  // Adjuntar token de acceso si existe
  let access = tokenManager.getAccess()

  // Si el token expiró, intentar renovarlo automáticamente una vez
  if (access && tokenManager.isExpired(access) && !intentoRefresh) {
    const refreshed = await _refreshToken()
    if (!refreshed) {
      tokenManager.clearTokens()
      return { data: null, error: 'Sesión expirada. Por favor inicia sesión nuevamente.', status: 401 }
    }
    access = tokenManager.getAccess()
  }

  if (access) headers['Authorization'] = `Bearer ${access}`

  const config = { method, headers }
  if (data !== null) config.body = JSON.stringify(data)

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, config)

    // Token inválido en servidor → intentar refresh una vez
    if (res.status === 401 && !intentoRefresh) {
      const refreshed = await _refreshToken()
      if (refreshed) return _request(method, endpoint, data, true)
      tokenManager.clearTokens()
      return { data: null, error: 'Sesión expirada.', status: 401 }
    }

    if (!res.ok) {
      let errorMsg = `Error ${res.status}`
      try {
        const body = await res.json()
        errorMsg = body.detail || body.message || Object.values(body).flat().join(' ') || errorMsg
      } catch { /* respuesta sin JSON */ }
      return { data: null, error: errorMsg, status: res.status }
    }

    // 204 No Content
    if (res.status === 204) return { data: null, error: null, status: 204 }

    const json = await res.json()
    return { data: json, error: null, status: res.status }

  } catch (e) {
    const offline = !navigator.onLine
    return {
      data:    null,
      error:   offline ? 'Sin conexión a internet' : (e.message || 'Error de red'),
      status:  0,
      offline,
    }
  }
}

async function _refreshToken() {
  const refresh = tokenManager.getRefresh()
  if (!refresh) return false
  try {
    const res = await fetch(`${BASE_URL}/auth/token/refresh/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refresh }),
    })
    if (!res.ok) return false
    const { access } = await res.json()
    tokenManager.setTokens(access, null)
    return true
  } catch { return false }
}

// ── API pública ───────────────────────────────────────────
export const api = {
  get:    (endpoint)       => _request('GET',    endpoint),
  post:   (endpoint, data) => _request('POST',   endpoint, data),
  put:    (endpoint, data) => _request('PUT',    endpoint, data),
  patch:  (endpoint, data) => _request('PATCH',  endpoint, data),
  delete: (endpoint)       => _request('DELETE', endpoint),

  // Autenticación Django simplejwt
  async login(empresaId, email, password) {
    const res = await _request('POST', '/auth/token/', { empresaId, email, password }, true)
    if (res.data?.access) {
      tokenManager.setTokens(res.data.access, res.data.refresh)
    }
    return res
  },

  // Login superadmin SaaS (sin tenant)
  async loginAdmin(email, password) {
    const res = await _request('POST', '/auth/admin/token/', { email, password }, true)
    if (res.data?.access) {
      tokenManager.setTokens(res.data.access, res.data.refresh)
    }
    return res
  },

  logout() {
    tokenManager.clearTokens()
  },
}

// ── Mapa de endpoints (referencia para la migración) ──────
//
// AUTH            POST   /auth/token/              → login tenant
//                 POST   /auth/admin/token/        → login superadmin
//                 POST   /auth/token/refresh/      → renovar access
//                 POST   /auth/logout/             → invalidar refresh
//
// PRODUCTOS       GET    /productos/
//                 POST   /productos/
//                 GET    /productos/{id}/
//                 PUT    /productos/{id}/
//                 DELETE /productos/{id}/
//
// MOVIMIENTOS     GET    /movimientos/
//                 POST   /movimientos/
//
// ORDENES         GET    /ordenes/
//                 POST   /ordenes/
//                 PATCH  /ordenes/{id}/
//
// DESPACHOS       GET    /despachos/
//                 POST   /despachos/
//                 PATCH  /despachos/{id}/
//
// CLIENTES        GET    /clientes/
//                 POST   /clientes/
//                 PUT    /clientes/{id}/
//                 DELETE /clientes/{id}/
//
// PROVEEDORES     GET    /proveedores/
//                 POST   /proveedores/
//                 PUT    /proveedores/{id}/
//                 DELETE /proveedores/{id}/
//
// CATEGORIAS      GET    /categorias/
//                 POST   /categorias/
//                 PUT    /categorias/{id}/
//                 DELETE /categorias/{id}/
//
// ALMACENES       GET    /almacenes/
//                 POST   /almacenes/
//                 PUT    /almacenes/{id}/
//                 DELETE /almacenes/{id}/
//
// TRANSFERENCIAS  GET    /transferencias/
//                 POST   /transferencias/
//
// AJUSTES         GET    /ajustes/
//                 POST   /ajustes/
//
// DEVOLUCIONES    GET    /devoluciones/
//                 POST   /devoluciones/
//
// USUARIOS        GET    /usuarios/
//                 POST   /usuarios/
//                 PUT    /usuarios/{id}/
//                 DELETE /usuarios/{id}/
//
// PEDIDOS INT.    GET    /pedidos-internos/
//                 POST   /pedidos-internos/
//                 PATCH  /pedidos-internos/{id}/
//
// ÁREAS           GET    /areas/
//                 POST   /areas/
//                 PUT    /areas/{id}/
//                 DELETE /areas/{id}/
//
// CONFIG          GET    /configuracion/
//                 PATCH  /configuracion/
//
// AUDITORÍA       GET    /auditoria/
//
// SAAS ADMIN      GET    /saas/negocios/
//                 POST   /saas/negocios/
//                 PUT    /saas/negocios/{id}/
//                 GET    /saas/planes/
//                 PUT    /saas/planes/{id}/
//                 GET    /saas/renovaciones/
//                 POST   /saas/renovaciones/

export default api
