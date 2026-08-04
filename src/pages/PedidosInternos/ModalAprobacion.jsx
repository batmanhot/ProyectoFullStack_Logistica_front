import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Textarea } from '../../components/ui'

// ── Modal Aprobar / Rechazar ────────────────────────────────
export function ModalAprobacion({ pedido, onClose, onAprobar, onRechazar, saving }) {
  const [accion, setAccion] = useState('aprobar')
  const [notas,  setNotas]  = useState('')
  const [motivo, setMotivo] = useState('')
  const [error,  setError]  = useState('')

  async function handleSubmit() {
    setError('')
    if (accion === 'rechazar' && !motivo.trim()) {
      setError('El motivo del rechazo es obligatorio.')
      return
    }
    if (accion === 'aprobar') {
      const res = await onAprobar({ id: pedido.id, notas })
      if (res?.error) { setError(res.error); return }
    } else {
      const res = await onRechazar({ id: pedido.id, motivo })
      if (res?.error) { setError(res.error); return }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0e1117] border border-white/10 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-[15px] font-semibold text-white">Revisión — {pedido.numero}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><X size={18}/></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex gap-2">
            <button onClick={() => setAccion('aprobar')}
              className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors ${accion==='aprobar' ? 'bg-[#00c896] text-[#082e1e]' : 'bg-white/5 text-white/50 hover:bg-white/8'}`}>
              <Check size={13} className="inline mr-1"/> Aprobar
            </button>
            <button onClick={() => setAccion('rechazar')}
              className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors ${accion==='rechazar' ? 'bg-red-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/8'}`}>
              <X size={13} className="inline mr-1"/> Rechazar
            </button>
          </div>
          {accion === 'aprobar' ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Notas de aprobación (opcional)</label>
              <Textarea className="resize-none h-20" placeholder="Comentarios..."
                value={notas} onChange={e => setNotas(e.target.value)}/>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Motivo del rechazo *</label>
              <Textarea className="resize-none h-20" placeholder="Indica el motivo..."
                value={motivo} onChange={e => setMotivo(e.target.value)}/>
            </div>
          )}
          {error && <div className="px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-lg text-[13px] text-red-400">{error}</div>}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/8">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-white/50 hover:text-white/80 transition-colors">Cancelar</button>
          <button disabled={saving} onClick={handleSubmit}
            className={`px-5 py-2 text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 ${accion==='aprobar' ? 'bg-[#00c896] hover:bg-[#009e76] text-[#082e1e]' : 'bg-red-500 hover:bg-red-600 text-white'}`}>
            {accion === 'aprobar' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
          </button>
        </div>
      </div>
    </div>
  )
}
