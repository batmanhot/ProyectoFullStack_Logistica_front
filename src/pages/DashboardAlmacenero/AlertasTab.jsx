import { useMemo, useState } from 'react'
import { Bell, BellRing, CheckCircle } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { Btn } from '../../components/ui/index'
import { vencimientoMasUrgentePorProducto } from '../../utils/helpers'
import { TIPOS, generarAlertas } from '../../utils/alertas'
import { pushSoportado, suscribirse, desuscribirse } from '../../utils/push'
import { usePushSubscribe, usePushUnsubscribe } from '../../queries/push.queries'
import { useProductosList } from '../../queries/productos.queries'
import { useOrdenesCompraList } from '../../queries/ordenes-compra.queries'
import { useCategoriasList } from '../../queries/categorias.queries'
import { useAlmacenesList } from '../../queries/almacenes.queries'
import { useLotesList } from '../../queries/lotes.queries'

function ActivarNotificaciones() {
  const { toast } = useApp()
  const [permiso, setPermiso] = useState(() => (pushSoportado() ? Notification.permission : 'unsupported'))
  const [activando, setActivando] = useState(false)
  const [desactivando, setDesactivando] = useState(false)
  const pushSubscribe = usePushSubscribe()
  const pushUnsubscribe = usePushUnsubscribe()

  if (permiso === 'unsupported') return null

  async function desactivar() {
    setDesactivando(true)
    try {
      const endpoint = await desuscribirse()
      if (endpoint) await pushUnsubscribe.mutateAsync(endpoint)
      setPermiso('default')
      toast('Notificaciones desactivadas', 'success')
    } catch (e) {
      toast(e.message || 'No se pudo desactivar las notificaciones', 'error')
    } finally {
      setDesactivando(false)
    }
  }

  if (permiso === 'granted') {
    return (
      <div className="flex items-center gap-2.5">
        <span className="flex items-center gap-1.5 text-[11px] text-[#00c896] font-semibold">
          <BellRing size={12}/> Notificaciones activadas
        </span>
        <button onClick={desactivar} disabled={desactivando}
          className="text-[11px] text-[#5f6f80] hover:text-[#9ba8b6] underline decoration-dotted transition-colors disabled:opacity-50">
          {desactivando ? 'Desactivando...' : 'Desactivar'}
        </button>
      </div>
    )
  }

  async function activar() {
    setActivando(true)
    try {
      const subscription = await suscribirse()
      const res = await pushSubscribe.mutateAsync(subscription)
      if (res?.error) { toast(res.error, 'error'); return }
      setPermiso('granted')
      toast('Notificaciones activadas — avisaremos de alertas críticas aunque tengas la app cerrada', 'success')
    } catch (e) {
      toast(e.message || 'No se pudo activar las notificaciones', 'error')
      setPermiso(Notification.permission)
    } finally {
      setActivando(false)
    }
  }

  return (
    <Btn variant="secondary" size="sm" disabled={activando} onClick={activar}>
      <Bell size={12}/> {activando ? 'Activando...' : 'Activar notificaciones'}
    </Btn>
  )
}

export default function AlertasTab({ simboloMoneda }) {
  const { data: productos  = [] } = useProductosList()
  const { data: ordenes    = [] } = useOrdenesCompraList()
  const { data: categorias = [] } = useCategoriasList()
  const { data: almacenes  = [] } = useAlmacenesList()
  const { data: lotes      = [] } = useLotesList(undefined, { enabled: true })

  const vencPorProducto = useMemo(() => vencimientoMasUrgentePorProducto(lotes), [lotes])

  const alertas = useMemo(() =>
    generarAlertas(productos, ordenes, vencPorProducto, null, categorias, almacenes, simboloMoneda)
  , [productos, ordenes, vencPorProducto, categorias, almacenes, simboloMoneda])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide">
          {alertas.length} alerta{alertas.length !== 1 ? 's' : ''} activa{alertas.length !== 1 ? 's' : ''}
        </div>
        <ActivarNotificaciones/>
      </div>

      {alertas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <CheckCircle size={40} className="text-green-400 opacity-40"/>
          <div className="text-[13px] text-[#5f6f80]">Todo el inventario está en orden.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {alertas.map((alerta, i) => {
            const meta = TIPOS[alerta.tipo]
            const Icon = meta?.icon || Bell
            const color = alerta.prioridad === 1 ? { bg:'bg-red-500/4', border:'border-red-500/20' }
                        : alerta.prioridad === 2 ? { bg:'bg-amber-500/4', border:'border-amber-500/20' }
                        : { bg:'bg-blue-500/3', border:'border-blue-500/15' }
            return (
              <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${color.bg} ${color.border}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta?.bg}`}>
                  <Icon size={16} className={meta?.txt}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#e8edf2] leading-snug">{alerta.titulo}</div>
                  <div className="text-[12px] text-[#9ba8b6] mt-0.5">{alerta.detalle}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
