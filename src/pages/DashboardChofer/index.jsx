import { useState } from 'react'
import { Truck, MapPin, CheckCircle } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { useDespachosList, useEntregarDespacho } from '../../queries/despachos.queries'
import { ModalEvidencia } from '../Despachos.jsx'

export default function DashboardChofer() {
  const { sesion, toast } = useApp()
  const { data: despachos = [], isLoading } = useDespachosList({
    transportistaId: sesion?.transportistaId,
    estado: 'DESPACHADO',
    enabled: !!sesion?.transportistaId,
  })
  const entregarDespacho = useEntregarDespacho()
  const [confirmando, setConfirmando] = useState(null)

  async function handleConfirmar(des, evidencia) {
    const res = await entregarDespacho.mutateAsync({
      id: des.id,
      receptorNombre: evidencia.receptor || undefined,
      evidenciaFoto:  evidencia.foto || undefined,
      evidenciaNotas: evidencia.notas || undefined,
    })
    if (res.error) { toast(res.error, 'error'); return }
    setConfirmando(null)
    toast(`Despacho ${des.numero} entregado`, 'success')
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
            {despachos.length} despacho{despachos.length !== 1 ? 's' : ''} por entregar
          </div>

          {isLoading && <div className="text-center text-[#5f6f80] py-8 text-[12px]">Cargando...</div>}

          {!isLoading && despachos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <CheckCircle size={40} className="text-green-400 opacity-40"/>
              <div className="text-[13px] text-[#5f6f80]">No tenés despachos pendientes de entrega.</div>
            </div>
          )}

          {!isLoading && despachos.length > 0 && (
            <div className="flex flex-col gap-2">
              {despachos.map(d => (
                <button key={d.id} onClick={() => setConfirmando(d)}
                  className="flex items-center gap-3 bg-[#1a2230] rounded-xl px-4 py-4 border border-white/8 text-left active:bg-white/5">
                  <Truck size={18} className="text-[#0ea5e9] shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[12px] text-[#00c896] font-bold">{d.numero}</div>
                    <div className="text-[13px] text-[#e8edf2] truncate">{d.cliente?.razonSocial || '—'}</div>
                    {d.direccionEntrega && (
                      <div className="flex items-center gap-1 text-[11px] text-[#5f6f80] truncate mt-0.5">
                        <MapPin size={11} className="shrink-0"/> {d.direccionEntrega}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {confirmando && (
        <ModalEvidencia des={confirmando} onClose={() => setConfirmando(null)}
          onConfirm={evidencia => handleConfirmar(confirmando, evidencia)}/>
      )}
    </div>
  )
}
