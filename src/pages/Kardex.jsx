import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, Download, BookOpen, ArrowDownToLine, ArrowUpFromLine,
         SlidersHorizontal, RotateCcw, ArrowRightLeft, X } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate } from '../utils/helpers'
import { Badge, Btn, EmptyState } from '../components/ui/index'
import { useKardex } from '../queries/movimientos.queries'
import { useProductosList } from '../queries/productos.queries'
import { useCategoriasList } from '../queries/categorias.queries'

const TIPO_META = {
  'ENTRADA':       { label:'Entrada',       color:'success', Icon:ArrowDownToLine   },
  'SALIDA':        { label:'Salida',        color:'danger',  Icon:ArrowUpFromLine   },
  'AJUSTE':        { label:'Ajuste',        color:'info',    Icon:SlidersHorizontal },
  'TRANSFERENCIA': { label:'Transfer.',     color:'neutral', Icon:ArrowRightLeft    },
  'DEVOLUCION':    { label:'Devolución',    color:'warning', Icon:RotateCcw         },
}

export default function Kardex() {
  const { sesion } = useApp()
  const simboloMoneda    = 'S/'
  const formulaValorizacion = 'Precio Compra'

  const { data: productos  = [] } = useProductosList()
  const { data: categorias = [] } = useCategoriasList()

  const [productoId, setProductoId] = useState('')
  const [busqueda,   setBusqueda]   = useState('')
  const [dropOpen,   setDropOpen]   = useState(false)
  const [filtDesde,  setFiltDesde]  = useState('')
  const [filtHasta,  setFiltHasta]  = useState('')
  const searchRef = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Kardex del backend ────────────────────────────────
  const { data: kardexRaw = [], isLoading: loadingKardex } = useKardex({
    productoId,
    desde: filtDesde || undefined,
    hasta: filtHasta || undefined,
  })

  const prod = useMemo(() => productos.find(p => p.id === productoId), [productos, productoId])

  const sugerencias = useMemo(() => {
    if (!busqueda.trim()) return []
    const q = busqueda.toLowerCase()
    return productos
      .filter(p => p.estado === 'Activo' && (p.nombre?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)))
      .slice(0, 10)
  }, [productos, busqueda])

  function seleccionarProducto(p) {
    setProductoId(p.id)
    setBusqueda(p.sku + ' — ' + p.nombre)
    setDropOpen(false)
    setFiltDesde('')
    setFiltHasta('')
  }

  function limpiarSeleccion() {
    setProductoId('')
    setBusqueda('')
    setDropOpen(false)
  }

  // Procesamos el kardex: el backend ya devuelve líneas en orden.
  // Cada línea puede tener: { fecha, tipo, documento, motivo, entrada, salida, saldo, costoUnit, valorAcum }
  // o puede ser un movimiento raw: { tipo, cantidad, direccion, ... }
  const lineasKardex = useMemo(() => {
    if (!productoId || !kardexRaw.length) return []
    // Si el backend devuelve kardex procesado (tiene campo saldo), usarlo directamente
    if ('saldo' in (kardexRaw[0] || {})) {
      return kardexRaw.map(l => ({
        ...l,
        valorAcum: Math.round(Number(l.saldo || 0) * Number(l.costoUnit || l.costoUnitario || 0) * 100) / 100,
      }))
    }
    // Si devuelve movimientos raw, construir el kardex con saldo acumulado
    let saldo = 0
    return kardexRaw.map(m => {
      const esEntrada = m.tipo === 'ENTRADA' || (m.tipo === 'AJUSTE' && m.direccion === 'incremento')
      const esSalida  = m.tipo === 'SALIDA'  || (m.tipo === 'AJUSTE' && m.direccion === 'decremento')
      const entrada   = esEntrada ? Number(m.cantidad || 0) : 0
      const salida    = esSalida  ? Number(m.cantidad || 0) : 0
      saldo += entrada - salida
      const costoUnit = Number(m.costoUnitario || 0)
      return {
        fecha:     m.fecha || m.createdAt,
        tipo:      m.tipo,
        documento: m.documento,
        motivo:    m.motivo,
        entrada,
        salida,
        saldo,
        costoUnit,
        valorAcum: Math.round(saldo * costoUnit * 100) / 100,
      }
    })
  }, [kardexRaw, productoId])

  const resumen = useMemo(() => {
    if (!prod || !lineasKardex.length) return null
    const totalEntradas = lineasKardex.reduce((s, l) => s + (l.entrada || 0), 0)
    const totalSalidas  = lineasKardex.reduce((s, l) => s + (l.salida  || 0), 0)
    const stockActual   = lineasKardex[lineasKardex.length - 1]?.saldo || 0
    const costoUnit     = lineasKardex[lineasKardex.length - 1]?.costoUnit || Number(prod.precioCompra || 0)
    const valorAct      = stockActual * costoUnit
    return { totalEntradas, totalSalidas, stockActual, valorAct, pmp: costoUnit }
  }, [prod, lineasKardex])

  function exportarCSV() {
    if (!prod || !lineasKardex.length) return
    const rows = [['N°','Fecha','Tipo','Documento','Motivo','Entrada','Salida','Saldo',`Costo Unit.`,`Valoriz. ${formulaValorizacion}`]]
    lineasKardex.forEach((l, i) => rows.push([
      i + 1, formatDate(l.fecha), l.tipo, l.documento, l.motivo,
      l.entrada || 0, l.salida || 0, l.saldo,
      Number(l.costoUnit || 0).toFixed(2), (l.valorAcum || 0).toFixed(2),
    ]))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], { type:'text/csv' }))
    a.download = `kardex_${prod.sku}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const SI       = 'px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
  const catNombre = id => categorias.find(c => c.id === id)?.nombre || '—'

  // Mostrar más reciente primero
  const lineasMostrar = [...lineasKardex].reverse()

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* ── Selector de producto ── */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">Seleccionar Producto</div>
        <div ref={searchRef} className="relative">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI + ' pl-9 w-full pr-10'} placeholder="Escribe nombre o SKU para buscar..."
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setDropOpen(true); if (!e.target.value) setProductoId('') }}
              onFocus={() => { if (busqueda) setDropOpen(true) }}/>
            {(busqueda || productoId) && (
              <button onClick={limpiarSeleccion} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6f80] hover:text-[#e8edf2]"><X size={14}/></button>
            )}
          </div>
          {dropOpen && sugerencias.length > 0 && (
            <div className="absolute z-30 w-full mt-1 bg-[#1a2230] border border-white/8 rounded-xl shadow-xl overflow-hidden">
              {sugerencias.map(p => (
                <button key={p.id} onClick={() => seleccionarProducto(p)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left transition-colors">
                  <div>
                    <div className="text-[13px] font-medium text-[#e8edf2]">{p.nombre}</div>
                    <div className="text-[11px] text-[#5f6f80]">{p.sku} · {catNombre(p.categoriaId)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resumen del producto */}
      {prod && resumen && (
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[16px] font-semibold text-[#e8edf2]">{prod.nombre}</div>
              <div className="text-[12px] text-[#5f6f80]">{prod.sku} · {catNombre(prod.categoriaId)}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge color={prod.estado === 'Activo' ? 'success' : 'neutral'}>{prod.estado || 'Activo'}</Badge>
              <Btn variant="ghost" size="sm" onClick={exportarCSV} disabled={!lineasKardex.length}><Download size={13}/> CSV</Btn>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Stock actual', `${resumen.stockActual} ${prod.unidadMedida || 'UND'}`, '#00c896'],
              [`Valor (${formulaValorizacion})`, formatCurrency(resumen.valorAct, simboloMoneda), '#00c896'],
              ['Total entradas', resumen.totalEntradas, '#22c55e'],
              ['Total salidas',  resumen.totalSalidas,  '#ef4444'],
            ].map(([label, val, color]) => (
              <div key={label} className="bg-[#1a2230] rounded-lg px-3.5 py-3">
                <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-1">{label}</div>
                <div className="font-semibold text-[#e8edf2] text-[15px]" style={{ color }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros de fecha + tabla */}
      {productoId && (
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
              Movimientos del Kardex · <span className="text-[#00c896]">{lineasKardex.length} registros</span>
            </span>
            <div className="flex gap-2 items-center">
              <span className="text-[11px] text-[#5f6f80]">Desde</span>
              <input type="date" className={SI + ' !w-auto !py-[4px] text-[12px]'} value={filtDesde} onChange={e => setFiltDesde(e.target.value)}/>
              <span className="text-[11px] text-[#5f6f80]">Hasta</span>
              <input type="date" className={SI + ' !w-auto !py-[4px] text-[12px]'} value={filtHasta} onChange={e => setFiltHasta(e.target.value)}/>
              {(filtDesde || filtHasta) && <Btn variant="ghost" size="sm" onClick={() => { setFiltDesde(''); setFiltHasta('') }}><X size={12}/></Btn>}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full border-collapse text-[12px]">
              <thead><tr>
                {['N°','Fecha','Tipo','Documento','Motivo','Entrada','Salida','Saldo','Costo Unit.','Valor Acum.'].map((h, i) => (
                  <th key={h} className={`bg-[#1a2230] px-3 py-2.5 text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/8 ${[5,6,7,8,9].includes(i) ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loadingKardex && <tr><td colSpan={10} className="text-center text-[#5f6f80] py-6 text-[12px]">Cargando kardex...</td></tr>}
                {!loadingKardex && lineasMostrar.length === 0 && (
                  <tr><td colSpan={10}><EmptyState icon={BookOpen} title="Sin movimientos" description="No hay movimientos en el período seleccionado."/></td></tr>
                )}
                {lineasMostrar.map((l, i) => {
                  const meta   = TIPO_META[l.tipo] || { label: l.tipo, color:'neutral', Icon: SlidersHorizontal }
                  const esEnt  = (l.entrada || 0) > 0
                  const esSal  = (l.salida  || 0) > 0
                  const nroLinea = lineasMostrar.length - i
                  return (
                    <tr key={i} className="border-b border-white/6 last:border-0 hover:bg-white/2">
                      <td className="px-3 py-2 text-[#5f6f80]">{nroLinea}</td>
                      <td className="px-3 py-2 font-mono text-[#9ba8b6]">{formatDate(l.fecha)}</td>
                      <td className="px-3 py-2">
                        <Badge color={meta.color} size="xs">{meta.label}</Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-[#00c896]">{l.documento || '—'}</td>
                      <td className="px-3 py-2 text-[#9ba8b6] max-w-[160px] truncate">{l.motivo || '—'}</td>
                      <td className="px-3 py-2 font-mono text-right font-semibold text-green-400">{esEnt ? `+${l.entrada}` : '—'}</td>
                      <td className="px-3 py-2 font-mono text-right font-semibold text-red-400">{esSal ? `-${l.salida}` : '—'}</td>
                      <td className="px-3 py-2 font-mono text-right font-bold text-[#e8edf2]">{l.saldo}</td>
                      <td className="px-3 py-2 font-mono text-right text-[#9ba8b6]">{formatCurrency(Number(l.costoUnit || 0), simboloMoneda)}</td>
                      <td className="px-3 py-2 font-mono text-right text-[#00c896] font-semibold">{formatCurrency(l.valorAcum || 0, simboloMoneda)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Estado vacío inicial */}
      {!productoId && (
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-12">
          <EmptyState icon={BookOpen} title="Selecciona un producto" description="Busca un producto por SKU o nombre para ver su kardex completo."/>
        </div>
      )}
    </div>
  )
}
