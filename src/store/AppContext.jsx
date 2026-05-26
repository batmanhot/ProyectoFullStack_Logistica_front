import { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react'
import * as storage from '../services/storage'
import { setTenant, loginSuperAdmin } from '../services/storage'
import { getStorageInfo, necesitaRespaldo, textoUltimoRespaldo, registrarRespaldo } from '../utils/storageMonitor'
import { contarPendientes } from '../services/offlineQueue'

const initialState = {
  config: null, productos: [], categorias: [], almacenes: [],
  proveedores: [], movimientos: [], ordenes: [], ajustes: [],
  devoluciones: [], transferencias: [], usuarios: [], sesion: null,
  areas: [], pedidosInternos: [],
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
    case 'SET_DESPACHOS':      return { ...state, despachos:       action.payload }
    case 'SET_TRANSPORTISTAS': return { ...state, transportistas:  action.payload }
    case 'SET_RUTAS':          return { ...state, rutas:           action.payload }
    case 'SET_USUARIOS':         return { ...state, usuarios:          action.payload }
    case 'SET_AREAS':            return { ...state, areas:            action.payload }
    case 'SET_PEDIDOS_INTERNOS': return { ...state, pedidosInternos:  action.payload }
    case 'SET_SESION':           return { ...state, sesion:           action.payload }
    case 'ADD_TOAST':          return { ...state, toasts: [...state.toasts, action.payload] }
    case 'REMOVE_TOAST':       return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) }
    default: return state
  }
}

// Carga todos los datos del tenant activo desde storage
function cargarDatosTenant() {
  return {
    config:         storage.getConfig().data,
    productos:      storage.getProductos().data,
    categorias:     storage.getCategorias().data,
    almacenes:      storage.getAlmacenes().data,
    proveedores:    storage.getProveedores().data,
    movimientos:    storage.getMovimientos().data,
    ordenes:        storage.getOrdenes().data,
    ajustes:        storage.getAjustes().data,
    devoluciones:   storage.getDevoluciones().data,
    transferencias: storage.getTransferencias().data,
    clientes:       storage.getClientes().data,
    despachos:      storage.getDespachos().data,
    transportistas: storage.getTransportistas().data,
    rutas:          storage.getRutas().data,
    usuarios:         storage.getUsuarios().data,
    areas:            storage.getAreas().data,
    pedidosInternos:  storage.getPedidosInternos().data,
    sesion:           storage.getSession().data,
  }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // ── Estado de conexión y storage ─────────────────────────
  const [online,          setOnline]          = useState(() => navigator.onLine)
  const [storageInfo,     setStorageInfo]      = useState(() => getStorageInfo())
  const [pendientesSinc,  setPendientesSinc]   = useState(0)

  // Monitor de conexión
  useEffect(() => {
    const up   = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online',  up)
    window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  // Monitor de storage — se actualiza cada 30 segundos y al montar
  useEffect(() => {
    const actualizar = () => setStorageInfo(getStorageInfo())
    actualizar()
    const id = setInterval(actualizar, 30_000)
    return () => clearInterval(id)
  }, [])

  // Contador de operaciones pendientes de sincronizar
  const refrescarPendientes = useCallback(async () => {
    setPendientesSinc(await contarPendientes())
  }, [])

  useEffect(() => {
    refrescarPendientes()
    const id = setInterval(refrescarPendientes, 15_000)
    return () => clearInterval(id)
  }, [refrescarPendientes])

  useEffect(() => {
    // Restaurar tenant desde sesión persistida antes de cargar datos
    const ses = storage.getSession().data
    if (ses?.empresaId) setTenant(ses.empresaId)
    dispatch({ type: 'SET_ALL', payload: cargarDatosTenant() })
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
  const recargarTransportistas=useCallback(() => dispatch({ type: 'SET_TRANSPORTISTAS', payload: storage.getTransportistas().data }), [])
  const recargarRutas        = useCallback(() => dispatch({ type: 'SET_RUTAS',          payload: storage.getRutas().data           }), [])
  const recargarClientes     = useCallback(() => dispatch({ type: 'SET_CLIENTES',       payload: storage.getClientes().data        }), [])
  const recargarDespachos    = useCallback(() => dispatch({ type: 'SET_DESPACHOS',      payload: storage.getDespachos().data       }), [])
  const recargarUsuarios        = useCallback(() => dispatch({ type: 'SET_USUARIOS',         payload: storage.getUsuarios().data           }), [])
  const recargarAreas           = useCallback(() => dispatch({ type: 'SET_AREAS',            payload: storage.getAreas().data              }), [])
  const recargarPedidosInternos = useCallback(() => dispatch({ type: 'SET_PEDIDOS_INTERNOS', payload: storage.getPedidosInternos().data    }), [])

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

  // login recibe empresaId (tenant) + credenciales
  // setTenant debe llamarse ANTES de loginUsuario para que lea los usuarios correctos
  const login = useCallback((empresaId, email, password) => {
    setTenant(empresaId)
    const result = storage.loginUsuario(email, password)
    if (result.error) return result
    dispatch({ type: 'SET_ALL', payload: { ...cargarDatosTenant(), sesion: result.data } })
    // Recordatorio de respaldo al iniciar sesión si corresponde
    if (necesitaRespaldo()) {
      setTimeout(() => {
        const dias = (() => {
          const val = localStorage.getItem('sp_ultimo_respaldo')
          if (!val) return null
          return Math.floor((Date.now() - new Date(val).getTime()) / 86400000)
        })()
        const msg = dias === null
          ? '💾 Nunca has hecho un respaldo. Exporta tus datos desde el sidebar para protegerlos.'
          : `💾 Han pasado ${dias} días desde el último respaldo. Recomendamos exportar tus datos.`
        dispatch({ type: 'ADD_TOAST', payload: { id: 'backup-reminder', mensaje: msg, tipo: 'warning' } })
        setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: 'backup-reminder' }), 8000)
      }, 3000)
    }
    return result
  }, [])

  // loginAdmin: superadmin SaaS — sin tenant, sin datos de empresa
  const loginAdmin = useCallback((email, password) => {
    const result = loginSuperAdmin(email, password)
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
    get esAdmin()             { return ['admin','owner','supervisor'].includes(state.sesion?.rol) },
    get empresaId()           { return state.sesion?.empresaId || null },
    get stockReservado() {
      const ESTADOS = ['PEDIDO','APROBADO','PICKING','LISTO']
      const reservas = {}
      ;(state.despachos || [])
        .filter(d => ESTADOS.includes(d.estado))
        .forEach(d => (d.items || []).forEach(it => {
          reservas[it.productoId] = (reservas[it.productoId] || 0) + (it.cantidad || 0)
        }))
      return reservas
    },
    recargarProductos, recargarMovimientos, recargarOrdenes,
    recargarProveedores, recargarCategorias, recargarAlmacenes,
    recargarAjustes, recargarDevoluciones, recargarTransferencias, recargarUsuarios,
    recargarClientes, recargarDespachos, recargarTransportistas, recargarRutas,
    recargarAreas, recargarPedidosInternos,
    saveConfig, toast, login, loginAdmin, logout, tienePermiso,
    // Storage / offline
    online, storageInfo, pendientesSinc,
    necesitaRespaldo, textoUltimoRespaldo,
    registrarRespaldo: () => { registrarRespaldo(); setStorageInfo(getStorageInfo()) },
    refrescarStorage:  () => setStorageInfo(getStorageInfo()),
    refrescarPendientes,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}
