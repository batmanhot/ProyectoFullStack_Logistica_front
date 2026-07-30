import { useState, useMemo } from 'react'
import { Search, Layers, Hash, Package, Calendar, TrendingDown } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, diasParaVencer } from '../utils/helpers'
import { Badge, EmptyState } from '../components/ui/index'
import { useProductosList } from '../queries/productos.queries'
import { useLotesList } from '../queries/lotes.queries'
import { useInventarioList } from '../queries/inventario.queries'
import { useCategoriasList } from '../queries/categorias.queries'

const simboloMoneda = 'S/'

const TH = ({ c, r }) => (
  <th className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/8 ${r ? 'text-right' : 'text-left'}`}>{c}</th>
)

const ESTADO_BADGE = { Vigente: 'success', 'Por Vencer': 'warning', Vencido: 'danger' }

export default function LotesSeries() {
  const { toast } = useApp()

  const { data: productos  = [] } = useProductosList()
  const { data: categorias = [] } = useCategoriasList()
  const { data: inventario = [] } = useInventarioList()

  const [productoId, setProductoId] = useState('')
  const [busqueda,   setBusqueda]   = useState('')

  const { data: lotes = [], isLoading: loadingLotes } = useLotesList(productoId || undefined)

  const stockMap = useMemo(() => {
    const m = {}
    inventario.forEach(i => { m[i.productoId] = (m[i.productoId] || 0) + Number(i.cantidad || 0) })
    return m
  }, [inventario])

  const productosFilt = useMemo(() => {
    const q = busqueda.toLowerCase()
    return productos.filter(p =>
      p.estado === 'Activo' &&
      (!busqueda || p.nombre?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
    )
  }, [productos, busqueda])

  const prod = productos.find(p => p.id === productoId)

  const kpis = useMemo(() => {
    if (!prod) return null
    const stockActual = stockMap[prod.id] || 0
    const pmp         = Number(prod.precioCompra || 0)
    const conVenc     = lotes.filter(l => l.fechaVencimiento).sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento))
    return {
      stockActual,
      pmp,
      valorActual: stockActual * pmp,
      loteCount:   lotes.length,
      fechaMasProxima: conVenc[0]?.fechaVencimiento || null,
    }
  }, [prod, stockMap, lotes])

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* ── Buscador de producto ── */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Seleccionar Producto</div>
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
          <input
            className="pl-8 w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] font-[inherit] placeholder-[#5f6f80]"
            placeholder="Buscar SKU o nombre..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        {busqueda && (
          <div className="mt-2 bg-[#1a2230] rounded-xl border border-white/8 max-h-48 overflow-y-auto">
            {productosFilt.length === 0
              ? <div className="text-center text-[12px] text-[#5f6f80] py-4">Sin resultados</div>
              : productosFilt.map(p => (
                <button key={p.id}
                  onClick={() => { setProductoId(p.id); setBusqueda('') }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/3 transition-colors border-b border-white/5 last:border-0 ${productoId === p.id ? 'bg-[#00c896]/5' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#e8edf2]">{p.nombre}</div>
                    <div className="text-[11px] text-[#5f6f80] font-mono">
                      {p.sku} · {categorias.find(c => c.id === p.categoriaId)?.nombre || '—'}
                    </div>
                  </div>
                  <div className="text-[11px] text-[#00c896] font-mono shrink-0">
                    {stockMap[p.id] || 0} {p.unidadMedida}
                  </div>
                </button>
              ))
            }
          </div>
        )}
      </div>

      {!prod && !busqueda && (
        <EmptyState icon={Layers} title="Selecciona un producto" description="Busca un producto para ver el detalle de sus lotes y trazabilidad."/>
      )}

      {prod && (
        <>
          {/* ── KPIs del producto ── */}
          <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[16px] font-bold text-[#e8edf2]">{prod.nombre}</div>
                <div className="text-[12px] text-[#5f6f80] mt-0.5 font-mono">
                  {prod.sku} · {categorias.find(c => c.id === prod.categoriaId)?.nombre || '—'}
                </div>
              </div>
              {kpis?.fechaMasProxima && (
                <Badge variant={diasParaVencer(kpis.fechaMasProxima) < 0 ? 'danger' : diasParaVencer(kpis.fechaMasProxima) <= 30 ? 'warning' : 'success'}>
                  Vence: {formatDate(kpis.fechaMasProxima)}
                </Badge>
              )}
            </div>

            {kpis && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Stock actual',   val: `${kpis.stockActual} ${prod.unidadMedida || 'UND'}`, color: '#00c896' },
                  { label: 'Costo unitario', val: formatCurrency(kpis.pmp, simboloMoneda),             color: '#3b82f6', mono: true },
                  { label: 'Valor en stock', val: formatCurrency(kpis.valorActual, simboloMoneda),     color: '#00c896', mono: true },
                  { label: 'Lotes reg.',     val: kpis.loteCount,                                      color: '#9ba8b6' },
                ].map(({ label, val, color, mono }) => (
                  <div key={label} className="bg-[#1a2230] rounded-xl p-3 text-center">
                    <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-1.5">{label}</div>
                    <div className={`font-semibold ${mono ? 'text-[17px] font-mono' : 'text-[28px]'}`} style={{ color }}>{val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Tabla de lotes ── */}
          <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4 flex items-center gap-2">
              <Hash size={12}/>
              Lotes registrados {lotes.length > 0 && `— ${lotes.length} lote${lotes.length > 1 ? 's' : ''}`}
            </div>

            {loadingLotes && (
              <div className="text-center text-[12px] text-[#5f6f80] py-6">Cargando lotes...</div>
            )}

            {!loadingLotes && lotes.length === 0 && (
              <EmptyState icon={Package} title="Sin lotes registrados"
                description="Este producto no tiene lotes registrados en el sistema."/>
            )}

            {lotes.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-white/8">
                <table className="w-full border-collapse text-[12px]">
                  <thead><tr>
                    <TH c="N° Lote"/>
                    <TH c="F. Vencimiento"/>
                    <TH c="Cantidad original" r/>
                    <TH c="Cantidad actual" r/>
                    <TH c="Consumido" r/>
                    <TH c="Estado"/>
                  </tr></thead>
                  <tbody>
                    {lotes.map(l => {
                      const orig = Number(l.cantidadOriginal || 0)
                      const act  = Number(l.cantidadActual  || 0)
                      const cons = orig - act
                      const pct  = orig > 0 ? Math.round((cons / orig) * 100) : 0
                      return (
                        <tr key={l.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                          <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#00c896] font-semibold">{l.numero}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">
                            {l.fechaVencimiento ? (
                              <span style={{ color: diasParaVencer(l.fechaVencimiento) < 0 ? '#ef4444' : diasParaVencer(l.fechaVencimiento) <= 30 ? '#f59e0b' : '#9ba8b6' }}>
                                {formatDate(l.fechaVencimiento)}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-[#e8edf2]">
                            {orig} <span className="text-[#5f6f80] text-[10px]">{prod.unidadMedida}</span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[#00c896]">
                            {act} <span className="text-[#5f6f80] text-[10px]">{prod.unidadMedida}</span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-12 h-1.5 bg-[#0e1117] rounded-full overflow-hidden">
                                <div className="h-full bg-[#ef4444] rounded-full" style={{ width: `${pct}%` }}/>
                              </div>
                              <span className="font-mono text-[11px] text-[#5f6f80]">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <Badge variant={ESTADO_BADGE[l.estado] || 'neutral'} size="sm">{l.estado || 'Vigente'}</Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/8">
                      <td colSpan={2} className="px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase">Total</td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[#e8edf2]">
                        {lotes.reduce((s, l) => s + Number(l.cantidadOriginal || 0), 0)} <span className="text-[#5f6f80] text-[10px]">{prod.unidadMedida}</span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[#00c896]">
                        {lotes.reduce((s, l) => s + Number(l.cantidadActual || 0), 0)} <span className="text-[#5f6f80] text-[10px]">{prod.unidadMedida}</span>
                      </td>
                      <td colSpan={2}/>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
