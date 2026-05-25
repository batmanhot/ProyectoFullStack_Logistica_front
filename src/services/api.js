/**
 * api.js — Cliente HTTP centralizado para Django REST Framework
 *
 * Uso actual  : inactivo (USE_BACKEND = false en storageAdapter)
 * Uso futuro  : activar USE_BACKEND = true y mapear endpoints
 *
 * Autenticación : JWT con djangorestframework-simplejwt
 *   POST /api/auth/token/         → obtener access + refresh
 *   POST /api/auth/token/refresh/ → renovar access con refresh
 *
 * Variables de entorno (.env):
 *   VITE_API_URL=http://localhost:8000/api
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const TOKEN_KEY   = 'sp_access_token'
const REFRESH_KEY = 'sp_refresh_token'

// ── Gestión de tokens JWT ─────────────────────────────────
export const tokenManager = {
  getAccess:      ()      => localStorage.getItem(TOKEN_KEY),
  getRefresh:     ()      => localStorage.getItem(REFRESH_KEY),
  setTokens:      (a, r)  => { localStorage.setItem(TOKEN_KEY, a); if (r) localStorage.setItem(REFRESH_KEY, r) },
  clearTokens:    ()      => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(REFRESH_KEY) },
  isExpired:      (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000 < Date.now()
    } catch { return true }
  },
}

// ── Núcleo HTTP ───────────────────────────────────────────
async function _request(method, endpoint, data = null, intentoRefresh = false) {
  const headers = { 'Content-Type': 'application/json' }

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
    // Error de red (sin conexión, timeout, CORS)
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
    tokenManager.setTokens(access, null) // refresh no cambia con simplejwt por defecto
    return true
  } catch { return false }
}

// ── API pública ───────────────────────────────────────────
export const api = {
  get:    (endpoint)        => _request('GET',    endpoint),
  post:   (endpoint, data)  => _request('POST',   endpoint, data),
  put:    (endpoint, data)  => _request('PUT',    endpoint, data),
  patch:  (endpoint, data)  => _request('PATCH',  endpoint, data),
  delete: (endpoint)        => _request('DELETE', endpoint),

  // Autenticación Django simplejwt
  async login(email, password) {
    const res = await _request('POST', '/auth/token/', { email, password }, true)
    if (res.data?.access) {
      tokenManager.setTokens(res.data.access, res.data.refresh)
    }
    return res
  },

  logout() {
    tokenManager.clearTokens()
  },
}

// ── Endpoints mapeados (referencia para la migración) ─────
// Cuando USE_BACKEND = true, storageAdapter.js llamará a estos.
//
// PRODUCTOS       GET/POST  /productos/
//                 GET/PUT   /productos/{id}/
// MOVIMIENTOS     GET/POST  /movimientos/
// ORDENES         GET/POST  /ordenes/
//                 PATCH     /ordenes/{id}/
// DESPACHOS       GET/POST  /despachos/
// CLIENTES        GET/POST  /clientes/
// PROVEEDORES     GET/POST  /proveedores/
// USUARIOS        GET/POST  /usuarios/
// CATEGORIAS      GET/POST  /categorias/
// ALMACENES       GET/POST  /almacenes/
// PEDIDOS INT.    GET/POST  /pedidos-internos/
// AUDITORÍA       GET       /auditoria/
// CONFIG          GET/PATCH /configuracion/

export default api
