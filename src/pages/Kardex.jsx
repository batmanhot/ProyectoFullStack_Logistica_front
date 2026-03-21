import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, Download, BookOpen, ArrowDownToLine, ArrowUpFromLine,
         SlidersHorizontal, RotateCcw, ArrowRightLeft, X } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate } from '../utils/helpers'
import { valorarStock, calcularPMP } from '../utils/valorizacion'
import { Badge, Btn, EmptyState } from '../components/ui/index'
import * as storage from '../services/storage'

const TIPO_META = {
  'ENTRADA':       { label:'Entrada',       color:'success', Icon:ArrowDownToLine   },
  'SALIDA':        { label:'Salida',        color:'danger',  Icon:ArrowUpFromLine   },
  'AJUSTE':        { label:'Ajuste',        color:'info',    Icon:SlidersHorizontal },
  'TRANSFERENCIA': { label:'Transfer.',     color:'neutral', Icon:ArrowRightLeft    },
  'TRANSFER-OUT':  { label:'Transfer.Sal.', color:'neutral', Icon:ArrowRightLeft    },
  'TRANSFER-IN':   { label:'Transfer.Ent.', color:'teal',    Icon:ArrowRightLeft    },
}

export default function Kardex() {
  const { productos, categorias, formulaValorizacion, simboloMoneda } = useApp()

  // ── Estado del buscador ───────────────────────────────
  const [productoId,  setProductoId]  = useState('')
  const [busqueda,    setBusqueda]    = useState('')
  const [dropOpen,    setDropOpen]    = useState(false)
  const [filtDesde,   setFiltDesde]   = useState('')
  const [filtHasta,   setFiltHasta]   = useState('')
  const searchRef = useRef(null)

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handler(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Producto seleccionado actualmente
  const prod = productos.find(p => p.id === productoId)

  // ── Sugerencias de búsqueda ───────────────────────────
  const sugerencias = useMemo(() => {
    if (!busqueda.trim()) return []
    const q = busqueda.toLowerCase()
    return productos
      .filter(p => p.activo !== false && (
        p.nombre?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
      ))
      .slice(0, 10)
  }, [productos, busqueda])

  // Seleccionar producto desde el dropdown
  function seleccionarProducto(p) {
    setProductoId(p.id)
    setBusqueda(p.sku + ' — ' + p.nombre)
    setDropOpen(false)
    setFiltDesde('')
    setFiltHasta('')
  }

  // Limpiar selección
  function limpiarSeleccion() {
    setProductoId('')
    setBusqueda('')
    setDropOpen(false)
  }

  // ── Líneas del kardex ─────────────────────────────────
  // getKardex retorna en orden ASCENDENTE (necesario para calcular saldos)
  // Después de obtener las líneas con saldos correctos, invertimos para mostrar
  // el más reciente primero (descendente).
  // Normaliza cualquier formato de fecha a YYYY-MM-DD para comparación segura
  function toYMD(f) {
    if (!f) return '0000-00-00'
    const s = String(f).trim()
    if (s[2] === '/') return `${s.slice(6,10)}-${s.slice(3,5)}-${s.slice(0,2)}`
    return s.slice(0,10)
  }

  const lineasKardex = useMemo(() => {
    if (!productoId) return []

    // 1. Obtener líneas en orden ASC (para cálculo correcto de saldo acumulado)
    let lines = storage.getKardex(productoId)

    // 2. Aplicar filtro de fechas con normalización de formato
    if (filtDesde) lines = lines.filter(l => toYMD(l.fecha) >= filtDesde)
    if (filtHasta) lines = lines.filter(l => toYMD(l.fecha) <= filtHasta)

    // 3. Agregar valorización acumulada (saldo × costoUnit)
    const lineasConValor = lines.map(l => ({
      ...l,
      valorAcum: Math.round(l.saldo * l.costoUnit * 100) / 100,
    }))

    // Orden ASC: más antiguo primero (cronológico contable)
    return lineasConValor
  }, [productoId, filtDesde, filtHasta])

  // ── Resumen del producto ──────────────────────────────
  const resumen = useMemo(() => {
    if (!prod) return null
    const pmp           = calcularPMP(prod.batches || [])
    const valorAct      = valorarStock(prod.batches || [], formulaValorizacion)
    // Usar líneas sin invertir para totales correctos
    const todasLineas   = productoId ? storage.getKardex(productoId) : []
    const filtradas     = todasLineas
      .filter(l => (!filtDesde || toYMD(l.fecha) >= filtDesde) && (!filtHasta || toYMD(l.fecha) <= filtHasta))
    const totalEntradas = filtradas.reduce((s, l) => s + l.entrada, 0)
    const totalSalidas  = filtradas.reduce((s, l) => s + l.salida, 0)
    return { pmp, valorAct, totalEntradas, totalSalidas }
  }, [prod, productoId, filtDesde, filtHasta, formulaValorizacion])

  function exportarCSV() {
    if (!prod || !lineasKardex.length) return
    const rows = [['N°','Fecha','Tipo','Documento','Motivo','Entrada','Salida','Saldo','Costo Unit.',`Valoriz. ${formulaValorizacion}`]]
    lineasKardex.forEach((l, i) => rows.push([
      i + 1, l.fecha, l.tipo, l.documento, l.motivo,
      l.entrada || 0, l.salida || 0, l.saldo,
      l.costoUnit.toFixed(2), (l.valorAcum || 0).toFixed(2),
    ]))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], { type:'text/csv' }))
    a.download = `kardex_${prod.sku}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const SI  = 'px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
  const catNombre = id => categorias.find(c => c.id === id)?.nombre || '—'

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* ── Selector de producto con buscador autocomplete ── */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          Seleccionar Producto
        </div>

        <div ref={searchRef} className="relative">
          {/* Input de búsqueda */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input
              className={SI + ' pl-9 w-full pr-10'}
              placeholder="Escribe nombre o SKU para buscar..."
              value={busqueda}
              onChange={e => {
                setBusqueda(e.target.value)
                setDropOpen(true)
                // Si borra el texto, limpia la selección
                if (!e.target.value) setProductoId('')
              }}
              onFocus={() => { if (busqueda) setDropOpen(true) }}
            />
            {/* Botón limpiar */}
            {(busqueda || productoId) && (
              <button
                onClick={limpiarSeleccion}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6f80] hover:text-[#9ba8b6] transition-colors">
                <X size={14}/>
              </button>
            )}
          </div>

          {/* Dropdown de sugerencias */}
          {dropOpen && sugerencias.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#1a2230] border border-white/[0.12] rounded-xl shadow-2xl z-50 overflow-hidden max-h-72 overflow-y-auto">
              {sugerencias.map(p => {
                const isSelected = p.id === productoId
                return (
                  <button key={p.id}
                    onClick={() => seleccionarProducto(p)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-white/[0.05] last:border-0
                      ${isSelected ? 'bg-[#00c896]/10' : 'hover:bg-white/[0.04]'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-[#00c896] font-bold">{p.sku}</span>
                        <span className="text-[13px] font-medium text-[#e8edf2] truncate">{p.nombre}</span>
                      </div>
                      <div className="text-[11px] text-[#5f6f80] mt-0.5">
                        {catNombre(p.categoriaId)} · Stock: <span className={p.stockActual <= 0 ? 'text-red-400' : p.stockActual <= p.stockMinimo ? 'text-amber-400' : 'text-[#00c896]'}>{p.stockActual} {p.unidadMedida}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-[#00c896] flex items-center justify-center shrink-0">
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="#082e1e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Sin resultados */}
          {dropOpen && busqueda.trim() && sugerencias.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#1a2230] border border-white/[0.12] rounded-xl shadow-2xl z-50 px-4 py-3 text-[12px] text-[#5f6f80]">
              Sin productos con "{busqueda}"
            </div>
          )}
        </div>

        {/* Info rápida del producto seleccionado */}
        {prod && resumen && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {[
              ['Producto',     prod.nombre],
              ['SKU',          prod.sku],
              ['Categoría',    catNombre(prod.categoriaId)],
              ['Stock actual', `${prod.stockActual} ${prod.unidadMedida}`],
              ['Costo PMP',    formatCurrency(resumen.pmp, simboloMoneda)],
              ['Valor stock',  formatCurrency(resumen.valorAct, simboloMoneda)],
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

      {/* ── Tabla Kardex ────────────────────────────────── */}
      {prod && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
                Kardex — {prod.nombre}
              </span>
              <span className="ml-2 text-[11px] text-[#5f6f80]">
                Método: <span className="text-[#00c896]">{formulaValorizacion}</span>
              </span>
              <span className="ml-3 text-[11px] text-[#3d4f60]">
                Orden cronológico ↑ (más antiguo primero)
              </span>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <input type="date" className={SI} style={{ width:140 }} value={filtDesde}
                onChange={e => setFiltDesde(e.target.value)}/>
              <input type="date" className={SI} style={{ width:140 }} value={filtHasta}
                onChange={e => setFiltHasta(e.target.value)}/>
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
                    <th key={h} className={`bg-[#1a2230] px-3 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/[0.08] whitespace-nowrap
                      ${['Entrada','Salida','Saldo','Costo Unit.','Valor Saldo','Valorización'].includes(h) ? 'text-right' : 'text-left'}`}>
                      {h === 'Valorización'
                        ? <>{h}<br/><span className="text-[9px] normal-case tracking-normal font-normal">({formulaValorizacion})</span></>
                        : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineasKardex.length === 0 && (
                  <tr><td colSpan={11}>
                    <EmptyState icon={BookOpen}
                      title="Sin movimientos"
                      description={filtDesde || filtHasta
                        ? 'Sin movimientos en el período seleccionado.'
                        : 'Este producto aún no tiene movimientos registrados.'}/>
                  </td></tr>
                )}
                {lineasKardex.map((l, i) => {
                  const meta      = TIPO_META[l.tipo] || TIPO_META['ENTRADA']
                  const Icon      = meta.Icon
                  const valorSaldo = l.saldo * l.costoUnit
                  const numFila = i + 1
                  return (
                    <tr key={i} className={`border-b border-white/[0.06] last:border-0 transition-colors ${
                      l.entrada > 0 ? 'hover:bg-green-500/[0.02]' :
                      l.salida  > 0 ? 'hover:bg-red-500/[0.02]'   : 'hover:bg-white/[0.02]'
                    }`}>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-[#5f6f80]">{numFila}</td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-[#9ba8b6] whitespace-nowrap">{formatDate(l.fecha)}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={meta.color}><Icon size={9}/> {meta.label}</Badge>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-[#00c896]">{l.documento}</td>
                      <td className="px-3 py-2.5 text-[12px] text-[#9ba8b6] max-w-[200px] truncate" title={l.motivo}>{l.motivo}</td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-right">
                        {l.entrada > 0
                          ? <span className="text-green-400 font-semibold">+{l.entrada}</span>
                          : <span className="text-[#5f6f80]">—</span>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-right">
                        {l.salida > 0
                          ? <span className="text-red-400 font-semibold">-{l.salida}</span>
                          : <span className="text-[#5f6f80]">—</span>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-right">
                        <span className={`font-semibold ${l.saldo <= 0 ? 'text-red-400' : 'text-[#e8edf2]'}`}>{l.saldo}</span>
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
              {lineasKardex.length > 0 && (() => {
                // El saldo más reciente está al final (último elemento en orden ASC)
                const ultima = lineasKardex[lineasKardex.length - 1]
                return (
                  <tfoot>
                    <tr className="bg-[#1a2230] border-t border-white/[0.12]">
                      <td colSpan={5} className="px-3 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide">
                        Totales del período · Saldo actual
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-right text-green-400 font-semibold">
                        +{lineasKardex.reduce((s, l) => s + l.entrada, 0)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-right text-red-400 font-semibold">
                        -{lineasKardex.reduce((s, l) => s + l.salida, 0)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-right font-semibold text-[#e8edf2]">
                        {ultima.saldo}
                        <span className="text-[#5f6f80] text-[11px] ml-1">{prod.unidadMedida}</span>
                      </td>
                      <td className="px-3 py-2.5"/>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-right text-[#00c896] font-semibold">
                        {formatCurrency(ultima.saldo * ultima.costoUnit, simboloMoneda)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-right">
                        <span className="text-[#00c896] font-bold text-[13px]">
                          {formatCurrency(ultima.valorAcum || 0, simboloMoneda)}
                        </span>
                        <span className="block text-[10px] text-[#5f6f80]">{formulaValorizacion}</span>
                      </td>
                    </tr>
                  </tfoot>
                )
              })()}
            </table>
          </div>
        </div>
      )}

      {/* Estado inicial — sin producto seleccionado */}
      {!prod && (
        <div className="flex-1 flex items-center justify-center py-16">
          <div className="text-center">
            <BookOpen size={52} className="text-[#5f6f80] opacity-20 mx-auto mb-4"/>
            <p className="text-[14px] font-medium text-[#9ba8b6] mb-1">Selecciona un producto</p>
            <p className="text-[12px] text-[#5f6f80]">Escribe el nombre o SKU en el buscador para ver su Kardex completo.</p>
          </div>
        </div>
      )}
    </div>
  )
}
