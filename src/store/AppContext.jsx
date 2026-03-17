import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import * as storage from '../services/storage'

const initialState = {
  config: null, productos: [], categorias: [], almacenes: [],
  proveedores: [], movimientos: [], ordenes: [], ajustes: [],
  devoluciones: [], transferencias: [], usuarios: [], sesion: null,
  loading: true, toasts: [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_ALL':            return { ...state, ...action.payload, loading: false }
    case 'SET_CONFIG':         return { ...state, config:          action.payload }
    case 'SET_PRODUCTOS':      return { ...state, productos:       action.payload }
    case 'SET_MOVIMIENTOS':    return { ...state, movimientos:     action.payload }
    case 'SET_ORDENES':        return { ...state, ordenes:         action.payload }
    case 'SET_PROVEEDORES':    return { ...state, proveedores:     action.payload }
    case 'SET_CATEGORIAS':     return { ...state, categorias:      action.payload }
    case 'SET_ALMACENES':      return { ...state, almacenes:       action.payload }
    case 'SET_AJUSTES':        return { ...state, ajustes:         action.payload }
    case 'SET_DEVOLUCIONES':   return { ...state, devoluciones:    action.payload }
    case 'SET_TRANSFERENCIAS': return { ...state, transferencias:  action.payload }
    case 'SET_CLIENTES':       return { ...state, clientes:        action.payload }
    case 'SET_DESPACHOS':      return { ...state, despachos:        action.payload }
    case 'SET_TRANSPORTISTAS': return { ...state, transportistas:   action.payload }
    case 'SET_RUTAS':          return { ...state, rutas:            action.payload }
    case 'SET_USUARIOS':       return { ...state, usuarios:        action.payload }
    case 'SET_SESION':         return { ...state, sesion:          action.payload }
    case 'ADD_TOAST':          return { ...state, toasts: [...state.toasts, action.payload] }
    case 'REMOVE_TOAST':       return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) }
    default: return state
  }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    dispatch({
      type: 'SET_ALL',
      payload: {
        config:          storage.getConfig().data,
        productos:       storage.getProductos().data,
        categorias:      storage.getCategorias().data,
        almacenes:       storage.getAlmacenes().data,
        proveedores:     storage.getProveedores().data,
        movimientos:     storage.getMovimientos().data,
        ordenes:         storage.getOrdenes().data,
        ajustes:         storage.getAjustes().data,
        devoluciones:    storage.getDevoluciones().data,
        transferencias:  storage.getTransferencias().data,
        clientes:        storage.getClientes().data,
        despachos:        storage.getDespachos().data,
        transportistas:  storage.getTransportistas().data,
        rutas:           storage.getRutas().data,
        usuarios:        storage.getUsuarios().data,
        sesion:          storage.getSession().data,
      }
    })
  }, [])

  const recargarProductos    = useCallback(() => dispatch({ type: 'SET_PRODUCTOS',      payload: storage.getProductos().data       }), [])
  const recargarMovimientos  = useCallback(() => dispatch({ type: 'SET_MOVIMIENTOS',    payload: storage.getMovimientos().data     }), [])
  const recargarOrdenes      = useCallback(() => dispatch({ type: 'SET_ORDENES',        payload: storage.getOrdenes().data         }), [])
  const recargarProveedores  = useCallback(() => dispatch({ type: 'SET_PROVEEDORES',    payload: storage.getProveedores().data     }), [])
  const recargarCategorias   = useCallback(() => dispatch({ type: 'SET_CATEGORIAS',     payload: storage.getCategorias().data      }), [])
  const recargarAlmacenes    = useCallback(() => dispatch({ type: 'SET_ALMACENES',      payload: storage.getAlmacenes().data       }), [])
  const recargarAjustes      = useCallback(() => dispatch({ type: 'SET_AJUSTES',        payload: storage.getAjustes().data         }), [])
  const recargarDevoluciones = useCallback(() => dispatch({ type: 'SET_DEVOLUCIONES',   payload: storage.getDevoluciones().data    }), [])
  const recargarTransferencias=useCallback(() => dispatch({ type: 'SET_TRANSFERENCIAS', payload: storage.getTransferencias().data  }), [])
  const recargarTransportistas=useCallback(() => dispatch({ type: 'SET_TRANSPORTISTAS',payload: storage.getTransportistas().data }), [])
  const recargarRutas        = useCallback(() => dispatch({ type: 'SET_RUTAS',         payload: storage.getRutas().data          }), [])
  const recargarClientes     = useCallback(() => dispatch({ type: 'SET_CLIENTES',     payload: storage.getClientes().data      }), [])
  const recargarDespachos    = useCallback(() => dispatch({ type: 'SET_DESPACHOS',    payload: storage.getDespachos().data     }), [])
  const recargarUsuarios     = useCallback(() => dispatch({ type: 'SET_USUARIOS',       payload: storage.getUsuarios().data        }), [])

  const toast = useCallback((mensaje, tipo = 'info', duracion = 3500) => {
    const id = Date.now().toString()
    dispatch({ type: 'ADD_TOAST', payload: { id, mensaje, tipo } })
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), duracion)
  }, [])

  const saveConfig = useCallback((cfg) => {
    storage.saveConfig(cfg)
    dispatch({ type: 'SET_CONFIG', payload: { ...state.config, ...cfg } })
    toast('Configuración guardada', 'success')
  }, [state.config, toast])

  const login = useCallback((email, password) => {
    const result = storage.loginUsuario(email, password)
    if (result.error) return result
    dispatch({ type: 'SET_SESION', payload: result.data })
    return result
  }, [])

  const logout = useCallback(() => {
    storage.logout()
    dispatch({ type: 'SET_SESION', payload: null })
  }, [])

  const tienePermiso = useCallback((modulo) => {
    const rol = state.sesion?.rol
    if (!rol) return false
    return storage.tienePermiso(rol, modulo)
  }, [state.sesion])

  const value = {
    ...state,
    get formulaValorizacion() { return state.config?.formulaValorizacion || 'PMP' },
    get simboloMoneda()       { return state.config?.simboloMoneda || 'S/' },
    get esAdmin()             { return state.sesion?.rol === 'admin' },
    recargarProductos, recargarMovimientos, recargarOrdenes,
    recargarProveedores, recargarCategorias, recargarAlmacenes,
    recargarAjustes, recargarDevoluciones, recargarTransferencias, recargarUsuarios,
    recargarClientes, recargarDespachos, recargarTransportistas, recargarRutas,
    saveConfig, toast, login, logout, tienePermiso,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}
