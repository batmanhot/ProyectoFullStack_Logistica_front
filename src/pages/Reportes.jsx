import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { Download } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, clasificarABC, formatDate } from '../utils/helpers'
import { valorarStock, calcularPMP } from '../utils/valorizacion'
import { Badge, Btn } from '../components/ui/index'

const TT = { background:'#1a2230', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, fontSize:12, color:'#e8edf2' }
const TH = ({c,r})=><th className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/[0.08] sticky top-0 ${r?'text-right':'text-left'}`}>{c}</th>

const TABS = [
  ['inventario',  'Inventario Valorizado'],
  ['movimientos', 'Movimientos por Período'],
  ['abc',         'Análisis ABC'],
  ['rotacion',    'Rotación por Categoría'],
]

export default function Reportes() {
  const { productos, movimientos, categorias, formulaValorizacion, simboloMoneda } = useApp()
  const [tab, setTab] = useState('inventario')

  const inventario = useMemo(() =>
    productos.filter(p => p.activo !== false).map(p => ({
      ...p,
      pmp:        calcularPMP(p.batches || []),
      valorStock: valorarStock(p.batches || [], formulaValorizacion),
      catNombre:  categorias.find(c => c.id === p.categoriaId)?.nombre || '—',
    })).sort((a, b) => b.valorStock - a.valorStock)
  , [productos, categorias, formulaValorizacion])

  const abc = useMemo(() => clasificarABC(inventario), [inventario])
  const valorTotal = inventario.reduce((s, p) => s + p.valorStock, 0)

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

  const rotacion = useMemo(() => {
    const map = {}
    categorias.forEach(c => { map[c.id] = { nombre: c.nombre, salidas: 0, valor: 0 } })
    movimientos.filter(m => m.tipo === 'SALIDA').forEach(m => {
      const p = productos.find(x => x.id === m.productoId)
      if (p && map[p.categoriaId]) { map[p.categoriaId].salidas += m.cantidad; map[p.categoriaId].valor += m.costoTotal }
    })
    return Object.values(map).sort((a, b) => b.valor - a.valor)
  }, [movimientos, productos, categorias])

  function exportarInventario() {
    const rows = [['SKU','Producto','Categoría','Stock','U.M.','Costo PMP','Valor Stock','ABC']]
    abc.forEach(p => rows.push([p.sku, p.nombre, p.catNombre, p.stockActual, p.unidadMedida, p.pmp.toFixed(2), p.valorStock.toFixed(2), p.abc]))
    rows.push(['','','','','','TOTAL', valorTotal.toFixed(2), ''])
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' }))
    a.download = `inventario_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-white/[0.08]">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-all whitespace-nowrap
              ${tab === id ? 'text-[#00c896] border-[#00c896]' : 'text-[#5f6f80] border-transparent hover:text-[#9ba8b6]'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Inventario Valorizado ─────────────────────── */}
      {tab === 'inventario' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
              Inventario Valorizado — Método {formulaValorizacion}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-[#9ba8b6]">
                Total: <span className="text-[#00c896] font-semibold">{formatCurrency(valorTotal, simboloMoneda)}</span>
              </span>
              <Btn variant="secondary" size="sm" onClick={exportarInventario}><Download size={13}/>CSV</Btn>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full border-collapse text-[13px]">
              <thead><tr>
                <TH c="SKU"/><TH c="Producto"/><TH c="Categoría"/>
                <TH c="Stock" r/><TH c="U.M."/><TH c="Costo PMP" r/>
                <TH c="Valor Stock" r/><TH c="% Total" r/><TH c="ABC"/>
              </tr></thead>
              <tbody>
                {abc.map(p => (
                  <tr key={p.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#00c896]">{p.sku}</td>
                    <td className="px-3.5 py-2.5 font-medium">{p.nombre}</td>
                    <td className="px-3.5 py-2.5 text-[#9ba8b6]">{p.catNombre}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-right">{p.stockActual}</td>
                    <td className="px-3.5 py-2.5 text-[#9ba8b6]">{p.unidadMedida}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-right">{formatCurrency(p.pmp, simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-right font-semibold text-[#00c896]">{formatCurrency(p.valorStock, simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-right text-[#9ba8b6]">
                      {valorTotal > 0 ? ((p.valorStock / valorTotal) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Badge variant={p.abc==='A'?'success':p.abc==='B'?'info':'neutral'}>{p.abc}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Movimientos por Período ───────────────────── */}
      {tab === 'movimientos' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-1">Entradas y Salidas por Mes</div>
          <div className="flex gap-4 text-[11px] text-[#5f6f80] mb-4">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#00c896] inline-block"/>Entradas</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block"/>Salidas</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={movMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mes" tick={{ fill:'#5f6f80', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#5f6f80', fontSize:11 }} axisLine={false} tickLine={false}
                tickFormatter={v => formatCurrency(v, simboloMoneda).replace(' ', '')} />
              <Tooltip contentStyle={TT} formatter={v => formatCurrency(v, simboloMoneda)} />
              <Line type="monotone" dataKey="entradas" stroke="#00c896" strokeWidth={2} dot={{ r:3, fill:'#00c896' }} name="Entradas" />
              <Line type="monotone" dataKey="salidas"  stroke="#ef4444" strokeWidth={2} dot={{ r:3, fill:'#ef4444' }} name="Salidas" />
            </LineChart>
          </ResponsiveContainer>

          {/* Panel explicativo */}
          <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#00c896]/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[#00c896] text-[13px] font-bold">?</span>
            </div>
            <div className="flex-1">
              <div className="text-[12px] font-semibold text-[#e8edf2] mb-1">¿Para qué sirve este reporte?</div>
              <p className="text-[12px] text-[#9ba8b6] leading-relaxed mb-3">
                Muestra la <strong className="text-[#e8edf2]">evolución mensual del flujo de mercadería</strong>: cuánto ingresó (entradas en verde)
                versus cuánto salió (salidas en rojo) valorizado en soles. Permite identificar los meses de mayor actividad,
                detectar estacionalidades y comparar si las compras están alineadas con las ventas.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['📈 Tendencia de compras', 'Si la línea verde sube, estás reponiendo más. Útil para ver si anticipas la demanda.'],
                  ['📉 Tendencia de ventas', 'Si la línea roja baja, tus salidas disminuyen. Puede indicar sobrestock o baja demanda.'],
                  ['⚖️ Balance mensual', 'Cuando entradas y salidas se cruzan, tu stock se mantiene estable. Si divergen, revisa tu política de compras.'],
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
      )}

      {/* ── Análisis ABC ──────────────────────────────── */}
      {tab === 'abc' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Análisis ABC de Inventario</div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              ['A','80% del valor — máximo control','#22c55e'],
              ['B','15% del valor — control moderado','#3b82f6'],
              ['C','5% del valor — control mínimo','#5f6f80'],
            ].map(([cls, desc, color]) => {
              const items = abc.filter(p => p.abc === cls)
              const valor = items.reduce((s, p) => s + p.valorStock, 0)
              return (
                <div key={cls} className="bg-[#1a2230] rounded-xl p-4" style={{ borderLeft: `3px solid ${color}` }}>
                  <div className="text-[24px] font-bold mb-1" style={{ color }}>Clase {cls}</div>
                  <div className="text-[12px] text-[#9ba8b6] mb-3">{desc}</div>
                  <div className="text-[13px]"><span className="font-semibold text-[#e8edf2]">{items.length}</span> productos</div>
                  <div className="text-[13px] font-mono text-[#e8edf2]">{formatCurrency(valor, simboloMoneda)}</div>
                </div>
              )
            })}
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full border-collapse text-[13px]">
              <thead><tr>
                <TH c="Clase"/><TH c="SKU"/><TH c="Producto"/>
                <TH c="Stock" r/><TH c="Valor" r/><TH c="% Acum." r/>
              </tr></thead>
              <tbody>
                {abc.map((p, i) => {
                  const acum = abc.slice(0, i + 1).reduce((s, x) => s + x.valorStock, 0)
                  return (
                    <tr key={p.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                      <td className="px-3.5 py-2.5">
                        <Badge variant={p.abc==='A'?'success':p.abc==='B'?'info':'neutral'}>{p.abc}</Badge>
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#00c896]">{p.sku}</td>
                      <td className="px-3.5 py-2.5 font-medium">{p.nombre}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-right">{p.stockActual} {p.unidadMedida}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-right text-[#00c896] font-semibold">{formatCurrency(p.valorStock, simboloMoneda)}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-right text-[#9ba8b6]">
                        {valorTotal > 0 ? ((acum / valorTotal) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Panel explicativo */}
          <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-amber-400 text-[13px] font-bold">?</span>
            </div>
            <div className="flex-1">
              <div className="text-[12px] font-semibold text-[#e8edf2] mb-1">¿Para qué sirve el Análisis ABC?</div>
              <p className="text-[12px] text-[#9ba8b6] leading-relaxed mb-3">
                El <strong className="text-[#e8edf2]">Análisis ABC</strong> clasifica tu inventario según el principio de Pareto:
                el 20% de los productos concentra el 80% del valor. Te ayuda a priorizar dónde enfocar el control,
                la atención y el presupuesto de compras.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['🟢 Clase A — Alta prioridad', 'Representan el 80% del valor total. Requieren control estricto: revisión frecuente, stock de seguridad alto y proveedor confiable.'],
                  ['🔵 Clase B — Prioridad media', 'Representan el 15% del valor. Control moderado: revisión periódica y reposición planificada sin urgencia.'],
                  ['⚫ Clase C — Baja prioridad', 'Representan solo el 5% del valor. Control mínimo: se pueden pedir en grandes lotes con poca frecuencia.'],
                ].map(([t, d]) => (
                  <div key={t} className="bg-[#1a2230] rounded-lg p-3">
                    <div className="text-[11px] font-semibold text-[#e8edf2] mb-1">{t}</div>
                    <div className="text-[11px] text-[#9ba8b6] leading-snug">{d}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#5f6f80] mt-3 leading-relaxed">
                <strong className="text-[#9ba8b6]">Acción recomendada:</strong> Los productos Clase A deben tener siempre
                stock de seguridad configurado, punto de reorden activo y proveedor alternativo identificado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Rotación por Categoría ────────────────────── */}
      {tab === 'rotacion' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Rotación de Stock por Categoría</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rotacion} layout="vertical">
              <XAxis type="number" tick={{ fill:'#5f6f80', fontSize:11 }} axisLine={false} tickLine={false}
                tickFormatter={v => formatCurrency(v, simboloMoneda).replace(' ', '')} />
              <YAxis type="category" dataKey="nombre" tick={{ fill:'#9ba8b6', fontSize:12 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip contentStyle={TT} formatter={v => formatCurrency(v, simboloMoneda)} />
              <Bar dataKey="valor" fill="#00c896" radius={[0, 4, 4, 0]} name="Valor Salidas" />
            </BarChart>
          </ResponsiveContainer>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08] mt-4">
            <table className="w-full border-collapse text-[13px]">
              <thead><tr>
                <TH c="Categoría"/>
                <TH c="Cant. Salidas" r/>
                <TH c="Valor Salidas" r/>
              </tr></thead>
              <tbody>
                {rotacion.map(r => (
                  <tr key={r.nombre} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3.5 py-2.5 font-medium">{r.nombre}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-right">{r.salidas.toFixed(2)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-right text-[#00c896] font-semibold">{formatCurrency(r.valor, simboloMoneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Panel explicativo */}
          <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-purple-400 text-[13px] font-bold">?</span>
            </div>
            <div className="flex-1">
              <div className="text-[12px] font-semibold text-[#e8edf2] mb-1">¿Para qué sirve la Rotación por Categoría?</div>
              <p className="text-[12px] text-[#9ba8b6] leading-relaxed mb-3">
                Mide <strong className="text-[#e8edf2]">cuánto se vendió o despachó de cada categoría</strong> en el período analizado,
                expresado en valor monetario. Te ayuda a identificar qué líneas de producto generan más movimiento
                y cuáles tienen rotación lenta (posible sobrestock o baja demanda).
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['🔄 Alta rotación', 'Categorías con barras largas: alta demanda, necesitan reposición frecuente y stock de seguridad. Prioriza su abastecimiento.'],
                  ['🐢 Baja rotación', 'Categorías con barras cortas o sin barras: poca salida. Evalúa si hay sobrestock, productos obsoletos o estacionalidad.'],
                  ['📊 Presupuesto', 'Asigna mayor presupuesto de compras a las categorías de mayor rotación para garantizar disponibilidad continua.'],
                ].map(([t, d]) => (
                  <div key={t} className="bg-[#1a2230] rounded-lg p-3">
                    <div className="text-[11px] font-semibold text-[#e8edf2] mb-1">{t}</div>
                    <div className="text-[11px] text-[#9ba8b6] leading-snug">{d}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#5f6f80] mt-3 leading-relaxed">
                <strong className="text-[#9ba8b6]">Consejo:</strong> Combina este reporte con el Análisis ABC — las categorías
                de alta rotación suelen contener los productos Clase A que merecen mayor atención en tu gestión de inventario.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
