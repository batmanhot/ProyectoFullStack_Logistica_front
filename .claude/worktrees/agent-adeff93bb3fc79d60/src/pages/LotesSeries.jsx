import { useState, useMemo } from 'react'
import { Search, Layers, Hash, Package } from 'lucide-react'
import { formatCurrency, formatDate, diasParaVencer } from '../utils/helpers'
import { Badge, EmptyState, Input, DataTable } from '../components/ui/index'
import { useProductosList } from '../queries/productos.queries'
import { useLotesList } from '../queries/lotes.queries'
import { useInventarioList } from '../queries/inventario.queries'
import { useCategoriasList } from '../queries/categorias.queries'

const simboloMoneda = 'S/'

const ESTADO_BADGE = { Vigente: 'success', 'Por Vencer': 'warning', Vencido: 'danger' }

export default function LotesSeries() {
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
          <Input
            className="pl-8"
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

            <DataTable
              loading={loadingLotes}
              rows={lotes}
              rowKey={l => l.id}
              emptyIcon={Package}
              emptyTitle="Sin lotes registrados"
              emptyDescription="Este producto no tiene lotes registrados en el sistema."
              columns={[
                { key: 'numero', header: 'N° Lote', render: l => <span className="font-mono text-[11px] text-[#00c896] font-semibold">{l.numero}</span> },
                { key: 'venc', header: 'F. Vencimiento', render: l => (
                    l.fechaVencimiento ? (
                      <span className="font-mono text-[11px]" style={{ color: diasParaVencer(l.fechaVencimiento) < 0 ? '#ef4444' : diasParaVencer(l.fechaVencimiento) <= 30 ? '#f59e0b' : '#9ba8b6' }}>
                        {formatDate(l.fechaVencimiento)}
                      </span>
                    ) : <span className="text-[#5f6f80]">—</span>
                  ) },
                { key: 'orig', header: 'Cantidad original', align: 'right', render: l => (
                    <span className="font-mono font-semibold text-[#e8edf2]">{Number(l.cantidadOriginal || 0)} <span className="text-[#5f6f80] text-[10px]">{prod.unidadMedida}</span></span>
                  ) },
                { key: 'act', header: 'Cantidad actual', align: 'right', render: l => (
                    <span className="font-mono font-bold text-[#00c896]">{Number(l.cantidadActual || 0)} <span className="text-[#5f6f80] text-[10px]">{prod.unidadMedida}</span></span>
                  ) },
                { key: 'consumido', header: 'Consumido', align: 'right', render: l => {
                    const orig = Number(l.cantidadOriginal || 0)
                    const act  = Number(l.cantidadActual  || 0)
                    const pct  = orig > 0 ? Math.round(((orig - act) / orig) * 100) : 0
                    return (
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1.5 bg-[#0e1117] rounded-full overflow-hidden">
                          <div className="h-full bg-[#ef4444] rounded-full" style={{ width: `${pct}%` }}/>
                        </div>
                        <span className="font-mono text-[11px] text-[#5f6f80]">{pct}%</span>
                      </div>
                    )
                  } },
                { key: 'estado', header: 'Estado', render: l => <Badge variant={ESTADO_BADGE[l.estado] || 'neutral'} size="sm">{l.estado || 'Vigente'}</Badge> },
              ]}
              footerRow={[
                <span key="t" className="text-[11px] font-semibold text-[#5f6f80] uppercase">Total</span>,
                '',
                <span key="o" className="font-mono font-bold text-[#e8edf2]">{lotes.reduce((s, l) => s + Number(l.cantidadOriginal || 0), 0)} <span className="text-[#5f6f80] text-[10px]">{prod.unidadMedida}</span></span>,
                <span key="a" className="font-mono font-bold text-[#00c896]">{lotes.reduce((s, l) => s + Number(l.cantidadActual || 0), 0)} <span className="text-[#5f6f80] text-[10px]">{prod.unidadMedida}</span></span>,
                '',
                '',
              ]}
            />
          </div>
        </>
      )}

      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Lotes y Series?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[
            ['1. Buscar producto', 'Escribe el SKU o nombre para elegir el producto cuya trazabilidad por lote quieres revisar.'],
            ['2. Ver lotes', 'Cada lote muestra su cantidad original, la cantidad actual disponible y el % ya consumido de ese lote específico.'],
            ['3. Controlar vencimientos', 'La fecha de vencimiento se resalta en ámbar o rojo según qué tan cerca esté, para priorizar la salida de esos lotes primero (FEFO).'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
