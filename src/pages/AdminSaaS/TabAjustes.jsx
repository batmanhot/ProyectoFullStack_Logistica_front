import { useState } from 'react'
import { KeyRound, Hourglass, Save } from 'lucide-react'
import { Toggle, Alert, Input, Field, Btn } from '../../components/ui/index'
import { usePlataformaConfig, useGuardarPlataformaConfig } from '../../queries/admin.queries'

// ══════════════════════════════════════════════════════════
// TAB: AJUSTES DE PLATAFORMA
// ══════════════════════════════════════════════════════════
export default function TabAjustes({ toast }) {
  const { data: config } = usePlataformaConfig()
  const guardar = useGuardarPlataformaConfig()

  const activo    = !!config?.accesoRapidoTarjetas
  const bloqueado = !!config?.bloqueadoPorEntorno

  async function toggleAccesoRapido(v) {
    const res = await guardar.mutateAsync({ accesoRapidoTarjetas: v })
    if (res?.error) { toast(res.error, 'error'); return }
    toast(v ? 'Tarjetas de acceso rápido activadas' : 'Tarjetas de acceso rápido desactivadas', 'success')
  }

  // Sin useEffect a propósito: mientras el campo no se toca, el valor mostrado
  // se deriva directo de `config` (llega async); al escribir, la edición local
  // manda hasta guardar (ahí se limpia y vuelve a reflejar lo que devolvió el server).
  const [diasGraciaEdit, setDiasGraciaEdit] = useState(null)
  const diasGraciaGuardado = config?.diasGracia != null ? String(config.diasGracia) : ''
  const diasGracia = diasGraciaEdit ?? diasGraciaGuardado

  async function guardarDiasGracia() {
    const n = parseInt(diasGracia, 10)
    if (!Number.isInteger(n) || n < 0 || n > 90) { toast('Los días de gracia deben estar entre 0 y 90.', 'error'); return }
    const res = await guardar.mutateAsync({ diasGracia: n })
    if (res?.error) { toast(res.error, 'error'); return }
    setDiasGraciaEdit(null)
    toast('Días de gracia actualizados', 'success')
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <KeyRound size={16} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-semibold text-[#e8edf2]">Tarjetas de acceso rápido en el Login</div>
            <div className="text-[12px] text-[#5f6f80] leading-relaxed mt-1">
              Con esto activo, la pantalla de Login muestra —para <b>todos los negocios</b>— una tarjeta por
              cada usuario habilitado, y se puede entrar sin escribir contraseña. Pensado para demos de venta
              y pruebas con usuarios. En la instalación de producción final debe quedar <b>desactivado</b>.
            </div>
          </div>
          <Toggle value={activo} onChange={toggleAccesoRapido} disabled={bloqueado || guardar.isPending} />
        </div>

        {bloqueado && (
          <Alert variant="warning">
            El despliegue actual no habilita el acceso rápido: aunque actives el switch, no tendrá efecto
            hasta que el entorno tenga <code>ALLOW_DEMO_LOGIN=true</code>. En producción real esta variable
            no se define, así que este control queda inerte por diseño.
          </Alert>
        )}
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <Hourglass size={16} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-semibold text-[#e8edf2]">Días de gracia tras el vencimiento</div>
            <div className="text-[12px] text-[#5f6f80] leading-relaxed mt-1">
              Pasada la <b>fecha de vencimiento</b> de un negocio, este es el margen antes de bloquearle el
              login y marcarlo <b>vencido</b> de forma automática — pensado para dar tiempo a conciliar un pago
              manual (transferencia/Yape). Aplica a <b>todos los negocios</b> por igual.
            </div>
          </div>
        </div>
        <Field label="Días de gracia">
          <Input type="number" min="0" max="90" value={diasGracia} onChange={e => setDiasGraciaEdit(e.target.value)} />
        </Field>
        <div className="mt-3">
          <Btn variant="primary" onClick={guardarDiasGracia} disabled={guardar.isPending || diasGracia === diasGraciaGuardado}>
            <Save size={14}/>Guardar
          </Btn>
        </div>
      </div>
    </div>
  )
}
