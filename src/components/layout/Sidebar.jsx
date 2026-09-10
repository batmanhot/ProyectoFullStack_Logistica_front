import { NavLink, useNavigate } from 'react-router-dom'
import { useMemo, useState, useRef, useEffect } from 'react'
import {LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine, ShoppingCart, BarChart3, Settings, ChevronLeft, ChevronRight, Boxes, Building2, SlidersHorizontal, RotateCcw, Users, Tag, LogOut, ArrowRightLeft, Clock, TrendingDown, BookOpen, Bell, FileText, ClipboardList, Activity, Smartphone, Truck, Navigation as NavIcon, Shield, ShieldCheck, TrendingUp, Wrench, DollarSign, Grid3x3, Layers, Globe, Target, Zap, Palette, Check, RefreshCw, Bug, HelpCircle, Filter, DatabaseBackup, ScrollText, CreditCard, Receipt} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { useTheme } from '../../hooks/useTheme'
import { PLAN_META } from '../../config/constants'
import StorageWidget from '../ui/StorageWidget'
import OfflineBanner from '../ui/OfflineBanner'

const ROLES_LABEL = { saas_admin:'Super Admin', owner:'Propietario', admin:'Administrador', supervisor:'Supervisor', almacenero:'Almacenero', solicitante:'Solicitante', chofer:'Chofer' }

// Panel del SuperAdmin integrado al sidebar oficial (antes era un sidebar
// interno aparte en pages/AdminSaaS/). Las rutas /admin-saas/<tab> las resuelve
// SuperAdminLayout en App.jsx.
const NAV_SAAS_ADMIN = [
  { divider:true, label:'PLATAFORMA' },
  { label:'Dashboard',         path:'/admin-saas/dashboard',       icon:LayoutDashboard,   color:'#3b82f6' },
  { label:'Negocios',          path:'/admin-saas/negocios',        icon:Building2,          color:'#f59e0b' },
  { label:'Alertas',           path:'/admin-saas/alertas',         icon:Bell,              color:'#ef4444' },
  { label:'Monitor en Vivo',   path:'/admin-saas/monitor',         icon:Activity,          color:'#22c55e' },
  { label:'Backups',           path:'/admin-saas/backups',         icon:DatabaseBackup,    color:'#8b5cf6' },
  { label:'Auditoría',         path:'/admin-saas/auditoria',       icon:ScrollText,        color:'#06b6d4' },
  { label:'Administradores',   path:'/admin-saas/platform-admins', icon:ShieldCheck,       color:'#6366f1' },
  { label:'Roles del sistema', path:'/admin-saas/roles',           icon:Shield,            color:'#a855f7' },
  { label:'Ajustes',           path:'/admin-saas/ajustes',         icon:Settings,          color:'#94a3b8' },
  { divider:true, label:'COMERCIAL' },
  { label:'Planes y Precios',  path:'/admin-saas/planes',          icon:CreditCard,        color:'#0ea5e9' },
  { label:'Límites del Plan',  path:'/admin-saas/limites',         icon:SlidersHorizontal, color:'#6366f1' },
  { label:'Suscripciones',     path:'/admin-saas/suscripciones',   icon:RefreshCw,         color:'#00c896' },
  { label:'Facturación',       path:'/admin-saas/facturacion',     icon:Receipt,           color:'#3b82f6' },
  { divider:true, label:'SITIO PÚBLICO' },
  { label:'Landing Page',      path:'/admin-saas/landing',         icon:Globe,             color:'#10b981' },
]

// La agrupación por secciones (los `divider`) se repite, a mano, en
// `pages/Usuarios/constants.js` (MODULOS_GRUPOS) para el editor de permisos por rol —
// no hay una fuente única. Si se agrega, quita o reagrupa un módulo acá, replicar el
// mismo cambio ahí (mismos `modulo`/`id`) o el editor de roles queda con una
// clasificación distinta a la del menú real.
const NAV = [
  { label:'Dashboard',             path:'/',                icon:LayoutDashboard,  modulo:'dashboard',      color:'#3b82f6' },
  { label:'Alertas',               path:'/alertas',         icon:Bell,             modulo:'alertas',        color:'#ef4444', badge:'alertas' },
  { divider:true, label:'INVENTARIO' },
  { label:'Productos',             path:'/inventario',      icon:Package,          modulo:'inventario',     color:'#f59e0b', badge:'stock' },
  { label:'Kardex',                path:'/kardex',          icon:BookOpen,         modulo:'kardex',         color:'#8b5cf6' },
  { label:'Movimientos',           path:'/movimientos',     icon:Boxes,            modulo:'movimientos',    color:'#8b5cf6' },
  { label:'Inventario Físico',     path:'/inv-fisico',      icon:ClipboardList,    modulo:'inv-fisico',     color:'#06b6d4' },
  { divider:true, label:'OPERACIONES' },
  { label:'Entradas',              path:'/entradas',        icon:ArrowDownToLine,  modulo:'entradas',       color:'#10b981' },
  { label:'Salidas',               path:'/salidas',         icon:ArrowUpFromLine,  modulo:'salidas',        color:'#f43f5e' },
  { label:'Ajustes',               path:'/ajustes',         icon:SlidersHorizontal,modulo:'ajustes',        color:'#6366f1' },
  { label:'Devoluciones',          path:'/devoluciones',    icon:RotateCcw,        modulo:'devoluciones',   color:'#f97316' },
  { label:'Transferencias',        path:'/transferencias',  icon:ArrowRightLeft,   modulo:'transferencias', color:'#a855f7' },
  { divider:true, label:'DESPACHOS' },
  { label:'Clientes',              path:'/clientes',        icon:Users,            modulo:'clientes',       color:'#10b981' },
  // Chofer sigue necesitando el permiso 'despachos' (Trazabilidad Pedidos lo comparte, y las
  // vistas de Transportes/Panel de Chofer leen despacho embebido) pero la pantalla completa de
  // Despachos —gestión de TODOS los despachos de la empresa— no es para el rol transportista.
  { label:'Despachos',             path:'/despachos',       icon:Truck,            modulo:'despachos',      color:'#3b82f6', ocultarPara:['chofer'] },
  { label:'Pedidos Internos',      path:'/pedidos-internos',icon:ClipboardList,    modulo:'pedidos-internos', color:'#f97316', badge:'pedidos-internos' },
  { label:'Portal de Pedidos',     path:'/portal-pedidos',  icon:Globe,            modulo:'portal-pedidos', color:'#0ea5e9' },
  { label:'Empaque',               path:'/empaque',         icon:Package,          modulo:'empaque',        color:'#06b6d4' },
  { label:'Transportes',           path:'/transportes',     icon:NavIcon,          modulo:'transportes',    color:'#0ea5e9' },
  { label:'Flota y Mantenimiento', path:'/flota',           icon:Wrench,           modulo:'flota',          color:'#94a3b8' },
  { label:'Estado de Pedidos',    path:'/trazabilidad',    icon:ArrowRightLeft,   modulo:'despachos',      color:'#06b6d4' },
  { divider:true, label:'VENTAS' },
  { label:'Lista de Precios',      path:'/lista-precios',   icon:Tag,              modulo:'lista-precios',  color:'#eab308' },
  { label:'Proformas',            path:'/proformas',       icon:FileText,         modulo:'proformas',      color:'#84cc16' },
  { label:'Guías de Remisión',   path:'/sunat',           icon:Zap,              modulo:'sunat',          color:'#eab308' },
  { label:'Cuentas por Cobrar',    path:'/cxc',             icon:DollarSign,       modulo:'cxc',            color:'#f43f5e' },
  { label:'Oportunidades',         path:'/oportunidades',   icon:Filter,           modulo:'oportunidades',  color:'#ec4899' },
  { divider:true, label:'COMPRAS' },
  { label:'Órdenes de Compra',     path:'/ordenes',         icon:ShoppingCart,     modulo:'ordenes',        color:'#0ea5e9' },
  { label:'Cotizaciones',         path:'/cotizaciones',    icon:FileText,         modulo:'cotizaciones',   color:'#84cc16' },
  { label:'Proveedores',           path:'/proveedores',     icon:Building2,        modulo:'proveedores',    color:'#f59e0b' },
  { label:'Portal de Proveedores',path:'/portal-prov-b2b', icon:Building2,        modulo:'proveedores',    color:'#0ea5e9' },
  { divider:true, label:'ALMACÉN' },
  { label:'Mapa de Almacén',       path:'/mapa-almacen',    icon:Grid3x3,          modulo:'mapa-almacen',   color:'#8b5cf6' },
  { label:'Lotes',                 path:'/lotes-series',    icon:Layers,           modulo:'lotes-series',   color:'#f97316' },
  { divider:true, label:'ANÁLISIS' },
  { label:'Vencimientos',          path:'/vencimientos',    icon:Clock,            modulo:'vencimientos',   color:'#ef4444' },
  { label:'Punto de Reorden',      path:'/reorden',         icon:TrendingDown,     modulo:'reorden',        color:'#f59e0b' },
  { label:'Previsión de Demanda',  path:'/prevision',       icon:Activity,         modulo:'prevision',      color:'#6366f1' },
  { label:'Análisis de Inventario',path:'/reportes',        icon:BarChart3,        modulo:'reportes',       color:'#3b82f6' },
  { label:'KPIs Operativos',       path:'/kpis',            icon:Target,           modulo:'kpis',           color:'#10b981' },
  { label:'Reportes Contables',    path:'/contabilidad',    icon:BookOpen,         modulo:'reportes',       color:'#a855f7' },
  { label:'Dashboard Financiero',  path:'/financiero',      icon:TrendingUp,       modulo:'financiero',     color:'#22c55e' },
  { label:'Consumo por Proyecto',  path:'/reportes-proyecto', icon:Layers,         modulo:'reportes-proyecto', color:'#f97316' },
  { divider:true, label:'ADMINISTRACIÓN' },
  { label:'Usuarios y Roles',      path:'/usuarios',        icon:Users,            modulo:'usuarios',       color:'#6366f1' },
  { label:'Proyectos y CDR',       path:'/proyectos',       icon:Target,           modulo:'proyectos',      color:'#f97316' },
  { label:'Bitácora',            path:'/auditoria',       icon:Shield,           modulo:'auditoria',      color:'#ef4444' },
  { label:'Panel de Auditoría',    path:'/panel-auditoria', icon:ShieldCheck,      modulo:'panel-auditoria', color:'#06b6d4' },
  { label:'Incidencias',           path:'/incidencias',     icon:Bug,              modulo:'incidencias',    color:'#ef4444' },
  { label:'Cola de Sincronización',path:'/cola-sync',       icon:RefreshCw,        modulo:'cola-sync',      color:'#f59e0b' },
  { label:'Configuración',         path:'/configuracion',   icon:Settings,         modulo:'configuracion',  color:'#94a3b8' },
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

function SidebarHelpLink({ collapsed }) {
  return (
    <NavLink
      to="/ayuda"
      title="Centro de Ayuda"
      className={({ isActive }) => `flex items-center gap-3 mx-2 my-0.5 rounded-lg transition-all duration-150 no-underline overflow-hidden whitespace-nowrap
        ${collapsed ? 'px-0 justify-center h-10' : 'px-3 py-2'}
        ${isActive ? '' : 'hover:bg-white/5'}`}
      style={({ isActive }) => isActive
        ? { background: 'var(--accent-dim)', color: 'var(--accent)' }
        : { color: 'var(--sidebar-fg-nav)' }}>
      <HelpCircle size={16} className="shrink-0" style={{ opacity: 0.85 }}/>
      {!collapsed && <span className="flex-1 text-[13.5px] font-medium">Centro de Ayuda</span>}
    </NavLink>
  )
}

export default function Sidebar({ collapsed, onToggle }) {
  const { sesion, logout, tienePermiso } = useApp()
  const navigate = useNavigate()
  const planMeta = PLAN_META[sesion?.plan]

  function handleLogout() {
    // logout() limpia la sesión (y con ella sesion.empresaCodigo) — hay que
    // guardarlo ANTES de llamarlo. Sin esto, "Cerrar sesión" mandaba siempre
    // a /login "en blanco" (pantalla de ingresar código de organización),
    // perdiendo el contexto del tenant y obligando a volver a escribirlo
    // cada vez — /app/:orgId ya resuelve exactamente esto (auto-selecciona
    // la empresa y muestra directo las tarjetas de acceso rápido/login).
    const empresaCodigo = sesion?.empresaCodigo
    logout()
    navigate(empresaCodigo ? `/app/${empresaCodigo}` : '/login', { replace: true })
  }

  // Badges: en 0 mientras los módulos no estén migrados a TanStack Query
  const stockCritico  = 0
  const totalAlertas  = 0
  const pedidosBadge  = 0

  const navVisible = useMemo(() => {
    if (!sesion) return NAV
    // SuperAdmin ve solo su panel exclusivo
    if (sesion.rol?.codigo === 'saas_admin') return NAV_SAAS_ADMIN
    const marked = NAV.map(item => {
      if (item.divider) return item
      if (!tienePermiso(item.modulo)) return null
      if (item.ocultarPara?.includes(sesion.rol?.codigo)) return null
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
      className={`flex flex-col border-r border-white/7 transition-all duration-250 shrink-0 overflow-y-auto z-10 ${collapsed ? 'w-15' : 'w-63'}`}
      style={{ background: 'var(--bg-sidebar)' }}>

      {/* ── CABECERA / LOGO ──────────────────────────── */}
      {collapsed ? (
        <div className="flex flex-col items-center border-b border-white/7 shrink-0 sticky top-0 z-10 py-3 gap-2"
          style={{ background: 'var(--bg-sidebar)' }}>
          <img src="/logo.webp" alt="StockPro" className="w-9 h-9 object-contain rounded-lg" style={{ filter:'brightness(1.1)' }}/>
          <button onClick={onToggle} title="Expandir menú"
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 shadow-sm"
            style={{ color: 'var(--sidebar-fg)', background: 'var(--sidebar-surface)', border: '1px solid var(--border)', boxShadow: '0 0 0 1px rgba(15,23,42,0.03), 0 6px 16px rgba(15,23,42,0.08)' }}>
            <ChevronRight size={15} strokeWidth={2.6}/>
          </button>
        </div>
      ) : (
        <div className="shrink-0 sticky top-0 z-10 border-b border-white/8" style={{ background: 'var(--sidebar-brand)' }}>

          {/* Barra acento superior */}
          <div style={{ height: 2, background: 'var(--sidebar-line)' }}/>

          <div className="flex items-center gap-3 px-3.5 pt-3 pb-3">
            <div className="w-13 h-13 shrink-0 flex items-center justify-center rounded-xl overflow-hidden shadow-inner"
              style={{ background: 'var(--sidebar-surface)', border: '1px solid var(--border)' }}>
              <img src="/logo.webp" alt="Logo" className="w-9 h-9 object-contain" style={{ filter:'brightness(1.08)' }}/>
            </div>

            <div className="flex-1 min-w-0 leading-none">
              <div className="truncate font-black tracking-[-0.02em]" title={sesion?.empresaNombre}
                style={{ color: 'var(--sidebar-fg)', fontSize: '1.15rem', lineHeight: 1.15 }}>
                {sesion?.empresaNombreCorto || sesion?.empresaNombre || 'StockPro'}
              </div>

              <div className="min-w-0" style={{ marginTop: '2px', lineHeight: 1.1 }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] whitespace-nowrap"
                    style={{ color: 'var(--sidebar-fg-muted)', lineHeight: 1.1 }}>
                    StockPro
                  </span>
                </div>

                {planMeta && (
                  <div style={{ marginTop: '1px' }}>
                    <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full text-[8.5px] font-bold leading-none whitespace-nowrap"
                      style={{ color: planMeta.color, background: `${planMeta.color}18`, border: `1px solid ${planMeta.color}33`, lineHeight: 1.1 }}>
                      <span className="w-1 h-1 rounded-full shrink-0" style={{ background: planMeta.color }}/>
                      {planMeta.label}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button onClick={onToggle} title="Colapsar menú"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 shrink-0 shadow-sm"
              style={{ color: 'var(--sidebar-fg)', background: 'var(--sidebar-surface)', border: '1px solid var(--border)', boxShadow: '0 0 0 1px rgba(15,23,42,0.03), 0 6px 16px rgba(15,23,42,0.08)' }}>
              <ChevronLeft size={15} strokeWidth={2.6}/>
            </button>
          </div>
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
          <SidebarHelpLink collapsed={collapsed}/>

          <div className="h-px bg-white/5 mx-3"/>

          <div className={`${collapsed ? 'p-2' : 'px-3 py-3'}`}>
            {collapsed ? (
              <button onClick={handleLogout} title="Cerrar sesión"
                className="w-full h-10 flex items-center justify-center transition-colors rounded-lg"
                style={{ color: 'var(--sidebar-fg)', background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02))', border: '1px solid rgba(148,163,184,0.36)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 6px 16px rgba(15,23,42,0.28)' }}>
                <LogOut size={16} strokeWidth={2.2}/>
              </button>
            ) : (
              <div className="rounded-xl overflow-hidden transition-colors"
                style={{ background: 'var(--sidebar-surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2.5 px-2.5 py-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))', boxShadow: '0 0 0 1px rgba(255,255,255,0.16)' }}>
                    {sesion.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold truncate leading-tight" style={{ color: 'var(--sidebar-fg)' }}>{sesion.nombre}</div>
                    <div className="text-[11px] truncate leading-tight" style={{ color: 'var(--sidebar-fg-muted)' }}>{sesion.email}</div>
                  </div>
                  <button onClick={handleLogout} title="Cerrar sesión"
                    className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0 transition-colors"
                    style={{ color: 'var(--sidebar-fg)', background: 'rgba(0,0,0,0.03)', border: '1px solid var(--border)' }}>
                    <LogOut size={14} strokeWidth={2.2}/>
                  </button>
                </div>

                <button type="button" className="w-full flex items-center gap-2 px-2.5 py-2 text-left transition-colors"
                  style={{ color: 'var(--sidebar-fg)', background: 'rgba(0,0,0,0.015)', borderTop: '1px solid var(--border)' }}>
                  <div className="w-4 h-4 flex items-center justify-center" style={{ color: 'var(--sidebar-fg-muted)' }}>
                    <Settings size={14} strokeWidth={2}/>
                  </div>
                  <span className="text-[12px] font-medium">Mi Perfil</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
