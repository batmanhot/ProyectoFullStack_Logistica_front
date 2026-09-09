import { KeyRound } from 'lucide-react'
import { Toggle, Alert } from '../../components/ui/index'
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
    </div>
  )
}
