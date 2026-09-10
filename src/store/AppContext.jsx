import { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react'
import api, { tokenManager } from '../services/api'
import { iniciarSyncAutomatico, detenerSyncAutomatico, sincronizarConServidor } from '../services/offlineQueue'
import {
  SESSION_KEY_TENANT,
  SESSION_KEY_ADMIN,
  esRutaSuperAdmin,
  slotParaSesion,
  slotParaRuta,
} from './sessionSlots'

const initialState = {
  sesion:  null,
  loading: true,
  toasts:  [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_SESION':    return { ...state, sesion: action.payload, loading: false }
    case 'SET_LOADING':   return { ...state, loading: action.payload }
    case 'ADD_TOAST':     return { ...state, toasts: [...state.toasts, action.payload] }
    case 'REMOVE_TOAST':  return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) }
    default: return state
  }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state,  dispatch]  = useReducer(reducer, initialState)
  const [online, setOnline] = useState(() => navigator.onLine)

  // Monitor de conexión
  useEffect(() => {
    const up   = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online',  up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online',  up)
      window.removeEventListener('offline', down)
    }
  }, [])

  // Restaurar sesión desde localStorage al montar.
  //
  // SuperAdmin y tenant tienen slots de sesión separados (ver sessionSlots.js):
  // se restaura el que corresponde a la URL de ESTA pestaña, no "el último que
  // logueó". Así, con el SuperAdmin en una pestaña y un negocio en otra, un
  // reload (manual o por PWA autoUpdate) mantiene cada pestaña en su identidad.
  // Los tokens ya viven en pares separados (tokenManager, ver api.js).
  useEffect(() => {
    // #5 (2026-09-10): el access token vive en memoria y se perdió al recargar.
    // Se recupera con /auth/refresh (cookie httpOnly). El objeto de sesión
    // (rol, permisos, nombre — NO secretos) sigue en localStorage para pintar
    // la UI al instante, pero la sesión solo es "real" si el refresh anda.
    let cancelado = false
    ;(async () => {
      try {
        const enRutaAdmin = esRutaSuperAdmin(window.location.pathname)
        const stored = localStorage.getItem(slotParaRuta(window.location.pathname))
        if (stored) {
          const sesionGuardada = JSON.parse(stored)
          const esAdmin = sesionGuardada?.rol?.codigo === 'saas_admin'
          if (esAdmin === enRutaAdmin) {
            const boot = esAdmin ? await api.bootstrapAdmin() : await api.bootstrapTenant()
            if (cancelado) return
            if (boot) {
              dispatch({ type: 'SET_SESION', payload: sesionGuardada })
              return
            }
            // Refresh falló → la sesión guardada ya no vale.
            localStorage.removeItem(slotParaSesion(sesionGuardada))
          } else if (!enRutaAdmin && esAdmin) {
            localStorage.removeItem(SESSION_KEY_TENANT)
          }
        }
      } catch {
        /* storage bloqueado / JSON inválido / red — se arranca sin sesión */
      }
      if (!cancelado) dispatch({ type: 'SET_LOADING', payload: false })
    })()
    return () => { cancelado = true }
  }, [])

  const toast = useCallback((mensaje, tipo = 'info', duracion = 3500) => {
    const id = Date.now().toString()
    dispatch({ type: 'ADD_TOAST', payload: { id, mensaje, tipo } })
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), duracion)
  }, [])

  // Cola offline (ver services/offlineQueue.js): mientras haya sesión, sincroniza
  // sola cada vez que el navegador recupera la conexión. También reintenta al
  // montar por si quedaron operaciones pendientes de una sesión anterior.
  useEffect(() => {
    if (!state.sesion) return

    const onSyncComplete = ({ sincronizados, errores }) => {
      if (sincronizados > 0) toast(`${sincronizados} operación${sincronizados > 1 ? 'es' : ''} sincronizada${sincronizados > 1 ? 's' : ''}`, 'success')
      if (errores > 0) toast(`${errores} operación${errores > 1 ? 'es' : ''} de la cola falló al sincronizar`, 'error')
    }

    iniciarSyncAutomatico(api.request, onSyncComplete)
    if (navigator.onLine) sincronizarConServidor(api.request).then(onSyncComplete)

    return () => detenerSyncAutomatico()
  }, [state.sesion, toast])

  // login: paso 2 ya completado — recibe resultado de api.login()
  // La página Login.jsx llama a api.buscarEmpresa + api.login directamente
  // y luego llama a esta función solo para persistir la sesión en el context.
  const setSesion = useCallback((sesion) => {
    // Escribe en el slot de la identidad (admin vs tenant). No toca el otro
    // slot a propósito: son independientes para permitir SuperAdmin + tenant
    // abiertos a la vez en pestañas distintas.
    localStorage.setItem(slotParaSesion(sesion), JSON.stringify(sesion))
    dispatch({ type: 'SET_SESION', payload: sesion })
  }, [])

  const logout = useCallback(() => {
    const esAdmin = state.sesion?.rol?.codigo === 'saas_admin'
    if (esAdmin) {
      api.logoutAdmin()
      localStorage.removeItem(SESSION_KEY_ADMIN)
    } else {
      api.logout()
      localStorage.removeItem(SESSION_KEY_TENANT)
    }
    dispatch({ type: 'SET_SESION', payload: null })
  }, [state.sesion])

  const tienePermiso = useCallback((modulo) => {
    const permisos = state.sesion?.rol?.permisos
    if (!permisos) return false
    return permisos.includes('*') || permisos.includes(modulo)
  }, [state.sesion])

  const value = {
    sesion:  state.sesion,
    loading: state.loading,
    toasts:  state.toasts,
    online,
    toast,
    setSesion,
    logout,
    tienePermiso,
    get esAdmin()   { return ['admin', 'owner', 'supervisor'].includes(state.sesion?.rol?.codigo) },
    get empresaId() { return state.sesion?.empresaId || null },
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}
