import { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react'
import api, { tokenManager } from '../services/api'
import { iniciarSyncAutomatico, detenerSyncAutomatico, sincronizarConServidor } from '../services/offlineQueue'

const SESSION_KEY = 'sp_session'

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

  // Restaurar sesión desde localStorage al montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      const access = tokenManager.getAccess()
      if (stored && access && !tokenManager.isExpired(access)) {
        dispatch({ type: 'SET_SESION', payload: JSON.parse(stored) })
        return
      }
    } catch {}
    dispatch({ type: 'SET_LOADING', payload: false })
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
    localStorage.setItem(SESSION_KEY, JSON.stringify(sesion))
    dispatch({ type: 'SET_SESION', payload: sesion })
  }, [])

  const logout = useCallback(() => {
    api.logout()
    localStorage.removeItem(SESSION_KEY)
    dispatch({ type: 'SET_SESION', payload: null })
  }, [])

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
