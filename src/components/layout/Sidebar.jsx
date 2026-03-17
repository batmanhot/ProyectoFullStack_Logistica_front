import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine,
  ShoppingCart, BarChart3, Settings, ChevronRight, Boxes,
  Building2, SlidersHorizontal, RotateCcw, Users, Tag, LogOut,
  ArrowRightLeft, Clock, TrendingDown, BookOpen, Bell,
  FileText, ClipboardList, Activity, Smartphone,
  Truck, Navigation as NavIcon,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { estadoStock, diasParaVencer } from '../../utils/helpers'

const NAV = [
  { label:'Dashboard',            path:'/',               icon:LayoutDashboard,  modulo:'dashboard'     },
  { label:'Inventario',           path:'/inventario',     icon:Package,          modulo:'inventario',   badge:'stock' },
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
  { label:'Clientes',              path:'/clientes',    icon:Users,    modulo:'clientes'   },
  { label:'Despachos',             path:'/despachos',   icon:Truck,    modulo:'despachos'  },
  { label:'Transportes',           path:'/transportes', icon:NavIcon,   modulo:'transportes'},
  { divider:true, label:'ANÁLISIS' },
  { label:'Alertas',              path:'/alertas',        icon:Bell,             modulo:'alertas',      badge:'alertas' },
  { label:'Movimientos',          path:'/movimientos',    icon:Boxes,            modulo:'movimientos'   },
  { label:'Kardex',               path:'/kardex',         icon:BookOpen,         modulo:'kardex'        },
  { label:'Vencimientos',         path:'/vencimientos',   icon:Clock,            modulo:'vencimientos'  },
  { label:'Punto de Reorden',     path:'/reorden',        icon:TrendingDown,     modulo:'reorden'       },
  { label:'Previsión de Demanda', path:'/prevision',      icon:Activity,         modulo:'prevision'     },
  { label:'Reportes',             path:'/reportes',       icon:BarChart3,        modulo:'reportes'      },
  { divider:true, label:'HERRAMIENTAS' },
  { label:'Inventario Físico',    path:'/inv-fisico',     icon:ClipboardList,    modulo:'inv-fisico'    },
  { label:'App Móvil / PWA',      path:'/pwa',            icon:Smartphone,       modulo:'pwa'           },
  { divider:true, label:'CONFIGURACIÓN' },
  { label:'Categ. / Almacenes',   path:'/maestros',       icon:Tag,              modulo:'maestros'      },
  { label:'Usuarios y Roles',     path:'/usuarios',       icon:Users,            modulo:'usuarios'      },
  { label:'Configuración',        path:'/configuracion',  icon:Settings,         modulo:'configuracion' },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { productos, sesion, logout, tienePermiso } = useApp()

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
    <aside className={`flex flex-col bg-[#141920] border-r border-white/[0.08] transition-all duration-200 shrink-0 overflow-y-auto z-10 ${collapsed ? 'w-14' : 'w-[235px]'}`}>
      {/* Logo */}
      <div className="h-[52px] flex items-center px-4 border-b border-white/[0.08] gap-2.5 shrink-0 sticky top-0 bg-[#141920] z-10">
        <div className="w-7 h-7 rounded-lg bg-[#00c896] flex items-center justify-center shrink-0">
          <Package size={15} color="#082e1e" strokeWidth={2.5}/>
        </div>
        {!collapsed && (
          <div className="overflow-hidden flex-1">
            <div className="text-[15px] font-semibold text-[#e8edf2] whitespace-nowrap">StockPro</div>
            <div className="text-[10px] text-[#00c896] font-medium tracking-[0.05em]">GESTIÓN LOGÍSTICA</div>
          </div>
        )}
        <button onClick={onToggle} className="ml-auto p-1 rounded text-[#5f6f80] hover:text-[#9ba8b6] transition-colors shrink-0">
          <ChevronRight size={14} className="transition-transform duration-200" style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}/>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2">
        {NAV.map((item, i) => {
          if (item.divider) return (
            <div key={i}>
              <div className="h-px bg-white/[0.05] mx-3 mt-1.5"/>
              {!collapsed && item.label && (
                <div className="px-4 py-1.5 text-[9px] font-semibold text-[#5f6f80] uppercase tracking-[0.1em]">{item.label}</div>
              )}
            </div>
          )
          if (sesion && !tienePermiso(item.modulo) && item.modulo !== 'configuracion' && item.modulo !== 'pwa') return null
          const Icon = item.icon
          const badgeCount = item.badge === 'stock' ? stockCritico : item.badge === 'alertas' ? totalAlertas : 0
          return (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-2.5 mx-2 my-px px-3 py-[7px] rounded-lg text-[13px] transition-all duration-150 no-underline overflow-hidden whitespace-nowrap
                ${isActive ? 'text-[#00c896] bg-[#00c896]/10 font-medium' : 'text-[#9ba8b6] hover:text-[#e8edf2] hover:bg-white/[0.04]'}`
              }>
              {({ isActive }) => (
                <>
                  <Icon size={15} className="shrink-0" style={{ opacity: isActive ? 1 : 0.6 }}/>
                  {!collapsed && <span className="flex-1 overflow-hidden text-ellipsis">{item.label}</span>}
                  {!collapsed && badgeCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-semibold px-1.5 py-px rounded-full shrink-0">{badgeCount}</span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && sesion && (
        <div className="px-3 py-3 border-t border-white/[0.06] sticky bottom-0 bg-[#141920]">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-[#00c896]/15 flex items-center justify-center text-[#00c896] text-[10px] font-bold shrink-0">
              {sesion.nombre.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-[#9ba8b6] truncate">{sesion.nombre}</div>
              <div className="text-[10px] text-[#5f6f80] truncate">{sesion.email}</div>
            </div>
            <button onClick={logout} title="Cerrar sesión" className="p-1 text-[#5f6f80] hover:text-red-400 transition-colors shrink-0">
              <LogOut size={13}/>
            </button>
          </div>
        </div>
      )}
      {collapsed && (
        <div className="p-2 border-t border-white/[0.06] sticky bottom-0 bg-[#141920]">
          <button onClick={logout} title="Cerrar sesión" className="w-full p-2 flex items-center justify-center text-[#5f6f80] hover:text-red-400 transition-colors rounded-lg hover:bg-white/[0.04]">
            <LogOut size={14}/>
          </button>
        </div>
      )}
    </aside>
  )
}
