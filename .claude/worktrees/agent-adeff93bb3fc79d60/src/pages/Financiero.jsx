import { useMemo, useState } from 'react'
import { DollarSign, TrendingUp, TrendingDown, BarChart2,
         ArrowUpRight, ArrowDownRight, FileSpreadsheet, FileText } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
         LineChart, Line, CartesianGrid, ComposedChart, Area } from 'recharts'
import { formatCurrency } from '../utils/helpers'
import { Btn, DataTable } from '../components/ui/index'
import { useApp } from '../store/AppContext'
import { useProductosList } from '../queries/productos.queries'
import { useMovimientosList } from '../queries/movimientos.queries'
import { useDespachosList } from '../queries/despachos.queries'
import { useOrdenesCompraList } from '../queries/ordenes-compra.queries'
import { exportarFinancieroXLSX } from '../utils/exportXLSX'
import { exportarFinancieroPDF } from '../utils/exportPDF'

const simboloMoneda = 'S/'
const TT = { background:'#1a2230', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, fontSize:12, color:'#e8edf2' }

function KPI({ label, val, sub, color, icon:Icon, trend }) {
  return (
    <div className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.75 rounded-t-xl" style={{ background: color }}/>
      <div className="absolute top-3 right-4 opacity-[0.06]"><Icon size={44}/></div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={11} style={{ color, opacity: 0.8 }}/>
        <span className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em]">{label}</span>
      </div>
      <div className="text-[17px] font-semibold font-mono text-[#e8edf2] leading-none">{val}</div>
      {sub && <div className="text-[11px] text-[#5f6f80] mt-1.5 flex items-center gap-1">
        {trend === 'up'   && <ArrowUpRight size={11} className="text-green-400"/>}
        {trend === 'down' && <ArrowDownRight size={11} className="text-red-400"/>}
        {sub}
      </div>}
    </div>
  )
}

export default function Financiero() {
  const { sesion } = useApp()
  const { data: productos    = [] } = useProductosList()
  const { data: movimientos  = [] } = useMovimientosList({})
  const { data: despachos    = [] } = useDespachosList()
  const { data: ordenes      = [] } = useOrdenesCompraList()

  const [periodo, setPeriodo] = useState('6') // meses hacia atrás

  // Devoluciones derivadas de movimientos (sin endpoint propio)
  const devoluciones = useMemo(() =>
    movimientos.filter(m => m.tipo === 'DEVOLUCION' || (m.motivo || '').toLowerCase().includes('devoluc'))
  , [movimientos])

  // ── Construir P&L mensual ─────────────────────────────
  const plMensual = useMemo(() => {
    const meses = []
    const hoy   = new Date()
    const nMeses = parseInt(periodo)

    for (let i = nMeses - 1; i >= 0; i--) {
      const d   = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      const clave = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const label = d.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' }).toUpperCase()

      // Ingresos = salidas de stock × precio de venta del producto
      const salidasMes = movimientos.filter(m => m.tipo === 'SALIDA' && m.fecha?.startsWith(clave))
      const ingresos   = salidasMes.reduce((s, m) => {
        const p = productos.find(x => x.id === m.productoId)
        return s + (m.cantidad * (p?.precioVenta || 0))
      }, 0)

      // Costo de ventas = costoUnitario × cantidad (costoTotal no existe en backend)
      const costoVentas = salidasMes.reduce((s, m) =>
        s + ((m.costoUnitario || 0) * (m.cantidad || 0)), 0)

      // Compras del mes (OC recibidas o APROBADAS)
      const comprasMes = ordenes
        .filter(o => o.fecha?.startsWith(clave) && ['APROBADA','RECIBIDA','PARCIAL'].includes(o.estado))
        .reduce((s, o) => s + Number(o.total || 0), 0)

      // Devoluciones del mes
      const devMes = devoluciones
        .filter(dv => dv.fecha?.startsWith(clave))
        .reduce((s, dv) => s + ((dv.costoUnitario || 0) * (dv.cantidad || 0)), 0)

      const margenBruto = ingresos - costoVentas - devMes
      const margenPct   = ingresos > 0 ? (margenBruto / ingresos) * 100 : 0

      meses.push({
        mes: label, clave, ingresos, costoVentas, comprasMes,
        devMes, margenBruto, margenPct,
        esMesActual: i === 0,
      })
    }
    return meses
  }, [movimientos, productos, ordenes, devoluciones, periodo])

  // KPIs del período
  const kpis = useMemo(() => {
    const totalIngresos   = plMensual.reduce((s, m) => s + m.ingresos, 0)
    const totalCosto      = plMensual.reduce((s, m) => s + m.costoVentas, 0)
    const totalCompras    = plMensual.reduce((s, m) => s + m.comprasMes, 0)
    const totalDev        = plMensual.reduce((s, m) => s + m.devMes, 0)
    const margenBruto     = totalIngresos - totalCosto - totalDev
    const margenPct       = totalIngresos > 0 ? (margenBruto / totalIngresos) * 100 : 0

    // Mes anterior vs actual para tendencia
    const mesAct  = plMensual[plMensual.length - 1]
    const mesPrev = plMensual[plMensual.length - 2]
    const tendIngresos = mesPrev?.ingresos > 0
      ? ((mesAct?.ingresos - mesPrev?.ingresos) / mesPrev.ingresos * 100).toFixed(1)
      : null

    // Valor del stock actual usando precioCompra (batches no existe en backend)
    const valorStock = productos.reduce((s, p) =>
      s + ((p.precioCompra || 0) * (p.stockActual || 0)), 0)

    return { totalIngresos, totalCosto, totalCompras, totalDev, margenBruto, margenPct, tendIngresos, valorStock }
  }, [plMensual, productos])

  // Top 5 productos más rentables
  const topRentables = useMemo(() => {
    return productos
      .filter(p => p.precioVenta > 0)
      .map(p => {
        const pmp    = p.precioCompra || 0
        const margen = p.precioVenta > 0 ? ((p.precioVenta - pmp) / p.precioVenta * 100) : 0
        return { ...p, pmp, margen }
      })
      .sort((a, b) => b.margen - a.margen)
      .slice(0, 5)
  }, [productos])

  const mesLabel = { '3':'Últimos 3 meses', '6':'Últimos 6 meses', '12':'Últimos 12 meses' }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* Selector período */}
      <div className="flex items-center justify-end">
        <div className="flex gap-1">
          {['3','6','12'].map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
                periodo === p ? 'bg-[#00c896]/15 text-[#00c896] border-[#00c896]/30' : 'text-[#5f6f80] border-white/6 hover:border-white/14'
              }`}>
              {p}M
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Ingresos totales"  val={formatCurrency(kpis.totalIngresos, simboloMoneda)} color="#3b82f6"
          icon={DollarSign} sub={kpis.tendIngresos !== null ? `${kpis.tendIngresos > 0 ? '+' : ''}${kpis.tendIngresos}% vs mes anterior` : undefined}
          trend={kpis.tendIngresos > 0 ? 'up' : 'down'}/>
        <KPI label="Costo de ventas"   val={formatCurrency(kpis.totalCosto, simboloMoneda)}    color="#ef4444" icon={TrendingDown}/>
        <KPI label="Margen bruto"      val={formatCurrency(kpis.margenBruto, simboloMoneda)}
          color={kpis.margenBruto >= 0 ? '#22c55e' : '#ef4444'} icon={TrendingUp}
          sub={`${kpis.margenPct.toFixed(1)}% del ingreso`}/>
        <KPI label="Valor de inventario" val={formatCurrency(kpis.valorStock, simboloMoneda)} color="#8b5cf6" icon={BarChart2}
          sub="Stock valorizado a costo"/>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Total compras (OC)" val={formatCurrency(kpis.totalCompras, simboloMoneda)} color="#f59e0b" icon={TrendingDown}
          sub="OC aprobadas y recibidas"/>
        <KPI label="Devoluciones" val={formatCurrency(kpis.totalDev, simboloMoneda)}
          color={kpis.totalDev > 0 ? '#ef4444' : '#22c55e'} icon={TrendingDown}/>
        <KPI label="Margen neto %" val={`${kpis.margenPct.toFixed(1)}%`}
          color={kpis.margenPct >= 20 ? '#22c55e' : kpis.margenPct >= 0 ? '#f59e0b' : '#ef4444'}
          icon={BarChart2} sub={kpis.margenPct >= 20 ? 'Margen saludable' : kpis.margenPct >= 0 ? 'Margen ajustado' : 'Margen negativo'}/>
        <KPI label="Despachos" val={despachos.filter(d=>d.estado==='ENTREGADO').length}
          color="#06b6d4" icon={TrendingUp} sub="Entregados en el período"/>
      </div>

      {/* Gráfico P&L mensual */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
            Ingresos vs Costo de Ventas — {mesLabel[periodo]}
          </span>
          <div className="flex gap-3 text-[10px] text-[#5f6f80]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#3b82f6]"/>Ingresos</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#ef4444]"/>Costo</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-[#22c55e] rounded"/>Margen %</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={plMensual} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
            <XAxis dataKey="mes" tick={{ fill:'#5f6f80', fontSize:11 }} axisLine={false} tickLine={false}/>
            <YAxis yAxisId="left" tick={{ fill:'#5f6f80', fontSize:10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${simboloMoneda}${(v/1000).toFixed(0)}k`}/>
            <YAxis yAxisId="right" orientation="right" tick={{ fill:'#5f6f80', fontSize:10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${v.toFixed(0)}%`} domain={[-20,100]}/>
            <Tooltip contentStyle={TT}
              formatter={(val, name) => name === 'Margen %' ? `${val.toFixed(1)}%` : formatCurrency(val, simboloMoneda)}/>
            <Bar yAxisId="left" dataKey="ingresos"   fill="#3b82f6" radius={[3,3,0,0]} name="Ingresos"   maxBarSize={40}/>
            <Bar yAxisId="left" dataKey="costoVentas" fill="#ef4444" radius={[3,3,0,0]} name="Costo"     maxBarSize={40}/>
            <Line yAxisId="right" type="monotone" dataKey="margenPct" stroke="#22c55e" strokeWidth={2.5}
              dot={{ r:3, fill:'#22c55e' }} name="Margen %"/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla P&L + Top productos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Tabla mensual */}
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Estado de Resultados Mensual</div>
            <div className="flex items-center gap-2">
              <Btn variant="secondary" size="sm" onClick={async()=>{ await exportarFinancieroXLSX(plMensual, kpis, simboloMoneda) }}>
                <FileSpreadsheet size={13}/> Excel
              </Btn>
              <Btn variant="secondary" size="sm" onClick={async()=>{ await exportarFinancieroPDF(plMensual, kpis, simboloMoneda, sesion?.nombre) }}>
                <FileText size={13}/> PDF
              </Btn>
            </div>
          </div>
          <DataTable
            rows={plMensual}
            rowKey={m => m.clave}
            rowClassName={m => m.esMesActual ? 'bg-[#00c896]/5' : ''}
            columns={[
              { key: 'mes', header: 'Mes', render: m => <span className={`font-medium ${m.esMesActual ? 'text-[#00c896]' : 'text-[#e8edf2]'}`}>{m.mes}</span> },
              { key: 'ingresos', header: 'Ingresos', align: 'right', render: m => <span className="font-mono text-[#3b82f6]">{formatCurrency(m.ingresos, simboloMoneda)}</span> },
              { key: 'costoVentas', header: 'Costo', align: 'right', render: m => <span className="font-mono text-[#ef4444]">{formatCurrency(m.costoVentas, simboloMoneda)}</span> },
              { key: 'devMes', header: 'Devoluc.', align: 'right', render: m => <span className="font-mono text-[#9ba8b6]">{m.devMes > 0 ? formatCurrency(m.devMes, simboloMoneda) : '—'}</span> },
              { key: 'margenBruto', header: 'Margen', align: 'right', render: m => <span className="font-mono font-semibold" style={{ color: m.margenBruto >= 0 ? '#22c55e' : '#ef4444' }}>{formatCurrency(m.margenBruto, simboloMoneda)}</span> },
              { key: 'margenPct', header: '%', align: 'right', render: m => <span className="font-semibold" style={{ color: m.margenPct >= 20 ? '#22c55e' : m.margenPct >= 0 ? '#f59e0b' : '#ef4444' }}>{m.margenPct.toFixed(1)}%</span> },
            ]}
            footerRow={plMensual.length>0 ? [
              <span className="text-[10px] font-bold text-[#5f6f80] uppercase">TOTAL</span>,
              <span className="font-mono text-[#3b82f6]">{formatCurrency(kpis.totalIngresos, simboloMoneda)}</span>,
              <span className="font-mono text-[#ef4444]">{formatCurrency(kpis.totalCosto, simboloMoneda)}</span>,
              <span className="font-mono text-[#9ba8b6]">{formatCurrency(kpis.totalDev, simboloMoneda)}</span>,
              <span className="font-mono" style={{ color: kpis.margenBruto >= 0 ? '#22c55e' : '#ef4444' }}>{formatCurrency(kpis.margenBruto, simboloMoneda)}</span>,
              <span style={{ color: kpis.margenPct >= 20 ? '#22c55e' : '#f59e0b' }}>{kpis.margenPct.toFixed(1)}%</span>,
            ] : undefined}
          />
        </div>

        {/* Top 5 productos más rentables */}
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Top 5 Productos — Mayor Margen %</div>
          {topRentables.length === 0 ? (
            <p className="text-[12px] text-[#5f6f80] text-center py-8">Configura precios de venta en Inventario para ver este reporte</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topRentables.map((p, i) => (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#00c896]/10 text-[#00c896] text-[10px] font-bold flex items-center justify-center shrink-0">{i+1}</span>
                      <div>
                        <div className="text-[12px] font-medium text-[#e8edf2] truncate max-w-50">{p.nombre}</div>
                        <div className="text-[10px] text-[#5f6f80]">{p.sku} · Costo: {formatCurrency(p.pmp, simboloMoneda)} → Venta: {formatCurrency(p.precioVenta, simboloMoneda)}</div>
                      </div>
                    </div>
                    <span className="font-bold text-[13px] shrink-0" style={{
                      color: p.margen >= 30 ? '#22c55e' : p.margen >= 15 ? '#f59e0b' : '#ef4444'
                    }}>{p.margen.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#0e1117] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(p.margen, 100)}%`,
                      background: p.margen >= 30 ? '#22c55e' : p.margen >= 15 ? '#f59e0b' : '#ef4444',
                    }}/>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-white/6 text-[11px] text-[#5f6f80]">
            El margen se calcula: (Precio Venta − Costo Compra) / Precio Venta × 100
          </div>
        </div>
      </div>

      {/* Guía de uso */}
      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Financiero?
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { t:'Ingresos', d:'Salidas de stock del período × precio de venta del producto — refleja lo facturado a clientes.' },
            { t:'Costo de ventas', d:'Costo unitario × cantidad de cada salida — el costo real de lo vendido, no el precio de lista.' },
            { t:'Margen bruto', d:'Ingresos − Costo de ventas − Devoluciones. El % es el margen sobre el ingreso total del mes.' },
            { t:'Valor de inventario', d:'Stock actual valorizado a costo de compra (PMP) — no incluye margen, es el capital inmovilizado.' },
          ].map(({t,d}) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[12px] font-semibold text-[#e8edf2] mb-1">{t}</div>
              <div className="text-[11px] text-[#9ba8b6] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
