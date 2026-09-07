import { Plus, Pencil, MapPin } from 'lucide-react'
import { DataTable } from '../../components/ui/index'
import { getOcupColor } from './constants'

/**
 * Vista de lista (tabla) del mapa de almacén (viewMode === 'list').
 * Puramente presentacional: todos los datos derivados ya vienen calculados
 * desde index.jsx — este componente no recalcula nada.
 */
export default function VistaListaUbicaciones({ ubicsFiltradas, invPorUbic, prodMap, selected, setSelected, setModalAsig, setModalUbic }) {
  return (
    <DataTable
      rows={ubicsFiltradas}
      rowKey={u => u.id}
      onRowClick={u => setSelected(selected === u.id ? null : u.id)}
      emptyIcon={MapPin}
      emptyTitle="Sin ubicaciones"
      emptyDescription="No hay ubicaciones que coincidan con los filtros aplicados."
      columns={[
        { key: 'codigo', header: 'Ubicación', render: u => <span className="font-mono text-[11px] text-[#00c896] font-semibold">{u.codigo}</span> },
        { key: 'zona', header: 'Zona', render: u => <span className="text-[#9ba8b6]">Zona {u.zona}</span> },
        { key: 'tipo', header: 'Tipo', render: u => <span className="text-[#9ba8b6]">{u.tipo || '—'}</span> },
        { key: 'ocupacion', header: 'Ocupación', render: u => {
            const pct  = u.capacidadMax > 0 ? (u.capacidadActual / u.capacidadMax) * 100 : 0
            const colr = getOcupColor(pct)
            return (
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-[#0e1117] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width:`${pct}%`, background:pct>=90?'#ef4444':pct>=70?'#f59e0b':pct>0?'#00c896':'transparent' }}/>
                </div>
                <span className={`text-[11px] ${colr.text}`}>{u.capacidadActual}/{u.capacidadMax}</span>
              </div>
            )
          } },
        { key: 'skus', header: 'SKUs', render: u => {
            const lineas = invPorUbic[u.id] || []
            return (
              <span className="text-[#9ba8b6] max-w-44 truncate block">
                {lineas.length > 0 ? lineas.map(l => prodMap[l.productoId]?.sku || '?').join(', ') : '—'}
              </span>
            )
          } },
        { key: 'estado', header: 'Estado', render: u => {
            const pct  = u.capacidadMax > 0 ? (u.capacidadActual / u.capacidadMax) * 100 : 0
            const colr = getOcupColor(pct)
            return <span className={`text-[10px] font-semibold ${colr.text}`}>{colr.label}</span>
          } },
        { key: 'accion', header: 'Acción', stopPropagation: true, render: u => (
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
          ) },
      ]}
    />
  )
}
