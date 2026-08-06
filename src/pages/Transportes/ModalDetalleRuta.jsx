import { useState } from 'react'
import { X, PlayCircle, Flag, Navigation as NavIcon, CheckCircle, Printer } from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '../../utils/helpers'
import { Modal, Btn, Badge, ConfirmDialog, Input } from '../../components/ui/index'
import { imprimirHojaReparto } from '../../utils/pdfTemplates'
import { ESTADO_RUTA, ESTADO_PARADA } from './constants'

// ── Modal Detalle / Gestión de Ruta ──────────────────────
export default function ModalDetalleRuta({ ruta, despachos, clientes, transportistas, almacenes, onClose, onIniciar, onCompletar, onCancelar, onMarcarParada, puedeIniciar = true, puedeCancelar = true, pdfConfig }) {
  const [confirmCancelar, setConfirmCancelar] = useState(false)
  const [obsParada, setObsParada] = useState({})
  const tra      = transportistas.find(t => t.id === ruta.transportistaId)
  const meta     = ESTADO_RUTA[ruta.estado] || ESTADO_RUTA.PROGRAMADA
  const Icon     = meta.icon
  const paradas  = ruta.paradas || []
  const entregadas = paradas.filter(p => p.estado === 'ENTREGADO').length
  // El Chofer no tiene permiso 'clientes' — su lista completa llega vacía.
  // Los despachos ya traen el cliente embebido (ver DespachosService.findAll),
  // así que se usa como respaldo para no depender de esa lista.
  const cliNombre = id => {
    const directo = clientes.find(c => c.id === id)?.razonSocial
    if (directo) return directo
    return despachos.find(d => d.clienteId === id)?.cliente?.razonSocial || '—'
  }
  const almacen    = almacenes?.find(a => a.id === ruta.almacenId)

  return (
    <Modal open title={`Ruta ${ruta.numero}`} onClose={onClose} size="lg"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
        <Btn variant="ghost" onClick={() => imprimirHojaReparto({ ruta, despachos, clientes, transportista: tra, config: pdfConfig })}>
          <Printer size={14}/> Hoja de Reparto
        </Btn>
        {puedeCancelar && ruta.estado === 'PROGRAMADA' && (
          <Btn variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => setConfirmCancelar(true)}>
            <X size={14}/> Cancelar Ruta
          </Btn>
        )}
        {puedeIniciar && ruta.estado === 'PROGRAMADA' && <Btn variant="primary" onClick={onIniciar}><PlayCircle size={14}/> Iniciar Ruta</Btn>}
        {ruta.estado === 'EN_RUTA'    && <Btn variant="success" onClick={onCompletar}><Flag size={14}/> Cerrar Ruta</Btn>}
      </>}>

      <div className="flex items-center gap-3 px-4 py-3 bg-[#00c896]/10 border border-[#00c896]/25 rounded-xl mb-3">
        <div className="w-9 h-9 rounded-full bg-[#00c896] flex items-center justify-center text-[10px] font-black text-[#082e1e] shrink-0">ALM</div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold text-[#00c896] uppercase tracking-[0.06em] mb-0.5">Origen de salida</div>
          <div className="text-[13px] font-semibold text-[#e8edf2] truncate">{almacen?.nombre || 'Almacén'}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">Hora salida</div>
          <div className="text-[15px] font-bold text-[#e8edf2] font-mono">{formatTime(ruta.fechaSalida) || '—'}</div>
          <div className="text-[11px] text-[#5f6f80]">{formatDate(ruta.fechaSalida)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          ['Transportista',    tra?.nombre || '—'],
          ['Placa / Vehículo', `${tra?.placa || '—'} · ${tra?.vehiculo || '—'}`],
          ['Estado',           null],
          ['Progreso',         `${entregadas}/${paradas.length} entregas`],
        ].map(([k, v]) => (
          <div key={k} className="bg-[#1a2230] rounded-lg px-3.5 py-2.5">
            <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">{k}</div>
            {k === 'Estado'
              ? <Badge variant={meta.color}><Icon size={9}/> {meta.label}</Badge>
              : <div className="text-[13px] font-medium text-[#e8edf2]">{v}</div>}
          </div>
        ))}
      </div>

      <div className="mb-4">
        <div className="w-full h-2 bg-[#0e1117] rounded-full overflow-hidden">
          <div className="h-full bg-[#00c896] rounded-full transition-all"
            style={{ width: paradas.length ? `${(entregadas/paradas.length)*100}%` : '0%' }}/>
        </div>
      </div>

      <div className="text-[13px] font-semibold text-[#e8edf2] mb-3">Paradas del viaje</div>
      <div className="flex flex-col gap-2.5">
        {paradas.map(parada => {
          const des   = despachos.find(d => d.id === parada.despachoId)
          const pMeta = ESTADO_PARADA[parada.estado] || ESTADO_PARADA.PENDIENTE
          return (
            <div key={parada.despachoId} className={`p-4 rounded-xl border transition-all ${
              parada.estado === 'EN_CAMINO' ? 'bg-blue-500/10 border-blue-500/25' :
              parada.estado === 'ENTREGADO' ? 'bg-green-500/5 border-green-500/15 opacity-70' :
              parada.estado === 'FALLIDO'   ? 'bg-red-500/10 border-red-500/20' :
              'bg-[#1a2230] border-white/6'
            }`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${
                    parada.estado === 'ENTREGADO' ? 'bg-green-500/20 text-green-400' :
                    parada.estado === 'EN_CAMINO' ? 'bg-blue-500/20 text-blue-400' :
                    parada.estado === 'FALLIDO'   ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-[#5f6f80]'
                  }`}>{parada.orden}</div>
                  <div>
                    <div className="font-medium text-[#e8edf2]">{cliNombre(des?.clienteId)}</div>
                    <div className="text-[11px] text-[#5f6f80]">{des?.direccionEntrega}</div>
                    <div className="text-[11px] text-[#9ba8b6] mt-0.5">
                      {des?.numero} · {des?.items?.length} ítem(s) · {formatCurrency(Number(des?.total||0), 'S/')}
                    </div>
                    {parada.horaLlegada && (
                      <div className="text-[11px] text-[#5f6f80] mt-0.5">
                        Llegada: {formatTime(parada.horaLlegada) || parada.horaLlegada}{parada.horaPartida ? ` · Partida: ${formatTime(parada.horaPartida) || parada.horaPartida}` : ''}
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant={pMeta.color}>{pMeta.label}</Badge>
              </div>

              {ruta.estado === 'EN_RUTA' && (parada.estado === 'EN_CAMINO' || parada.estado === 'PENDIENTE') && (
                <div className="mt-3 pt-3 border-t border-white/6">
                  <Input className="mb-2" placeholder="Observación (opcional)"
                    value={obsParada[parada.despachoId] || ''}
                    onChange={e => setObsParada(p => ({ ...p, [parada.despachoId]: e.target.value }))}/>
                  <div className="flex gap-2">
                    {parada.estado === 'PENDIENTE' && (
                      <Btn variant="secondary" size="sm" onClick={() => onMarcarParada(parada.despachoId, 'EN_CAMINO', obsParada[parada.despachoId] || '')}>
                        <NavIcon size={12}/> En Camino
                      </Btn>
                    )}
                    <Btn variant="primary" size="sm" onClick={() => onMarcarParada(parada.despachoId, 'ENTREGADO', obsParada[parada.despachoId] || '')}>
                      <CheckCircle size={12}/> Confirmar Entrega
                    </Btn>
                    <Btn variant="ghost" size="sm" className="text-red-400 hover:text-red-300"
                      onClick={() => onMarcarParada(parada.despachoId, 'FALLIDO', obsParada[parada.despachoId] || 'No se pudo entregar')}>
                      <X size={12}/> No Entregado
                    </Btn>
                  </div>
                </div>
              )}
              {parada.observacion && <div className="mt-2 text-[11px] text-[#9ba8b6] italic">{parada.observacion}</div>}
            </div>
          )
        })}
      </div>
      <ConfirmDialog
        open={confirmCancelar}
        onClose={() => setConfirmCancelar(false)}
        onConfirm={() => { setConfirmCancelar(false); onCancelar() }}
        danger
        title="Cancelar ruta"
        message={`¿Cancelar la ruta ${ruta.numero}? Solo se puede cancelar antes de iniciarla. Los despachos incluidos no se ven afectados y podrás asignarlos a otra ruta.`}
      />
    </Modal>
  )
}
