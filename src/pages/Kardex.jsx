import { useState, useMemo } from 'react'
import { Search, Download, BookOpen, ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, RotateCcw, ArrowRightLeft } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate } from '../utils/helpers'
import { valorarStock, calcularPMP } from '../utils/valorizacion'
import { Badge, Btn, EmptyState } from '../components/ui/index'
import * as storage from '../services/storage'

const TIPO_META = {
  'ENTRADA':       { label: 'Entrada',       color: 'success', Icon: ArrowDownToLine  },
  'SALIDA':        { label: 'Salida',        color: 'danger',  Icon: ArrowUpFromLine  },
  'AJUSTE':        { label: 'Ajuste',        color: 'info',    Icon: SlidersHorizontal},
  'TRANSFERENCIA': { label: 'Transfer.',     color: 'neutral', Icon: ArrowRightLeft   },
  'TRANSFER-OUT':  { label: 'Transfer. sal.',color: 'neutral', Icon: ArrowRightLeft   },
  'TRANSFER-IN':   { label: 'Transfer. ent.',color: 'teal',    Icon: ArrowRightLeft   },
}

export default function Kardex() {
  const { productos, categorias, formulaValorizacion, simboloMoneda } = useApp()
  const [productoId, setProductoId] = useState('')
  const [busqueda, setBusqueda]     = useState('')
  const [filtDesde, setFiltDesde]   = useState('')
  const [filtHasta, setFiltHasta]   = useState('')

  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return productos.filter(p =>
      p.activo !== false && (
        !busqueda || p.nombre?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
      )
    )
  }, [productos, busqueda])

  const prod = productos.find(p => p.id === productoId)

  const lineasKardex = useMemo(() => {
    if (!productoId) return []
    let lines = storage.getKardex(productoId)
    if (filtDesde) lines = lines.filter(l => l.fecha >= filtDesde)
    if (filtHasta) lines = lines.filter(l => l.fecha <= filtHasta)
    // Calcular valorización acumulada corriente (saldo × costo unitario de la línea)
    // Para FIFO/LIFO el costoUnit ya viene calculado desde el motor de valorización
    return lines.map(l => ({
      ...l,
      valorAcum: Math.round(l.saldo * l.costoUnit * 100) / 100,
    }))
  }, [productoId, filtDesde, filtHasta])

  const resumen = useMemo(() => {
    if (!prod) return null
    const pmp        = calcularPMP(prod.batches || [])
    const valorAct   = valorarStock(prod.batches || [], formulaValorizacion)
    const totalEntradas = lineasKardex.reduce((s, l) => s + l.entrada, 0)
    const totalSalidas  = lineasKardex.reduce((s, l) => s + l.salida, 0)
    return { pmp, valorAct, totalEntradas, totalSalidas }
  }, [prod, lineasKardex, formulaValorizacion])

  function exportarCSV() {
    if (!prod || !lineasKardex.length) return
    const rows = [['Fecha','Tipo','Documento','Motivo','Entrada','Salida','Saldo','Costo Unit.',`Valoriz. ${formulaValorizacion}`]]
    lineasKardex.forEach(l => rows.push([
      l.fecha, l.tipo, l.documento, l.motivo,
      l.entrada || 0, l.salida || 0, l.saldo, l.costoUnit.toFixed(2),
      (l.valorAcum || 0).toFixed(2),
    ]))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' }))
    a.download = `kardex_${prod.sku}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const SI  = 'px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
  const SEL = SI + ' pr-8'
  const catNombre = id => categorias.find(c => c.id === id)?.nombre || '—'

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* Selector de producto */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          Seleccionar Producto
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI + ' pl-8 w-full'} placeholder="Buscar por nombre o SKU..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <select className={SEL} style={{ minWidth: 240 }} value={productoId}
            onChange={e => setProductoId(e.target.value)}>
            <option value="">— Seleccionar producto —</option>
            {productosFiltrados.map(p => (
              <option key={p.id} value={p.id}>{p.sku} — {p.nombre} (Stock: {p.stockActual} {p.unidadMedida})</option>
            ))}
          </select>
        </div>

        {/* Info rápida del producto */}
        {prod && resumen && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
            {[
              ['Producto',    prod.nombre],
              ['SKU',         prod.sku],
              ['Categoría',   catNombre(prod.categoriaId)],
              ['Stock actual',`${prod.stockActual} ${prod.unidadMedida}`],
              ['Costo PMP',   formatCurrency(resumen.pmp, simboloMoneda)],
              ['Valor stock', formatCurrency(resumen.valorAct, simboloMoneda)],
              ['Total entradas (filtro)', `${resumen.totalEntradas} ${prod.unidadMedida}`],
              ['Total salidas (filtro)',  `${resumen.totalSalidas} ${prod.unidadMedida}`],
            ].map(([k, v]) => (
              <div key={k} className="bg-[#1a2230] rounded-lg px-3 py-2.5">
                <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">{k}</div>
                <div className="text-[13px] font-medium text-[#e8edf2]">{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kardex */}
      {prod && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
                Kardex — {prod.nombre}
              </span>
              <span className="ml-2 text-[11px] text-[#5f6f80]">Método: <span className="text-[#00c896]">{formulaValorizacion}</span></span>
            </div>
            <div className="flex gap-2 items-center">
              <input type="date" className={SI} style={{ width: 140 }} value={filtDesde}
                onChange={e => setFiltDesde(e.target.value)} placeholder="Desde"/>
              <input type="date" className={SI} style={{ width: 140 }} value={filtHasta}
                onChange={e => setFiltHasta(e.target.value)} placeholder="Hasta"/>
              {(filtDesde || filtHasta) && (
                <Btn variant="ghost" size="sm" onClick={() => { setFiltDesde(''); setFiltHasta('') }}>
                  Limpiar
                </Btn>
              )}
              <Btn variant="secondary" size="sm" onClick={exportarCSV} disabled={!lineasKardex.length}>
                <Download size={13}/> CSV
              </Btn>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {['N°','Fecha','Tipo','Documento','Motivo','Entrada','Salida','Saldo','Costo Unit.','Valor Saldo','Valorización'].map(h => (
                    <th key={h} className={`bg-[#1a2230] px-3 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/[0.08] whitespace-nowrap ${['Entrada','Salida','Saldo','Costo Unit.','Valor Saldo','Valorización'].includes(h) ? 'text-right' : 'text-left'}`}>
                      {h === 'Valorización' ? <>{h}<br/><span className="text-[9px] text-[#5f6f80] normal-case tracking-normal font-normal">({formulaValorizacion})</span></> : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineasKardex.length === 0 && (
                  <tr><td colSpan={11}>
                    <EmptyState icon={BookOpen}
                      title="Sin movimientos"
                      description={filtDesde || filtHasta ? 'Sin movimientos en el período seleccionado.' : 'Este producto aún no tiene movimientos registrados.'}/>
                  </td></tr>
                )}
                {lineasKardex.map((l, i) => {
                  const meta = TIPO_META[l.tipo] || TIPO_META['ENTRADA']
                  const Icon = meta.Icon
                  const valorSaldo = l.saldo * l.costoUnit
                  return (
                    <tr key={i} className={`border-b border-white/[0.06] last:border-0 transition-colors ${
                      l.entrada > 0 ? 'hover:bg-green-500/[0.02]' :
                      l.salida  > 0 ? 'hover:bg-red-500/[0.02]'   : 'hover:bg-white/[0.02]'
                    }`}>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-[#5f6f80]">{i + 1}</td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-[#9ba8b6] whitespace-nowrap">{formatDate(l.fecha)}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={meta.color}>
                          <Icon size={9}/> {meta.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-[#00c896]">{l.documento}</td>
                      <td className="px-3 py-2.5 text-[12px] text-[#9ba8b6] max-w-[200px] truncate" title={l.motivo}>
                        {l.motivo}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-right">
                        {l.entrada > 0
                          ? <span className="text-green-400 font-semibold">+{l.entrada}</span>
                          : <span className="text-[#5f6f80]">—</span>
                        }
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-right">
                        {l.salida > 0
                          ? <span className="text-red-400 font-semibold">-{l.salida}</span>
                          : <span className="text-[#5f6f80]">—</span>
                        }
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-right">
                        <span className={`font-semibold ${l.saldo <= 0 ? 'text-red-400' : 'text-[#e8edf2]'}`}>
                          {l.saldo}
                        </span>
                        <span className="text-[#5f6f80] text-[11px] ml-1">{prod.unidadMedida}</span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-right text-[#9ba8b6]">
                        {formatCurrency(l.costoUnit, simboloMoneda)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-right text-[#00c896] font-semibold">
                        {formatCurrency(valorSaldo, simboloMoneda)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-right">
                        <span className="text-[#e8edf2] font-semibold">{formatCurrency(l.valorAcum, simboloMoneda)}</span>
                        <span className="block text-[10px] text-[#5f6f80] font-normal">{formulaValorizacion}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {lineasKardex.length > 0 && (
                <tfoot>
                  <tr className="bg-[#1a2230] border-t border-white/[0.12]">
                    <td colSpan={5} className="px-3 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide">
                      Totales del período
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-right text-green-400 font-semibold">
                      +{lineasKardex.reduce((s, l) => s + l.entrada, 0)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-right text-red-400 font-semibold">
                      -{lineasKardex.reduce((s, l) => s + l.salida, 0)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-right font-semibold text-[#e8edf2]">
                      {lineasKardex.length > 0 ? lineasKardex[lineasKardex.length - 1].saldo : '—'}
                      <span className="text-[#5f6f80] text-[11px] ml-1">{prod.unidadMedida}</span>
                    </td>
                    <td className="px-3 py-2.5"/>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-right text-[#00c896] font-semibold">
                      {lineasKardex.length > 0
                        ? formatCurrency(lineasKardex[lineasKardex.length - 1].saldo * (lineasKardex[lineasKardex.length - 1].costoUnit || 0), simboloMoneda)
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-right">
                      <span className="text-[#00c896] font-bold text-[13px]">
                        {lineasKardex.length > 0
                          ? formatCurrency(lineasKardex[lineasKardex.length - 1].valorAcum || 0, simboloMoneda)
                          : '—'}
                      </span>
                      <span className="block text-[10px] text-[#5f6f80]">{formulaValorizacion}</span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Estado inicial sin producto */}
      {!prod && (
        <div className="flex-1 flex items-center justify-center py-16">
          <div className="text-center">
            <BookOpen size={52} className="text-[#5f6f80] opacity-20 mx-auto mb-4"/>
            <p className="text-[14px] font-medium text-[#9ba8b6] mb-1">Selecciona un producto</p>
            <p className="text-[12px] text-[#5f6f80]">Elige un producto arriba para ver su Kardex completo con saldos históricos.</p>
          </div>
        </div>
      )}
    </div>
  )
}
