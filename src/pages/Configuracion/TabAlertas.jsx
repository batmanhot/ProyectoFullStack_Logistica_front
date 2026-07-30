import { Toggle } from '../../components/ui/index'

export default function TabAlertas({ form, f }) {
  return (
    <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
      <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Configuración de Alertas</div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-4 py-3.5 bg-[#1a2230] rounded-xl">
          <div>
            <div className="text-[14px] font-medium text-[#e8edf2] mb-0.5">Alertas de Stock Mínimo</div>
            <div className="text-[12px] text-[#5f6f80]">Notifica cuando el stock cae por debajo del mínimo configurado</div>
          </div>
          <Toggle value={form.alertaStockMinimo} onChange={v => f('alertaStockMinimo', v)} />
        </div>

        <div className="flex items-center justify-between px-4 py-3.5 bg-[#1a2230] rounded-xl">
          <div>
            <div className="text-[14px] font-medium text-[#e8edf2] mb-0.5">Alertas de Vencimiento</div>
            <div className="text-[12px] text-[#5f6f80]">Avisa cuando un producto está próximo a vencer</div>
          </div>
          <Toggle value={form.alertaVencimiento} onChange={v => f('alertaVencimiento', v)} />
        </div>
        <div className="flex items-center justify-between py-3 border-b border-white/6">
          <div>
            <div className="text-[13px] font-medium text-[#e8edf2]">Lector de Código de Barras</div>
            <div className="text-[12px] text-[#5f6f80] mt-0.5">
              Activa el botón "Scan" en Entradas para escanear con la cámara del celular o lector USB.
              Cuando está desactivado, solo se muestra el buscador de texto estándar.
            </div>
          </div>
          <Toggle value={!!form.lectorBarras} onChange={v => f('lectorBarras', v)} />
        </div>

        {form.alertaVencimiento && (
          <div className="px-4 py-4 bg-[#1a2230] rounded-xl">
            <div className="text-[12px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-3">
              Días de anticipación
            </div>
            <div className="flex items-center gap-4">
              <input type="range" min="7" max="90" step="7"
                value={form.diasAlertaVencimiento || 30}
                onChange={e => f('diasAlertaVencimiento', +e.target.value)}
                className="flex-1"
                style={{ accentColor: '#00c896' }}
              />
              <span className="text-[22px] font-bold text-[#00c896] min-w-[52px] text-right">
                {form.diasAlertaVencimiento || 30}d
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-[#5f6f80] mt-1.5">
              <span>7 días</span><span>30 días</span><span>60 días</span><span>90 días</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
