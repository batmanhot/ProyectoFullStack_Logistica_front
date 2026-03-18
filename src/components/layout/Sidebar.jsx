import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine,
  ShoppingCart, BarChart3, Settings, ChevronLeft, ChevronRight, Boxes,
  Building2, SlidersHorizontal, RotateCcw, Users, Tag, LogOut,
  ArrowRightLeft, Clock, TrendingDown, BookOpen, Bell,
  FileText, ClipboardList, Activity, Smartphone,
  Truck, Navigation as NavIcon, Shield,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { estadoStock, diasParaVencer } from '../../utils/helpers'

const NAV = [
  { label:'Dashboard',            path:'/',               icon:LayoutDashboard,  modulo:'dashboard'     },
  { label:'Alertas',              path:'/alertas',        icon:Bell,             modulo:'alertas',      badge:'alertas' },
  { divider:true, label:'INVENTARIO' },
  { label:'Inventario',           path:'/inventario',     icon:Package,          modulo:'inventario',   badge:'stock' },
  { label:'Kardex',               path:'/kardex',         icon:BookOpen,         modulo:'kardex'        },
  { label:'Inventario Físico',    path:'/inv-fisico',     icon:ClipboardList,    modulo:'inv-fisico'    },
  { divider:true, label:'OPERACIONES' },
  { label:'Entradas',             path:'/entradas',       icon:ArrowDownToLine,  modulo:'entradas'      },
  { label:'Salidas',              path:'/salidas',        icon:ArrowUpFromLine,  modulo:'salidas'       },
  { label:'Ajustes',              path:'/ajustes',        icon:SlidersHorizontal,modulo:'ajustes'       },
  { label:'Devoluciones',         path:'/devoluciones',   icon:RotateCcw,        modulo:'devoluciones'  },
  { label:'Transferencias',       path:'/transferencias', icon:ArrowRightLeft,   modulo:'transferencias'},
  { divider:true, label:'COMPRAS' },
  { label:'Órdenes de Compra',    path:'/ordenes',        icon:ShoppingCart,     modulo:'ordenes'       },
  { label:'Cotizaciones',         path:'/cotizaciones',   icon:FileText,         modulo:'cotizaciones'  },
  { label:'Proveedores',          path:'/proveedores',    icon:Building2,        modulo:'proveedores'   },
  { divider:true, label:'DESPACHOS' },
  { label:'Clientes',             path:'/clientes',       icon:Users,            modulo:'clientes'      },
  { label:'Despachos',            path:'/despachos',      icon:Truck,            modulo:'despachos'     },
  { label:'Transportes',          path:'/transportes',    icon:NavIcon,          modulo:'transportes'   },
  { divider:true, label:'ANÁLISIS' },
  { label:'Movimientos',          path:'/movimientos',    icon:Boxes,            modulo:'movimientos'   },
  { label:'Vencimientos',         path:'/vencimientos',   icon:Clock,            modulo:'vencimientos'  },
  { label:'Punto de Reorden',     path:'/reorden',        icon:TrendingDown,     modulo:'reorden'       },
  { label:'Previsión de Demanda', path:'/prevision',      icon:Activity,         modulo:'prevision'     },
  { label:'Reportes',             path:'/reportes',       icon:BarChart3,        modulo:'reportes'      },
  { divider:true, label:'ADMINISTRACIÓN' },
  { label:'Categ. / Almacenes',   path:'/maestros',       icon:Tag,              modulo:'maestros'      },
  { label:'Usuarios y Roles',     path:'/usuarios',       icon:Users,            modulo:'usuarios'      },
  { label:'Auditoría',            path:'/auditoria',      icon:Shield,           modulo:'auditoria'     },
  { label:'Configuración',        path:'/configuracion',  icon:Settings,         modulo:'configuracion' },
  { label:'App Móvil / PWA',      path:'/pwa',            icon:Smartphone,       modulo:'pwa'           },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { productos, sesion, logout, tienePermiso, config } = useApp()

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

  return (
    <aside className={`flex flex-col bg-[#0f1520] border-r border-white/[0.07] transition-all duration-250 shrink-0 overflow-y-auto z-10 ${collapsed ? 'w-[60px]' : 'w-[252px]'}`}>

      {/* Logo */}
      <div className={`flex items-center border-b border-white/[0.07] shrink-0 sticky top-0 bg-[#0f1520] z-10 ${collapsed ? 'h-[60px] justify-center' : 'h-[68px] px-4 gap-3'}`}>
        <div className={`rounded-xl bg-[#00c896] flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(0,200,150,0.35)] ${collapsed ? 'w-9 h-9' : 'w-10 h-10'}`}>
          <Package size={collapsed ? 17 : 20} color="#082e1e" strokeWidth={2.5}/>
        </div>
        {!collapsed && (
          <div className="flex-1 overflow-hidden">
            <div className="text-[18px] font-extrabold text-white tracking-tight leading-none" style={{ fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", letterSpacing:'-0.03em' }}>
              Stock<span style={{ color:'#00c896' }}>Pro</span>
            </div>
            <div className="text-[10px] font-semibold tracking-[0.18em] mt-0.5" style={{ color:'#00c896', opacity:0.75 }}>
              GESTIÓN LOGÍSTICA
            </div>
          </div>
        )}
        <button onClick={onToggle} title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className={`flex items-center justify-center rounded-lg transition-all duration-150 shrink-0 text-[#5f6f80] hover:text-[#e8edf2] hover:bg-white/[0.06] ${collapsed ? 'w-9 h-9' : 'w-8 h-8 ml-auto'}`}>
          {collapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
        </button>
      </div>

      {/* Versión */}
      {!collapsed && config?.modoSistema && (
        <div className="px-4 py-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00c896]/10 text-[#00c896]/70 font-medium tracking-wide">
            {config.version || 'v2.0'} · {config.modoSistema?.split('—')[0]?.trim()}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-2">
        {NAV.map((item, i) => {
          if (item.divider) return (
            <div key={i} className="mt-1">
              <div className="h-px bg-white/[0.05] mx-3 mb-1"/>
              {!collapsed && item.label && (
                <div className="px-4 py-1 text-[9.5px] font-bold text-[#3d4f60] uppercase tracking-[0.14em]">{item.label}</div>
              )}
            </div>
          )
          if (sesion) {
            const libre = ['configuracion','pwa','auditoria'].includes(item.modulo)
            if (!libre && !tienePermiso(item.modulo)) return null
            if (item.modulo === 'auditoria' && sesion.rol !== 'admin') return null
          }
          const Icon = item.icon
          const badgeCount = item.badge === 'stock' ? stockCritico : item.badge === 'alertas' ? totalAlertas : 0
          return (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 mx-2 my-[2px] rounded-lg transition-all duration-150 no-underline overflow-hidden whitespace-nowrap relative
                ${collapsed ? 'px-0 justify-center h-10' : 'px-3 py-[8px]'}
                ${isActive ? 'bg-[#00c896]/12 text-[#00c896]' : 'text-[#7a8fa8] hover:text-[#d0dae6] hover:bg-white/[0.05]'}`
              }>
              {({ isActive }) => (<>
                {isActive && !collapsed && <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-[#00c896]"/>}
                <Icon size={16} className="shrink-0" style={{ opacity: isActive ? 1 : 0.65 }}/>
                {!collapsed && <span className="flex-1 text-[16px] font-medium overflow-hidden text-ellipsis leading-snug">{item.label}</span>}
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

      {/* Footer */}
      {sesion && (
        <div className={`border-t border-white/[0.07] sticky bottom-0 bg-[#0f1520] ${collapsed ? 'p-2' : 'px-3 py-3'}`}>
          {collapsed ? (
            <button onClick={logout} title="Cerrar sesión"
              className="w-full h-10 flex items-center justify-center text-[#5f6f80] hover:text-red-400 transition-colors rounded-lg hover:bg-white/[0.04]">
              <LogOut size={15}/>
            </button>
          ) : (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background:'linear-gradient(135deg,#00c896,#008f6b)' }}>
                {sesion.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#c8d8e8] truncate leading-tight">{sesion.nombre}</div>
                <div className="text-[10px] text-[#3d4f60] truncate">{sesion.email}</div>
              </div>
              <button onClick={logout} title="Cerrar sesión"
                className="p-1.5 text-[#3d4f60] hover:text-red-400 transition-colors rounded-lg hover:bg-white/[0.06] shrink-0">
                <LogOut size={13}/>
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
