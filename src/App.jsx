import React, { useState, useRef, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Bell, X, AlertTriangle, Sun, Moon, Palette, Check } from 'lucide-react'
import { AppProvider, useApp } from './store/AppContext'
import Sidebar from './components/layout/Sidebar'
import { ToastContainer } from './components/ui/index'
import { estadoStock, diasParaVencer, formatCurrency } from './utils/helpers'
import { useTheme, THEMES } from './hooks/useTheme'

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
const PWA             = lazy(() => import('./pages/PWA'))
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
const PortalPedidos   = lazy(() => import('./pages/PortalPedidos'))

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
  '/pwa':            'App Móvil / PWA',
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
  '/portal-pedidos': 'Portal de Pedidos para Clientes',
  '/proveedores':    'Proveedores',
  '/maestros':       'Categorías y Almacenes',
  '/usuarios':       'Usuarios y Roles',
  '/configuracion':  'Configuración',
}

const ROLES_LABEL = { admin:'Administrador', supervisor:'Supervisor', almacenero:'Almacenero' }

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

// ── Generador de notificaciones automáticas ─────────────
function generarNotifAuto(productos, ordenes, config, simboloMoneda) {
  const notifs = []
  // ── Alerta WhatsApp automática si está configurada ─────
  function enviarWhatsAppAlerta(mensaje) {
    const tel = config?.whatsappResponsable
    if (!tel || !config?.alertasAutoWhatsApp) return
    const url = `https://wa.me/${tel.replace(/[^0-9]/g,'')}?text=${encodeURIComponent('🚨 StockPro Alerta:\n'+mensaje)}`
    // Solo abrir si no se abrió en los últimos 60 min (evitar spam)
    const lastSent = sessionStorage.getItem('sp_wa_last')
    const now = Date.now()
    if (!lastSent || now - parseInt(lastSent) > 3600000) {
      window.open(url, '_blank')
      sessionStorage.setItem('sp_wa_last', now.toString())
    }
  }
  const diasAlerta = config?.diasAlertaVencimiento || 30
  productos.filter(p => p.activo !== false).forEach(p => {
    const e = estadoStock(p.stockActual, p.stockMinimo)
    if (p.stockActual <= 0) {
      notifs.push({ tipo:'danger', titulo:'Sin stock', msg:p.nombre, sub:`SKU: ${p.sku}`, path:'/inventario' })
    } else if (e.estado === 'critico') {
      notifs.push({ tipo:'warning', titulo:'Stock crítico', msg:p.nombre, sub:`${p.stockActual}/${p.stockMinimo} ${p.unidadMedida}`, path:'/inventario' })
    }
    if (p.tieneVencimiento && p.fechaVencimiento) {
      const d = diasParaVencer(p.fechaVencimiento)
      if (d !== null && d < 0) {
        notifs.push({ tipo:'danger', titulo:'Producto VENCIDO', msg:p.nombre, sub:`Venció hace ${Math.abs(d)} días`, path:'/vencimientos' })
      } else if (d !== null && d <= diasAlerta) {
        notifs.push({ tipo:'warning', titulo:'Próximo a vencer', msg:p.nombre, sub:`Vence en ${d} días`, path:'/vencimientos' })
      }
    }
  })
  ordenes.filter(o => o.estado === 'PENDIENTE').forEach(o => {
    notifs.push({ tipo:'info', titulo:'OC pendiente', msg:`OC ${o.numero}`, sub:`Total: ${formatCurrency(o.total, simboloMoneda)}`, path:'/ordenes' })
  })
  // Auto-enviar WhatsApp si hay alertas críticas
  const dangers = notifs.filter(n => n.tipo === 'danger')
  if (dangers.length > 0) {
    const msg = dangers.slice(0,3).map(n=>`• ${n.titulo}: ${n.msg}`).join('\n')
    enviarWhatsAppAlerta(msg)
  }
  return notifs.slice(0, 20)
}

// ── Panel de Notificaciones ─────────────────────────────
function PanelNotificaciones({ open, onClose, notifs }) {
  const ref = useRef(null)
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, onClose])

  if (!open) return null

  return (
    <div ref={ref}
      className="absolute top-full right-0 mt-1 w-[380px] bg-[#141920] border border-white/[0.12] rounded-xl shadow-2xl z-[9999] overflow-hidden"
      style={{ maxHeight:'80vh' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#0f1520]">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-[#00c896]"/>
          <span className="text-[13px] font-semibold text-[#e8edf2]">Notificaciones</span>
          {notifs.length > 0 && (
            <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{notifs.length}</span>
          )}
        </div>
        <button onClick={onClose} className="text-[#5f6f80] hover:text-[#9ba8b6] transition-colors p-1 rounded-lg hover:bg-white/[0.05]">
          <X size={13}/>
        </button>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight:'calc(80vh - 52px)' }}>
        {notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Bell size={24} className="text-[#00c896] opacity-30"/>
            <p className="text-[12px] text-[#5f6f80]">Sin notificaciones activas</p>
          </div>
        ) : notifs.map((n, i) => {
          const bgRow = n.tipo==='danger' ? 'bg-red-500/[0.03]' : ''
          const txtColor = n.tipo==='danger' ? 'text-red-400' : n.tipo==='warning' ? 'text-amber-400' : 'text-blue-400'
          const bgIcon   = n.tipo==='danger' ? 'bg-red-500/15' : n.tipo==='warning' ? 'bg-amber-500/15' : 'bg-blue-500/15'
          return (
            <a key={i} href={n.path} onClick={onClose}
              className={`flex items-start gap-3 px-4 py-3 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03] transition-colors no-underline ${bgRow}`}>
              <div className={`w-8 h-8 rounded-lg ${bgIcon} flex items-center justify-center shrink-0`}>
                <AlertTriangle size={14} className={txtColor}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${txtColor}`}>{n.titulo}</div>
                <div className="text-[12px] font-medium text-[#e8edf2] truncate">{n.msg}</div>
                <div className="text-[11px] text-[#5f6f80]">{n.sub}</div>
              </div>
              <span className="text-[10px] text-[#3d4f60] shrink-0 mt-1">→</span>
            </a>
          )
        })}
      </div>
      {notifs.filter(n => n.tipo === 'danger').length > 0 && (
        <div className="px-4 py-2.5 bg-[#0f1520] border-t border-white/[0.06]">
          <a
            href={`https://wa.me/?text=${encodeURIComponent('🚨 ALERTA StockPro:\n' + notifs.filter(n=>n.tipo==='danger').slice(0,3).map(n=>`• ${n.titulo}: ${n.msg}`).join('\n'))}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-[12px] font-semibold hover:bg-green-500/20 transition-colors no-underline">
            📱 Enviar alerta por WhatsApp
          </a>
        </div>
      )}
    </div>
  )
}

// ── PageHeader ──────────────────────────────────────────
function ThemeToggle() {
  const { current, toggleDark, applyTheme, themes } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title={current.dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-all ${open ? 'bg-[#00c896]/15 text-[#00c896]' : 'text-[#5f6f80] hover:text-[#9ba8b6] hover:bg-white/[0.05]'}`}>
        {current.dark ? <Moon size={15}/> : <Sun size={15}/>}
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-[220px] bg-[#141920] border border-white/[0.12] rounded-xl shadow-2xl z-[9999] overflow-hidden p-2">
          <div className="px-2 pt-1 pb-2 text-[10px] font-bold text-[#5f6f80] uppercase tracking-[0.1em]">Tema de color</div>
          {themes.map(t => (
            <button
              key={t.id}
              onClick={() => { applyTheme(t.id); setOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-colors text-left">
              {/* Preview dots */}
              <div className="flex gap-1 shrink-0">
                {t.preview.map((c, i) => (
                  <div key={i} className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ background: c }}/>
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold" style={{ color: current.id === t.id ? t.accent : '#e8edf2' }}>{t.label}</div>
                <div className="text-[10px] text-[#5f6f80]">{t.desc}</div>
              </div>
              {current.id === t.id && <Check size={13} style={{ color: t.accent, flexShrink: 0 }}/>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PageHeader() {
  const location = useLocation()
  const { config, sesion, logout, productos, ordenes, simboloMoneda } = useApp()
  const [panelOpen, setPanelOpen] = useState(false)
  const title = PAGE_TITLES[location.pathname] || 'StockPro'

  const notifs = React.useMemo(() =>
    sesion ? generarNotifAuto(productos || [], ordenes || [], config, simboloMoneda) : []
  , [productos, ordenes, config, sesion, simboloMoneda])

  const cantDanger = notifs.filter(n => n.tipo === 'danger').length
  const cantTotal  = notifs.length
  const badgeColor = cantDanger > 0 ? 'bg-red-500' : cantTotal > 0 ? 'bg-amber-500' : ''

  return (
    <div className="h-[52px] flex items-center px-6 border-b border-white/[0.08] bg-[#141920] shrink-0 gap-3">
      <h1 className="flex-1 text-[16px] font-semibold text-[#e8edf2]">{title}</h1>
      <div className="flex items-center gap-2">
        {config?.empresa && (
          <span className="hidden sm:flex items-center gap-1.5 text-[12px] text-[#5f6f80]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00c896] inline-block"/>
            {config.empresa}
          </span>
        )}
        {sesion && (
          <div className="relative">
            <button
              onClick={() => setPanelOpen(o => !o)}
              title="Notificaciones"
              className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-all ${panelOpen ? 'bg-[#00c896]/15 text-[#00c896]' : 'text-[#5f6f80] hover:text-[#9ba8b6] hover:bg-white/[0.05]'}`}>
              <Bell size={16} className={cantDanger > 0 && !panelOpen ? 'animate-bounce' : ''}/>
              {cantTotal > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 ${badgeColor} text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1`}>
                  {cantTotal > 9 ? '9+' : cantTotal}
                </span>
              )}
            </button>
            <PanelNotificaciones open={panelOpen} onClose={() => setPanelOpen(false)} notifs={notifs}/>
          </div>
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
        <ThemeToggle/>
        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#00c896]/10 text-[#00c896] font-semibold tracking-wide">
          {config?.version || 'StockPro v2.0'}
        </span>
      </div>
    </div>
  )
}

// ── AppLayout ───────────────────────────────────────────
function AppLayout() {
  const { sesion } = useApp()
  const [collapsed, setCollapsed] = useState(false)

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
            <Route path="/pwa"            element={<PWA />} />
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
            <Route path="/portal-pedidos" element={<PortalPedidos />} />
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
