import { useMemo } from 'react'
import {
  Package, AlertTriangle, ShoppingCart, Activity,
  ArrowDownToLine, ArrowUpFromLine, Truck, Users, MapPin,
  Clock, CheckCircle, DollarSign
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell
} from 'recharts'
import { useApp } from '../store/AppContext'
import { formatCurrency, estadoStock, formatDate } from '../utils/helpers'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/index'
import { useProductosList } from '../queries/productos.queries'
import { useInventarioList } from '../queries/inventario.queries'
import { useMovimientosList } from '../queries/movimientos.queries'
import { useOrdenesCompraList } from '../queries/ordenes-compra.queries'
import { useDespachosList } from '../queries/despachos.queries'
import { useClientesList } from '../queries/clientes.queries'
import { useRutasList } from '../queries/rutas.queries'
import { useCategoriasList } from '../queries/categorias.queries'
import { useAlmacenesList } from '../queries/almacenes.queries'

const TT = { background:'#1a2230', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, fontSize:12, color:'#e8edf2' }
const PIE_COLORS = ['#00c896','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899']

function KPI({ label, value, sub, color = '#00c896', icon: Icon, onClick, mono }) {
  return (
    <div onClick={onClick}
      className={`relative bg-[#161d28] border border-white/8 rounded-xl px-4 sm:px-5 py-4 overflow-hidden
        ${onClick ? 'cursor-pointer hover:border-white/16 transition-all' : ''}`}>
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
      <div className="absolute top-3 right-4 opacity-[0.06]">{Icon && <Icon size={44}/>}</div>
      <div className="text-[9px] sm:text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.08em] mb-2 flex items-center gap-1.5">
        {Icon && <Icon size={11} style={{ color, opacity:0.8 }}/>}{label}
      </div>
      <div className={`font-semibold text-[#e8edf2] leading-none ${mono ? 'font-mono text-[17px]' : 'text-[28px]'}`}>{value}</div>
      {sub && <div className="text-[10px] text-[#5f6f80] mt-1.5 leading-snug">{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { sesion } = useApp()
  const nav = useNavigate()
  const hoy = new Date().toISOString().split('T')[0]

  const { data: productosRaw  = [] } = useProductosList()
  const { data: inventarioRaw = [] } = useInventarioList()
  const { data: movimientos   = [] } = useMovimientosList()
  const { data: ordenes       = [] } = useOrdenesCompraList()
  const { data: despachos     = [] } = useDespachosList()
  const { data: clientes      = [] } = useClientesList()
  const { data: rutas         = [] } = useRutasList()
  const { data: categorias    = [] } = useCategoriasList()
  const { data: almacenes     = [] } = useAlmacenesList()

  const simboloMoneda       = 'S/'
  const formulaValorizacion = 'Precio Compra'

  // Enriquecer productos con stockActual (suma de inventario por producto)
  const productos = useMemo(() => {
    const stockMap = {}
    inventarioRaw.forEach(item => {
      stockMap[item.productoId] = (stockMap[item.productoId] || 0) + Number(item.cantidad || 0)
    })
    return productosRaw.map(p => ({
      ...p,
      activo:      p.estado === 'Activo',
      stockActual: stockMap[p.id] || 0,
      stockMinimo: Number(p.stockMinimo || 0),
    }))
  }, [productosRaw, inventarioRaw])

  const kpis = useMemo(() => {
    const activos     = productos.filter(p => p.activo)
    const valorTotal  = activos.reduce((s, p) => s + (Number(p.precioCompra || 0) * p.stockActual), 0)
    const criticos    = activos.filter(p => { const e = estadoStock(p.stockActual, p.stockMinimo); return e.estado === 'critico' || e.estado === 'agotado' }).length
    const movHoy      = movimientos.filter(m => m.fecha === hoy).length
    const entradasHoy = movimientos.filter(m => m.fecha === hoy && m.tipo === 'ENTRADA').reduce((s, m) => s + (m.costoTotal || 0), 0)
    const salidasHoy  = movimientos.filter(m => m.fecha === hoy && m.tipo === 'SALIDA').reduce((s, m) => s + (m.costoTotal || 0), 0)
    const ocPendientes = ordenes.filter(o => o.estado === 'PENDIENTE').length
    const ocAprobadas  = ordenes.filter(o => ['APROBADO','APROBADA'].includes(o.estado)).length
    const valorDespachos = despachos.filter(d => d.estado !== 'CANCELADO').reduce((s, d) => s + Number(d.total || 0), 0)
    return {
      totalProductos: activos.length, valorTotal, criticos,
      movHoy, entradasHoy, salidasHoy,
      ocPendientes, ocAprobadas, valorDespachos,
      totalClientes: clientes.filter(c => c.activo !== false).length,
    }
  }, [productos, movimientos, ordenes, despachos, clientes, hoy])

  const movChart = useMemo(() => {
    const dias = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      dias.push({
        dia:      d.toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit' }),
        Entradas: movimientos.filter(m => m.fecha === key && m.tipo === 'ENTRADA').reduce((s, m) => s + (m.costoTotal || 0), 0),
        Salidas:  movimientos.filter(m => m.fecha === key && m.tipo === 'SALIDA').reduce((s, m) => s + (m.costoTotal || 0), 0),
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

  const despChart = [
    { estado:'Pedido',     total: despachos.filter(d => d.estado === 'PEDIDO').length,     color:'#5f6f80' },
    { estado:'Aprobado',   total: despachos.filter(d => d.estado === 'APROBADO').length,   color:'#3b82f6' },
    { estado:'Picking',    total: despachos.filter(d => d.estado === 'PICKING').length,    color:'#f59e0b' },
    { estado:'Listo',      total: despachos.filter(d => d.estado === 'LISTO').length,      color:'#06b6d4' },
    { estado:'Despachado', total: despachos.filter(d => d.estado === 'DESPACHADO').length, color:'#8b5cf6' },
    { estado:'Entregado',  total: despachos.filter(d => d.estado === 'ENTREGADO').length,  color:'#22c55e' },
  ]

  const ultMovimientos = useMemo(() =>
    [...movimientos].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 6)
  , [movimientos])

  const ultDespachos = useMemo(() =>
    [...despachos].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5)
  , [despachos])

  const alertas = useMemo(() => {
    const lista = []
    productos.forEach(p => {
      const e = estadoStock(p.stockActual, p.stockMinimo)
      if (e.estado === 'agotado')    lista.push({ prioridad:1, tipo:'danger',  msg:`${p.nombre} — Sin stock`, path:'/inventario' })
      else if (e.estado === 'critico') lista.push({ prioridad:1, tipo:'warning', msg:`${p.nombre} — Crítico (${p.stockActual} ${p.unidadMedida || ''})`, path:'/inventario' })
    })
    ordenes.filter(o => o.estado === 'PENDIENTE').forEach(o =>
      lista.push({ prioridad:3, tipo:'info', msg:`OC ${o.numero} pendiente de aprobación`, path:'/ordenes' })
    )
    despachos.filter(d => d.estado === 'LISTO').forEach(d => {
      const cli = clientes.find(c => c.id === d.clienteId)?.razonSocial?.slice(0, 25) || '—'
      lista.push({ prioridad:2, tipo:'info', msg:`${d.numero} — Listo para despachar · ${cli}`, path:'/despachos' })
    })
    return lista.sort((a, b) => a.prioridad - b.prioridad).slice(0, 8)
  }, [productos, ordenes, despachos, clientes])

  const topMovidos = useMemo(() => {
    const ini30s = new Date(); ini30s.setDate(ini30s.getDate() - 30)
    const corte  = ini30s.toISOString().split('T')[0]
    const conteo = {}
    movimientos.filter(m => m.fecha >= corte && m.tipo === 'SALIDA').forEach(m => {
      conteo[m.productoId] = (conteo[m.productoId] || 0) + (m.costoTotal || 0)
    })
    return Object.entries(conteo)
      .map(([id, val]) => ({ prod: productos.find(p => p.id === id), val }))
      .filter(x => x.prod).sort((a, b) => b.val - a.val).slice(0, 5)
  }, [movimientos, productos])

  const estadoDesp = { PEDIDO:'neutral', APROBADO:'info', PICKING:'warning', LISTO:'teal', DESPACHADO:'info', ENTREGADO:'success', CANCELADO:'danger' }

  if (sesion?.rol?.codigo === 'almacenero') {
    return <DashboardAlmacenero productos={productos} despachos={despachos} kpis={kpis} nav={nav} simboloMoneda={simboloMoneda}/>
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-[#e8edf2]">
            {(() => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches' })()}{sesion?.nombre ? `, ${sesion.nombre.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">{new Date().toLocaleDateString('es-PE', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-[#5f6f80]">Empresa</div>
          <div className="text-[13px] font-semibold text-[#e8edf2]">{sesion?.nombre || 'StockPro'}</div>
        </div>
      </div>

      <div>
        <div className="text-[9.5px] font-bold text-[#3d4f60] uppercase tracking-[0.14em] mb-2.5">Inventario</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI label="Total productos"       value={kpis.totalProductos}                            color="#00c896" icon={Package}       onClick={() => nav('/inventario')}/>
          <KPI label="Valor del stock"       value={formatCurrency(kpis.valorTotal, simboloMoneda)} color="#3b82f6" icon={DollarSign}    mono sub={`Método: ${formulaValorizacion}`}/>
          <KPI label="Stock crítico/agotado" value={kpis.criticos} color={kpis.criticos > 0 ? '#ef4444' : '#22c55e'} icon={AlertTriangle} onClick={() => nav('/inventario')} sub={kpis.criticos > 0 ? 'Requiere reposición' : 'Todo en orden'}/>
          <KPI label="Clientes activos"      value={kpis.totalClientes}                             color="#f59e0b" icon={Users}         onClick={() => nav('/clientes')}/>
        </div>
      </div>

      <div>
        <div className="text-[9.5px] font-bold text-[#3d4f60] uppercase tracking-[0.14em] mb-2.5">Operaciones de Hoy</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI label="Movimientos hoy" value={kpis.movHoy}                                      color="#00c896" icon={Activity}       sub="Entradas + Salidas + Ajustes"/>
          <KPI label="Entradas hoy"    value={formatCurrency(kpis.entradasHoy, simboloMoneda)}  color="#22c55e" icon={ArrowDownToLine} mono sub="Valor ingresado"/>
          <KPI label="Salidas hoy"     value={formatCurrency(kpis.salidasHoy, simboloMoneda)}   color="#ef4444" icon={ArrowUpFromLine} mono sub="Valor despachado"/>
          <KPI label="OC pendientes"   value={kpis.ocPendientes + kpis.ocAprobadas}             color="#f59e0b" icon={ShoppingCart}   onClick={() => nav('/ordenes')} sub={`${kpis.ocPendientes} por aprobar · ${kpis.ocAprobadas} aprobadas`}/>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Entradas vs Salidas — Últimos 14 días</span>
            <div className="flex gap-3 text-[11px] text-[#5f6f80]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#00c896]"/>Entradas</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400"/>Salidas</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={movChart} margin={{ left:-10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="dia" tick={{ fill:'#5f6f80', fontSize:10 }} axisLine={false} tickLine={false} interval={1}/>
              <YAxis tick={{ fill:'#5f6f80', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}/>
              <Tooltip contentStyle={TT} formatter={v => formatCurrency(v, simboloMoneda)}/>
              <Line type="monotone" dataKey="Entradas" stroke="#00c896" strokeWidth={2} dot={false} activeDot={{ r:4 }}/>
              <Line type="monotone" dataKey="Salidas"  stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r:4 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">Valor por Categoría</div>
          {pieData.length > 0 ? (
            <div className="flex flex-col">
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={TT} formatter={v => formatCurrency(v, simboloMoneda)}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1 mt-1">
                {pieData.slice(0, 5).map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                    <span className="text-[#9ba8b6] flex-1 truncate">{d.name}</span>
                    <span className="text-[#e8edf2] font-medium font-mono">{formatCurrency(d.value, simboloMoneda)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-[#5f6f80] text-[12px] text-center py-8">Sin datos</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Pipeline de Despachos</span>
            <button onClick={() => nav('/despachos')} className="text-[11px] text-[#9ba8b6] hover:text-[#e8edf2] transition-colors">Ver todos →</button>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={despChart} layout="vertical" margin={{ left:0, right:10 }}>
              <XAxis type="number" tick={{ fill:'#5f6f80', fontSize:10 }} axisLine={false} tickLine={false} allowDecimals={false}/>
              <YAxis type="category" dataKey="estado" tick={{ fill:'#9ba8b6', fontSize:11 }} axisLine={false} tickLine={false} width={72}/>
              <Tooltip contentStyle={TT} cursor={{ fill:'rgba(255,255,255,0.03)' }}/>
              <Bar dataKey="total" radius={[0,4,4,0]} name="Despachos">
                {despChart.map((d, i) => <Cell key={i} fill={d.color}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 pt-3 border-t border-white/6 flex items-center justify-between text-[12px]">
            <span className="text-[#5f6f80]">Valor total despachado</span>
            <span className="font-semibold text-[#00c896] font-mono">{formatCurrency(kpis.valorDespachos, simboloMoneda)}</span>
          </div>
        </div>
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">Top 5 Productos — Salidas últimos 30 días</div>
          {topMovidos.length === 0
            ? <p className="text-[12px] text-[#5f6f80] py-6 text-center">Sin salidas en los últimos 30 días</p>
            : (
              <div className="flex flex-col gap-2.5">
                {topMovidos.map(({ prod, val }, i) => {
                  const pct = topMovidos[0]?.val > 0 ? (val / topMovidos[0].val) * 100 : 0
                  return (
                    <div key={prod.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#00c896]/10 text-[#00c896] text-[10px] font-bold flex items-center justify-center shrink-0">{i+1}</span>
                          <span className="text-[12px] font-medium text-[#e8edf2]">{prod.nombre.slice(0, 28)}</span>
                          <span className="text-[10px] text-[#5f6f80]">{prod.sku}</span>
                        </div>
                        <span className="text-[12px] font-semibold text-[#00c896] font-mono shrink-0">{formatCurrency(val, simboloMoneda)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#0e1117] rounded-full overflow-hidden">
                        <div className="h-full bg-[#00c896] rounded-full" style={{ width:`${pct}%` }}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Últimos Despachos</span>
            <button onClick={() => nav('/despachos')} className="text-[11px] text-[#9ba8b6] hover:text-[#e8edf2] transition-colors">Ver todos →</button>
          </div>
          <div className="flex flex-col divide-y divide-white/5">
            {ultDespachos.length === 0
              ? <p className="text-[12px] text-[#5f6f80] py-6 text-center">Sin despachos registrados</p>
              : ultDespachos.map(d => {
                const cli = clientes.find(c => c.id === d.clienteId)?.razonSocial?.slice(0, 26) || '—'
                return (
                  <div key={d.id} className="flex items-center gap-3 py-2.5 hover:bg-white/2 px-1 rounded-lg cursor-pointer transition-colors" onClick={() => nav('/despachos')}>
                    <div className="w-8 h-8 rounded-lg bg-[#1a2230] flex items-center justify-center shrink-0"><Truck size={14} className="text-[#5f6f80]"/></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-[#00c896]">{d.numero}</span>
                        <Badge variant={estadoDesp[d.estado] || 'neutral'} className="text-[9px]">{d.estado}</Badge>
                      </div>
                      <div className="text-[11px] text-[#5f6f80] truncate">{cli}</div>
                    </div>
                    <span className="text-[12px] font-semibold text-[#e8edf2] font-mono shrink-0">{formatCurrency(d.total, simboloMoneda)}</span>
                  </div>
                )
              })
            }
          </div>
        </div>

        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Alertas Activas</span>
            {alertas.length > 0 && <span className="text-[10px] font-bold bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full">{alertas.length}</span>}
          </div>
          {alertas.length === 0
            ? (
              <div className="flex flex-col items-center py-6 gap-2">
                <CheckCircle size={28} className="text-green-400 opacity-50"/>
                <p className="text-[12px] text-[#22c55e] font-medium">Sin alertas pendientes</p>
                <p className="text-[11px] text-[#5f6f80]">Todo el inventario está en orden</p>
              </div>
            )
            : (
              <div className="flex flex-col gap-1.5">
                {alertas.map((a, i) => (
                  <div key={i} onClick={() => nav(a.path)}
                    className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      a.tipo === 'danger'  ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/35' :
                      a.tipo === 'warning' ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/35' :
                      'bg-blue-500/5 border-blue-500/15 hover:border-blue-500/30'
                    }`}>
                    <AlertTriangle size={12} className={`shrink-0 mt-0.5 ${a.tipo === 'danger' ? 'text-red-400' : a.tipo === 'warning' ? 'text-amber-400' : 'text-blue-400'}`}/>
                    <span className="text-[12px] text-[#9ba8b6] leading-snug">{a.msg}</span>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Últimos Movimientos de Inventario</span>
          <button onClick={() => nav('/movimientos')} className="text-[11px] text-[#9ba8b6] hover:text-[#e8edf2] transition-colors">Ver todos →</button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {['Fecha','Tipo','Producto','Cantidad','Costo Total','Motivo'].map(h => (
                <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/8 whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {ultMovimientos.length === 0 && (
                <tr><td colSpan={6} className="text-center text-[#5f6f80] py-8 text-[12px]">Sin movimientos registrados</td></tr>
              )}
              {ultMovimientos.map(m => {
                const prod = productos.find(p => p.id === m.productoId)
                const ct = m.tipo === 'ENTRADA' ? 'text-green-400' : m.tipo === 'SALIDA' ? 'text-red-400' : 'text-[#9ba8b6]'
                const bt = m.tipo === 'ENTRADA' ? 'bg-green-500/10' : m.tipo === 'SALIDA' ? 'bg-red-500/10' : 'bg-white/5'
                return (
                  <tr key={m.id} className="border-b border-white/6 last:border-0 hover:bg-white/2 transition-colors">
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6] whitespace-nowrap">{formatDate(m.fecha)}</td>
                    <td className="px-3.5 py-2.5"><span className={`text-[10px] font-bold px-2 py-1 rounded-full ${bt} ${ct}`}>{m.tipo === 'ENTRADA' ? '↓' : m.tipo === 'SALIDA' ? '↑' : '⚡'} {m.tipo}</span></td>
                    <td className="px-3.5 py-2.5"><div className="font-medium text-[#e8edf2]">{prod?.nombre || '—'}</div><div className="text-[11px] text-[#5f6f80]">{prod?.sku}</div></td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px]"><span className={ct}>{m.tipo === 'ENTRADA' ? '+' : '-'}{m.cantidad}</span><span className="text-[#5f6f80] ml-1 text-[11px]">{prod?.unidadMedida}</span></td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] font-semibold text-[#e8edf2]">{formatCurrency(m.costoTotal, simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6] max-w-[200px] truncate">{m.motivo}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function DashboardAlmacenero({ productos, despachos, kpis, nav, simboloMoneda }) {
  const criticos        = productos.filter(p => { const e = estadoStock(p.stockActual, p.stockMinimo); return (e.estado === 'critico' || e.estado === 'agotado') && p.activo })
  const pendientePicking = despachos.filter(d => ['PICKING','LISTO'].includes(d.estado))
  const paraDespachar   = despachos.filter(d => d.estado === 'LISTO')
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-[#e8edf2]">Panel de Almacén 📦</h1>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Vista operativa — {new Date().toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long' })}</p>
        </div>
        <div className="text-[11px] px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-semibold">Rol: Almacenero</div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label:'En picking',      val:pendientePicking.length, color:'#f59e0b', nav:'/despachos' },
          { label:'Para despachar',  val:paraDespachar.length,   color:'#00c896', nav:'/despachos' },
          { label:'Stock crítico',   val:criticos.length,         color:'#ef4444', nav:'/inventario' },
          { label:'Total productos', val:kpis.totalProductos,     color:'#3b82f6', nav:'/inventario' },
        ].map(({ label, val, color, nav: to }) => (
          <div key={label} onClick={() => nav(to)} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden cursor-pointer hover:border-white/14 transition-all">
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
  )
}
