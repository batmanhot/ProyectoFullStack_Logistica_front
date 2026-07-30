import { MapPin, Pencil, Trash2, Package, Plus } from 'lucide-react'
import { estadoStock } from '../../utils/helpers'

/**
 * Panel lateral de detalle de la ubicación seleccionada.
 * Puramente presentacional: `ubicacion` y `lineasSelected` ya vienen resueltos
 * y calculados desde index.jsx (a partir de `selected` + `invPorUbic`) — este
 * componente no recalcula nada, solo muestra lo que recibe por props.
 */
export default function PanelDetalleUbicacion({ ubicacion, lineasSelected, prodMap, setSelected, setModalUbic, setModalAsig, setConfirmDelUbic, toast }) {
  const ubic = ubicacion

  return (
    <div className="w-[280px] shrink-0">
      <div className="bg-[#161d28] border border-[#00c896]/20 rounded-xl p-4 sticky top-0">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={14} className="text-[#00c896]"/>
          <span className="text-[13px] font-semibold text-[#e8edf2] font-mono">{ubic.codigo}</span>
          <span className="text-[10px] text-[#5f6f80] ml-1">{ubic.tipo} · {ubic.zona}</span>
          <button onClick={() => setSelected(null)} className="ml-auto text-[#5f6f80] hover:text-[#9ba8b6] text-[16px] leading-none">×</button>
        </div>

        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/6">
          <button onClick={() => setModalUbic(ubic)}
            className="flex items-center gap-1 text-[10px] text-[#5f6f80] hover:text-[#9ba8b6] transition-colors">
            <Pencil size={10}/> Editar
          </button>
          <button
            onClick={() => ubic.capacidadActual > 0
              ? toast('Esta ubicación tiene stock asignado — muévelo al bucket general antes de eliminarla.', 'error')
              : setConfirmDelUbic(ubic)}
            disabled={ubic.capacidadActual > 0}
            title={ubic.capacidadActual > 0 ? 'No se puede eliminar: tiene stock asignado' : undefined}
            className="flex items-center gap-1 text-[10px] text-[#5f6f80] hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[#5f6f80]">
            <Trash2 size={10}/> Eliminar
          </button>
        </div>

        {/* Barra de capacidad */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-[#5f6f80] mb-1">
            <span>Capacidad</span>
            <span>{ubic.capacidadActual}/{ubic.capacidadMax} SKUs</span>
          </div>
          <div className="h-1.5 bg-[#0e1117] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#00c896]" style={{
              width: ubic.capacidadMax > 0 ? `${Math.min(100, (ubic.capacidadActual / ubic.capacidadMax)*100)}%` : '0%'
            }}/>
          </div>
        </div>

        {lineasSelected.length === 0 ? (
          <div className="text-center py-5 flex flex-col items-center gap-2">
            <Package size={18} className="text-[#3d4f60]"/>
            <div className="text-[12px] text-[#5f6f80]">Ubicación vacía</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mb-3">
            {lineasSelected.map(inv => {
              const p = prodMap[inv.productoId]
              if (!p) return null
              const est    = estadoStock(p.stockActual, p.stockMinimo)
              const stColor = est.estado==='agotado'?'#ef4444':est.estado==='critico'?'#f59e0b':'#00c896'
              return (
                <div key={inv.id ?? inv.productoId} className="bg-[#1a2230] rounded-lg p-3">
                  <div className="flex items-start justify-between mb-1">
                    <div className="text-[12px] font-medium text-[#e8edf2] leading-tight">{p.nombre.slice(0,26)}</div>
                    <div className="w-2 h-2 rounded-full ml-2 mt-1 shrink-0" style={{ background: stColor }}/>
                  </div>
                  <div className="text-[10px] text-[#5f6f80] font-mono">{p.sku}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-[#5f6f80]">En rack</span>
                    <span className="text-[12px] font-semibold font-mono text-[#00c896]">
                      {Number(inv.cantidad)} {p.unidadMedida}
                    </span>
                  </div>
                  <button
                    onClick={() => setModalAsig({ ubicacionId: ubic.id, modo: 'liberar', inv, prod: p, ubicacion: ubic })}
                    className="mt-2 w-full text-[10px] text-red-400 hover:text-red-300 py-1 rounded border border-red-500/20 hover:border-red-500/40 transition-colors">
                    Mover de vuelta al bucket general
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Botón asignar desde panel */}
        <button
          onClick={() => setModalAsig({ ubicacionId: ubic.id, modo: 'asignar', ubicacion: ubic })}
          className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#00c896]/10 border border-[#00c896]/20 text-[#00c896] rounded-lg text-[11px] font-medium hover:bg-[#00c896]/20 transition-colors">
          <Plus size={11}/> Asignar producto a esta ubicación
        </button>

        {/* Leyenda */}
        <div className="mt-3 pt-3 border-t border-white/6 flex gap-3 text-[10px]">
          {[['bg-[#00c896]','OK'],['bg-amber-400','Crítico'],['bg-red-500','Agotado']].map(([bg,lb]) => (
            <div key={lb} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${bg}`}/>
              <span className="text-[#5f6f80]">{lb}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
