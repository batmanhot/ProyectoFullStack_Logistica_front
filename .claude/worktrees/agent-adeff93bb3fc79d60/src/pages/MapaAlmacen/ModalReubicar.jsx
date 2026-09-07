import { useState } from 'react'
import { ArrowRight, AlertTriangle, Loader2 } from 'lucide-react'
import { Input, Select } from '../../components/ui/index'

// ── Modal: Asignar o Liberar ─────────────────────────────────────────────────
export default function ModalReubicar({ modo, ubicacion, invLinea, prod, sinUbicLines, prodMap, ubicacionesDisponibles = [], asignarMut, liberarMut, onClose }) {
  const [productoId, setProductoId] = useState(invLinea?.productoId ?? '')
  const [ubicacionIdSel, setUbicacionIdSel] = useState(ubicacion?.id ?? '')
  const [cantidad,   setCantidad]   = useState(1)
  const [error,      setError]      = useState('')

  const pendiente = asignarMut.isPending || liberarMut.isPending

  // En modo asignar, la ubicación puede venir fija (clic en una celda) o
  // elegirse en el formulario (viene de "Sin ubicar", donde el producto ya
  // está fijo pero falta decidir a qué rack va).
  const ubicacionDestino = ubicacion || ubicacionesDisponibles.find(u => u.id === ubicacionIdSel)

  const maxCantidad = (() => {
    if (modo === 'liberar') return Number(invLinea?.cantidad ?? 0)
    const linea = sinUbicLines.find(l => l.productoId === productoId)
    if (!linea) return 0
    return Number(linea.cantidad) - Number(linea.cantidadReservada ?? 0)
  })()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!productoId)    return setError('Debes seleccionar un producto.')
    if (modo === 'asignar' && !ubicacionDestino) return setError('Debes seleccionar una ubicación destino.')
    if (cantidad <= 0)  return setError('La cantidad debe ser mayor que cero.')
    if (cantidad > maxCantidad) return setError(`Máximo disponible: ${maxCantidad}`)

    try {
      const res = modo === 'asignar'
        ? await asignarMut.mutateAsync({ ubicacionId: ubicacionDestino.id, productoId, cantidad })
        : await liberarMut.mutateAsync({ ubicacionId: ubicacion.id, productoId, cantidad })
      if (res?.error) { setError(res.error); return }
      onClose()
    } catch (err) {
      setError(err?.message || 'Error al procesar la operación.')
    }
  }

  const prodSel = prodMap[productoId]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#161d28] border border-white/12 rounded-2xl shadow-2xl w-full max-w-[420px] p-6">

        <div className="flex items-center gap-3 mb-5">
          {modo === 'asignar'
            ? <div className="w-9 h-9 rounded-xl bg-[#00c896]/10 flex items-center justify-center"><ArrowRight size={16} className="text-[#00c896]"/></div>
            : <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center"><ArrowRight size={16} className="text-amber-400 rotate-180"/></div>
          }
          <div>
            <div className="text-[14px] font-semibold text-[#e8edf2]">
              {modo === 'asignar' ? 'Asignar a ubicación' : 'Mover al bucket general'}
            </div>
            {modo === 'asignar' && ubicacion && (
              <div className="text-[11px] text-[#5f6f80] font-mono">
                → {ubicacion.codigo} ({ubicacion.tipo || 'Rack'})
              </div>
            )}
            {modo === 'liberar' && ubicacion && (
              <div className="text-[11px] text-[#5f6f80] font-mono">
                ← {ubicacion.codigo} → sin asignar
              </div>
            )}
          </div>
          <button onClick={onClose} className="ml-auto text-[#5f6f80] hover:text-[#9ba8b6] text-[20px] leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Selección de producto (solo en modo asignar sin prod preseleccionado) */}
          {modo === 'asignar' && !invLinea && (
            <div>
              <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">
                Producto (stock sin ubicar)
              </label>
              {sinUbicLines.length === 0 ? (
                <div className="px-3 py-2.5 bg-[#1e2835] border border-white/8 rounded-lg text-[12px] text-[#5f6f80]">
                  No hay stock sin ubicar en este almacén
                </div>
              ) : (
                <Select
                  value={productoId}
                  onChange={e => { setProductoId(e.target.value); setCantidad(1); setError('') }}>
                  <option value="">Seleccionar producto...</option>
                  {sinUbicLines.map(l => {
                    const p = prodMap[l.productoId]
                    const disp = Number(l.cantidad) - Number(l.cantidadReservada ?? 0)
                    if (!p || disp <= 0) return null
                    return <option key={l.productoId} value={l.productoId}>{p.sku} — {p.nombre} ({disp} disp.)</option>
                  })}
                </Select>
              )}
            </div>
          )}

          {/* Selección de ubicación destino (solo en modo asignar sin ubicación preseleccionada,
              es decir, cuando se abre desde la pestaña "Sin ubicar") */}
          {modo === 'asignar' && !ubicacion && (
            <div>
              <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">
                Ubicación destino
              </label>
              {ubicacionesDisponibles.length === 0 ? (
                <div className="px-3 py-2.5 bg-[#1e2835] border border-white/8 rounded-lg text-[12px] text-[#5f6f80]">
                  Este almacén no tiene ubicaciones creadas. Cierra este modal y usa "Nueva ubicación" primero.
                </div>
              ) : (
                <Select
                  value={ubicacionIdSel}
                  onChange={e => { setUbicacionIdSel(e.target.value); setError('') }}>
                  <option value="">Seleccionar ubicación...</option>
                  {ubicacionesDisponibles.map(u => {
                    const llena = u.capacidadMax > 0 && u.capacidadActual >= u.capacidadMax
                    return (
                      <option key={u.id} value={u.id} disabled={llena}>
                        {u.codigo} — {u.tipo} ({u.capacidadActual}/{u.capacidadMax}{llena ? ' · llena' : ''})
                      </option>
                    )
                  })}
                </Select>
              )}
            </div>
          )}

          {/* Info del producto en modo liberar */}
          {modo === 'liberar' && prod && (
            <div className="px-3 py-2.5 bg-[#1e2835] border border-white/8 rounded-lg">
              <div className="text-[12px] font-medium text-[#e8edf2]">{prod.nombre}</div>
              <div className="text-[10px] text-[#5f6f80] font-mono mt-0.5">{prod.sku}</div>
              <div className="text-[11px] text-[#00c896] mt-1">
                En rack: {Number(invLinea?.cantidad ?? 0)} {prod.unidadMedida}
              </div>
            </div>
          )}

          {/* Input cantidad */}
          <div>
            <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">
              Cantidad a {modo === 'asignar' ? 'mover al rack' : 'regresar al bucket'}
              {maxCantidad > 0 && <span className="ml-2 text-[#3d4f60] font-normal normal-case">máx. {maxCantidad}</span>}
            </label>
            <Input
              type="number" min={1} max={maxCantidad || undefined}
              value={cantidad}
              onChange={e => { setCantidad(Number(e.target.value)); setError('') }}
            />
            {prodSel && productoId && modo === 'asignar' && (
              <div className="text-[10px] text-[#5f6f80] mt-1">
                Disponible para reubicar (sin reserva): {maxCantidad} {prodSel.unidadMedida}
              </div>
            )}
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
            <button type="submit" disabled={pendiente || !productoId || (modo === 'asignar' && !ubicacionDestino)}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors ${
                modo === 'asignar'
                  ? 'bg-[#00c896] text-[#0e1117] hover:bg-[#00b084] disabled:opacity-40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-40'
              }`}>
              {pendiente && <Loader2 size={13} className="animate-spin"/>}
              {modo === 'asignar' ? 'Asignar al rack' : 'Mover al bucket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
