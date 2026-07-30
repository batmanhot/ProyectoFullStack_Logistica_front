import { Plus, Pencil } from 'lucide-react'
import { getOcupColor } from './constants'

/**
 * Vista de lista (tabla) del mapa de almacén (viewMode === 'list').
 * Puramente presentacional: todos los datos derivados ya vienen calculados
 * desde index.jsx — este componente no recalcula nada.
 */
export default function VistaListaUbicaciones({ ubicsFiltradas, invPorUbic, prodMap, selected, setSelected, setModalAsig, setModalUbic }) {
  return (
    <div className="bg-[#161d28] border border-white/8 rounded-xl overflow-hidden">
      <table className="w-full border-collapse text-[12px]">
        <thead><tr>
          {['Ubicación','Zona','Tipo','Ocupación','SKUs','Estado','Acción'].map(h => (
            <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[10px] font-semibold text-[#5f6f80] uppercase border-b border-white/8">{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {ubicsFiltradas.map(u => {
            const lineas = invPorUbic[u.id] || []
            const pct    = u.capacidadMax > 0 ? (u.capacidadActual / u.capacidadMax) * 100 : 0
            const colr   = getOcupColor(pct)
            return (
              <tr key={u.id}
                className="border-b border-white/5 last:border-0 hover:bg-white/2 cursor-pointer"
                onClick={() => setSelected(selected===u.id ? null : u.id)}>
                <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#00c896] font-semibold">{u.codigo}</td>
                <td className="px-3.5 py-2.5 text-[#9ba8b6]">Zona {u.zona}</td>
                <td className="px-3.5 py-2.5 text-[#9ba8b6]">{u.tipo || '—'}</td>
                <td className="px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-[#0e1117] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width:`${pct}%`, background:pct>=90?'#ef4444':pct>=70?'#f59e0b':pct>0?'#00c896':'transparent' }}/>
                    </div>
                    <span className={`text-[11px] ${colr.text}`}>{u.capacidadActual}/{u.capacidadMax}</span>
                  </div>
                </td>
                <td className="px-3.5 py-2.5 text-[#9ba8b6] max-w-44 truncate">
                  {lineas.length > 0 ? lineas.map(l => prodMap[l.productoId]?.sku || '?').join(', ') : '—'}
                </td>
                <td className="px-3.5 py-2.5">
                  <span className={`text-[10px] font-semibold ${colr.text}`}>{colr.label}</span>
                </td>
                <td className="px-3.5 py-2.5" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setModalAsig({ ubicacionId: u.id, modo: 'asignar', ubicacion: u })}
                      className="flex items-center gap-1 px-2.5 py-1 bg-[#00c896]/10 border border-[#00c896]/20 text-[#00c896] rounded-lg text-[11px] hover:bg-[#00c896]/20 transition-colors">
                      <Plus size={10}/> Asignar
                    </button>
                    <button
                      onClick={() => setModalUbic(u)}
                      title="Editar ubicación"
                      className="p-1.5 rounded-lg text-[#5f6f80] hover:text-[#9ba8b6] hover:bg-white/5 transition-colors">
                      <Pencil size={11}/>
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
