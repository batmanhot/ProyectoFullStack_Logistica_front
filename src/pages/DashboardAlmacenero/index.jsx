import { useState } from 'react'
import { Home, Layers, ClipboardList, Bell } from 'lucide-react'
import { estadoStock } from '../../utils/helpers'
import PickingTab from './PickingTab'
import InventarioFisicoTab from './InventarioFisicoTab'
import AlertasTab from './AlertasTab'

const TABS = [
  { id:'inicio',     label:'Inicio',      icon:Home },
  { id:'picking',    label:'Picking',     icon:Layers },
  { id:'inv-fisico', label:'Inv. Físico', icon:ClipboardList },
  { id:'alertas',    label:'Alertas',     icon:Bell },
]

export default function DashboardAlmacenero({ productos, despachos, kpis, nav, simboloMoneda }) {
  const [tab, setTab] = useState('inicio')

  const criticos          = productos.filter(p => { const e = estadoStock(p.stockActual, p.stockMinimo); return (e.estado === 'critico' || e.estado === 'agotado') && p.activo })
  const pendientePicking  = despachos.filter(d => ['PICKING','LISTO'].includes(d.estado))
  const paraDespachar     = despachos.filter(d => d.estado === 'LISTO')

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-[#e8edf2]">Panel de Almacén 📦</h1>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Vista operativa — {new Date().toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long' })}</p>
        </div>
        <div className="text-[11px] px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-semibold">Rol: Almacenero</div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1a2230] rounded-xl p-1.5">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
                tab === t.id ? 'bg-[#00c896]/15 text-[#00c896]' : 'text-[#5f6f80] hover:text-[#9ba8b6]'}`}>
              <Icon size={16}/>
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'inicio' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label:'En picking',      val:pendientePicking.length, color:'#f59e0b', nav:'/despachos' },
              { label:'Para despachar',  val:paraDespachar.length,   color:'#00c896', nav:'/despachos' },
              { label:'Stock crítico',   val:criticos.length,         color:'#ef4444', nav:'/inventario' },
              { label:'Total productos', val:kpis.totalProductos,     color:'#3b82f6', nav:'/inventario' },
            ].map(({ label, val, color, nav: to }) => (
              <div key={label} onClick={() => nav(to)}
                className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden cursor-pointer hover:border-white/14 active:scale-[0.98] transition-all">
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background:color }}/>
                <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em] mb-2">{label}</div>
                <div className="text-[28px] font-semibold" style={{ color }}>{val}</div>
              </div>
            ))}
          </div>
          {criticos.length === 0 && pendientePicking.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span style={{ fontSize:48 }}>✅</span>
              <div className="text-[16px] font-semibold text-[#e8edf2]">Todo en orden</div>
              <div className="text-[13px] text-[#5f6f80]">No hay alertas de stock ni despachos pendientes.</div>
            </div>
          )}
        </div>
      )}

      {tab === 'picking'    && <PickingTab despachos={despachos}/>}
      {tab === 'inv-fisico' && <InventarioFisicoTab/>}
      {tab === 'alertas'    && <AlertasTab simboloMoneda={simboloMoneda}/>}
    </div>
  )
}
