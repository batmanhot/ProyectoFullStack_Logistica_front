import { NavLink } from 'react-router-dom'
import { useMemo, useState, useRef, useEffect } from 'react'
import logoImg from '../../assets/logo.webp'
import {LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine, ShoppingCart, BarChart3, Settings, ChevronLeft, ChevronRight, Boxes, Building2, SlidersHorizontal, RotateCcw, Users, Tag, LogOut, ArrowRightLeft, Clock, TrendingDown, BookOpen, Bell, FileText, ClipboardList, Activity, Smartphone, Truck, Navigation as NavIcon, Shield, TrendingUp, Wrench, DollarSign, Grid3x3, Layers, Globe, Target, Zap, Palette, Check, RefreshCw} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { useTheme } from '../../hooks/useTheme'
import { estadoStock, diasParaVencer } from '../../utils/helpers'
import StorageWidget from '../ui/StorageWidget'
import OfflineBanner from '../ui/OfflineBanner'

const ROLES_LABEL = { admin:'Administrador', supervisor:'Supervisor', almacenero:'Almacenero', solicitante:'Solicitante' }

const NAV = [
  { label:'Dashboard',             path:'/',                icon:LayoutDashboard,  modulo:'dashboard',      color:'#3b82f6' },
  { label:'Alertas',               path:'/alertas',         icon:Bell,             modulo:'alertas',        color:'#ef4444', badge:'alertas' },
  { divider:true, label:'INVENTARIO' },
  { label:'Inventario',            path:'/inventario',      icon:Package,          modulo:'inventario',     color:'#f59e0b', badge:'stock' },
  { label:'Kardex',                path:'/kardex',          icon:BookOpen,         modulo:'kardex',         color:'#8b5cf6' },
  { label:'Inventario Físico',     path:'/inv-fisico',      icon:ClipboardList,    modulo:'inv-fisico',     color:'#06b6d4' },
  { divider:true, label:'OPERACIONES' },
  { label:'Entradas',              path:'/entradas',        icon:ArrowDownToLine,  modulo:'entradas',       color:'#10b981' },
  { label:'Salidas',               path:'/salidas',         icon:ArrowUpFromLine,  modulo:'salidas',        color:'#f43f5e' },
  { label:'Ajustes',               path:'/ajustes',         icon:SlidersHorizontal,modulo:'ajustes',        color:'#6366f1' },
  { label:'Devoluciones',          path:'/devoluciones',    icon:RotateCcw,        modulo:'devoluciones',   color:'#f97316' },
  { label:'Transferencias',        path:'/transferencias',  icon:ArrowRightLeft,   modulo:'transferencias', color:'#a855f7' },
  { divider:true, label:'COMPRAS' },
  { label:'Órdenes de Compra',     path:'/ordenes',         icon:ShoppingCart,     modulo:'ordenes',        color:'#0ea5e9' },
  { label:'Cotizaciones',          path:'/cotizaciones',    icon:FileText,         modulo:'cotizaciones',   color:'#84cc16' },
  { label:'Proveedores',           path:'/proveedores',     icon:Building2,        modulo:'proveedores',    color:'#f59e0b' },
  { divider:true, label:'DESPACHOS' },
  { label:'Clientes',              path:'/clientes',        icon:Users,            modulo:'clientes',       color:'#10b981' },
  { label:'Despachos',             path:'/despachos',       icon:Truck,            modulo:'despachos',      color:'#3b82f6' },
  { label:'Pedidos Internos',      path:'/pedidos-internos',icon:ClipboardList,    modulo:'pedidos-internos', color:'#f97316', badge:'pedidos-internos' },
  { label:'Empaque / Packing',     path:'/empaque',         icon:Package,          modulo:'empaque',        color:'#06b6d4' },
  { label:'Transportes',           path:'/transportes',     icon:NavIcon,          modulo:'transportes',    color:'#0ea5e9' },
  { label:'Flota y Mantenimiento', path:'/flota',           icon:Wrench,           modulo:'flota',          color:'#94a3b8' },
  { divider:true, label:'ANÁLISIS' },
  { label:'Movimientos',           path:'/movimientos',     icon:Boxes,            modulo:'movimientos',    color:'#8b5cf6' },
  { label:'Vencimientos',          path:'/vencimientos',    icon:Clock,            modulo:'vencimientos',   color:'#ef4444' },
  { label:'Punto de Reorden',      path:'/reorden',         icon:TrendingDown,     modulo:'reorden',        color:'#f59e0b' },
  { label:'Previsión de Demanda',  path:'/prevision',       icon:Activity,         modulo:'prevision',      color:'#6366f1' },
  { label:'Reportes',              path:'/reportes',        icon:BarChart3,        modulo:'reportes',       color:'#3b82f6' },
  { label:'KPIs Operativos',       path:'/kpis',            icon:Target,           modulo:'kpis',           color:'#10b981' },
  { label:'SUNAT / Fact. Elect.',  path:'/sunat',           icon:Zap,              modulo:'sunat',          color:'#eab308' },
  { label:'Reportes Contables',    path:'/contabilidad',    icon:BookOpen,         modulo:'reportes',       color:'#a855f7' },
  { label:'Trazabilidad Pedidos',  path:'/trazabilidad',    icon:ArrowRightLeft,   modulo:'despachos',      color:'#06b6d4' },
  { label:'Dashboard Financiero',  path:'/financiero',      icon:TrendingUp,       modulo:'financiero',     color:'#22c55e' },
  { divider:true, label:'VENTAS' },
  { label:'Proformas / Cotiz.',    path:'/proformas',       icon:FileText,         modulo:'proformas',      color:'#84cc16' },
  { label:'Cuentas por Cobrar',    path:'/cxc',             icon:DollarSign,       modulo:'cxc',            color:'#f43f5e' },
  { label:'Portal de Pedidos',     path:'/portal-pedidos',  icon:Globe,            modulo:'portal-pedidos', color:'#0ea5e9' },
  { divider:true, label:'ALMACÉN' },
  { label:'Mapa de Almacén',       path:'/mapa-almacen',    icon:Grid3x3,          modulo:'mapa-almacen',   color:'#8b5cf6' },
  { label:'Lotes y Series',        path:'/lotes-series',    icon:Layers,           modulo:'lotes-series',   color:'#f97316' },
  { label:'Lista de Precios',      path:'/lista-precios',   icon:Tag,              modulo:'lista-precios',  color:'#eab308' },
  { divider:true, label:'ADMINISTRACIÓN' },
  { label:'Usuarios y Roles',      path:'/usuarios',        icon:Users,            modulo:'usuarios',       color:'#6366f1' },
  { label:'Auditoría',             path:'/auditoria',       icon:Shield,           modulo:'auditoria',      color:'#ef4444' },
  { label:'Cola de Sincronización',path:'/cola-sync',       icon:RefreshCw,        modulo:'cola-sync',      color:'#f59e0b' },
  { label:'Configuración',         path:'/configuracion',   icon:Settings,         modulo:'configuracion',  color:'#94a3b8' },

  { label:'Portal Proveedores B2B',path:'/portal-prov-b2b', icon:Building2,        modulo:'proveedores',    color:'#0ea5e9' },
]

function SidebarThemeButton({ collapsed }) {
  const { current, applyTheme, themes } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div ref={ref} className="relative px-2 py-1">
      <button
        onClick={() => setOpen(o => !o)}
        title="Cambiar tema de apariencia"
        className={`w-full flex items-center gap-3 mx-0 rounded-lg transition-all duration-150 overflow-hidden whitespace-nowrap
          ${collapsed ? 'px-0 justify-center h-10' : 'px-3 py-2'}
          ${open ? 'bg-white/8' : 'hover:bg-white/5'}`}
        style={{ color: open ? 'var(--sidebar-fg-muted)' : 'var(--sidebar-fg-nav)' }}>
        <Palette size={16} className="shrink-0" style={{ opacity: 0.75 }}/>
        {!collapsed && (
          <>
            <span className="flex-1 text-[13.5px] font-medium text-left">Apariencia</span>
            <span className="text-[11px] font-semibold shrink-0" style={{ color: current.accent }}>
              {current.emoji} {current.label}
            </span>
          </>
        )}
      </button>
      {open && (
        <div
          className="absolute z-[9999] border border-white/12 rounded-xl shadow-2xl overflow-hidden p-1.5"
          style={{
            background: 'var(--bg-surface)',
            ...(collapsed
              ? { left: '100%', marginLeft: 8, bottom: 0, minWidth: 220 }
              : { bottom: '100%', left: 0, right: 0, marginBottom: 4 })
          }}>
          <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--sidebar-fg-faint)' }}>Tema de color</div>
          {themes.map(t => (
            <button key={t.id} onClick={() => { applyTheme(t.id); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors text-left">
              <div className="flex gap-1 shrink-0">
                {t.preview.map((c, i) => (
                  <div key={i} className="w-3 h-3 rounded-full border border-white/20" style={{ background: c }}/>
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold" style={{ color: current.id === t.id ? t.accent : 'var(--text-primary)' }}>
                  {t.emoji} {t.label}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t.desc}</div>
              </div>
              {current.id === t.id && <Check size={12} style={{ color: t.accent, flexShrink: 0 }}/>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ collapsed, onToggle }) {
  const { productos, pedidosInternos, sesion, logout, tienePermiso, config } = useApp()

  const stockCritico = productos.filter(p => {
    const e = estadoStock(p.stockActual, p.stockMinimo)
    return e.estado === 'critico' || e.estado === 'agotado'
  }).length

  const alertasVenc = productos.filter(p => {
    if (!p.tieneVencimiento || !p.fechaVencimiento) return false
    const d = diasParaVencer(p.fechaVencimiento)
    return d !== null && d <= 30
  }).length

  const totalAlertas = stockCritico + alertasVenc

  const pedidosBadge = useMemo(() => {
    if (!sesion || !pedidosInternos?.length) return 0
    if (sesion.rol === 'solicitante') {
      return pedidosInternos.filter(p =>
        p.areaId === sesion.areaId && p.estado === 'ENTREGADO' && !p.reciboConfirmado
      ).length
    }
    return pedidosInternos.filter(p => p.estado === 'ENVIADO').length
  }, [pedidosInternos, sesion])

  const navVisible = useMemo(() => {
    if (!sesion) return NAV
    const marked = NAV.map(item => {
      if (item.divider) return item
      if (!tienePermiso(item.modulo)) return null
      return item
    })
    const result = []
    for (let i = 0; i < marked.length; i++) {
      const item = marked[i]
      if (!item) continue
      if (item.divider) {
        let hasItems = false
        for (let j = i + 1; j < marked.length; j++) {
          if (marked[j]?.divider) break
          if (marked[j] !== null) { hasItems = true; break }
        }
        if (hasItems) result.push(item)
      } else {
        result.push(item)
      }
    }
    return result
  }, [sesion, tienePermiso])

  return (
    <aside
      className={`flex flex-col border-r border-white/[0.07] transition-all duration-250 shrink-0 overflow-y-auto z-10 ${collapsed ? 'w-15' : 'w-63'}`}
      style={{ background: 'var(--bg-sidebar)' }}>

      {/* ── CABECERA / LOGO ──────────────────────────── */}
      {collapsed ? (
        <div className="flex flex-col items-center border-b border-white/[0.07] shrink-0 sticky top-0 z-10 py-3 gap-2"
          style={{ background: 'var(--bg-sidebar)' }}>
          <img src={logoImg} alt="StockPro" className="w-9 h-9 object-contain rounded-lg" style={{ filter:'brightness(1.1)' }}/>
          <button onClick={onToggle} title="Expandir menú"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/6 transition-all"
            style={{ color: 'var(--sidebar-fg-muted)' }}>
            <ChevronRight size={15}/>
          </button>
        </div>
      ) : (
        <div className="shrink-0 sticky top-0 z-10" style={{ background: 'var(--sidebar-brand)' }}>

          {/* Barra acento superior */}
          <div style={{ height: 2, background: 'var(--sidebar-line)' }}/>

          {/* Bloque — Identidad de la app */}
          <div className="flex items-center gap-3 px-4 pt-3.5 pb-3">

            <div className="w-11 h-11 shrink-0 flex items-center justify-center overflow-hidden">
              <img src={logoImg} alt="Logo" className="w-11 h-11 object-contain" style={{ filter:'brightness(1.08)' }}/>
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-bold truncate leading-snug" style={{ color: 'var(--sidebar-fg)' }}>
                {config?.empresa || 'Mi Empresa'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.75">
                <span className="text-[10px] font-bold uppercase tracking-[0.06em]"
                  style={{ color: 'var(--accent)', opacity: 0.75 }}>StockPro</span>
                <span className="text-[9px] px-1.5 py-px rounded font-semibold"
                  style={{ color: 'var(--sidebar-fg-muted)', background: 'var(--sidebar-surface)', letterSpacing: '0.03em' }}>
                  {config?.version ? config.version.replace(/stockpro\s*/i, '') : 'v2.0'}
                </span>
              </div>
            </div>

            <button onClick={onToggle} title="Colapsar menú"
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all shrink-0"
              style={{ color: 'var(--sidebar-fg-muted)', background: 'var(--sidebar-surface)', border: '1px solid var(--border)' }}>
              <ChevronLeft size={15}/>
            </button>
          </div>

          <div style={{ height: 1, background: 'var(--border)' }}/>
        </div>
      )}

      {/* ── NAV ──────────────────────────────────────── */}
      <nav className="flex-1 py-2">
        {navVisible.map((item, i) => {
          if (item.divider) return (
            <div key={i} className="mt-1">
              <div className="h-px bg-white/5 mx-3 mb-1"/>
              {!collapsed && item.label && (
                <div className="px-4 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--sidebar-fg-faint)' }}>{item.label}</div>
              )}
            </div>
          )
          const Icon = item.icon
          const badgeCount = item.badge === 'stock' ? stockCritico
            : item.badge === 'alertas' ? totalAlertas
            : item.badge === 'pedidos-internos' ? pedidosBadge
            : 0
          return (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 mx-2 my-0.5 rounded-lg transition-all duration-150 no-underline overflow-hidden whitespace-nowrap relative
                ${collapsed ? 'px-0 justify-center h-10' : 'px-3 py-2'}
                ${isActive ? '' : 'hover:bg-white/5'}`
              }
              style={({ isActive }) => isActive
                ? { background: 'var(--accent-dim)', color: 'var(--accent)' }
                : { color: 'var(--sidebar-fg-nav)' }}>
              {({ isActive }) => (<>
                {isActive && !collapsed && (
                  <div className="absolute left-0 top-1 bottom-1 w-0.75 rounded-full" style={{ background: 'var(--accent)' }}/>
                )}
                <Icon size={16} className="shrink-0"
                  style={{ color: isActive ? 'var(--accent)' : item.color, opacity: isActive ? 1 : 0.85 }}/>
                {!collapsed && (
                  <span className="flex-1 text-[13.5px] font-medium overflow-hidden text-ellipsis leading-snug">{item.label}</span>
                )}
                {badgeCount > 0 && (
                  collapsed
                    ? <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"/>
                    : <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-[1px] rounded-full shrink-0">{badgeCount}</span>
                )}
              </>)}
            </NavLink>
          )
        })}
      </nav>

      {/* ── FOOTER ───────────────────────────────────── */}
      {sesion && (
        <div className="sticky bottom-0" style={{ background: 'var(--bg-sidebar)' }}>
          <div className="h-px bg-white/5 mx-3"/>

          {/* Indicador sin conexión / cola pendiente */}
          <OfflineBanner collapsed={collapsed}/>

          {/* Monitor de almacenamiento */}
          <StorageWidget collapsed={collapsed}/>

          <div className="h-px bg-white/5 mx-3"/>

          <SidebarThemeButton collapsed={collapsed}/>

          <div className="h-px bg-white/5 mx-3"/>

          <div className={`${collapsed ? 'p-2' : 'px-3 py-3'}`}>
            {collapsed ? (
              <button onClick={logout} title="Cerrar sesión"
                className="w-full h-10 flex items-center justify-center text-[#9ba8b6] hover:text-red-400 hover:bg-red-500/8 transition-colors rounded-lg">
                <LogOut size={16}/>
              </button>
            ) : (
              <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/3 transition-colors">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))' }}>
                  {sesion.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate leading-tight" style={{ color: 'var(--sidebar-fg)' }}>{sesion.nombre}</div>
                  <div className="text-[10px] truncate" style={{ color: 'var(--sidebar-fg-muted)' }}>{sesion.email}</div>
                </div>
                <button onClick={logout} title="Cerrar sesión"
                  className="p-1.5 hover:text-red-400 hover:bg-red-500/8 transition-colors rounded-lg shrink-0"
                  style={{ color: 'var(--sidebar-fg-muted)' }}>
                  <LogOut size={15}/>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
