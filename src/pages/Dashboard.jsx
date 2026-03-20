import { useMemo } from 'react'
import {
  Package, TrendingUp, AlertTriangle, ShoppingCart, Activity,
  ArrowDownToLine, ArrowUpFromLine, Truck, Users, MapPin,
  Clock, CheckCircle, XCircle, RotateCcw, ArrowRightLeft,
  FileText, DollarSign, Navigation, Eye
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts'
import { useApp } from '../store/AppContext'
import { formatCurrency, estadoStock, formatDate, diasParaVencer } from '../utils/helpers'
import { valorarStock } from '../utils/valorizacion'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/index'

const TT = { background:'#1a2230', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, fontSize:12, color:'#e8edf2' }
const PIE_COLORS = ['#00c896','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899']

// KPI card reutilizable
function KPI({ label, value, sub, color = '#00c896', icon: Icon, onClick, mono }) {
  return (
    <div onClick={onClick}
      className={`relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden
        ${onClick ? 'cursor-pointer hover:border-white/[0.16] transition-all' : ''}`}>
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
      <div className="absolute top-3 right-4 opacity-[0.06]">
        {Icon && <Icon size={44}/>}
      </div>
      <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.08em] mb-2 flex items-center gap-1.5">
        {Icon && <Icon size={11} style={{ color, opacity:0.8 }}/>}
        {label}
      </div>
      <div className={`text-[22px] font-bold text-[#e8edf2] leading-none ${mono ? 'font-mono text-[16px]' : ''}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-[#5f6f80] mt-1.5 leading-snug">{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const {
    productos, movimientos, ordenes, config, categorias, almacenes,
    formulaValorizacion, simboloMoneda, ajustes, devoluciones,
    transferencias, despachos, clientes, rutas, sesion,
  } = useApp()
  const nav = useNavigate()
  const hoy = new Date().toISOString().split('T')[0]

  // ── KPIs principales ──────────────────────────────────
  const kpis = useMemo(() => {
    const activos      = productos.filter(p => p.activo !== false)
    const valorTotal   = activos.reduce((s,p) => s + valorarStock(p.batches||[], formulaValorizacion), 0)
    const criticos     = activos.filter(p => { const e=estadoStock(p.stockActual,p.stockMinimo); return e.estado==='critico'||e.estado==='agotado' }).length
    const proxVencer   = activos.filter(p => { if(!p.tieneVencimiento||!p.fechaVencimiento) return false; const d=diasParaVencer(p.fechaVencimiento); return d!==null&&d>=0&&d<=(config?.diasAlertaVencimiento||30) }).length
    const movHoy       = movimientos.filter(m => m.fecha===hoy).length
    const entradasHoy  = movimientos.filter(m => m.fecha===hoy && m.tipo==='ENTRADA').reduce((s,m)=>s+(m.costoTotal||0),0)
    const salidasHoy   = movimientos.filter(m => m.fecha===hoy && m.tipo==='SALIDA').reduce((s,m)=>s+(m.costoTotal||0),0)
    const ocPendientes = ordenes.filter(o => o.estado==='PENDIENTE').length
    const ocAprobadas  = ordenes.filter(o => o.estado==='APROBADA').length
    // Despachos
    const despPedidos  = despachos.filter(d => d.estado==='PEDIDO').length
    const despEnProceso= despachos.filter(d => ['APROBADO','PICKING','LISTO'].includes(d.estado)).length
    const despDespachados = despachos.filter(d => d.estado==='DESPACHADO').length
    const despEntregados  = despachos.filter(d => d.estado==='ENTREGADO').length
    const valorDespachos  = despachos.filter(d => d.estado!=='ANULADO').reduce((s,d)=>s+(d.total||0),0)
    // Rutas
    const rutasActivas = rutas.filter(r => r.estado==='EN_RUTA').length
    const rutasProg    = rutas.filter(r => r.estado==='PROGRAMADA').length

    return {
      totalProductos: activos.length, valorTotal, criticos, proxVencer,
      movHoy, entradasHoy, salidasHoy,
      ocPendientes, ocAprobadas,
      despPedidos, despEnProceso, despDespachados, despEntregados, valorDespachos,
      rutasActivas, rutasProg,
      totalClientes: clientes.filter(c=>c.activo).length,
    }
  }, [productos, movimientos, ordenes, despachos, rutas, clientes, formulaValorizacion, config, hoy])

  // ── Movimientos últimos 14 días (línea) ──────────────
  const movChart = useMemo(() => {
    const dias = []
    for (let i=13; i>=0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i)
      const key = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit'})
      dias.push({
        dia:      label,
        Entradas: movimientos.filter(m=>m.fecha===key&&m.tipo==='ENTRADA').reduce((s,m)=>s+(m.costoTotal||0),0),
        Salidas:  movimientos.filter(m=>m.fecha===key&&m.tipo==='SALIDA').reduce((s,m)=>s+(m.costoTotal||0),0),
      })
    }
    return dias
  }, [movimientos])

  // ── Valor por categoría (pie) ────────────────────────
  const pieData = useMemo(() => {
    const map = {}
    productos.forEach(p => {
      const n = categorias.find(c=>c.id===p.categoriaId)?.nombre || 'Sin categoría'
      map[n] = (map[n]||0) + valorarStock(p.batches||[], formulaValorizacion)
    })
    return Object.entries(map).map(([name,value])=>({name,value:Math.round(value)}))
      .filter(d=>d.value>0).sort((a,b)=>b.value-a.value).slice(0,7)
  }, [productos, categorias, formulaValorizacion])

  // ── Despachos por estado (barras) ────────────────────
  const despChart = [
    { estado:'Pedido',      total: despachos.filter(d=>d.estado==='PEDIDO').length,      color:'#5f6f80' },
    { estado:'Aprobado',    total: despachos.filter(d=>d.estado==='APROBADO').length,     color:'#3b82f6' },
    { estado:'Picking',     total: despachos.filter(d=>d.estado==='PICKING').length,      color:'#f59e0b' },
    { estado:'Listo',       total: despachos.filter(d=>d.estado==='LISTO').length,        color:'#06b6d4' },
    { estado:'Despachado',  total: despachos.filter(d=>d.estado==='DESPACHADO').length,   color:'#8b5cf6' },
    { estado:'Entregado',   total: despachos.filter(d=>d.estado==='ENTREGADO').length,    color:'#22c55e' },
  ]

  // ── Últimos movimientos (recientes primero) ───────────
  const ultMovimientos = useMemo(() =>
    [...movimientos].sort((a,b)=>b.createdAt?.localeCompare(a.createdAt||'')).slice(0,6)
  , [movimientos])

  // ── Últimos despachos ─────────────────────────────────
  const ultDespachos = useMemo(() =>
    [...despachos].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,5)
  , [despachos])

  // ── Alertas activas ───────────────────────────────────
  const alertas = useMemo(() => {
    const lista = []
    productos.forEach(p => {
      const e = estadoStock(p.stockActual, p.stockMinimo)
      if (e.estado==='agotado')  lista.push({ prioridad:1, tipo:'danger',  msg:`${p.nombre} — Sin stock`, path:'/inventario' })
      else if (e.estado==='critico') lista.push({ prioridad:1, tipo:'warning', msg:`${p.nombre} — Crítico (${p.stockActual} ${p.unidadMedida})`, path:'/inventario' })
      if (p.tieneVencimiento && p.fechaVencimiento) {
        const d = diasParaVencer(p.fechaVencimiento)
        if (d!==null && d<0)   lista.push({ prioridad:1, tipo:'danger',  msg:`${p.nombre} — VENCIDO`, path:'/vencimientos' })
        else if (d!==null && d<=15) lista.push({ prioridad:2, tipo:'warning', msg:`${p.nombre} — Vence en ${d} días`, path:'/vencimientos' })
      }
    })
    ordenes.filter(o=>o.estado==='PENDIENTE').forEach(o =>
      lista.push({ prioridad:3, tipo:'info', msg:`OC ${o.numero} pendiente de aprobación`, path:'/ordenes' })
    )
    despachos.filter(d=>d.estado==='LISTO').forEach(d => {
      const cli = clientes.find(c=>c.id===d.clienteId)?.razonSocial?.slice(0,25)||'—'
      lista.push({ prioridad:2, tipo:'info', msg:`${d.numero} — Listo para despachar · ${cli}`, path:'/despachos' })
    })
    return lista.sort((a,b)=>a.prioridad-b.prioridad).slice(0,8)
  }, [productos, ordenes, despachos, clientes])

  // ── Top 5 productos más movidos ───────────────────────
  const topMovidos = useMemo(() => {
    const ini30 = new Date(); ini30.setDate(ini30.getDate()-30)
    const ini30s = ini30.toISOString().split('T')[0]
    const conteo = {}
    movimientos.filter(m=>m.fecha>=ini30s&&m.tipo==='SALIDA').forEach(m => {
      conteo[m.productoId] = (conteo[m.productoId]||0) + (m.costoTotal||0)
    })
    return Object.entries(conteo)
      .map(([id,val]) => ({ prod:productos.find(p=>p.id===id), val }))
      .filter(x=>x.prod)
      .sort((a,b)=>b.val-a.val)
      .slice(0,5)
  }, [movimientos, productos])

  const estadoDesp = {
    PEDIDO:'neutral', APROBADO:'info', PICKING:'warning',
    LISTO:'teal', DESPACHADO:'info', ENTREGADO:'success', ANULADO:'danger',
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* Saludo */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-[#e8edf2]">
            Buenos días{sesion?.nombre ? `, ${sesion.nombre.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">
            {new Date().toLocaleDateString('es-PE',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-[#5f6f80]">Empresa</div>
          <div className="text-[13px] font-semibold text-[#e8edf2]">{config?.empresa || 'StockPro'}</div>
        </div>
      </div>

      {/* ── FILA 1 · KPIs Inventario ──────────────────── */}
      <div>
        <div className="text-[9.5px] font-bold text-[#3d4f60] uppercase tracking-[0.14em] mb-2.5">Inventario</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI label="Total productos"    value={kpis.totalProductos}                       color="#00c896" icon={Package}       onClick={()=>nav('/inventario')}/>
          <KPI label="Valor del stock"    value={formatCurrency(kpis.valorTotal,simboloMoneda)} color="#3b82f6" icon={DollarSign} mono sub={`Método: ${formulaValorizacion}`}/>
          <KPI label="Stock crítico/agotado" value={kpis.criticos} color={kpis.criticos>0?'#ef4444':'#22c55e'} icon={AlertTriangle} onClick={()=>nav('/inventario')} sub={kpis.criticos>0?'Requiere reposición':'Todo en orden'}/>
          <KPI label="Próximos a vencer"  value={kpis.proxVencer} color={kpis.proxVencer>0?'#f59e0b':'#22c55e'} icon={Clock} onClick={()=>nav('/vencimientos')} sub={`En ${config?.diasAlertaVencimiento||30} días`}/>
        </div>
      </div>

      {/* ── FILA 2 · KPIs Operaciones hoy ────────────── */}
      <div>
        <div className="text-[9.5px] font-bold text-[#3d4f60] uppercase tracking-[0.14em] mb-2.5">Operaciones de Hoy</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI label="Movimientos hoy"   value={kpis.movHoy}                                color="#00c896"  icon={Activity}        sub="Entradas + Salidas + Ajustes"/>
          <KPI label="Entradas hoy"      value={formatCurrency(kpis.entradasHoy,simboloMoneda)} color="#22c55e" icon={ArrowDownToLine} mono sub="Valor ingresado"/>
          <KPI label="Salidas hoy"       value={formatCurrency(kpis.salidasHoy,simboloMoneda)}  color="#ef4444" icon={ArrowUpFromLine} mono sub="Valor despachado"/>
          <KPI label="OC pendientes"     value={kpis.ocPendientes + kpis.ocAprobadas}       color="#f59e0b"  icon={ShoppingCart}    onClick={()=>nav('/ordenes')} sub={`${kpis.ocPendientes} por aprobar · ${kpis.ocAprobadas} aprobadas`}/>
        </div>
      </div>



      {/* ── FILA 4 · Gráficos ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Movimientos 14 días (línea) */}
        <div className="lg:col-span-2 bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
              Entradas vs Salidas — Últimos 14 días
            </span>
            <div className="flex gap-3 text-[11px] text-[#5f6f80]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#00c896]"/>Entradas</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400"/>Salidas</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={movChart} margin={{left:-10}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="dia" tick={{fill:'#5f6f80',fontSize:10}} axisLine={false} tickLine={false} interval={1}/>
              <YAxis tick={{fill:'#5f6f80',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(1)}k`:v}/>
              <Tooltip contentStyle={TT} formatter={v=>formatCurrency(v,simboloMoneda)}/>
              <Line type="monotone" dataKey="Entradas" stroke="#00c896" strokeWidth={2} dot={false} activeDot={{r:4}}/>
              <Line type="monotone" dataKey="Salidas"  stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{r:4}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Valor por categoría */}
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">Valor por Categoría</div>
          {pieData.length > 0 ? (
            <div className="flex flex-col gap-0">
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={2}>
                    {pieData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={TT} formatter={v=>formatCurrency(v,simboloMoneda)}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1 mt-1">
                {pieData.slice(0,5).map((d,i)=>(
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                    <span className="text-[#9ba8b6] flex-1 truncate">{d.name}</span>
                    <span className="text-[#e8edf2] font-medium font-mono">{formatCurrency(d.value,simboloMoneda)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-[#5f6f80] text-[12px] text-center py-8">Sin datos</p>}
        </div>
      </div>

      {/* ── FILA 5 · Despachos por estado + Top productos ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Pipeline de despachos */}
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Pipeline de Despachos</span>
            <button onClick={()=>nav('/despachos')} className="text-[11px] text-[#9ba8b6] hover:text-[#e8edf2] transition-colors">Ver todos →</button>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={despChart} layout="vertical" margin={{left:0,right:10}}>
              <XAxis type="number" tick={{fill:'#5f6f80',fontSize:10}} axisLine={false} tickLine={false} allowDecimals={false}/>
              <YAxis type="category" dataKey="estado" tick={{fill:'#9ba8b6',fontSize:11}} axisLine={false} tickLine={false} width={72}/>
              <Tooltip contentStyle={TT} cursor={{fill:'rgba(255,255,255,0.03)'}}/>
              <Bar dataKey="total" radius={[0,4,4,0]} name="Despachos">
                {despChart.map((d,i)=><Cell key={i} fill={d.color}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[12px]">
            <span className="text-[#5f6f80]">Valor total despachado</span>
            <span className="font-semibold text-[#00c896] font-mono">{formatCurrency(kpis.valorDespachos,simboloMoneda)}</span>
          </div>
        </div>

        {/* Top 5 productos más movidos (últimos 30 días) */}
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
            Top 5 Productos — Salidas últimos 30 días
          </div>
          {topMovidos.length === 0 ? (
            <p className="text-[12px] text-[#5f6f80] py-6 text-center">Sin salidas en los últimos 30 días</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {topMovidos.map(({prod,val},i)=>{
                const pct = topMovidos[0]?.val > 0 ? (val/topMovidos[0].val)*100 : 0
                return (
                  <div key={prod.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#00c896]/10 text-[#00c896] text-[10px] font-bold flex items-center justify-center shrink-0">{i+1}</span>
                        <div>
                          <span className="text-[12px] font-medium text-[#e8edf2]">{prod.nombre.slice(0,28)}</span>
                          <span className="text-[10px] text-[#5f6f80] ml-1.5">{prod.sku}</span>
                        </div>
                      </div>
                      <span className="text-[12px] font-semibold text-[#00c896] font-mono shrink-0">{formatCurrency(val,simboloMoneda)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#0e1117] rounded-full overflow-hidden">
                      <div className="h-full bg-[#00c896] rounded-full transition-all" style={{width:`${pct}%`}}/>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── FILA 6 · Últimos despachos + Alertas ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Últimos despachos */}
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Últimos Despachos</span>
            <button onClick={()=>nav('/despachos')} className="text-[11px] text-[#9ba8b6] hover:text-[#e8edf2] transition-colors">Ver todos →</button>
          </div>
          <div className="flex flex-col divide-y divide-white/[0.05]">
            {ultDespachos.length === 0 ? (
              <p className="text-[12px] text-[#5f6f80] py-6 text-center">Sin despachos registrados</p>
            ) : ultDespachos.map(d=>{
              const cli = clientes.find(c=>c.id===d.clienteId)?.razonSocial?.slice(0,26)||'—'
              return (
                <div key={d.id} className="flex items-center gap-3 py-2.5 hover:bg-white/[0.02] px-1 rounded-lg cursor-pointer transition-colors" onClick={()=>nav('/despachos')}>
                  <div className="w-8 h-8 rounded-lg bg-[#1a2230] flex items-center justify-center shrink-0">
                    <Truck size={14} className="text-[#5f6f80]"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-[#00c896]">{d.numero}</span>
                      <Badge variant={estadoDesp[d.estado]||'neutral'} className="text-[9px]">{d.estado}</Badge>
                    </div>
                    <div className="text-[11px] text-[#5f6f80] truncate">{cli}</div>
                  </div>
                  <span className="text-[12px] font-semibold text-[#e8edf2] font-mono shrink-0">{formatCurrency(d.total,simboloMoneda)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Alertas activas */}
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Alertas Activas</span>
            {alertas.length > 0 && (
              <span className="text-[10px] font-bold bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full">{alertas.length}</span>
            )}
          </div>
          {alertas.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-2">
              <CheckCircle size={28} className="text-green-400 opacity-50"/>
              <p className="text-[12px] text-[#22c55e] font-medium">Sin alertas pendientes</p>
              <p className="text-[11px] text-[#5f6f80]">Todo el inventario está en orden</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {alertas.map((a,i) => (
                <div key={i} onClick={()=>nav(a.path)}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    a.tipo==='danger'  ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/35' :
                    a.tipo==='warning' ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/35' :
                    'bg-blue-500/5 border-blue-500/15 hover:border-blue-500/30'
                  }`}>
                  <AlertTriangle size={12} className={`shrink-0 mt-0.5 ${a.tipo==='danger'?'text-red-400':a.tipo==='warning'?'text-amber-400':'text-blue-400'}`}/>
                  <span className="text-[12px] text-[#9ba8b6] leading-snug">{a.msg}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── FILA 7 · Volumen Despachos + Últimas Órdenes ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Widget 1 — Volumen de Despachos: eficiencia + devoluciones */}
        <WidgetVolumenDespachos
          despachos={despachos} devoluciones={devoluciones}
          rutas={rutas} simboloMoneda={simboloMoneda}
          onVerDetalle={()=>nav('/despachos')}
        />

        {/* Widget 2 — Últimas órdenes de despacho */}
        <WidgetUltimasOrdenes
          despachos={despachos} clientes={clientes} rutas={rutas}
          almacenes={almacenes} onVerTodas={()=>nav('/despachos')}
        />
      </div>

      {/* ── FILA 8 · Últimos movimientos ─────────────────── */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Últimos Movimientos de Inventario</span>
          <button onClick={()=>nav('/movimientos')} className="text-[11px] text-[#9ba8b6] hover:text-[#e8edf2] transition-colors">Ver todos →</button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {['Fecha','Tipo','Producto','Cantidad','Costo Total','Motivo'].map(h=>(
                <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/[0.08] whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {ultMovimientos.length === 0 && (
                <tr><td colSpan={6} className="text-center text-[#5f6f80] py-8 text-[12px]">Sin movimientos registrados</td></tr>
              )}
              {ultMovimientos.map(m=>{
                const prod = productos.find(p=>p.id===m.productoId)
                const colorTipo = m.tipo==='ENTRADA'?'text-green-400':m.tipo==='SALIDA'?'text-red-400':'text-[#9ba8b6]'
                const bgTipo    = m.tipo==='ENTRADA'?'bg-green-500/10':m.tipo==='SALIDA'?'bg-red-500/10':'bg-white/5'
                return (
                  <tr key={m.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6] whitespace-nowrap">{formatDate(m.fecha)}</td>
                    <td className="px-3.5 py-2.5">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${bgTipo} ${colorTipo}`}>
                        {m.tipo==='ENTRADA'?'↓':m.tipo==='SALIDA'?'↑':'⚡'} {m.tipo}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-medium text-[#e8edf2]">{prod?.nombre||'—'}</div>
                      <div className="text-[11px] text-[#5f6f80]">{prod?.sku}</div>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px]">
                      <span className={colorTipo}>{m.tipo==='ENTRADA'?'+':'-'}{m.cantidad}</span>
                      <span className="text-[#5f6f80] ml-1 text-[11px]">{prod?.unidadMedida}</span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] font-semibold text-[#e8edf2]">{formatCurrency(m.costoTotal,simboloMoneda)}</td>
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

// ════════════════════════════════════════════════════════
// WIDGET: Volumen de Despachos — Últimos 30 días
// ════════════════════════════════════════════════════════
function WidgetVolumenDespachos({ despachos, devoluciones, rutas, simboloMoneda, onVerDetalle }) {

  // Helper: fecha local de un despacho (YYYY-MM-DD)
  function getFecha(d) {
    if (d.fecha) return d.fecha
    if (d.createdAt) return d.createdAt.substring(0, 10)
    return ''
  }

  // Helper: fecha local de hoy como string YYYY-MM-DD (sin problemas de zona horaria)
  function hoyStr() {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`
  }

  // Helper: restar N días a una fecha YYYY-MM-DD
  function restarDias(fechaStr, dias) {
    const d = new Date(fechaStr + 'T12:00:00')
    d.setDate(d.getDate() - dias)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  // ── Bloques por mes (6 meses hacia atrás) ──────────
  const { bloques, ini30s } = useMemo(() => {
    const hoy   = new Date()
    const bloques = []

    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      const desdeStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`
      // último día del mes
      const fin = new Date(d.getFullYear(), d.getMonth()+1, 0)
      const hastaStr = `${fin.getFullYear()}-${String(fin.getMonth()+1).padStart(2,'0')}-${String(fin.getDate()).padStart(2,'0')}`
      const esFinal  = i === 0
      const label    = d.toLocaleDateString('es-PE', { month:'short' }).toUpperCase()

      const desMes = despachos.filter(dd => {
        const f = getFecha(dd)
        return f >= desdeStr && f <= hastaStr
      })
      const entregados = desMes.filter(dd => dd.estado === 'ENTREGADO').length
      bloques.push({ label, desdeStr, hastaStr, total: desMes.length, entregados, esFinal })
    }

    // ini30s = inicio del mes más antiguo para KPIs
    const inicio = bloques[0]?.desdeStr || hoyStr()
    return { bloques, ini30s: inicio }
  }, [despachos])

  // ── KPIs globales 30 días ─────────────────────────────
  const stats = useMemo(() => {
    // Todos los despachos en los últimos 30 días (cualquier estado)
    const des30 = despachos.filter(d => getFecha(d) >= ini30s)
    const total       = des30.length
    const entregados  = des30.filter(d => d.estado === 'ENTREGADO').length
    const despachados = des30.filter(d => ['DESPACHADO','ENTREGADO'].includes(d.estado)).length

    // Eficiencia — paradas de rutas del período (más preciso)
    const paradasPeriodo    = rutas
      .filter(r => (r.fechaSalida || '') >= ini30s)
      .flatMap(r => r.paradas || [])
    const totalParadas      = paradasPeriodo.length
    const paradasEntregadas = paradasPeriodo.filter(p => p.estado === 'ENTREGADO').length

    const eficiencia = totalParadas > 0
      ? ((paradasEntregadas / totalParadas) * 100).toFixed(1)
      : total > 0
        ? ((entregados / total) * 100).toFixed(1)
        : null

    // Devoluciones cliente del período
    const devs30  = (devoluciones || []).filter(dv => {
      const f = dv.fecha || (dv.createdAt || '').substring(0, 10)
      return f >= ini30s && dv.tipo === 'CLIENTE'
    }).length
    const base    = despachados + devs30
    const pctDevs = base > 0 ? ((devs30 / base) * 100).toFixed(1) : '0.0'

    const maxBloq = Math.max(...bloques.map(b => b.total), 1)

    return { total, entregados, despachados, eficiencia, devs30, pctDevs, maxBloq, totalParadas }
  }, [despachos, devoluciones, rutas, ini30s, bloques])

  const efNum   = parseFloat(stats.eficiencia)
  const efColor = stats.eficiencia === null ? '#5f6f80'
    : efNum >= 90 ? '#00c896' : efNum >= 70 ? '#f59e0b' : '#ef4444'
  const devNum  = parseFloat(stats.pctDevs)
  const devColor = devNum > 5 ? '#ef4444' : devNum > 2 ? '#f59e0b' : '#9ba8b6'

  return (
    <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5 flex flex-col gap-4">

      {/* Cabecera */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[14px] font-bold text-[#e8edf2]">Volumen de Despachos</div>
          <div className="text-[11px] text-[#5f6f80] mt-0.5">Últimos 6 meses</div>
        </div>
        <button onClick={onVerDetalle}
          className="text-[11px] text-[#00c896] hover:text-[#00e0aa] transition-colors whitespace-nowrap">
          Ver detalle →
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-0 divide-x divide-white/[0.07]">
        <div className="pr-4">
          <div className="text-[9.5px] font-semibold text-[#5f6f80] uppercase tracking-[0.08em] mb-1.5">Total</div>
          <div className="text-[26px] font-black text-[#e8edf2] leading-none font-mono">{stats.total}</div>
          <div className="text-[10px] text-[#5f6f80] mt-1">{stats.despachados} despachados</div>
        </div>
        <div className="px-4">
          <div className="text-[9.5px] font-semibold text-[#5f6f80] uppercase tracking-[0.08em] mb-1.5">Eficiencia</div>
          <div className="text-[26px] font-black leading-none" style={{ color: efColor }}>
            {stats.eficiencia !== null ? `${stats.eficiencia}%` : '—'}
          </div>
          <div className="text-[10px] text-[#5f6f80] mt-1">
            {stats.totalParadas > 0 ? `${stats.totalParadas} paradas eval.` : `${stats.entregados} entregados`}
          </div>
        </div>
        <div className="pl-4">
          <div className="text-[9.5px] font-semibold text-[#5f6f80] uppercase tracking-[0.08em] mb-1.5">Devoluciones</div>
          <div className="text-[26px] font-black leading-none" style={{ color: devColor }}>{stats.devs30}</div>
          <div className="text-[10px] mt-1" style={{ color: devColor }}>{stats.pctDevs}% del total</div>
        </div>
      </div>

      {/* Barras por bloque */}
      <div>
        <div className="text-[9.5px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          Actividad por bloque (5 días)
        </div>
        <div className="flex items-end gap-2" style={{ height: 80 }}>
          {bloques.map((b, i) => {
            const pct      = b.total / stats.maxBloq
            const efB      = b.total > 0 ? b.entregados / b.total : 0
            const barColor = b.esFinal   ? '#00c896'
              : efB >= 0.9 ? '#1a7a5e'
              : efB >= 0.7 ? '#2a5a3a'
              : b.total > 0 ? '#1e3028'
              : '#1a2230'
            const barH = b.total > 0 ? Math.max(pct * 64, 10) : 4

            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5 group relative"
                style={{ height: '100%' }}>
                {/* Tooltip */}
                {b.total > 0 && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 pointer-events-none">
                    <div className="bg-[#1a2230] border border-white/10 rounded-lg px-3 py-2 text-center whitespace-nowrap shadow-xl">
                      <div className="text-[11px] font-semibold text-[#e8edf2]">{b.total} despachos</div>
                      <div className="text-[10px] text-[#00c896]">{b.entregados} entregados</div>
                      <div className="text-[10px] text-[#5f6f80]">
                        {b.total > 0 ? `${Math.round((b.entregados/b.total)*100)}% efic.` : ''}
                      </div>
                      <div className="text-[9px] text-[#3d4f60] mt-0.5">{b.desdeStr} → {b.hastaStr}</div>
                    </div>
                    <div className="w-2 h-2 bg-[#1a2230] border-b border-r border-white/10 rotate-45 -mt-1 mx-auto"/>
                  </div>
                )}
                {/* Barra */}
                <div className="w-full rounded-t-sm transition-all duration-300 flex-shrink-0"
                  style={{ height: barH, background: barColor, opacity: b.total > 0 ? 1 : 0.25 }}/>
                {/* Label */}
                <div className={`text-[9px] font-semibold shrink-0 ${b.esFinal ? 'text-[#00c896]' : 'text-[#3d4f60]'}`}>
                  {b.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-3 text-[10px] text-[#5f6f80] pt-1 border-t border-white/[0.05] flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#00c896]"/>Período actual</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#1a7a5e]"/>≥ 90% efic.</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#2a5a3a]"/>70–90%</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#1e3028]"/>{'< 70%'}</span>
      </div>
    </div>
  )
}


// ════════════════════════════════════════════════════════
// WIDGET: Últimas Órdenes de Despacho
// ════════════════════════════════════════════════════════
function WidgetUltimasOrdenes({ despachos, clientes, rutas, almacenes, onVerTodas }) {
  const ultimas = useMemo(() => {
    return [...despachos]
      .sort((a, b) => (b.createdAt||'').localeCompare(a.createdAt||''))
      .slice(0, 6)
      .map(des => {
        const cli    = clientes.find(c => c.id === des.clienteId)
        const alm    = almacenes.find(a => a.id === des.almacenId)
        // Buscar la ruta que incluye este despacho
        const ruta   = rutas.find(r => r.despachoIds?.includes(des.id) || r.paradas?.some(p => p.despachoId === des.id))
        const parada = ruta?.paradas?.find(p => p.despachoId === des.id)
        return {
          ...des,
          clienteNombre: cli?.razonSocial || '—',
          clienteDir:    des.direccionEntrega || cli?.direccion || '—',
          almacenNombre: alm?.nombre || '—',
          horaSalida:    ruta?.horaSalida || null,
          fechaSalida:   ruta?.fechaSalida || null,
          estadoParada:  parada?.estado || null,
        }
      })
  }, [despachos, clientes, rutas, almacenes])

  const META_ESTADO = {
    PEDIDO:     { label:'Pedido',      bg:'bg-[#5f6f80]/20', txt:'text-[#9ba8b6]'   },
    APROBADO:   { label:'Aprobado',    bg:'bg-blue-500/15',  txt:'text-blue-400'     },
    PICKING:    { label:'Picking',     bg:'bg-amber-500/15', txt:'text-amber-400'    },
    LISTO:      { label:'Listo',       bg:'bg-cyan-500/15',  txt:'text-cyan-400'     },
    DESPACHADO: { label:'En ruta',     bg:'bg-purple-500/15',txt:'text-purple-400'   },
    ENTREGADO:  { label:'Entregado',   bg:'bg-green-500/15', txt:'text-green-400'    },
    ANULADO:    { label:'Anulado',     bg:'bg-red-500/15',   txt:'text-red-400'      },
  }

  return (
    <div className="bg-[#161d28] border border-white/[0.08] rounded-xl overflow-hidden flex flex-col">
      {/* Cabecera */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="text-[14px] font-bold text-[#e8edf2]">Órdenes Recientes</div>
        <button onClick={onVerTodas} className="text-[11px] text-[#00c896] hover:text-[#00e0aa] transition-colors">
          Ver todas →
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#1a2230]">
              {['ID', 'Destino', 'Origen', 'Estado', 'Hora salida'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.08em] whitespace-nowrap border-b border-white/[0.06]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {ultimas.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-[#5f6f80] text-[12px] py-8">Sin órdenes registradas</td></tr>
            ) : ultimas.map(des => {
              const meta    = META_ESTADO[des.estado] || META_ESTADO.PEDIDO
              const vencida = des.horaSalida && des.estado === 'DESPACHADO'
                ? null
                : null

              return (
                <tr key={des.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer group">
                  {/* ID */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-[12px] font-bold text-[#00c896]">
                      #{des.numero?.replace('GD-','').replace('-000','-')||des.id}
                    </span>
                  </td>

                  {/* Destino */}
                  <td className="px-4 py-3">
                    <div className="text-[12px] font-medium text-[#e8edf2] truncate max-w-[140px]">
                      {des.clienteNombre.split(' ').slice(0,2).join(' ')}
                    </div>
                    <div className="text-[10px] text-[#5f6f80] truncate max-w-[140px]">
                      {des.clienteDir.split(',')[1]?.trim() || des.clienteDir.split(',')[0]?.trim()}
                    </div>
                  </td>

                  {/* Origen */}
                  <td className="px-4 py-3">
                    <div className="text-[12px] text-[#9ba8b6] flex items-center gap-1.5">
                      <MapPin size={10} className="text-[#5f6f80] shrink-0"/>
                      <span className="truncate max-w-[100px]">{des.almacenNombre}</span>
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${meta.bg} ${meta.txt}`}>
                      {meta.label}
                    </span>
                  </td>

                  {/* Hora salida programada */}
                  <td className="px-4 py-3">
                    {des.horaSalida ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-[12px] font-semibold ${
                          des.estado === 'DESPACHADO' ? 'text-purple-400' :
                          des.estado === 'ENTREGADO'  ? 'text-green-400'  :
                          'text-[#9ba8b6]'
                        }`}>
                          {des.horaSalida}
                        </span>
                        {des.fechaSalida && (
                          <span className="text-[10px] text-[#5f6f80]">
                            {new Date(des.fechaSalida).toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit'})}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#374151]">Sin asignar</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Resumen inferior */}
      <div className="px-5 py-3 border-t border-white/[0.06] grid grid-cols-3 gap-4">
        {[
          ['En proceso', despachos.filter(d=>['APROBADO','PICKING','LISTO'].includes(d.estado)).length, '#f59e0b'],
          ['En tránsito', despachos.filter(d=>d.estado==='DESPACHADO').length, '#8b5cf6'],
          ['Entregados', despachos.filter(d=>d.estado==='ENTREGADO').length, '#22c55e'],
        ].map(([l,v,c])=>(
          <div key={l} className="text-center">
            <div className="text-[16px] font-bold" style={{color:c}}>{v}</div>
            <div className="text-[9px] text-[#5f6f80] uppercase tracking-wide mt-0.5">{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
