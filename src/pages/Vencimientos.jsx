import { useMemo, useState } from 'react'
import { AlertTriangle, Clock, CheckCircle, Package, Filter } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, diasParaVencer } from '../utils/helpers'
import { valorarStock } from '../utils/valorizacion'
import { Badge, Btn, EmptyState } from '../components/ui/index'
import { useNavigate } from 'react-router-dom'

const RANGOS = [
  { key: 'vencido',   label: 'Vencidos',          dias: [-Infinity, -1], color: '#ef4444', badge: 'danger'  },
  { key: 'critico',   label: 'Crítico (0–15 días)',dias: [0,  15],        color: '#ef4444', badge: 'danger'  },
  { key: 'urgente',   label: 'Urgente (16–30 días)',dias: [16, 30],       color: '#f59e0b', badge: 'warning' },
  { key: 'proximo',   label: 'Próximo (31–90 días)',dias: [31, 90],       color: '#3b82f6', badge: 'info'    },
  { key: 'normal',    label: 'Normal (> 90 días)', dias: [91, Infinity],  color: '#22c55e', badge: 'success' },
]

function clasificar(dias) {
  if (dias === null) return null
  return RANGOS.find(r => dias >= r.dias[0] && dias <= r.dias[1])
}

export default function Vencimientos() {
  const { productos, categorias, formulaValorizacion, simboloMoneda } = useApp()
  const nav = useNavigate()
  const [filtroRango, setFiltroRango] = useState('all')
  const [filtCat, setFiltCat]         = useState('')

  const productosConVenc = useMemo(() =>
    productos
      .filter(p => p.activo !== false && p.tieneVencimiento && p.fechaVencimiento)
      .map(p => ({
        ...p,
        dias:       diasParaVencer(p.fechaVencimiento),
        valorStock: valorarStock(p.batches || [], formulaValorizacion),
        catNombre:  categorias.find(c => c.id === p.categoriaId)?.nombre || '—',
      }))
      .sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999))
  , [productos, categorias, formulaValorizacion])

  const conteos = useMemo(() => {
    const c = {}
    RANGOS.forEach(r => { c[r.key] = productosConVenc.filter(p => clasificar(p.dias)?.key === r.key).length })
    c.all = productosConVenc.length
    return c
  }, [productosConVenc])

  const filtered = useMemo(() => {
    let d = productosConVenc
    if (filtroRango !== 'all') d = d.filter(p => clasificar(p.dias)?.key === filtroRango)
    if (filtCat) d = d.filter(p => p.categoriaId === filtCat)
    return d
  }, [productosConVenc, filtroRango, filtCat])

  const SEL = 'px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] pr-8'

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* Semáforo de conteos */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {RANGOS.map(r => (
          <button key={r.key} onClick={() => setFiltroRango(filtroRango === r.key ? 'all' : r.key)}
            className={`relative rounded-xl px-4 py-3.5 text-left border transition-all overflow-hidden
              ${filtroRango === r.key
                ? 'border-['+r.color+'] bg-['+r.color+']/10'
                : 'bg-[#161d28] border-white/[0.08] hover:border-white/[0.16]'
              }`}
            style={{
              borderColor: filtroRango === r.key ? r.color : undefined,
              background:  filtroRango === r.key ? `${r.color}18` : undefined,
            }}>
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: r.color }}/>
            <div className="text-[26px] font-semibold text-[#e8edf2]">{conteos[r.key] || 0}</div>
            <div className="text-[11px] text-[#9ba8b6] mt-0.5 leading-tight">{r.label}</div>
          </button>
        ))}
      </div>

      {/* Alerta si hay vencidos */}
      {conteos.vencido > 0 && (
        <div className="flex items-start gap-3 px-4 py-3.5 bg-red-500/10 border border-red-500/25 rounded-xl text-[13px] text-red-300 leading-snug">
          <AlertTriangle size={16} className="shrink-0 mt-0.5"/>
          <div>
            <span className="font-semibold">{conteos.vencido} producto{conteos.vencido > 1 ? 's' : ''} vencido{conteos.vencido > 1 ? 's' : ''}.</span>
            {' '}Deben ser dados de baja mediante un <button onClick={() => nav('/ajustes')} className="underline hover:text-red-200">Ajuste Negativo</button> para mantener el inventario correcto.
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
            Productos con Fecha de Vencimiento
            {filtroRango !== 'all' && (
              <span className="ml-2 text-[#00c896]">— {RANGOS.find(r => r.key === filtroRango)?.label}</span>
            )}
          </span>
          <div className="flex gap-2 items-center">
            <select className={SEL} value={filtCat} onChange={e => setFiltCat(e.target.value)}>
              <option value="">Todas las categorías</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            {(filtroRango !== 'all' || filtCat) && (
              <Btn variant="ghost" size="sm" onClick={() => { setFiltroRango('all'); setFiltCat('') }}>
                Limpiar
              </Btn>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {['Producto','Categoría','Stock','F. Vencimiento','Días restantes','Estado','Valor en Stock','Acción'].map(h => (
                  <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/[0.08] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8}>
                  <EmptyState
                    icon={CheckCircle}
                    title="Sin productos en este rango"
                    description={filtroRango === 'all'
                      ? 'Ningún producto tiene fecha de vencimiento configurada.'
                      : 'No hay productos en este rango de vencimiento.'}
                  />
                </td></tr>
              )}
              {filtered.map(p => {
                const rango = clasificar(p.dias)
                return (
                  <tr key={p.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3.5 py-2.5">
                      <div className="font-medium text-[#e8edf2]">{p.nombre}</div>
                      <div className="text-[11px] text-[#5f6f80]">{p.sku}</div>
                    </td>
                    <td className="px-3.5 py-2.5 text-[#9ba8b6]">{p.catNombre}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px]">
                      {p.stockActual} <span className="text-[#5f6f80] text-[11px]">{p.unidadMedida}</span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">
                      {formatDate(p.fechaVencimiento)}
                    </td>
                    <td className="px-3.5 py-2.5">
                      {p.dias === null ? '—' : (
                        <div className="flex items-center gap-2">
                          {/* Barra visual */}
                          <div className="w-20 h-1.5 bg-[#1a2230] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{
                                width: p.dias < 0 ? '100%' : p.dias > 90 ? '10%' : `${Math.max(5, 100 - (p.dias/90)*100)}%`,
                                background: rango?.color || '#22c55e',
                              }}/>
                          </div>
                          <span className="font-mono text-[12px]" style={{ color: rango?.color }}>
                            {p.dias < 0 ? `${Math.abs(p.dias)}d vencido` : `${p.dias}d`}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5">
                      {rango ? <Badge variant={rango.badge}>{rango.label.split(' ')[0]}</Badge> : '—'}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#00c896] font-semibold">
                      {formatCurrency(p.valorStock, simboloMoneda)}
                    </td>
                    <td className="px-3.5 py-2.5">
                      {(p.dias !== null && p.dias <= 30) ? (
                        <Btn variant="danger" size="sm" onClick={() => nav('/ajustes')}>
                          Dar de baja
                        </Btn>
                      ) : (
                        <Btn variant="ghost" size="sm" onClick={() => nav('/inventario')}>
                          Ver detalle
                        </Btn>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Resumen inferior */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06] text-[13px]">
            <span className="text-[#5f6f80]">{filtered.length} productos mostrados</span>
            <span className="text-[#9ba8b6]">
              Valor total en riesgo:{' '}
              <span className="text-[#e8edf2] font-semibold">
                {formatCurrency(filtered.reduce((s, p) => s + p.valorStock, 0), simboloMoneda)}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
