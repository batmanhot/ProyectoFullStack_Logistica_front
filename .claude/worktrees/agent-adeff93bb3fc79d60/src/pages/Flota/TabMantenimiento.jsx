import { Wrench, Edit2, Trash2, Download, FileText } from 'lucide-react'
import { formatDate } from '../../utils/helpers'
import { Btn, DataTable } from '../../components/ui/index'
import FechaRango from '../../components/ui/FechaRango'
import { exportarMantenimientosXLSX } from '../../utils/exportXLSX'
import { exportarMantenimientosPDF } from '../../utils/exportPDF'
import { toDateStr } from './constants'

// ════════════════════════════════════════════════════════
// TAB MANTENIMIENTO
// ════════════════════════════════════════════════════════
export default function TabMantenimiento({
  mantenimientos, filtDesde, filtHasta, setFiltDesde, setFiltHasta, setEditandoMant, setConfirmDelMant, empresa,
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
        <div className="flex items-center gap-2">
          <Btn variant="ghost" size="sm" onClick={() => exportarMantenimientosXLSX(mantenimientos)}>
            <Download size={13}/> Excel
          </Btn>
          <Btn variant="ghost" size="sm" onClick={() => exportarMantenimientosPDF(mantenimientos, empresa)}>
            <FileText size={13}/> PDF
          </Btn>
          <FechaRango desde={filtDesde} hasta={filtHasta} onDesde={setFiltDesde} onHasta={setFiltHasta}/>
        </div>
      </div>

      <DataTable
        rows={mantenimientos}
        rowKey={m => m.id}
        onRowClick={m => setEditandoMant(m)}
        emptyIcon={Wrench}
        emptyTitle="Sin mantenimientos registrados"
        emptyDescription="Ve a la pestaña Unidades → botón Registrar en cada unidad para agregar mantenimientos."
        columns={[
          { key: 'fecha', header: 'Fecha', render: m => <span className="font-mono text-[11px] text-[#9ba8b6]">{formatDate(toDateStr(m.fecha))}</span> },
          { key: 'unidad', header: 'Unidad', render: m => <span className="font-medium text-[#e8edf2]">{m.vehiculo?.nombre || '—'}</span> },
          { key: 'placa', header: 'Placa', render: m => <span className="font-mono text-[12px] text-[#00c896] font-bold">{m.vehiculo?.placa || '—'}</span> },
          { key: 'tipo', header: 'Tipo de mantenimiento', render: m => <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">{m.tipo}</span> },
          { key: 'km', header: 'Km', render: m => <span className="font-mono text-[11px] text-[#9ba8b6]">{m.kmActual ? Number(m.kmActual).toLocaleString() + ' km' : '—'}</span> },
          { key: 'costo', header: 'Costo (S/)', render: m => <span className="font-mono text-[12px] font-semibold text-[#00c896]">{m.costo ? `S/ ${Number(m.costo).toFixed(2)}` : '—'}</span> },
          { key: 'taller', header: 'Taller', render: m => <span className="text-[#9ba8b6]">{m.taller || '—'}</span> },
          { key: 'observaciones', header: 'Observaciones', render: m => <span className="text-[11px] text-[#5f6f80] max-w-50 truncate block">{m.observaciones || '—'}</span> },
          { key: 'acciones', header: 'Acciones', stopPropagation: true, render: m => (
              <div className="flex gap-1">
                <Btn variant="ghost" size="icon" title="Editar" onClick={() => setEditandoMant(m)}><Edit2 size={12}/></Btn>
                <Btn variant="ghost" size="icon" className="text-red-400" title="Eliminar" onClick={() => setConfirmDelMant(m.id)}><Trash2 size={12}/></Btn>
              </div>
            ) },
        ]}
      />
    </div>
  )
}
