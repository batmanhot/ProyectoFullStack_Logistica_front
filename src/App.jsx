import React, { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './store/AppContext'
import Sidebar from './components/layout/Sidebar'
import { ToastContainer } from './components/ui/index'

// ── Lazy imports de páginas ─────────────────────────────
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

const PortalProvB2B   = lazy(() => import('./pages/PortalProveedoresB2B'))
const Clientes        = lazy(() => import('./pages/Clientes'))
const Despachos       = lazy(() => import('./pages/Despachos'))
const Transportes     = lazy(() => import('./pages/Transportes'))
const Auditoria       = lazy(() => import('./pages/Auditoria'))
const Flota           = lazy(() => import('./pages/Flota'))
const Financiero      = lazy(() => import('./pages/Financiero'))
const CuentasPorCobrar= lazy(() => import('./pages/CuentasPorCobrar'))
const Proformas       = lazy(() => import('./pages/Proformas'))
const MapaAlmacen     = lazy(() => import('./pages/MapaAlmacen'))
const LotesSeries     = lazy(() => import('./pages/LotesSeries'))
const Empaque         = lazy(() => import('./pages/Empaque'))
const ListaPrecios    = lazy(() => import('./pages/ListaPrecios'))
const KPIsOperativos  = lazy(() => import('./pages/KPIsOperativos'))
const Sunat           = lazy(() => import('./pages/Sunat'))
const PortalPedidos      = lazy(() => import('./pages/PortalPedidos'))
const PedidosInternos    = lazy(() => import('./pages/PedidosInternos'))
const PortalPublico        = lazy(() => import('./pages/PortalPublico'))
const ContabilidadReportes = lazy(() => import('./pages/ContabilidadReportes'))
const TrazabilidadPedidos  = lazy(() => import('./pages/TrazabilidadPedidos'))
const ColaSincronizacion   = lazy(() => import('./pages/ColaSincronizacion'))

// ── Títulos de página ───────────────────────────────────
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

  '/portal-prov-b2b':'Portal Proveedores B2B',
  '/clientes':       'Clientes',
  '/despachos':      'Gestión de Despachos',
  '/transportes':    'Gestión de Transportes',
  '/auditoria':      'Auditoría del Sistema',
  '/flota':          'Flota y Mantenimiento',
  '/financiero':     'Dashboard Financiero — P&L',
  '/cxc':            'Cuentas por Cobrar',
  '/proformas':      'Proformas y Cotizaciones de Venta',
  '/mapa-almacen':   'Mapa Visual de Almacén',
  '/lotes-series':   'Trazabilidad de Lotes y Series',
  '/empaque':        'Módulo de Empaque y Packing',
  '/lista-precios':  'Listas de Precios',
  '/kpis':           'KPIs Operativos — Fill Rate · OTIF · Perfect Order',
  '/sunat':          'Integración SUNAT / Facturación Electrónica',
  '/portal-pedidos':      'Portal de Pedidos para Clientes',
  '/contabilidad':        'Reportes Contables',
  '/trazabilidad':        'Trazabilidad de Pedidos y OC',
  '/cola-sync':           'Cola de Sincronización',
  '/pedidos-internos':'Pedidos Internos',
  '/proveedores':    'Proveedores',
  '/maestros':       'Categorías y Almacenes',
  '/usuarios':       'Usuarios y Roles',
  '/configuracion':  'Configuración',
}

// ── Error Boundary ──────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('[StockPro Error]', error, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 text-2xl">!</div>
          <div>
            <div className="text-[15px] font-semibold text-[#e8edf2] mb-1">Error al cargar el módulo</div>
            <div className="text-[12px] text-[#5f6f80] mb-4 max-w-sm">{this.state.error?.message || 'Error inesperado'}</div>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
              className="px-4 py-2 bg-[#00c896] text-[#082e1e] text-[13px] font-semibold rounded-lg hover:bg-[#00e0aa] transition-colors">
              Recargar página
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ── PageLoader ──────────────────────────────────────────
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
  const title = PAGE_TITLES[location.pathname] || 'StockPro'

  return (
    <div className="h-[52px] flex items-center px-6 border-b border-white/[0.08] bg-[#141920] shrink-0">
      <h1 className="text-[16px] font-semibold text-[#e8edf2]">{title}</h1>
    </div>
  )
}

// ── AppLayout ───────────────────────────────────────────
const MOBILE_BP = 768

function AppLayout() {
  const { sesion } = useApp()
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < MOBILE_BP)

  useEffect(() => {
    let wasMobile = window.innerWidth < MOBILE_BP
    function onResize() {
      const isMobile = window.innerWidth < MOBILE_BP
      if (isMobile !== wasMobile) {
        setCollapsed(isMobile)
        wasMobile = isMobile
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!sesion) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes><Route path="*" element={<Login />}/></Routes>
        </Suspense>
        <ToastContainer />
      </ErrorBoundary>
    )
  }

  return (
    <div className="flex w-full h-screen overflow-hidden bg-[#0e1117]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <PageHeader />
        <ErrorBoundary>
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
            <Route path="/portal-prov-b2b" element={<PortalProvB2B />} />
            <Route path="/clientes"       element={<Clientes />} />
            <Route path="/despachos"      element={<Despachos />} />
            <Route path="/transportes"    element={<Transportes />} />
            <Route path="/auditoria"      element={<Auditoria />} />
            <Route path="/flota"          element={<Flota />} />
            <Route path="/financiero"     element={<Financiero />} />
            <Route path="/cxc"            element={<CuentasPorCobrar />} />
            <Route path="/proformas"      element={<Proformas />} />
            <Route path="/mapa-almacen"   element={<MapaAlmacen />} />
            <Route path="/lotes-series"   element={<LotesSeries />} />
            <Route path="/empaque"        element={<Empaque />} />
            <Route path="/lista-precios"  element={<ListaPrecios />} />
            <Route path="/kpis"           element={<KPIsOperativos />} />
            <Route path="/sunat"          element={<Sunat />} />
            <Route path="/portal-pedidos"   element={<PortalPedidos />} />
            <Route path="/pedidos-internos" element={<PedidosInternos />} />
            <Route path="/portal/:token"  element={<PortalPublico />} />
            <Route path="/contabilidad"   element={<ContabilidadReportes />} />
            <Route path="/trazabilidad"   element={<TrazabilidadPedidos />} />
            <Route path="/cola-sync"      element={<ColaSincronizacion />} />
            <Route path="/proveedores"    element={<Proveedores />} />
            <Route path="/maestros"       element={<Maestros />} />
            <Route path="/usuarios"       element={<Usuarios />} />
            <Route path="/configuracion"  element={<Configuracion />} />
            <Route path="*"               element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
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
