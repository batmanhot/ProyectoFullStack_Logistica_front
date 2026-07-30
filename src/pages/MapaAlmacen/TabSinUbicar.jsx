import { Package, MapPin, CheckCircle } from 'lucide-react'
import { estadoStock } from '../../utils/helpers'

/** Tab "Sin ubicar" — stock del bucket general del almacén que todavía no tiene rack asignado. */
export default function TabSinUbicar({ nombreAlmacen, sinUbicLines, prodMap, setModalAsig }) {
  return (
    <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
      <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">
        Stock sin ubicación asignada — {nombreAlmacen}
      </div>

      {sinUbicLines.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle size={36} className="text-green-400 opacity-60"/>
          <div className="text-[13px] font-medium text-[#e8edf2]">Todo el stock tiene ubicación asignada</div>
          <div className="text-[11px] text-[#5f6f80]">No queda stock en el bucket general de este almacén.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sinUbicLines.map(inv => {
            const prod = prodMap[inv.productoId]
            if (!prod) return null
            const est    = estadoStock(prod.stockActual, prod.stockMinimo)
            const stColor = est.estado==='agotado'?'#ef4444':est.estado==='critico'?'#f59e0b':'#00c896'
            return (
              <div key={inv.id} className="flex items-center gap-4 px-4 py-3 bg-[#1a2230] rounded-xl border border-white/8">
                <div className="w-8 h-8 rounded-lg bg-[#1e2835] flex items-center justify-center shrink-0">
                  <Package size={14} className="text-[#5f6f80]"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#e8edf2] truncate">{prod.nombre}</div>
                  <div className="text-[11px] text-[#5f6f80] font-mono">{prod.sku}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[12px] font-bold font-mono" style={{ color: stColor }}>
                    {Number(inv.cantidad)} {prod.unidadMedida}
                  </div>
                  <div className="text-[10px] text-[#5f6f80]">disponible para reubicar</div>
                </div>
                <button
                  onClick={() => setModalAsig({ ubicacionId: null, modo: 'asignar', inv, prod })}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#00c896]/10 border border-[#00c896]/20 text-[#00c896] rounded-lg text-[11px] font-medium hover:bg-[#00c896]/20 transition-colors">
                  <MapPin size={11}/> Asignar rack
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
