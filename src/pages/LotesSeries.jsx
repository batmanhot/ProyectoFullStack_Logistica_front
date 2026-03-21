import { useState, useMemo } from 'react'
import { Search, Layers, ArrowDownToLine, ArrowUpFromLine, Hash } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, diasParaVencer } from '../utils/helpers'
import { calcularPMP } from '../utils/valorizacion'
import { Badge, EmptyState } from '../components/ui/index'
import * as storage from '../services/storage'

const TH = ({c,r}) => <th className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/[0.08] ${r?'text-right':'text-left'}`}>{c}</th>

export default function LotesSeries() {
  const { productos, categorias, simboloMoneda } = useApp()
  const [productoId, setProductoId] = useState('')
  const [busqueda,   setBusqueda]   = useState('')

  const productosFilt = useMemo(() => {
    const q = busqueda.toLowerCase()
    return productos.filter(p => p.activo!==false && (!busqueda || p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)))
  }, [productos, busqueda])

  const prod = productos.find(p => p.id === productoId)

  const lotes = useMemo(() => {
    if (!productoId) return []
    return storage.getLotesProducto(productoId).data || []
  }, [productoId])

  // Lotes desde batches del producto (valorización)
  const batches = useMemo(() => {
    if (!prod) return []
    return (prod.batches || []).map(b => ({
      ...b,
      saldo: b.cantidad,
      valorTotal: b.cantidad * b.costo,
    }))
  }, [prod])

  const kpis = useMemo(() => {
    if (!prod) return null
    const pmp  = calcularPMP(prod.batches || [])
    const tEnt = lotes.reduce((s,l) => s + l.entradas, 0)
    const tSal = lotes.reduce((s,l) => s + l.salidas,  0)
    return { pmp, tEnt, tSal, loteCount: lotes.length }
  }, [prod, lotes])

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Seleccionar Producto</div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className="pl-8 w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] font-[inherit] placeholder-[#5f6f80]"
              placeholder="Buscar SKU o nombre..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
          </div>
        </div>
        {busqueda && (
          <div className="mt-2 bg-[#1a2230] rounded-xl border border-white/[0.08] max-h-48 overflow-y-auto">
            {productosFilt.length === 0
              ? <div className="text-center text-[12px] text-[#5f6f80] py-4">Sin resultados</div>
              : productosFilt.map(p => (
                <button key={p.id} onClick={() => { setProductoId(p.id); setBusqueda('') }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors border-b border-white/[0.05] last:border-0 ${productoId===p.id?'bg-[#00c896]/5':''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#e8edf2]">{p.nombre}</div>
                    <div className="text-[11px] text-[#5f6f80] font-mono">{p.sku} · {categorias.find(c=>c.id===p.categoriaId)?.nombre}</div>
                  </div>
                  <div className="text-[11px] text-[#00c896] font-mono shrink-0">{p.stockActual} {p.unidadMedida}</div>
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
          <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[16px] font-bold text-[#e8edf2]">{prod.nombre}</div>
                <div className="text-[12px] text-[#5f6f80] mt-0.5 font-mono">{prod.sku} · {categorias.find(c=>c.id===prod.categoriaId)?.nombre}</div>
              </div>
              {prod.tieneVencimiento && prod.fechaVencimiento && (
                <Badge variant={diasParaVencer(prod.fechaVencimiento) < 0 ? 'danger' : diasParaVencer(prod.fechaVencimiento) <= 30 ? 'warning' : 'success'}>
                  Vence: {formatDate(prod.fechaVencimiento)}
                </Badge>
              )}
            </div>
            {kpis && (
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label:'Stock actual',   val:`${prod.stockActual} ${prod.unidadMedida}`, color:'#00c896' },
                  { label:'Costo PMP',      val:formatCurrency(kpis.pmp, simboloMoneda),   color:'#3b82f6', mono:true },
                  { label:'Total entradas', val:kpis.tEnt,                                color:'#22c55e' },
                  { label:'Total salidas',  val:kpis.tSal,                                color:'#ef4444' },
                ].map(({label,val,color,mono})=>(
                  <div key={label} className="bg-[#1a2230] rounded-xl p-3 text-center">
                    <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-1.5">{label}</div>
                    <div className={`font-bold ${mono?'text-[13px] font-mono':'text-[18px]'}`} style={{color}}>{val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Batches (lotes de valorización) */}
          {batches.length > 0 && (
            <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
              <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">
                Lotes en stock — {batches.length} lote{batches.length>1?'s':''}
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
                <table className="w-full border-collapse text-[12px]">
                  <thead><tr>
                    <TH c="Lote"/><TH c="Fecha entrada"/><TH c="Cantidad" r/><TH c="Costo unit." r/><TH c="Valor total" r/>
                  </tr></thead>
                  <tbody>
                    {batches.map((b,i) => (
                      <tr key={b.id||i} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]">
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#00c896] font-semibold">{b.lote||`LOTE-${String(i+1).padStart(3,'0')}`}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">{formatDate(b.fecha)}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-[#e8edf2]">{b.cantidad} <span className="text-[#5f6f80] text-[10px]">{prod.unidadMedida}</span></td>
                        <td className="px-3.5 py-2.5 text-right font-mono text-[#9ba8b6]">{formatCurrency(b.costo, simboloMoneda)}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-[#00c896]">{formatCurrency(b.valorTotal, simboloMoneda)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/[0.08]">
                      <td colSpan={2} className="px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase">Total en stock</td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[#e8edf2]">{batches.reduce((s,b)=>s+b.cantidad,0)} <span className="text-[#5f6f80] text-[10px]">{prod.unidadMedida}</span></td>
                      <td/>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[#00c896]">{formatCurrency(batches.reduce((s,b)=>s+b.valorTotal,0), simboloMoneda)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Historial de movimientos por lote */}
          {lotes.length > 0 && (
            <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
              <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">
                Trazabilidad por lote — movimientos históricos
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
                <table className="w-full border-collapse text-[12px]">
                  <thead><tr>
                    <TH c="Lote"/><TH c="1er ingreso"/><TH c="Últ. mov."/>
                    <TH c="Entradas" r/><TH c="Salidas" r/><TH c="Saldo" r/>
                    <TH c="Costo unit." r/>
                  </tr></thead>
                  <tbody>
                    {lotes.map((l,i) => {
                      const saldoColor = l.saldo<=0?'#ef4444':l.saldo<=(prod.stockMinimo/lotes.length)?'#f59e0b':'#00c896'
                      return (
                        <tr key={i} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]">
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-2">
                              <Hash size={11} className="text-[#5f6f80]"/>
                              <span className="font-mono text-[11px] text-[#00c896] font-semibold">{l.lote}</span>
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">{formatDate(l.fechaEntrada)}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">{formatDate(l.fechaUltMov)}</td>
                          <td className="px-3.5 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1 text-green-400">
                              <ArrowDownToLine size={10}/>
                              <span className="font-mono font-semibold">{l.entradas}</span>
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1 text-red-400">
                              <ArrowUpFromLine size={10}/>
                              <span className="font-mono font-semibold">{l.salidas}</span>
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold" style={{color:saldoColor}}>{l.saldo}</td>
                          <td className="px-3.5 py-2.5 text-right font-mono text-[#9ba8b6]">{formatCurrency(l.costo, simboloMoneda)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
