import { useState, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './store/AppContext'
import Sidebar from './components/layout/Sidebar'
import { ToastContainer } from './components/ui/index'

const Login           = lazy(() => import('./pages/Login'))
const Dashboard       = lazy(() => import('./pages/Dashboard'))
const Inventario      = lazy(() => import('./pages/Inventario'))
const Entradas        = lazy(() => import('./pages/Entradas'))
const Salidas         = lazy(() => import('./pages/Salidas'))
const Ajustes         = lazy(() => import('./pages/Ajustes'))
const Devoluciones    = lazy(() => import('./pages/Devoluciones'))
const Transferencias  = lazy(() => import('./pages/Transferencias'))
const Ordenes         = lazy(() => import('./pages/Ordenes'))
const Movimientos     = lazy(() => import('./pages/Movimientos'))
const Reportes        = lazy(() => import('./pages/Reportes'))
const Proveedores     = lazy(() => import('./pages/Proveedores'))
const Maestros        = lazy(() => import('./pages/Maestros'))
const Usuarios        = lazy(() => import('./pages/Usuarios'))
const Configuracion   = lazy(() => import('./pages/Configuracion'))
const Vencimientos    = lazy(() => import('./pages/Vencimientos'))
const PuntoReorden    = lazy(() => import('./pages/PuntoReorden'))
const Kardex          = lazy(() => import('./pages/Kardex'))
const Alertas         = lazy(() => import('./pages/Alertas'))
const Cotizaciones    = lazy(() => import('./pages/Cotizaciones'))
const InventarioFisico= lazy(() => import('./pages/InventarioFisico'))
const Prevision       = lazy(() => import('./pages/Prevision'))
const PWA             = lazy(() => import('./pages/PWA'))
const Clientes        = lazy(() => import('./pages/Clientes'))
const Despachos       = lazy(() => import('./pages/Despachos'))
const Transportes     = lazy(() => import('./pages/Transportes'))
const Auditoria       = lazy(() => import('./pages/Auditoria'))

const PAGE_TITLES = {
  '/':               'Dashboard',
  '/inventario':     'Inventario',
  '/entradas':       'Entradas de Stock',
  '/salidas':        'Salidas de Stock',
  '/ajustes':        'Ajustes de Inventario',
  '/devoluciones':   'Devoluciones',
  '/transferencias': 'Transferencias entre Almacenes',
  '/ordenes':        'Órdenes de Compra',
  '/cotizaciones':   'Cotizaciones a Proveedores',
  '/movimientos':    'Historial de Movimientos',
  '/reportes':       'Reportes y Análisis',
  '/vencimientos':   'Control de Vencimientos',
  '/reorden':        'Punto de Reorden',
  '/kardex':         'Kardex por Producto',
  '/alertas':        'Centro de Alertas',
  '/inv-fisico':     'Inventario Físico',
  '/prevision':      'Previsión de Demanda',
  '/pwa':            'App Móvil / PWA',
  '/clientes':       'Clientes',
  '/despachos':      'Gestión de Despachos',
  '/transportes':    'Gestión de Transportes',
  '/auditoria':      'Auditoría del Sistema',
  '/proveedores':    'Proveedores',
  '/maestros':       'Categorías y Almacenes',
  '/usuarios':       'Usuarios y Roles',
  '/configuracion':  'Configuración',
}

const ROLES_LABEL = { admin:'Administrador', supervisor:'Supervisor', almacenero:'Almacenero' }

function PageLoader() {
  return (
    <div className="flex items-center justify-center flex-1 gap-3 text-[#5f6f80]">
      <div className="animate-spin-slow w-5 h-5 rounded-full border-2 border-white/10 border-t-[#00c896]"/>
      <span className="text-[13px]">Cargando...</span>
    </div>
  )
}

function PageHeader() {
  const location = useLocation()
  const { config, sesion, logout } = useApp()
  const title = PAGE_TITLES[location.pathname] || 'StockPro'
  return (
    <div className="h-[52px] flex items-center px-6 border-b border-white/[0.08] bg-[#141920] shrink-0 gap-3">
      <h1 className="flex-1 text-[16px] font-semibold text-[#e8edf2]">{title}</h1>
      <div className="flex items-center gap-3">
        {config?.empresa && (
          <span className="hidden sm:flex items-center gap-1.5 text-[12px] text-[#5f6f80]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00c896] inline-block"/>
            {config.empresa}
          </span>
        )}
        {sesion && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg">
              <div className="w-5 h-5 rounded-full bg-[#00c896]/15 flex items-center justify-center text-[#00c896] text-[10px] font-bold">
                {sesion.nombre.charAt(0)}
              </div>
              <span className="text-[12px] text-[#9ba8b6]">{sesion.nombre}</span>
              <span className="text-[10px] text-[#5f6f80]">·</span>
              <span className="text-[11px] text-[#5f6f80]">{ROLES_LABEL[sesion.rol] || sesion.rol}</span>
            </div>
            <button onClick={logout}
              className="text-[12px] text-[#5f6f80] hover:text-red-400 transition-colors px-2 py-1.5"
              title="Cerrar sesión">
              Salir
            </button>
          </div>
        )}
        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#00c896]/10 text-[#00c896] font-semibold tracking-wide" title={config?.modoSistema || 'Maqueta — localStorage'}>
          {config?.version || 'StockPro v2.0'}
        </span>
      </div>
    </div>
  )
}

function AppLayout() {
  const { sesion } = useApp()
  const [collapsed, setCollapsed] = useState(false)

  if (!sesion) {
    return (
      <>
        <Suspense fallback={<PageLoader />}>
          <Routes><Route path="*" element={<Login />}/></Routes>
        </Suspense>
        <ToastContainer />
      </>
    )
  }

  return (
    <div className="flex w-full h-screen overflow-hidden bg-[#0e1117]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <PageHeader />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"               element={<Dashboard />} />
            <Route path="/inventario"     element={<Inventario />} />
            <Route path="/entradas"       element={<Entradas />} />
            <Route path="/salidas"        element={<Salidas />} />
            <Route path="/ajustes"        element={<Ajustes />} />
            <Route path="/devoluciones"   element={<Devoluciones />} />
            <Route path="/transferencias" element={<Transferencias />} />
            <Route path="/ordenes"        element={<Ordenes />} />
            <Route path="/cotizaciones"   element={<Cotizaciones />} />
            <Route path="/movimientos"    element={<Movimientos />} />
            <Route path="/reportes"       element={<Reportes />} />
            <Route path="/vencimientos"   element={<Vencimientos />} />
            <Route path="/reorden"        element={<PuntoReorden />} />
            <Route path="/kardex"         element={<Kardex />} />
            <Route path="/alertas"        element={<Alertas />} />
            <Route path="/inv-fisico"     element={<InventarioFisico />} />
            <Route path="/prevision"      element={<Prevision />} />
            <Route path="/pwa"            element={<PWA />} />
            <Route path="/clientes"       element={<Clientes />} />
            <Route path="/despachos"      element={<Despachos />} />
            <Route path="/transportes"    element={<Transportes />} />
            <Route path="/auditoria"      element={<Auditoria />} />
            <Route path="/proveedores"    element={<Proveedores />} />
            <Route path="/maestros"       element={<Maestros />} />
            <Route path="/usuarios"       element={<Usuarios />} />
            <Route path="/configuracion"  element={<Configuracion />} />
            <Route path="*"               element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      <ToastContainer />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppLayout />
      </AppProvider>
    </BrowserRouter>
  )
}
