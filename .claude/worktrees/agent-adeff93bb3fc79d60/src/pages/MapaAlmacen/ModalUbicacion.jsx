import { useState } from 'react'
import { MapPin, AlertTriangle, Loader2 } from 'lucide-react'
import { Input, Select } from '../../components/ui/index'
import { parseCodigo } from './constants'

// ── Modal: Crear o Editar Ubicación ───────────────────────────────────────────
export default function ModalUbicacion({ ubicacion, almacenId, ubicacionesExistentes, crearMut, actualizarMut, onClose, onSaved }) {
  const editando = !!ubicacion
  const inicial = ubicacion ? parseCodigo(ubicacion.codigo) : { zona: '', fila: '', col: '' }
  const [zona,          setZona]          = useState(inicial.zona || '')
  const [fila,          setFila]          = useState(inicial.fila ? String(inicial.fila) : '')
  const [columna,       setColumna]       = useState(inicial.col ? String(inicial.col) : '')
  const [tipo,          setTipo]          = useState(ubicacion?.tipo || 'Rack')
  const [capacidadMax,  setCapacidadMax]  = useState(ubicacion?.capacidadMax ? String(ubicacion.capacidadMax) : '10')
  const [observaciones, setObservaciones] = useState(ubicacion?.observaciones || '')
  const [error,         setError]         = useState('')

  const pendiente = crearMut.isPending || actualizarMut.isPending

  const codigo = zona.trim() && fila && columna
    ? `${zona.trim().toUpperCase()}${String(fila).padStart(2,'0')}-${String(columna).padStart(2,'0')}`
    : ''

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!zona.trim())              return setError('Indica la zona (una letra, ej. A).')
    if (!fila || Number(fila) <= 0)       return setError('Indica la fila (número mayor a 0).')
    if (!columna || Number(columna) <= 0) return setError('Indica la columna (número mayor a 0).')
    if (!capacidadMax || Number(capacidadMax) <= 0) return setError('La capacidad máxima debe ser mayor a 0.')

    const dup = ubicacionesExistentes.some(u => u.codigo === codigo && u.id !== ubicacion?.id)
    if (dup) return setError(`Ya existe una ubicación con el código ${codigo} en este almacén.`)

    const dto = {
      codigo,
      tipo,
      zona: zona.trim().toUpperCase(),
      capacidadMax: Number(capacidadMax),
      observaciones: observaciones.trim() || undefined,
    }

    const res = editando
      ? await actualizarMut.mutateAsync({ id: ubicacion.id, ...dto })
      : await crearMut.mutateAsync({ almacenId, ...dto })

    if (res?.error) { setError(res.error); return }
    onSaved(editando ? 'Ubicación actualizada' : 'Ubicación creada')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#161d28] border border-white/12 rounded-2xl shadow-2xl w-full max-w-105 p-6">

        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#00c896]/10 flex items-center justify-center"><MapPin size={16} className="text-[#00c896]"/></div>
          <div>
            <div className="text-[14px] font-semibold text-[#e8edf2]">{editando ? 'Editar ubicación' : 'Nueva ubicación'}</div>
            <div className="text-[11px] text-[#5f6f80]">Rack, estantería o zona de piso dentro del almacén</div>
          </div>
          <button onClick={onClose} className="ml-auto text-[#5f6f80] hover:text-[#9ba8b6] text-[20px] leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Zona</label>
              <Input value={zona} onChange={e => setZona(e.target.value.toUpperCase().slice(0,2))}
                placeholder="A" maxLength={2} className="uppercase"/>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Fila</label>
              <Input type="number" min={1} value={fila} onChange={e => setFila(e.target.value)}
                placeholder="1"/>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Columna</label>
              <Input type="number" min={1} value={columna} onChange={e => setColumna(e.target.value)}
                placeholder="1"/>
            </div>
          </div>

          {codigo && (
            <div className="text-[11px] text-[#5f6f80] -mt-2">
              Código de la ubicación: <span className="font-mono text-[#00c896] font-semibold">{codigo}</span>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Tipo</label>
            <Select value={tipo} onChange={e => setTipo(e.target.value)}>
              {['Rack','Estantería','Piso'].map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">
              Capacidad máxima <span className="text-[#3d4f60] font-normal normal-case">(SKUs distintos que caben)</span>
            </label>
            <Input type="number" min={1} value={capacidadMax} onChange={e => setCapacidadMax(e.target.value)}/>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">
              Observaciones <span className="text-[#3d4f60] font-normal normal-case">(opcional)</span>
            </label>
            <Input value={observaciones} onChange={e => setObservaciones(e.target.value)}
              placeholder="Ej. solo productos perecibles"/>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle size={12} className="text-red-400 shrink-0"/>
              <span className="text-[11px] text-red-300">{error}</span>
            </div>
          )}

          <div className="flex gap-2 mt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[#1e2835] border border-white/8 text-[13px] text-[#9ba8b6] hover:text-[#e8edf2] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={pendiente}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 bg-[#00c896] text-[#0e1117] hover:bg-[#00b084] disabled:opacity-40 transition-colors">
              {pendiente && <Loader2 size={13} className="animate-spin"/>}
              {editando ? 'Guardar cambios' : 'Crear ubicación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
