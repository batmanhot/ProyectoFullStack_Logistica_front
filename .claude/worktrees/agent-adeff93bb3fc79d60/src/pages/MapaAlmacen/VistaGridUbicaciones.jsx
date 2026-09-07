import { getOcupColor } from './constants'
import { estadoStock } from '../../utils/helpers'

/**
 * Vista de grilla del mapa de almacén (viewMode === 'grid').
 * Puramente presentacional: todos los datos derivados (ubicsFiltradas, invPorUbic,
 * prodMap) ya vienen calculados desde index.jsx — este componente no recalcula nada.
 */
export default function VistaGridUbicaciones({ zonaSel, zonas, ubicsFiltradas, invPorUbic, prodMap, selected, setSelected }) {
  return (
    <div>
      {(zonaSel ? [zonaSel] : zonas).map(zona => {
        const ubsZona = ubicsFiltradas.filter(u => u.zona === zona)
        if (ubsZona.length === 0) return null
        const filas = [...new Set(ubsZona.map(u => u.fila))].sort((a,b)=>a-b)
        const cols  = [...new Set(ubsZona.map(u => u.col))].sort((a,b)=>a-b)
        return (
          <div key={zona} className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[#00c896]/10 flex items-center justify-center text-[#00c896] font-bold text-[13px]">{zona}</div>
              <span className="text-[12px] font-semibold text-[#e8edf2]">Zona {zona}</span>
              <span className="text-[11px] text-[#5f6f80]">{ubsZona.length} ubicaciones</span>
            </div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns:`repeat(${cols.length}, minmax(0,1fr))` }}>
              {filas.map(fila =>
                cols.map(col => {
                  const u = ubsZona.find(x => x.fila===fila && x.col===col)
                  if (!u) return <div key={`e-${fila}-${col}`}/>
                  const lineas   = invPorUbic[u.id] || []
                  const pct      = u.capacidadMax > 0 ? (u.capacidadActual / u.capacidadMax) * 100 : 0
                  const colr     = getOcupColor(pct)
                  const isSel    = selected === u.id
                  return (
                    <button key={u.id}
                      onClick={() => setSelected(isSel ? null : u.id)}
                      className={`relative rounded-lg border p-2 text-left transition-all cursor-pointer
                        ${colr.bg} ${isSel ? 'ring-2 ring-[#00c896] ring-offset-1 ring-offset-[#0e1117]' : colr.border}
                        hover:brightness-110`}
                      style={{ minHeight: 56 }}>
                      <div className={`text-[10px] font-bold ${isSel?'text-[#00c896]':colr.text}`}>{u.codigo}</div>
                      <div className="text-[9px] text-[#5f6f80] mt-0.5">{u.capacidadActual}/{u.capacidadMax}</div>
                      {lineas.length > 0 && (
                        <div className="mt-1 flex gap-0.5 flex-wrap">
                          {lineas.slice(0,3).map(l => {
                            const p = prodMap[l.productoId]
                            const e = p ? estadoStock(p.stockActual, p.stockMinimo) : { estado:'ok' }
                            return <div key={l.id ?? l.productoId} className={`w-2 h-2 rounded-full ${
                              e.estado==='agotado'?'bg-red-500':e.estado==='critico'?'bg-amber-400':'bg-[#00c896]'}`}/>
                          })}
                          {lineas.length>3 && <div className="text-[8px] text-[#5f6f80]">+{lineas.length-3}</div>}
                        </div>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
