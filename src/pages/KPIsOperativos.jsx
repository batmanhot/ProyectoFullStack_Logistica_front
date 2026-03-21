/**
 * KPIsOperativos.jsx — Panel de KPIs de Gestión Logística en Tiempo Real
 *
 * Métricas clave:
 * • Fill Rate      — % de líneas despachadas sin faltantes
 * • OTIF           — On Time In Full (entregado a tiempo y completo)
 * • Tasa de error  — % despachos con incidencias / devoluciones
 * • Rotación stock — veces que rota el inventario por categoría
 * • Cycle Time     — días promedio PEDIDO → ENTREGADO
 * • Perfect Order  — % pedidos sin errores, a tiempo, completos
 */
import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Target, Zap, Clock, Package,
         CheckCircle, AlertTriangle, RotateCcw, Truck, DollarSign, BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
         LineChart, Line, CartesianGrid, RadialBarChart, RadialBar, Legend } from 'recharts'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate } from '../utils/helpers'
import { valorarStock, calcularPMP } from '../utils/valorizacion'

const TT = { background:'#1a2230', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, fontSize:12, color:'#e8edf2' }

function Gauge({ value, max = 100, color = '#00c896', label, sub, size = 120 }) {
  const pct  = Math.min(100, Math.max(0, (value / max) * 100))
  const r    = 42
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ * 0.75
  const offset = circ * 0.125

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size * 0.7} viewBox="0 0 100 70">
        {/* Track */}
        <circle cx="50" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.06)"
          strokeWidth="8" strokeDasharray={`${circ * 0.75} ${circ}`}
          strokeDashoffset={-offset} strokeLinecap="round" transform="rotate(0 50 55)"/>
        {/* Value */}
        <circle cx="50" cy="55" r={r} fill="none" stroke={color}
          strokeWidth="8" strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={-offset} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}/>
        <text x="50" y="52" textAnchor="middle" fontSize="16" fontWeight="800"
          fill={color} fontFamily="monospace">{value.toFixed(1)}%</text>
        <text x="50" y="63" textAnchor="middle" fontSize="8" fill="#5f6f80">{sub}</text>
      </svg>
      <div className="text-[11px] font-semibold text-[#9ba8b6] text-center">{label}</div>
    </div>
  )
}

function KPICard({ label, value, sub, color, icon: Icon, trend, trendVal, onClick }) {
  const isUp = trend === 'up'
  return (
    <div onClick={onClick}
      className={`relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden ${onClick?'cursor-pointer hover:border-white/[0.14] transition-all':''}`}>
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
      <div className="absolute top-3 right-4 opacity-[0.06]"><Icon size={38}/></div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={11} style={{ color, opacity:0.85 }}/>
        <span className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em]">{label}</span>
      </div>
      <div className="text-[24px] font-bold font-mono leading-none" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] text-[#5f6f80] mt-1.5 leading-snug">{sub}</div>}
      {trendVal !== undefined && (
        <div className={`flex items-center gap-1 mt-1.5 text-[11px] font-semibold ${isUp?'text-green-400':'text-red-400'}`}>
          {isUp ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
          {trendVal}
        </div>
      )}
    </div>
  )
}

export default function KPIsOperativos() {
  const { despachos, movimientos, devoluciones, productos, categorias,
          clientes, ordenes, simboloMoneda, formulaValorizacion } = useApp()

  const [periodo, setPeriodo] = useState('30') // días

  // ── Calcular KPIs ─────────────────────────────────────
  const kpis = useMemo(() => {
    const hoy    = new Date()
    const desde  = new Date(hoy); desde.setDate(hoy.getDate() - parseInt(periodo))
    const desdeS = desde.toISOString().split('T')[0]

    const desPeriodo = despachos.filter(d => (d.createdAt||'').slice(0,10) >= desdeS)
    const desTotal   = desPeriodo.length
    const desCompletos = desPeriodo.filter(d => d.estado === 'ENTREGADO').length
    const desAnulados  = desPeriodo.filter(d => d.estado === 'ANULADO').length

    // Fill Rate — % líneas entregadas sin faltantes
    // Calculamos como % de despachos que llegaron a ENTREGADO sin anularse
    const fillRate = desTotal > 0 ? ((desCompletos / desTotal) * 100) : 0

    // OTIF — On Time In Full
    // "In Full" = llegó ENTREGADO | "On Time" = entregado antes o en fechaEntrega
    const otifDenominator = desPeriodo.filter(d => d.estado === 'ENTREGADO').length
    const otif = otifDenominator > 0
      ? (desPeriodo.filter(d => {
          if (d.estado !== 'ENTREGADO') return false
          if (!d.fechaEntrega || !d.fechaEntregaReal) return true // sin fecha = sin penalidad
          return d.fechaEntregaReal <= d.fechaEntrega
        }).length / otifDenominator) * 100
      : 0

    // Tasa de error — devoluciones / total despachos completados
    const devsPeriodo = (devoluciones||[]).filter(dv => (dv.createdAt||'').slice(0,10) >= desdeS && dv.tipo === 'CLIENTE')
    const tasaError = desCompletos > 0 ? (devsPeriodo.length / desCompletos) * 100 : 0

    // Perfect Order Rate = Fill Rate × OTIF × (1 - TasaError)
    const perfectOrder = (fillRate/100) * (otif/100) * (1 - tasaError/100) * 100

    // Cycle Time — días promedio PEDIDO → ENTREGADO
    const tiemposCiclo = desPeriodo
      .filter(d => d.estado === 'ENTREGADO' && d.fecha && d.fechaEntregaReal)
      .map(d => {
        const inicio = new Date(d.fecha + 'T12:00:00')
        const fin    = new Date(d.fechaEntregaReal + 'T12:00:00')
        return Math.max(0, Math.round((fin - inicio) / 86400000))
      })
    const cycleTime = tiemposCiclo.length > 0
      ? (tiemposCiclo.reduce((s,t) => s+t, 0) / tiemposCiclo.length).toFixed(1)
      : null

    // Rotación de inventario por categoría
    const rotacion = categorias.map(cat => {
      const prodsCat  = productos.filter(p => p.categoriaId === cat.id && p.activo !== false)
      const costoVtas = movimientos.filter(m => m.tipo === 'SALIDA' && (m.createdAt||'').slice(0,10) >= desdeS)
        .filter(m => prodsCat.some(p => p.id === m.productoId))
        .reduce((s,m) => s + (m.costoTotal||0), 0)
      const invPromedio = prodsCat.reduce((s,p) => s + valorarStock(p.batches||[], formulaValorizacion), 0)
      const rot = invPromedio > 0 ? costoVtas / invPromedio : 0
      return { name: cat.nombre.slice(0,14), rot: +rot.toFixed(2) }
    }).filter(r => r.rot > 0).sort((a,b) => b.rot - a.rot)

    // Despachos por semana (últimas 8 semanas)
    const semanas = []
    for (let i = 7; i >= 0; i--) {
      const d1 = new Date(hoy); d1.setDate(hoy.getDate() - (i+1)*7)
      const d2 = new Date(hoy); d2.setDate(hoy.getDate() - i*7)
      const s1 = d1.toISOString().split('T')[0]
      const s2 = d2.toISOString().split('T')[0]
      const label = `S${8-i}`
      const semDes = despachos.filter(d => (d.createdAt||'').slice(0,10) >= s1 && (d.createdAt||'').slice(0,10) < s2)
      semanas.push({
        sem:       label,
        Pedidos:   semDes.length,
        Entregados:semDes.filter(d=>d.estado==='ENTREGADO').length,
        Anulados:  semDes.filter(d=>d.estado==='ANULADO').length,
      })
    }

    // Top clientes por volumen
    const topClientes = clientes
      .map(c => {
        const des = desPeriodo.filter(d => d.clienteId === c.id && d.estado === 'ENTREGADO')
        return {
          nombre:  c.razonSocial.slice(0,22),
          valor:   des.reduce((s,d) => s+(d.total||0), 0),
          pedidos: des.length,
        }
      })
      .filter(c => c.valor > 0)
      .sort((a,b) => b.valor - a.valor)
      .slice(0, 6)

    // OC — lead time promedio proveedor
    const ocs = ordenes.filter(o => o.estado === 'RECIBIDA' && (o.createdAt||'').slice(0,10) >= desdeS)
    const leadTimes = ocs.map(o => {
      if (!o.fecha || !o.fechaRecepcion) return null
      const d = Math.max(0, Math.round((new Date(o.fechaRecepcion+'T12:00:00') - new Date(o.fecha+'T12:00:00')) / 86400000))
      return d
    }).filter(d => d !== null)
    const leadTimeAvg = leadTimes.length > 0 ? (leadTimes.reduce((s,t)=>s+t,0)/leadTimes.length).toFixed(1) : null

    return {
      fillRate, otif, tasaError, perfectOrder, cycleTime, leadTimeAvg,
      desTotal, desCompletos, desAnulados,
      rotacion, semanas, topClientes,
      devCount: devsPeriodo.length,
    }
  }, [despachos, movimientos, devoluciones, productos, categorias, clientes, ordenes, periodo, simboloMoneda, formulaValorizacion])

  const SI_PERIODO = 'px-3 py-1.5 bg-[#1a2230] border border-white/[0.08] rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896] pr-7'

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

      {/* Header + selector período */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-[#e8edf2]">KPIs Operativos</h2>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Métricas de gestión logística en tiempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#5f6f80]">Período:</span>
          <select className={SI_PERIODO} value={periodo} onChange={e=>setPeriodo(e.target.value)}
            style={{backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235f6f80' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 8px center',appearance:'none'}}>
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="60">Últimos 60 días</option>
            <option value="90">Últimos 90 días</option>
          </select>
        </div>
      </div>

      {/* Gauges principales */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-6">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-5">
          Indicadores clave de rendimiento
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex flex-col items-center gap-3">
            <Gauge value={kpis.fillRate} color={kpis.fillRate>=95?'#22c55e':kpis.fillRate>=85?'#f59e0b':'#ef4444'} label="Fill Rate" sub="Objetivo: ≥95%"/>
            <div className="text-center">
              <div className="text-[11px] text-[#5f6f80]">% despachos completados</div>
              <div className="text-[11px] text-[#5f6f80]">{kpis.desCompletos}/{kpis.desTotal} en el período</div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Gauge value={kpis.otif} color={kpis.otif>=90?'#22c55e':kpis.otif>=75?'#f59e0b':'#ef4444'} label="OTIF" sub="On Time In Full"/>
            <div className="text-center">
              <div className="text-[11px] text-[#5f6f80]">Entregado a tiempo y completo</div>
              <div className="text-[11px] text-[#5f6f80]">Objetivo: ≥90%</div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Gauge value={kpis.perfectOrder} color={kpis.perfectOrder>=85?'#22c55e':kpis.perfectOrder>=70?'#f59e0b':'#ef4444'} label="Perfect Order" sub="Fill × OTIF × Sin error"/>
            <div className="text-center">
              <div className="text-[11px] text-[#5f6f80]">Pedido perfecto = sin falta,</div>
              <div className="text-[11px] text-[#5f6f80]">a tiempo y sin devolución</div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Gauge value={100 - kpis.tasaError} color={kpis.tasaError<=3?'#22c55e':kpis.tasaError<=8?'#f59e0b':'#ef4444'} label="Calidad entregas" sub={`${kpis.tasaError.toFixed(1)}% error`}/>
            <div className="text-center">
              <div className="text-[11px] text-[#5f6f80]">{kpis.devCount} devolución{kpis.devCount!==1?'es':''} en el período</div>
              <div className="text-[11px] text-[#5f6f80]">Objetivo: tasa error ≤3%</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs numéricos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard label="Fill Rate"       value={`${kpis.fillRate.toFixed(1)}%`}   color={kpis.fillRate>=95?'#22c55e':'#f59e0b'} icon={Target}        sub={`${kpis.desCompletos}/${kpis.desTotal} despachos`}/>
        <KPICard label="OTIF"            value={`${kpis.otif.toFixed(1)}%`}        color={kpis.otif>=90?'#22c55e':'#f59e0b'}   icon={Zap}           sub="On Time In Full"/>
        <KPICard label="Cycle Time"      value={kpis.cycleTime ? `${kpis.cycleTime}d` : '—'} color="#3b82f6" icon={Clock} sub="Pedido → Entregado"/>
        <KPICard label="Lead Time prov." value={kpis.leadTimeAvg ? `${kpis.leadTimeAvg}d` : '—'} color="#8b5cf6" icon={Package} sub="OC → Recepción"/>
        <KPICard label="Perfect Order"   value={`${kpis.perfectOrder.toFixed(1)}%`} color={kpis.perfectOrder>=85?'#22c55e':'#ef4444'} icon={CheckCircle} sub="Objetivo ≥85%"/>
        <KPICard label="Tasa de error"   value={`${kpis.tasaError.toFixed(2)}%`}   color={kpis.tasaError<=3?'#22c55e':'#ef4444'}   icon={AlertTriangle} sub={`${kpis.devCount} devolución${kpis.devCount!==1?'es':''}`}/>
        <KPICard label="Despachos activos" value={kpis.desTotal}                    color="#00c896" icon={Truck} sub={`${kpis.desAnulados} anulados`}/>
        <KPICard label="Entregas completadas" value={kpis.desCompletos}             color="#22c55e" icon={CheckCircle} sub="en el período"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Despachos por semana */}
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">
            Despachos por semana — últimas 8 semanas
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={kpis.semanas} margin={{ left:-10, right:5, top:5, bottom:0 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="sem" tick={{ fill:'#5f6f80', fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:'#5f6f80', fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={TT}/>
              <Bar dataKey="Pedidos"    fill="rgba(59,130,246,0.4)" radius={[3,3,0,0]}/>
              <Bar dataKey="Entregados" fill="#22c55e"              radius={[3,3,0,0]}/>
              <Bar dataKey="Anulados"   fill="rgba(239,68,68,0.5)"  radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top clientes por valor */}
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">
            Top clientes por valor entregado
          </div>
          {kpis.topClientes.length === 0 ? (
            <div className="text-center text-[12px] text-[#5f6f80] py-8">Sin entregas en el período</div>
          ) : (
            <div className="flex flex-col gap-2">
              {kpis.topClientes.map((c, i) => {
                const max = kpis.topClientes[0]?.valor || 1
                return (
                  <div key={c.nombre} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#1a2230] flex items-center justify-center text-[9px] font-bold text-[#5f6f80] shrink-0">{i+1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[#e8edf2] truncate">{c.nombre}</span>
                        <span className="text-[#00c896] font-mono shrink-0 ml-2">{formatCurrency(c.valor, '')}</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#0e1117] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#00c896]" style={{ width:`${(c.valor/max)*100}%` }}/>
                      </div>
                    </div>
                    <div className="text-[10px] text-[#5f6f80] shrink-0">{c.pedidos} ped.</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Rotación por categoría */}
        {kpis.rotacion.length > 0 && (
          <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">
              Rotación de inventario por categoría
              <span className="ml-2 text-[#3d4f60] normal-case font-normal">(costo ventas / inventario promedio)</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={kpis.rotacion} layout="vertical" margin={{ left:5, right:30, top:0, bottom:0 }}>
                <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.04)"/>
                <XAxis type="number" tick={{ fill:'#5f6f80', fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis dataKey="name" type="category" tick={{ fill:'#9ba8b6', fontSize:11 }} width={90} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={TT} formatter={v=>[v+'x','Rotación']}/>
                <Bar dataKey="rot" fill="#00c896" radius={[0,4,4,0]} label={{ position:'right', fill:'#5f6f80', fontSize:10, formatter:v=>v+'x' }}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Semáforo de estado */}
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">
            Semáforo de rendimiento
          </div>
          <div className="flex flex-col gap-3">
            {[
              { label:'Fill Rate',       val:kpis.fillRate,        ok:95, warn:85, fmt:v=>`${v.toFixed(1)}%`, desc:'≥95% óptimo · ≥85% aceptable' },
              { label:'OTIF',            val:kpis.otif,            ok:90, warn:75, fmt:v=>`${v.toFixed(1)}%`, desc:'≥90% óptimo · ≥75% aceptable' },
              { label:'Perfect Order',   val:kpis.perfectOrder,    ok:85, warn:70, fmt:v=>`${v.toFixed(1)}%`, desc:'≥85% óptimo · ≥70% aceptable' },
              { label:'Tasa de error',   val:kpis.tasaError,       ok:3,  warn:8,  fmt:v=>`${v.toFixed(2)}%`, desc:'≤3% óptimo · ≤8% aceptable', inverse:true },
              { label:'Cycle Time (días)',val:kpis.cycleTime?+kpis.cycleTime:null, ok:2, warn:5, fmt:v=>`${v}d`, desc:'≤2d óptimo · ≤5d aceptable', inverse:true, nullMsg:'Sin datos' },
            ].map(({ label, val, ok, warn, fmt, desc, inverse, nullMsg }) => {
              const color = val === null ? '#5f6f80'
                : inverse
                  ? val <= ok ? '#22c55e' : val <= warn ? '#f59e0b' : '#ef4444'
                  : val >= ok ? '#22c55e' : val >= warn ? '#f59e0b' : '#ef4444'
              return (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }}/>
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[12px] font-medium text-[#e8edf2]">{label}</span>
                      <span className="text-[13px] font-bold font-mono" style={{ color }}>
                        {val === null ? (nullMsg || '—') : fmt(val)}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#3d4f60] mt-0.5">{desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Glosario */}
      <div className="bg-[#161d28] border border-white/[0.06] rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">Glosario de métricas</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-[11px]">
          {[
            ['Fill Rate', '% de despachos que se completaron sin faltantes de stock. Numerador: despachos ENTREGADO. Denominador: total despachos del período.'],
            ['OTIF (On Time In Full)', '% de pedidos entregados a tiempo Y completos. Requiere que el despacho sea ENTREGADO y que la fecha real ≤ fecha comprometida.'],
            ['Perfect Order Rate', 'Fill Rate × OTIF × (1 − Tasa de Error). El KPI más exigente: sin falta, a tiempo, y sin devolución posterior.'],
            ['Tasa de Error', '% de entregas que generaron una devolución de cliente. Devoluciones tipo CLIENTE del período / total entregas completadas.'],
            ['Cycle Time', 'Promedio de días entre la fecha de creación del pedido y la fecha de entrega real confirmada.'],
            ['Rotación inventario', 'Costo de ventas del período / valor promedio del inventario. Indica cuántas veces "rotó" el stock. Más alto = mejor liquidez.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3 border-l-2 border-[#00c896]/30">
              <div className="font-semibold text-[#e8edf2] mb-1">{t}</div>
              <div className="text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
