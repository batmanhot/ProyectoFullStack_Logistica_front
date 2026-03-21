import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
         LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { Download, TrendingUp, TrendingDown, DollarSign, Percent, Package } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, clasificarABC, formatDate } from '../utils/helpers'
import { valorarStock, calcularPMP } from '../utils/valorizacion'
import { Badge, Btn } from '../components/ui/index'
import { exportarRentabilidadXLSX, exportarInventarioXLSX } from '../utils/exportXLSX'
import { exportarRentabilidadPDF, exportarInventarioPDF } from '../utils/exportPDF'

const TT = { background:'#0f172a', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, fontSize:12, color:'#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }
const TH = ({c,r,center})=><th className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/[0.08] sticky top-0 ${r?'text-right':center?'text-center':'text-left'}`}>{c}</th>
const PIE_COLORS = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4']

const TABS = [
  ['rentabilidad', '💰 Rentabilidad'],
  ['inventario',   'Inventario Valorizado'],
  ['movimientos',  'Movimientos por Período'],
  ['abc',          'Análisis ABC'],
  ['rotacion',     'Rotación por Categoría'],
]

export default function Reportes() {
  const { productos, movimientos, categorias, almacenes,
          formulaValorizacion, simboloMoneda, config } = useApp()
  const [tab, setTab] = useState('rentabilidad')

  // ── Inventario enriquecido ────────────────────────────
  const inventario = useMemo(() =>
    productos.filter(p => p.activo !== false).map(p => ({
      ...p,
      pmp:         calcularPMP(p.batches || []),
      valorStock:  valorarStock(p.batches || [], formulaValorizacion),
      catNombre:   categorias.find(c => c.id === p.categoriaId)?.nombre || '—',
      margenNum:   (p.precioVenta || 0) > 0
        ? (((p.precioVenta || 0) - calcularPMP(p.batches || [])) / (p.precioVenta || 1)) * 100
        : null,
    })).sort((a, b) => b.valorStock - a.valorStock)
  , [productos, categorias, formulaValorizacion])

  const abc = useMemo(() => clasificarABC(inventario), [inventario])
  const valorTotal = inventario.reduce((s, p) => s + p.valorStock, 0)

  // ── Rentabilidad ──────────────────────────────────────
  const rentabilidad = useMemo(() => {
    // Por producto: calcular ingresos y costos reales de las salidas
    const map = {}
    productos.filter(p => p.activo !== false).forEach(p => {
      const pmp          = calcularPMP(p.batches || [])
      const precioVenta  = p.precioVenta || 0
      // Salidas de este producto (historial de movimientos)
      const salidas      = movimientos.filter(m => m.productoId === p.id && m.tipo === 'SALIDA')
      const unidadesVend = salidas.reduce((s, m) => s + m.cantidad, 0)
      const costoVentas  = salidas.reduce((s, m) => s + (m.costoTotal || m.cantidad * pmp), 0)
      const ingresos     = unidadesVend * precioVenta
      const margenBruto  = ingresos - costoVentas
      const margenPct    = ingresos > 0 ? (margenBruto / ingresos) * 100 : null

      map[p.id] = {
        id: p.id, sku: p.sku, nombre: p.nombre,
        catNombre: categorias.find(c => c.id === p.categoriaId)?.nombre || '—',
        pmp, precioVenta,
        unidadesVend, costoVentas, ingresos,
        margenBruto, margenPct,
        stockActual: p.stockActual, unidadMedida: p.unidadMedida,
        abc: abc.find(a => a.id === p.id)?.abc || '—',
      }
    })
    return Object.values(map).sort((a, b) => b.margenBruto - a.margenBruto)
  }, [productos, movimientos, categorias, abc])

  // KPIs de rentabilidad
  const kpisRent = useMemo(() => {
    const totalIngresos    = rentabilidad.reduce((s, r) => s + r.ingresos, 0)
    const totalCosto       = rentabilidad.reduce((s, r) => s + r.costoVentas, 0)
    const totalMargen      = totalIngresos - totalCosto
    const margenPct        = totalIngresos > 0 ? (totalMargen / totalIngresos) * 100 : 0
    const sinPrecio        = rentabilidad.filter(r => !r.precioVenta || r.precioVenta <= 0).length
    const conMargenNeg     = rentabilidad.filter(r => r.margenPct !== null && r.margenPct < 0).length
    return { totalIngresos, totalCosto, totalMargen, margenPct, sinPrecio, conMargenNeg }
  }, [rentabilidad])

  // Rentabilidad por categoría (para pie)
  const rentPorCat = useMemo(() => {
    const map = {}
    rentabilidad.forEach(r => {
      if (!map[r.catNombre]) map[r.catNombre] = { nombre: r.catNombre, margen: 0, ingresos: 0 }
      map[r.catNombre].margen   += r.margenBruto
      map[r.catNombre].ingresos += r.ingresos
    })
    return Object.values(map).filter(c => c.ingresos > 0).sort((a, b) => b.margen - a.margen)
  }, [rentabilidad])

  // ── Movimientos por mes ───────────────────────────────
  const movMes = useMemo(() => {
    const map = {}
    movimientos.forEach(m => {
      const mes = m.fecha?.substring(0, 7) || '—'
      if (!map[mes]) map[mes] = { mes, entradas: 0, salidas: 0 }
      if (m.tipo === 'ENTRADA') map[mes].entradas += m.costoTotal
      if (m.tipo === 'SALIDA')  map[mes].salidas  += m.costoTotal
    })
    return Object.values(map).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-12)
  }, [movimientos])

  // ── Rotación por categoría ────────────────────────────
  const rotacion = useMemo(() => {
    const map = {}
    categorias.forEach(c => { map[c.id] = { nombre: c.nombre, salidas: 0, valor: 0 } })
    movimientos.filter(m => m.tipo === 'SALIDA').forEach(m => {
      const p = productos.find(x => x.id === m.productoId)
      if (p && map[p.categoriaId]) { map[p.categoriaId].salidas += m.cantidad; map[p.categoriaId].valor += m.costoTotal }
    })
    return Object.values(map).sort((a, b) => b.valor - a.valor)
  }, [movimientos, productos, categorias])

  // ── Exportaciones CSV ─────────────────────────────────
  function exportCSV(rows, nombre) {
    const content = rows.map(r => r.map(v => {
      const val = v === null || v === undefined ? '' : v
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' }))
    a.download = `${nombre}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  function exportarRentabilidad() {
    const rows = [['SKU','Producto','Categoría','Costo PMP','Precio Venta','Unid. Vendidas','Costo Ventas','Ingresos','Margen S/','Margen %','ABC']]
    rentabilidad.forEach(r => rows.push([
      r.sku, r.nombre, r.catNombre,
      r.pmp.toFixed(2), r.precioVenta.toFixed(2),
      r.unidadesVend, r.costoVentas.toFixed(2),
      r.ingresos.toFixed(2), r.margenBruto.toFixed(2),
      r.margenPct !== null ? r.margenPct.toFixed(1) + '%' : '—', r.abc,
    ]))
    exportCSV(rows, 'reporte_rentabilidad')
  }

  function exportarInventario() {
    const rows = [['SKU','Producto','Categoría','Stock','U.M.','Costo PMP','Precio Venta','Margen %','Valor Stock','ABC']]
    abc.forEach(p => rows.push([
      p.sku, p.nombre, p.catNombre, p.stockActual, p.unidadMedida,
      p.pmp.toFixed(2), (p.precioVenta||0).toFixed(2),
      p.margenNum !== null ? p.margenNum.toFixed(1)+'%' : '—',
      p.valorStock.toFixed(2), p.abc,
    ]))
    rows.push(['','','','','','','TOTAL','', valorTotal.toFixed(2), ''])
    exportCSV(rows, 'inventario_valorizado')
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-white/[0.08] overflow-x-auto">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-all whitespace-nowrap
              ${tab === id ? 'text-[#00c896] border-[#00c896]' : 'text-[#5f6f80] border-transparent hover:text-[#9ba8b6]'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════
          RENTABILIDAD
      ══════════════════════════════════════════════════ */}
      {tab === 'rentabilidad' && (
        <div className="flex flex-col gap-5">

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label:'Ingresos totales', val: formatCurrency(kpisRent.totalIngresos, simboloMoneda), color:'#3b82f6',  icon:DollarSign, mono:true },
              { label:'Costo de ventas',  val: formatCurrency(kpisRent.totalCosto,    simboloMoneda), color:'#ef4444',  icon:Package,    mono:true },
              { label:'Margen bruto',     val: formatCurrency(kpisRent.totalMargen,   simboloMoneda), color: kpisRent.totalMargen >= 0 ? '#22c55e' : '#ef4444', icon:TrendingUp, mono:true },
              { label:'Margen %',         val: kpisRent.margenPct.toFixed(1) + '%',                  color: kpisRent.margenPct >= 20 ? '#22c55e' : kpisRent.margenPct >= 0 ? '#f59e0b' : '#ef4444', icon:Percent },
              { label:'Sin precio venta', val: kpisRent.sinPrecio,                                   color: kpisRent.sinPrecio > 0 ? '#f59e0b' : '#22c55e', icon:TrendingDown, sub: kpisRent.sinPrecio > 0 ? 'Requieren precio' : 'Todo configurado' },
            ].map(({ label, val, color, icon:Icon, mono, sub }) => (
              <div key={label} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon size={11} style={{ color, opacity: 0.8 }}/>
                  <span className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em]">{label}</span>
                </div>
                <div className={`font-bold text-[#e8edf2] leading-none ${mono ? 'text-[15px] font-mono' : 'text-[22px]'}`}>{val}</div>
                {sub && <div className="text-[10px] text-[#5f6f80] mt-1">{sub}</div>}
              </div>
            ))}
          </div>

          {/* Alerta productos sin precio */}
          {kpisRent.sinPrecio > 0 && (
            <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-[12px] text-amber-300">
              <TrendingDown size={14} className="shrink-0 mt-0.5"/>
              <span>
                <strong>{kpisRent.sinPrecio} producto{kpisRent.sinPrecio > 1 ? 's' : ''}</strong> sin precio de venta configurado.
                El margen de esos productos aparece como <strong>—</strong>. Ve a <strong>Inventario → Editar producto</strong> y agrega el precio de venta para ver la rentabilidad completa.
              </span>
            </div>
          )}

          {/* Gráfico y Distribución */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
                <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] block mb-4">Distribución de Margen por Categoría</span>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={rentPorCat}
                        dataKey="margen"
                        nameKey="nombre"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        stroke="none"
                        animationBegin={0}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      >
                        {rentPorCat.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={TT}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                        formatter={(v) => formatCurrency(v, simboloMoneda)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5 flex flex-col">
              <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] block mb-4">Resumen por Categoría</span>
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[280px] custom-scrollbar">
                {rentPorCat.map((c, i) => (
                  <div key={c.nombre} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[12px] text-[#9ba8b6] group-hover:text-[#e8edf2] transition-colors">{c.nombre}</span>
                    </div>
                    <span className="text-[12px] font-mono text-[#e8edf2]">{formatCurrency(c.margen, simboloMoneda)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center text-[11px]">
                <span className="text-[#5f6f80]">Eficiencia Global</span>
                <span className="text-[#00c896] font-bold">{kpisRent.margenPct.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Tabla rentabilidad por producto */}
          <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Rentabilidad por Producto</span>
                <div className="flex items-center gap-2">
                  <Btn variant="secondary" size="sm" onClick={exportarRentabilidad}><Download size={13}/>CSV</Btn>
                  <Btn variant="secondary" size="sm"
                    onClick={async()=>{ await exportarRentabilidadXLSX(rentabilidad, kpisRent, simboloMoneda) }}
                    style={{background:'#1e7b47',color:'#fff',borderColor:'#1e7b47'}}>
                    <Download size={13}/>Excel
                  </Btn>
                  <Btn variant="secondary" size="sm"
                    onClick={async()=>{ await exportarRentabilidadPDF(rentabilidad, kpisRent, simboloMoneda, config?.empresa) }}
                    style={{background:'#c0392b',color:'#fff',borderColor:'#c0392b'}}>
                    <Download size={13}/>PDF
                  </Btn>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
                <table className="w-full border-collapse text-[13px]">
                  <thead><tr>
                    <TH c="SKU"/><TH c="Producto"/><TH c="P. Costo" r/><TH c="P. Venta" r/>
                    <TH c="Uds. Vend." r/><TH c="Ingresos" r/><TH c="Margen S/" r/><TH c="Margen %" r/><TH c="ABC" center/>
                  </tr></thead>
                  <tbody>
                    {rentabilidad.map(r => {
                      const margenColor = r.margenPct === null ? '#5f6f80'
                        : r.margenPct >= 20 ? '#22c55e'
                        : r.margenPct >= 0  ? '#f59e0b'
                        : '#ef4444'
                      return (
                        <tr key={r.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                          <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#00c896]">{r.sku}</td>
                          <td className="px-3.5 py-2.5 text-[12px] max-w-[160px] truncate font-medium text-[#e8edf2]">{r.nombre}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px] text-right text-[#9ba8b6]">{formatCurrency(r.pmp, simboloMoneda)}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px] text-right">
                            {r.precioVenta > 0
                              ? <span className="text-[#e8edf2]">{formatCurrency(r.precioVenta, simboloMoneda)}</span>
                              : <span className="text-[#5f6f80] text-[11px]">Sin precio</span>
                            }
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px] text-right text-[#9ba8b6]">{r.unidadesVend}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px] text-right text-[#3b82f6] font-semibold">{formatCurrency(r.ingresos, simboloMoneda)}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px] text-right font-semibold" style={{ color: margenColor }}>
                            {r.margenPct !== null ? formatCurrency(r.margenBruto, simboloMoneda) : '—'}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            {r.margenPct !== null ? (
                              <span className="font-mono text-[12px] font-semibold" style={{ color: margenColor }}>
                                {r.margenPct.toFixed(1)}%
                              </span>
                            ) : <span className="text-[11px] text-[#5f6f80]">—</span>}
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            <Badge variant={r.abc==='A'?'success':r.abc==='B'?'info':'neutral'}>{r.abc}</Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#1a2230] border-t border-white/[0.1]">
                      <td colSpan={5} className="px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide">TOTAL</td>
                      <td className="px-3.5 py-2.5 font-mono text-[13px] text-right font-bold text-[#3b82f6]">{formatCurrency(kpisRent.totalIngresos, simboloMoneda)}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[13px] text-right font-bold" style={{ color: kpisRent.totalMargen >= 0 ? '#22c55e' : '#ef4444' }}>{formatCurrency(kpisRent.totalMargen, simboloMoneda)}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[13px] text-right font-bold" style={{ color: kpisRent.margenPct >= 20 ? '#22c55e' : kpisRent.margenPct >= 0 ? '#f59e0b' : '#ef4444' }}>{kpisRent.margenPct.toFixed(1)}%</td>
                      <td/>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

          {/* Panel explicativo */}
          <div className="bg-[#161d28] border border-[#00c896]/20 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#00c896]/10 flex items-center justify-center shrink-0 mt-0.5 text-[#00c896] text-[13px] font-bold">?</div>
              <div className="flex-1">
                <div className="text-[12px] font-semibold text-[#e8edf2] mb-1">¿Cómo se calcula la rentabilidad?</div>
                <p className="text-[12px] text-[#9ba8b6] leading-relaxed mb-3">
                  <strong className="text-[#e8edf2]">Ingresos</strong> = Unidades vendidas (salidas) × Precio de venta.
                  <strong className="text-[#e8edf2]"> Costo de ventas</strong> = Costo real de cada movimiento de salida (PMP/FIFO/LIFO).
                  <strong className="text-[#e8edf2]"> Margen bruto</strong> = Ingresos − Costo de ventas.
                  <strong className="text-[#e8edf2]"> Margen %</strong> = Margen bruto / Ingresos × 100.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['🟢 Margen ≥ 20%', 'Rentabilidad saludable. Mantén el precio y asegura disponibilidad.'],
                    ['🟡 Margen 0–20%', 'Margen bajo. Evalúa negociar mejor precio con el proveedor o ajustar el precio de venta.'],
                    ['🔴 Margen negativo', 'Estás vendiendo por debajo del costo. Requiere acción inmediata: revisar precio venta o costo de compra.'],
                  ].map(([t, d]) => (
                    <div key={t} className="bg-[#1a2230] rounded-lg p-3">
                      <div className="text-[11px] font-semibold text-[#e8edf2] mb-1">{t}</div>
                      <div className="text-[11px] text-[#9ba8b6] leading-snug">{d}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════
              GUÍA DIDÁCTICA ABC — aparece después de rentabilidad
          ════════════════════════════════════════════════════════ */}

          {/* Panel A: ¿Qué es la clasificación ABC? */}
          <div className="flex items-start gap-4 px-5 py-4 rounded-xl" style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.20)'}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-blue-400 text-[13px] leading-none" style={{background:'rgba(59,130,246,0.15)'}}>
              ABC
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-[#e8edf2] mb-1">¿Qué es la Clasificación ABC?</div>
              <div className="text-[12px] text-[#9ba8b6] leading-relaxed mb-3">
                Es una técnica de gestión de inventario basada en el{' '}
                <strong className="text-[#e8edf2]">Principio de Pareto (regla 80/20)</strong>:
                unos pocos productos concentran la mayor parte del valor del stock.
                El sistema analiza el valor de cada producto y lo clasifica automáticamente en una de tres clases.
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {[
                  { cls:'A', pct:'80%', color:'#22c55e', titulo:'Clase A — Alto valor',   desc:'Son el 20% de los productos pero representan el 80% del valor total. Requieren control riguroso, conteos físicos frecuentes, stock de seguridad alto y negociación activa con proveedores.' },
                  { cls:'B', pct:'15%', color:'#3b82f6', titulo:'Clase B — Valor medio',  desc:'Representan el 15% del valor. Requieren control moderado, revisiones periódicas y reorden por punto de pedido estándar. Son importantes pero no críticos.' },
                  { cls:'C', pct:'5%',  color:'#5f6f80', titulo:'Clase C — Bajo valor',   desc:'Son muchos productos pero solo el 5% del valor. Control mínimo, pedidos en lotes grandes para reducir costos operativos. Menor frecuencia de conteo físico.' },
                ].map(({ cls, pct, color, titulo, desc }) => (
                  <div key={cls} className="bg-[#1a2230] rounded-xl p-3.5" style={{ borderTop:`3px solid ${color}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[15px] font-bold" style={{ color }}>Clase {cls}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background:`${color}20`, color }}>{pct} del valor</span>
                    </div>
                    <div className="text-[11px] font-semibold text-[#e8edf2] mb-1">{titulo}</div>
                    <div className="text-[11px] text-[#5f6f80] leading-relaxed">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panel B: ¿Cómo usar el análisis ABC? */}
          <div className="flex items-start gap-4 px-5 py-4 rounded-xl" style={{background:'rgba(0,200,150,0.08)',border:'1px solid rgba(0,200,150,0.20)'}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{background:'rgba(0,200,150,0.15)'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00c896" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-[#e8edf2] mb-1">¿Cómo usar este análisis en tu negocio?</div>
              <div className="text-[12px] text-[#9ba8b6] leading-relaxed mb-3">
                El objetivo es <strong className="text-[#e8edf2]">enfocar los recursos donde más importa</strong>.
                No todos los productos merecen el mismo nivel de atención — el ABC te dice exactamente cuáles sí.
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {[
                  { titulo:'Compras y presupuesto', color:'#22c55e', icon:'💰',
                    items:['Concentra el presupuesto en productos Clase A', 'Negocia mejores precios con proveedores de A', 'Mantén stock de seguridad más alto para la Clase A', 'Revisa los Clase C: ¿se pueden eliminar o consolidar?'] },
                  { titulo:'Control de inventario', color:'#3b82f6', icon:'📋',
                    items:['Clase A → conteo físico mensual o semanal', 'Clase B → conteo trimestral', 'Clase C → conteo semestral o anual', 'Automatiza el reorden de Clase A con alertas de stock mínimo'] },
                  { titulo:'Estrategia operativa', color:'#f59e0b', icon:'🎯',
                    items:['Dedica más tiempo del equipo a los productos A', 'Clase C: pide en lotes grandes, menos órdenes', 'Un C puede ascender a A — revisa periódicamente', 'Usa este reporte antes de cada negociación de compras'] },
                ].map(({ titulo, color, icon, items }) => (
                  <div key={titulo} className="bg-[#1a2230] rounded-xl p-3.5">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-[15px]">{icon}</span>
                      <span className="text-[12px] font-semibold" style={{ color }}>{titulo}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {items.map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: color }}/>
                          <span className="text-[11px] text-[#5f6f80] leading-snug">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          INVENTARIO VALORIZADO
      ══════════════════════════════════════════════════ */}
      {tab === 'inventario' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
              Inventario Valorizado — Método {formulaValorizacion}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-[#9ba8b6]">Total: <span className="text-[#00c896] font-semibold">{formatCurrency(valorTotal, simboloMoneda)}</span></span>
              <Btn variant="secondary" size="sm" onClick={exportarInventario}><Download size={13}/>CSV</Btn>
              <Btn variant="secondary" size="sm"
                onClick={async()=>{ await exportarInventarioXLSX(productos, categorias, almacenes, formulaValorizacion, simboloMoneda, calcularPMP, valorarStock) }}
                style={{background:'#1e7b47',color:'#fff',borderColor:'#1e7b47'}}>
                <Download size={13}/>Excel
              </Btn>
              <Btn variant="secondary" size="sm"
                onClick={async()=>{ await exportarInventarioPDF(productos, categorias, almacenes, formulaValorizacion, simboloMoneda, calcularPMP, valorarStock, config?.empresa) }}
                style={{background:'#c0392b',color:'#fff',borderColor:'#c0392b'}}>
                <Download size={13}/>PDF
              </Btn>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full border-collapse text-[13px]">
              <thead><tr>
                <TH c="SKU"/><TH c="Producto"/><TH c="Categoría"/>
                <TH c="Stock" r/><TH c="U.M."/>
                <TH c="Costo PMP" r/><TH c="P. Venta" r/><TH c="Margen %" r/>
                <TH c="Valor Stock" r/><TH c="% Total" r/><TH c="ABC" center/>
              </tr></thead>
              <tbody>
                {abc.map(p => {
                  const margenColor = p.margenNum === null ? '#5f6f80'
                    : p.margenNum >= 20 ? '#22c55e'
                    : p.margenNum >= 0  ? '#f59e0b'
                    : '#ef4444'
                  return (
                    <tr key={p.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#00c896]">{p.sku}</td>
                      <td className="px-3.5 py-2.5 font-medium text-[#e8edf2] max-w-[160px] truncate">{p.nombre}</td>
                      <td className="px-3.5 py-2.5 text-[#9ba8b6]">{p.catNombre}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-right">{p.stockActual}</td>
                      <td className="px-3.5 py-2.5 text-[#9ba8b6]">{p.unidadMedida}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-right text-[#9ba8b6]">{formatCurrency(p.pmp, simboloMoneda)}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-right">
                        {(p.precioVenta||0) > 0
                          ? <span className="text-[#e8edf2]">{formatCurrency(p.precioVenta, simboloMoneda)}</span>
                          : <span className="text-[#5f6f80] text-[11px]">—</span>
                        }
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-right font-semibold" style={{ color: margenColor }}>
                        {p.margenNum !== null ? `${p.margenNum.toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-right font-semibold text-[#00c896]">{formatCurrency(p.valorStock, simboloMoneda)}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-right text-[#9ba8b6]">
                        {valorTotal > 0 ? ((p.valorStock / valorTotal) * 100).toFixed(1) : 0}%
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <Badge variant={p.abc==='A'?'success':p.abc==='B'?'info':'neutral'}>{p.abc}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MOVIMIENTOS POR PERÍODO
      ══════════════════════════════════════════════════ */}
      {tab === 'movimientos' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-1">Entradas y Salidas por Mes</div>
          <div className="flex gap-4 text-[11px] text-[#5f6f80] mb-4">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#00c896]"/>Entradas</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-400"/>Salidas</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={movMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mes" tick={{ fill:'#5f6f80', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#5f6f80', fontSize:11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${simboloMoneda}${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TT} formatter={v => formatCurrency(v, simboloMoneda)} />
              <Line type="monotone" dataKey="entradas" stroke="#00c896" strokeWidth={2} dot={{ r:3, fill:'#00c896' }} name="Entradas" />
              <Line type="monotone" dataKey="salidas"  stroke="#ef4444" strokeWidth={2} dot={{ r:3, fill:'#ef4444' }} name="Salidas" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ANÁLISIS ABC
      ══════════════════════════════════════════════════ */}
      {tab === 'abc' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5 flex flex-col gap-5">

          {/* Título */}
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
            Análisis ABC de Inventario
          </span>

          {/* ── KPIs por clase con datos reales ─────────── */}
          <div className="grid grid-cols-3 gap-4">
            {[['A','80% del valor','#22c55e'],['B','15% del valor','#3b82f6'],['C','5% del valor','#5f6f80']].map(([cls,desc,color]) => {
              const items = abc.filter(p => p.abc === cls)
              const valor = items.reduce((s, p) => s + p.valorStock, 0)
              return (
                <div key={cls} className="bg-[#1a2230] rounded-xl p-4" style={{ borderLeft:`3px solid ${color}` }}>
                  <div className="text-[22px] font-bold mb-1" style={{ color }}>Clase {cls}</div>
                  <div className="text-[12px] text-[#9ba8b6] mb-3">{desc}</div>
                  <div className="text-[13px]"><span className="font-semibold text-[#e8edf2]">{items.length}</span> productos</div>
                  <div className="text-[13px] font-mono text-[#e8edf2]">{formatCurrency(valor, simboloMoneda)}</div>
                </div>
              )
            })}
          </div>

          {/* ── Tabla detallada ──────────────────────────── */}
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full border-collapse text-[13px]">
              <thead><tr><TH c="Clase"/><TH c="SKU"/><TH c="Producto"/><TH c="Stock" r/><TH c="Valor" r/><TH c="% Acum." r/></tr></thead>
              <tbody>
                {abc.map((p, i) => {
                  const acum = abc.slice(0, i + 1).reduce((s, x) => s + x.valorStock, 0)
                  return (
                    <tr key={p.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                      <td className="px-3.5 py-2.5"><Badge variant={p.abc==='A'?'success':p.abc==='B'?'info':'neutral'}>{p.abc}</Badge></td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#00c896]">{p.sku}</td>
                      <td className="px-3.5 py-2.5 font-medium text-[#e8edf2]">{p.nombre}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-right">{p.stockActual} {p.unidadMedida}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-right text-[#00c896] font-semibold">{formatCurrency(p.valorStock, simboloMoneda)}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-right text-[#9ba8b6]">{valorTotal > 0 ? ((acum/valorTotal)*100).toFixed(1) : 0}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ════════════════════════════════════════════════════════
              GUÍA DIDÁCTICA — aparece en la parte inferior
              visible para el usuario, debajo de la tabla.
              Conserva ambos paneles originales: definición y uso.
              ════════════════════════════════════════════════════════ */}

          {/* Panel A: ¿Qué es la clasificación ABC? */}
          <div className="flex items-start gap-4 px-5 py-4 rounded-xl" style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.20)'}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-blue-400 text-[13px] leading-none" style={{background:'rgba(59,130,246,0.15)'}}>
              ABC
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-[#e8edf2] mb-1">¿Qué es la Clasificación ABC?</div>
              <div className="text-[12px] text-[#9ba8b6] leading-relaxed mb-3">
                Es una técnica de gestión de inventario basada en el{' '}
                <strong className="text-[#e8edf2]">Principio de Pareto (regla 80/20)</strong>:
                unos pocos productos concentran la mayor parte del valor del stock.
                El sistema analiza el valor de cada producto y lo clasifica automáticamente en una de tres clases.
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {[
                  { cls:'A', pct:'80%', color:'#22c55e', titulo:'Clase A — Alto valor',   desc:'Son el 20% de los productos pero representan el 80% del valor total. Requieren control riguroso, conteos físicos frecuentes, stock de seguridad alto y negociación activa con proveedores.' },
                  { cls:'B', pct:'15%', color:'#3b82f6', titulo:'Clase B — Valor medio',  desc:'Representan el 15% del valor. Requieren control moderado, revisiones periódicas y reorden por punto de pedido estándar. Son importantes pero no críticos.' },
                  { cls:'C', pct:'5%',  color:'#5f6f80', titulo:'Clase C — Bajo valor',   desc:'Son muchos productos pero solo el 5% del valor. Control mínimo, pedidos en lotes grandes para reducir costos operativos. Menor frecuencia de conteo físico.' },
                ].map(({ cls, pct, color, titulo, desc }) => (
                  <div key={cls} className="bg-[#1a2230] rounded-xl p-3.5" style={{ borderTop:`3px solid ${color}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[15px] font-bold" style={{ color }}>Clase {cls}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background:`${color}20`, color }}>{pct} del valor</span>
                    </div>
                    <div className="text-[11px] font-semibold text-[#e8edf2] mb-1">{titulo}</div>
                    <div className="text-[11px] text-[#5f6f80] leading-relaxed">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panel B: ¿Cómo usar el análisis ABC? */}
          <div className="flex items-start gap-4 px-5 py-4 rounded-xl" style={{background:'rgba(0,200,150,0.08)',border:'1px solid rgba(0,200,150,0.20)'}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{background:'rgba(0,200,150,0.15)'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00c896" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-[#e8edf2] mb-1">¿Cómo usar este análisis en tu negocio?</div>
              <div className="text-[12px] text-[#9ba8b6] leading-relaxed mb-3">
                El objetivo es <strong className="text-[#e8edf2]">enfocar los recursos donde más importa</strong>.
                No todos los productos merecen el mismo nivel de atención — el ABC te dice exactamente cuáles sí.
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {[
                  { titulo:'Compras y presupuesto', color:'#22c55e', icon:'💰',
                    items:['Concentra el presupuesto en productos Clase A', 'Negocia mejores precios con proveedores de A', 'Mantén stock de seguridad más alto para la Clase A', 'Revisa los Clase C: ¿se pueden eliminar o consolidar?'] },
                  { titulo:'Control de inventario', color:'#3b82f6', icon:'📋',
                    items:['Clase A → conteo físico mensual o semanal', 'Clase B → conteo trimestral', 'Clase C → conteo semestral o anual', 'Automatiza el reorden de Clase A con alertas de stock mínimo'] },
                  { titulo:'Estrategia operativa', color:'#f59e0b', icon:'🎯',
                    items:['Dedica más tiempo del equipo a los productos A', 'Clase C: pide en lotes grandes, menos órdenes', 'Un C puede ascender a A — revisa periódicamente', 'Usa este reporte antes de cada negociación de compras'] },
                ].map(({ titulo, color, icon, items }) => (
                  <div key={titulo} className="bg-[#1a2230] rounded-xl p-3.5">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-[15px]">{icon}</span>
                      <span className="text-[12px] font-semibold" style={{ color }}>{titulo}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {items.map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: color }}/>
                          <span className="text-[11px] text-[#5f6f80] leading-snug">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ROTACIÓN POR CATEGORÍA
      ══════════════════════════════════════════════════ */}
      {tab === 'rotacion' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Rotación de Stock por Categoría</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rotacion} layout="vertical">
              <XAxis type="number" tick={{ fill:'#5f6f80', fontSize:11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${simboloMoneda}${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="nombre" tick={{ fill:'#9ba8b6', fontSize:12 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip contentStyle={TT} formatter={v => formatCurrency(v, simboloMoneda)} />
              <Bar dataKey="valor" fill="#00c896" radius={[0, 4, 4, 0]} name="Valor Salidas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
