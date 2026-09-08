import { Toggle } from '../../components/ui/index'
import { STOCK } from '../../config/constants'

export default function TabAlertas({ form, onChange }) {
  return (
    <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
      <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Configuración de Alertas</div>
      <div className="flex flex-col gap-4">

        {/* Stock mínimo — siempre activa, informativo */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-[#1a2230] rounded-xl">
          <div>
            <div className="text-[14px] font-medium text-[#e8edf2] mb-0.5">Alertas de Stock Mínimo</div>
            <div className="text-[12px] text-[#5f6f80]">Siempre activas — avisan cuando un producto cae por debajo de su stock mínimo.</div>
          </div>
          <span className="shrink-0 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2.5 py-1">Activa</span>
        </div>

        {/* Vencimiento — el único configurable */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-[#1a2230] rounded-xl">
          <div>
            <div className="text-[14px] font-medium text-[#e8edf2] mb-0.5">Alertas de Vencimiento</div>
            <div className="text-[12px] text-[#5f6f80]">
              Avisan cuando un producto perecedero está a {STOCK.DIAS_ALERTA_VENCIMIENTO} días o menos de vencer.
              Desactívalas si tu operación no maneja productos con fecha de vencimiento.
            </div>
          </div>
          <Toggle value={form.alertaVencimiento !== false} onChange={onChange} />
        </div>

      </div>
    </div>
  )
}
