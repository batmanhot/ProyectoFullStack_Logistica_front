import { useState, useMemo } from 'react'
import { Truck, Navigation as NavIcon, Clock, CheckCircle, PlayCircle } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { formatDate, formatTime } from '../../utils/helpers'
import { Badge } from '../../components/ui/index'
import { useRutasList, useIniciarRuta, useCompletarRuta, useMarcarParada } from '../../queries/rutas.queries'
import { useDespachosList } from '../../queries/despachos.queries'
import { useClientesList } from '../../queries/clientes.queries'
import { useAlmacenesList } from '../../queries/almacenes.queries'
import { useTransportistasList } from '../../queries/transportistas.queries'
import { useEmpresaPDFConfig } from '../../queries/configuracion.queries'
import { ESTADO_RUTA } from '../Transportes/constants'
import ModalDetalleRuta from '../Transportes/ModalDetalleRuta.jsx'

export default function DashboardChofer() {
  const { sesion, toast } = useApp()
  const pdfConfig = useEmpresaPDFConfig()

  const { data: rutasRaw    = [], isLoading } = useRutasList()
  const { data: despachos   = [] }            = useDespachosList()
  const { data: clientesRaw = [] }            = useClientesList({ incluirInactivos: true })
  const { data: almacenes   = [] }            = useAlmacenesList()
  const { data: transRaw    = [] }            = useTransportistasList({ incluirInactivos: true })

  const iniciarRuta   = useIniciarRuta()
  const completarRuta = useCompletarRuta()
  const marcarParada  = useMarcarParada()

  const [detalle, setDetalle] = useState(null)

  const transportistas = useMemo(() => transRaw.map(t => ({ ...t, activo: t.activo !== false })), [transRaw])
  const clientes        = useMemo(() => clientesRaw.map(c => ({ ...c, activo: c.activo !== false })), [clientesRaw])

  // Rutas propias vigentes: programadas (para poder iniciarlas) y en curso (para ir marcando entregas).
  // Mismo criterio de filtrado que TabRutas.jsx (Usuario.transportistaId), acá acotado además por estado.
  const rutas = useMemo(() =>
    rutasRaw
      .filter(r => r.transportistaId === sesion?.transportistaId && ['PROGRAMADA', 'EN_RUTA'].includes(r.estado))
      .sort((a, b) => new Date(a.fechaSalida) - new Date(b.fechaSalida))
  , [rutasRaw, sesion?.transportistaId])

  async function handleIniciar(ruta) {
    const res = await iniciarRuta.mutateAsync(ruta.id)
    if (res?.error) { toast(res.error, 'error'); return }
    toast(`Ruta ${ruta.numero} iniciada — ${ruta.paradas?.length || 0} despacho(s) en camino`, 'success')
    if (detalle?.id === ruta.id) setDetalle(null)
  }

  async function handleCompletar(ruta) {
    const res = await completarRuta.mutateAsync({ id: ruta.id })
    if (res?.error) { toast(res.error, 'error'); return }
    toast(`Ruta ${ruta.numero} cerrada`, 'success')
    setDetalle(null)
  }

  async function handleMarcarParada(ruta, despachoId, estado, obs = '', evidencia = null) {
    const res = await marcarParada.mutateAsync({
      id: ruta.id, despachoId, estado, observacion: obs,
      ...(evidencia && {
        receptorNombre: evidencia.receptor,
        evidenciaFoto:  evidencia.foto,
        evidenciaNotas: evidencia.notas,
      }),
    })
    if (res?.error) { toast(res.error, 'error'); return }
    toast(estado === 'ENTREGADO' ? '✓ Entrega confirmada' : 'Parada marcada como no entregada', estado === 'ENTREGADO' ? 'success' : 'warning')
    if (detalle?.id === ruta.id && res?.data) setDetalle(res.data)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-[#e8edf2]">Panel de Chofer 🚚</h1>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Vista operativa — {new Date().toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long' })}</p>
        </div>
        <div className="text-[11px] px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-semibold">Rol: Chofer</div>
      </div>

      {!sesion?.transportistaId ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Truck size={40} className="text-[#5f6f80] opacity-40"/>
          <div className="text-[13px] text-[#5f6f80] text-center max-w-xs">
            Tu usuario no tiene un transportista vinculado — pedile a un administrador que lo configure en Usuarios.
          </div>
        </div>
      ) : (
        <>
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide">
            {rutas.length} ruta{rutas.length !== 1 ? 's' : ''} programada{rutas.length !== 1 ? 's' : ''} o en curso
          </div>

          {isLoading && <div className="text-center text-[#5f6f80] py-8 text-[12px]">Cargando...</div>}

          {!isLoading && rutas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <CheckCircle size={40} className="text-green-400 opacity-40"/>
              <div className="text-[13px] text-[#5f6f80]">No tenés rutas programadas por ahora.</div>
            </div>
          )}

          {!isLoading && rutas.length > 0 && (
            <div className="flex flex-col gap-2">
              {rutas.map(ruta => {
                const meta = ESTADO_RUTA[ruta.estado] || ESTADO_RUTA.PROGRAMADA
                const Icon = meta.icon
                const entregadas = (ruta.paradas || []).filter(p => p.estado === 'ENTREGADO').length
                return (
                  <button key={ruta.id} onClick={() => setDetalle(ruta)}
                    className="flex items-center gap-3 bg-[#1a2230] rounded-xl px-4 py-4 border border-white/8 text-left active:bg-white/5">
                    <NavIcon size={18} className="text-[#0ea5e9] shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[12px] text-[#00c896] font-bold">{ruta.numero}</span>
                        <Badge variant={meta.color}><Icon size={9}/> {meta.label}</Badge>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-[#5f6f80] mt-1">
                        <Clock size={11}/> {formatDate(ruta.fechaSalida)} · {formatTime(ruta.fechaSalida) || '—'}
                      </div>
                      <div className="text-[11px] text-[#9ba8b6] mt-0.5">
                        {entregadas}/{(ruta.paradas || []).length} entregas
                      </div>
                    </div>
                    {ruta.estado === 'PROGRAMADA' && <PlayCircle size={16} className="text-[#00c896] shrink-0"/>}
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {detalle && (
        <ModalDetalleRuta
          ruta={detalle} despachos={despachos} clientes={clientes}
          transportistas={transportistas} almacenes={almacenes}
          onClose={() => setDetalle(null)}
          onIniciar={() => handleIniciar(detalle)}
          onCompletar={() => handleCompletar(detalle)}
          onCancelar={() => {}}
          onMarcarParada={(dId, estado, obs, evidencia) => handleMarcarParada(detalle, dId, estado, obs, evidencia)}
          puedeCancelar={false}
          pdfConfig={pdfConfig}
        />
      )}
    </div>
  )
}
