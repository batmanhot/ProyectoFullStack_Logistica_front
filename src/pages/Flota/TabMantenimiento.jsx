import { Wrench, Edit2, Trash2 } from 'lucide-react'
import { formatDate } from '../../utils/helpers'
import { EmptyState, Btn } from '../../components/ui/index'
import FechaRango from '../../components/ui/FechaRango'
import { toDateStr } from './constants'

// ════════════════════════════════════════════════════════
// TAB MANTENIMIENTO
// ════════════════════════════════════════════════════════
export default function TabMantenimiento({
  mantenimientos, filtDesde, filtHasta, setFiltDesde, setFiltHasta, setEditandoMant, setConfirmDelMant,
}) {
  return (
    <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
          Historial de Mantenimientos
          <span className="ml-2 text-[#3d4f60] normal-case font-normal">
            ({mantenimientos.length} registro{mantenimientos.length !== 1 ? 's' : ''})
          </span>
        </span>
        <FechaRango desde={filtDesde} hasta={filtHasta} onDesde={setFiltDesde} onHasta={setFiltHasta}/>
      </div>

      {mantenimientos.length === 0 ? (
        <EmptyState icon={Wrench} title="Sin mantenimientos registrados"
          description="Ve a la pestaña Unidades → botón Registrar en cada unidad para agregar mantenimientos."/>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                {['Fecha','Unidad','Placa','Tipo de mantenimiento','Km','Costo (S/)','Taller','Observaciones','Acciones'].map(h => (
                  <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[10px] font-semibold text-[#5f6f80] uppercase border-b border-white/8 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mantenimientos.map(m => (
                <tr key={m.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">{formatDate(toDateStr(m.fecha))}</td>
                  <td className="px-3.5 py-2.5 font-medium text-[#e8edf2]">{m.vehiculo?.nombre || '—'}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#00c896] font-bold">{m.vehiculo?.placa || '—'}</td>
                  <td className="px-3.5 py-2.5">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">{m.tipo}</span>
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">
                    {m.kmActual ? Number(m.kmActual).toLocaleString() + ' km' : '—'}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] font-semibold text-[#00c896]">
                    {m.costo ? `S/ ${Number(m.costo).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-3.5 py-2.5 text-[#9ba8b6]">{m.taller || '—'}</td>
                  <td className="px-3.5 py-2.5 text-[11px] text-[#5f6f80] max-w-50 truncate">{m.observaciones || '—'}</td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex gap-1">
                      <Btn variant="ghost" size="icon" title="Editar" onClick={() => setEditandoMant(m)}><Edit2 size={12}/></Btn>
                      <Btn variant="ghost" size="icon" className="text-red-400" title="Eliminar" onClick={() => setConfirmDelMant(m.id)}><Trash2 size={12}/></Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
