import React, { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './store/AppContext'
import Sidebar from './components/layout/Sidebar'
import { ToastContainer } from './components/ui/index'
import { AlertTriangle, X } from 'lucide-react'
import { useConfiguracion } from './queries/configuracion.queries'

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
const PanelAuditoria  = lazy(() => import('./pages/PanelAuditoria'))
const Incidencias     = lazy(() => import('./pages/Incidencias'))
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
const PortalProveedorPublico = lazy(() => import('./pages/PortalProveedorPublico'))
const ContabilidadReportes = lazy(() => import('./pages/ContabilidadReportes'))
const TrazabilidadPedidos  = lazy(() => import('./pages/TrazabilidadPedidos'))
const ColaSincronizacion   = lazy(() => import('./pages/ColaSincronizacion'))
const AdminSaaS            = lazy(() => import('./pages/AdminSaaS'))
const LandingPage          = lazy(() => import('./pages/LandingPage'))

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
  '/panel-auditoria': 'Panel de Auditoría',
  '/incidencias':    'Registro de Incidencias',
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
  '/admin-saas':     'Administración SaaS — Negocios, Planes y Facturación',
  '/superadmin':     'Panel de Administración',
  '/landing':        'StockPro — Sistema Logístico SaaS',
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


function PlanVencidoScreen({ negocio }) {
  const { logout } = useApp()
  const dias = negocio?.fechaVencimiento
    ? Math.floor((new Date(negocio.fechaVencimiento) - new Date()) / 86400000)
    : null

  return (
    <div className="flex flex-col items-center justify-center flex-1 h-screen bg-[#0e1117] gap-6 p-8 text-center">
      <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <AlertTriangle size={40} className="text-red-400" />
      </div>
      <div>
        <h1 className="text-[22px] font-bold text-[#e8edf2] mb-2">Plan vencido</h1>
        <p className="text-[14px] text-[#9ba8b6] max-w-sm leading-relaxed">
          El plan <strong className="text-[#e8edf2]">{negocio?.plan || 'contratado'}</strong> de{' '}
          <strong className="text-[#e8edf2]">{negocio?.nombre}</strong> venció el{' '}
          <strong className="text-red-400">{negocio?.fechaVencimiento}</strong>{' '}
          {dias !== null && `(hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'})`}.
        </p>
        <p className="text-[13px] text-[#5f6f80] mt-3">
          Contacta al administrador para renovar tu acceso.
        </p>
        {negocio?.contacto && (
          <p className="text-[12px] text-[#5f6f80] mt-1">
            Contacto: <span className="text-[#9ba8b6]">{negocio.contacto}</span>
            {negocio.email && <> · <span className="text-[#00c896]">{negocio.email}</span></>}
          </p>
        )}
      </div>
      <button
        onClick={logout}
        className="px-5 py-2.5 bg-[#1e2835] border border-white/8 text-[#e8edf2] text-[13px] font-medium rounded-lg hover:bg-[#263040] transition-colors">
        Cerrar sesión
      </button>
    </div>
  )
}

function PlanVencimientoBanner({ empresaId }) {
  const hoy = new Date()
  const DISMISS_KEY = `sp_plan_banner_dismiss_${empresaId}`
  const { data: configApi } = useConfiguracion()

  const [dismissedHoy, setDismissedHoy] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === hoy.toDateString(),
  )

  const fechaVencimiento = configApi?.fechaVencimiento
  const dias = fechaVencimiento
    ? Math.floor((new Date(fechaVencimiento) - hoy) / 86400000)
    : null

  const visible = !dismissedHoy && dias !== null && dias <= 7
  if (!visible) return null

  const vencido  = dias < 0
  const mensaje  = vencido
    ? 'Tu plan ha vencido. Contacta al administrador para renovar tu acceso.'
    : `Tu plan vence en ${dias} día${dias === 1 ? '' : 's'}. Contacta al administrador para renovarlo.`

  function cerrar() {
    sessionStorage.setItem(DISMISS_KEY, hoy.toDateString())
    setDismissedHoy(true)
  }

  return (
    <div className={`flex items-center justify-between gap-3 px-5 py-2 text-[13px] shrink-0 ${vencido ? 'bg-red-500/15 border-b border-red-500/30 text-red-300' : 'bg-amber-500/12 border-b border-amber-500/25 text-amber-300'}`}>
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="shrink-0" />
        <span>{mensaje}</span>
      </div>
      <button onClick={cerrar} className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors" title="Cerrar">
        <X size={13} />
      </button>
    </div>
  )
}

function PageHeader() {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'StockPro'

  return (
    <div className="h-[52px] flex items-center px-6 border-b border-white/8 bg-[#141920] shrink-0">
      <h1 className="text-[16px] font-semibold text-[#e8edf2]">{title}</h1>
    </div>
  )
}

// ── SuperAdminLayout ────────────────────────────────────
function SuperAdminLayout() {
  return (
    <div className="flex w-full h-screen overflow-hidden bg-[#0e1117]">
      <Sidebar collapsed={false} onToggle={() => {}} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <PageHeader />
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="*" element={<AdminSaaS />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      <ToastContainer />
    </div>
  )
}

// ── AppLayout ───────────────────────────────────────────
const MOBILE_BP = 768

function AppLayout() {
  const { sesion } = useApp()
  const location = useLocation()
  const { data: configApiBloqueo } = useConfiguracion({ enabled: !!sesion?.empresaId })
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

  // ── LANDING PAGE: siempre pública, sin sidebar ni header ──────────────
  // Se intercepta ANTES de cualquier verificación de sesión o plan para
  // garantizar que la landing tenga su propio diseño aislado.
  if (location.pathname === '/landing') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <LandingPage />
        </Suspense>
        <ToastContainer />
      </ErrorBoundary>
    )
  }

  // /portal/:token (cliente) y /portal-proveedor/:token (proveedor B2B) son
  // públicos — el visitante externo entra con un JWT propio (PortalClienteGuard /
  // PortalProveedorGuard), nunca con sesión de tenant. Deben interceptarse AQUÍ,
  // antes del `if (!sesion)` de más abajo: si vivieran dentro del bloque
  // autenticado (como antes), un visitante externo sin sesión nunca llegaría a
  // resolver la ruta — siempre caía en la landing por el catch-all `*`.
  const isPortalPublico = location.pathname.startsWith('/portal/') || location.pathname.startsWith('/portal-proveedor/')
  if (isPortalPublico) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/portal/:token"           element={<PortalPublico />} />
            <Route path="/portal-proveedor/:token"  element={<PortalProveedorPublico />} />
          </Routes>
        </Suspense>
        <ToastContainer />
      </ErrorBoundary>
    )
  }

  // /app/:orgId siempre muestra el Login del tenant — sin importar quién esté logueado.
  // Si el usuario ya tiene sesión en ESE tenant específico, redirige al dashboard.
  const isTenantRoute = location.pathname.startsWith('/app/')
  if (isTenantRoute) {
    const orgId = location.pathname.replace('/app/', '').split('/')[0]
    if (sesion && sesion.rol?.codigo !== 'saas_admin' &&
        (sesion.empresaId === orgId || sesion.empresaCodigo === orgId)) {
      return <Navigate to="/" replace />
    }
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/app/:orgId" element={<Login />} />
          </Routes>
        </Suspense>
        <ToastContainer />
      </ErrorBoundary>
    )
  }

  // SuperAdmin: layout exclusivo sin datos de empresa
  if (sesion?.rol?.codigo === 'saas_admin') {
    return <SuperAdminLayout />
  }

  // Bloqueo por plan vencido
  if (sesion?.empresaId && configApiBloqueo) {
    const estadosBloqueados = ['suspendido', 'vencido', 'cancelado']
    const fechaVencida = configApiBloqueo.fechaVencimiento &&
      new Date(configApiBloqueo.fechaVencimiento) < new Date(new Date().toDateString())
    if (estadosBloqueados.includes(configApiBloqueo.estado) || fechaVencida) {
      return (
        <ErrorBoundary>
          <PlanVencidoScreen negocio={configApiBloqueo} />
          <ToastContainer />
        </ErrorBoundary>
      )
    }
  }

  if (!sesion) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Rutas públicas — no requieren autenticación */}
            <Route path="/"            element={<LandingPage />} />
            <Route path="/landing"     element={<LandingPage />} />
            <Route path="/login"       element={<Login />} />
            <Route path="/superadmin"  element={<Login adminMode />} />
            {/* Cualquier otra ruta sin sesión → landing */}
            <Route path="*"            element={<LandingPage />} />
          </Routes>
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
        <PlanVencimientoBanner empresaId={sesion?.empresaId} />
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
            <Route path="/panel-auditoria" element={<PanelAuditoria />} />
            <Route path="/incidencias"    element={<Incidencias />} />
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
            <Route path="/contabilidad"   element={<ContabilidadReportes />} />
            <Route path="/trazabilidad"   element={<TrazabilidadPedidos />} />
            <Route path="/cola-sync"      element={<ColaSincronizacion />} />
            <Route path="/proveedores"    element={<Proveedores />} />
            <Route path="/maestros"       element={<Maestros />} />
            <Route path="/usuarios"       element={<Usuarios />} />
            <Route path="/configuracion"  element={<Configuracion />} />
            <Route path="/admin-saas"     element={sesion?.rol?.codigo === 'saas_admin' ? <AdminSaaS /> : <Navigate to="/" replace />} />
            <Route path="/landing"        element={<LandingPage />} />
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
