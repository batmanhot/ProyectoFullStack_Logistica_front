import { useMemo } from 'react'
import { Package, DollarSign, AlertTriangle, Clock, Boxes } from 'lucide-react'
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../store/AppContext'
import { formatCurrency, formatDate, estadoStock, vencimientoMasUrgentePorProducto, diasParaVencer } from '../../utils/helpers'
import { useProductosList } from '../../queries/productos.queries'
import { useInventarioList } from '../../queries/inventario.queries'
import { useMovimientosList } from '../../queries/movimientos.queries'
import { useCategoriasList } from '../../queries/categorias.queries'
import { useLotesList } from '../../queries/lotes.queries'

const TT = { background: '#1a2230', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12, color: '#e8edf2' }
const PIE_COLORS = ['#00c896', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

function KPI({ label, value, sub, color, icon: Icon, onClick }) {
  return (
    <div onClick={onClick}
      className={`relative bg-[#161d28] border border-white/8 rounded-xl px-4 sm:px-5 py-4 overflow-hidden
        ${onClick ? 'cursor-pointer hover:border-white/16 transition-all' : ''}`}>
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
      <div className="absolute top-3 right-4 opacity-[0.06]">{Icon && <Icon size={44}/>}</div>
      <div className="text-[9px] sm:text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.08em] mb-2 flex items-center gap-1.5">
        {Icon && <Icon size={11} style={{ color, opacity: 0.8 }}/>}{label}
      </div>
      <div className="text-[28px] font-semibold text-[#e8edf2] leading-none">{value}</div>
      {sub && <div className="text-[10px] text-[#5f6f80] mt-1.5 leading-snug">{sub}</div>}
    </div>
  )
}

export default function DashboardSupervisor() {
  const { sesion } = useApp()
  const nav = useNavigate()
  const simboloMoneda = 'S/'
  const hoy = new Date().toISOString().split('T')[0]

  const { data: productosRaw  = [] } = useProductosList()
  const { data: inventarioRaw = [] } = useInventarioList()
  const { data: movimientos   = [] } = useMovimientosList()
  const { data: categorias    = [] } = useCategoriasList()
  const { data: lotes         = [] } = useLotesList(undefined, { enabled: true })

  const productos = useMemo(() => {
    const stockMap = {}
    inventarioRaw.forEach(item => { stockMap[item.productoId] = (stockMap[item.productoId] || 0) + Number(item.cantidad || 0) })
    return productosRaw.map(p => ({ ...p, activo: p.estado === 'Activo', stockActual: stockMap[p.id] || 0, stockMinimo: Number(p.stockMinimo || 0) }))
  }, [productosRaw, inventarioRaw])

  const vencPorProducto = useMemo(() => vencimientoMasUrgentePorProducto(lotes), [lotes])

  const kpis = useMemo(() => {
    const activos = productos.filter(p => p.activo)
    const valorTotal = activos.reduce((s, p) => s + (Number(p.precioCompra || 0) * p.stockActual), 0)
    const criticos = activos.filter(p => { const e = estadoStock(p.stockActual, p.stockMinimo); return e.estado === 'critico' || e.estado === 'agotado' }).length
    const movHoy = movimientos.filter(m => m.fecha === hoy).length
    const vencProximos = activos.filter(p => {
      const f = vencPorProducto[p.id]
      if (!f) return false
      const dias = diasParaVencer(f)
      return dias !== null && dias <= 30
    }).length
    return { totalProductos: activos.length, valorTotal, criticos, movHoy, vencProximos }
  }, [productos, movimientos, hoy, vencPorProducto])

  const movChart = useMemo(() => {
    const dias = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      dias.push({
        dia: d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }),
        Entradas: movimientos.filter(m => m.fecha === key && m.tipo === 'ENTRADA').reduce((s, m) => s + (m.costoTotal || 0), 0),
        Salidas: movimientos.filter(m => m.fecha === key && m.tipo === 'SALIDA').reduce((s, m) => s + (m.costoTotal || 0), 0),
      })
    }
    return dias
  }, [movimientos])

  const pieData = useMemo(() => {
    const map = {}
    productos.forEach(p => {
      const n = categorias.find(c => c.id === p.categoriaId)?.nombre || 'Sin categoría'
      map[n] = (map[n] || 0) + (Number(p.precioCompra || 0) * p.stockActual)
    })
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) }))
      .filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 7)
  }, [productos, categorias])

  const productosCriticos = useMemo(() =>
    productos.filter(p => p.activo && ['critico', 'agotado'].includes(estadoStock(p.stockActual, p.stockMinimo).estado)).slice(0, 6)
  , [productos])

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-[#e8edf2]">Panel de Almacén 🏭</h1>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Buenos días, {sesion?.nombre?.split(' ')[0] || ''} — {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="text-[11px] px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-semibold">Rol: Supervisor de Almacén</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Total productos" value={kpis.totalProductos} color="#00c896" icon={Package} onClick={() => nav('/inventario')}/>
        <KPI label="Valor del stock" value={formatCurrency(kpis.valorTotal, simboloMoneda)} color="#3b82f6" icon={DollarSign} onClick={() => nav('/inventario')}/>
        <KPI label="Stock crítico/agotado" value={kpis.criticos} color={kpis.criticos > 0 ? '#ef4444' : '#22c55e'} icon={AlertTriangle} onClick={() => nav('/reorden')}/>
        <KPI label="Por vencer (30 días)" value={kpis.vencProximos} color={kpis.vencProximos > 0 ? '#f59e0b' : '#22c55e'} icon={Clock} onClick={() => nav('/vencimientos')}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Entradas vs Salidas — Últimos 14 días</span>
            <div className="flex gap-3 text-[11px] text-[#5f6f80]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#00c896]"/>Entradas</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400"/>Salidas</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={movChart} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="dia" tick={{ fill: '#5f6f80', fontSize: 10 }} axisLine={false} tickLine={false} interval={1}/>
              <YAxis tick={{ fill: '#5f6f80', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}/>
              <Tooltip contentStyle={TT} formatter={v => formatCurrency(v, simboloMoneda)}/>
              <Line type="monotone" dataKey="Entradas" stroke="#00c896" strokeWidth={2} dot={false} activeDot={{ r: 4 }}/>
              <Line type="monotone" dataKey="Salidas" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">Valor por Categoría</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                </Pie>
                <Tooltip contentStyle={TT} formatter={v => formatCurrency(v, simboloMoneda)}/>
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-[#5f6f80] text-[12px] text-center py-8">Sin datos</p>}
        </div>
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12px] font-semibold text-[#e8edf2] flex items-center gap-1.5"><Boxes size={13} className="text-red-400"/> Stock crítico / agotado</div>
          <button onClick={() => nav('/reorden')} className="text-[11px] text-[#00c896] hover:underline">Ver Punto de Reorden →</button>
        </div>
        {productosCriticos.length === 0 ? (
          <div className="text-[12px] text-[#5f6f80] text-center py-6">Todo el stock está en orden. 🎉</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {productosCriticos.map(p => (
              <div key={p.id} className="flex items-center justify-between text-[12px] px-3 py-2 rounded-lg bg-[#1a2230]">
                <div className="min-w-0">
                  <div className="text-[#e8edf2] truncate">{p.nombre}</div>
                  <div className="text-[#5f6f80] font-mono">{p.sku}</div>
                </div>
                <span className="text-red-400 font-mono font-semibold shrink-0">{p.stockActual}/{p.stockMinimo}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
