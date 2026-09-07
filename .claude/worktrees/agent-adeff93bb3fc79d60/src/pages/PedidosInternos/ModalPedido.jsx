import { useState } from 'react'
import { Plus, Package, Send, X } from 'lucide-react'
import { Input, Select, Textarea } from '../../components/ui'

// ── Modal Nuevo / Editar Pedido ─────────────────────────────
export function ModalPedido({ pedido, onClose, onSave, areas, productos, almacenes, sesion, areaFija, saving }) {
  const esSolicitante = sesion?.rol?.codigo === 'solicitante'
  const [form, setForm] = useState({
    areaId:         pedido?.areaId         || areaFija || '',
    almacenId:      pedido?.almacenId      || (almacenes[0]?.id || ''),
    fechaRequerida: pedido?.fechaRequerida?.split('T')[0] || '',
    prioridad:      pedido?.prioridad      || 'NORMAL',
    notasSolicitud: pedido?.notasSolicitud || '',
    items:          pedido?.items?.map(it => ({
      productoId:   it.productoId,
      cantidad:     it.cantidad,
      unidadMedida: it.unidadMedida || '',
      notas:        it.notas || '',
    })) || [],
  })
  const [error, setError] = useState('')
  const esEdicion = !!pedido?.id

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { productoId:'', cantidad:1, unidadMedida:'', notas:'' }] }))
  }
  function removeItem(i) {
    setForm(f => ({ ...f, items: f.items.filter((_,idx) => idx !== i) }))
  }
  function updateItem(i, field, val) {
    setForm(f => {
      const items = [...f.items]
      items[i] = { ...items[i], [field]: val }
      if (field === 'productoId') {
        const prod = productos.find(p => p.id === val)
        if (prod) items[i].unidadMedida = prod.unidadMedida || ''
      }
      return { ...f, items }
    })
  }

  async function handleSave(enviar = false) {
    setError('')
    if (!form.areaId || !form.almacenId || form.items.length === 0) {
      setError('Área, almacén e ítems son obligatorios.')
      return
    }
    const itemsValidos = form.items.filter(it => it.productoId && Number(it.cantidad) > 0)
    if (itemsValidos.length === 0) { setError('Agrega al menos un producto con cantidad mayor a cero.'); return }

    if (esEdicion) {
      // Solo actualizar campos permitidos (items son inmutables tras crear)
      const dto = {
        fechaRequerida: form.fechaRequerida || undefined,
        prioridad:      form.prioridad || undefined,
        notasSolicitud: form.notasSolicitud || undefined,
      }
      const res = await onSave({ type: 'update', id: pedido.id, dto, enviar })
      if (res?.error) { setError(res.error); return }
    } else {
      const dto = {
        areaId:         form.areaId,
        almacenId:      form.almacenId,
        fechaRequerida: form.fechaRequerida || undefined,
        prioridad:      form.prioridad || undefined,
        notasSolicitud: form.notasSolicitud || undefined,
        items: itemsValidos.map(it => ({
          productoId:   it.productoId,
          cantidad:     Number(it.cantidad),
          unidadMedida: it.unidadMedida || undefined,
          notas:        it.notas || undefined,
        })),
      }
      const res = await onSave({ type: 'create', dto, enviar })
      if (res?.error) { setError(res.error); return }
    }
  }

  const puedeEnviar = !esEdicion || pedido?.estado === 'BORRADOR'
  const productosActivos = productos.filter(p => p.activo !== false && p.estado !== 'Inactivo')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0e1117] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div>
            <h2 className="text-[15px] font-semibold text-white">
              {esEdicion ? `Editar ${pedido.numero}` : 'Nuevo Pedido Interno'}
            </h2>
            <p className="text-[11px] text-white/40 mt-0.5">Solicitud de materiales al almacén</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Área solicitante *</label>
              {esSolicitante || esEdicion ? (
                <Input disabled className="opacity-60 cursor-not-allowed" value={areas.find(a => a.id === form.areaId)?.nombre || '—'} readOnly/>
              ) : (
                <Select value={form.areaId} onChange={e => setForm(f => ({...f, areaId: e.target.value}))}>
                  <option value="">Selecciona área...</option>
                  {areas.filter(a => a.activo !== false).map(a => (
                    <option key={a.id} value={a.id}>{a.nombre} ({a.codigo})</option>
                  ))}
                </Select>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Almacén de despacho *</label>
              {esEdicion ? (
                <Input disabled className="opacity-60 cursor-not-allowed" value={almacenes.find(a => a.id === form.almacenId)?.nombre || '—'} readOnly/>
              ) : (
                <Select value={form.almacenId} onChange={e => setForm(f => ({...f, almacenId: e.target.value}))}>
                  {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </Select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Fecha requerida</label>
              <Input type="date" value={form.fechaRequerida}
                onChange={e => setForm(f => ({...f, fechaRequerida: e.target.value}))}/>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Prioridad</label>
              <Select value={form.prioridad} onChange={e => setForm(f => ({...f, prioridad: e.target.value}))}>
                <option value="NORMAL">Normal</option>
                <option value="URGENTE">Urgente</option>
                <option value="CRITICO">Crítico</option>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Productos solicitados *</label>
              {!esEdicion && (
                <button onClick={addItem}
                  className="flex items-center gap-1 text-[11px] text-[#00c896] hover:text-[#009e76] transition-colors">
                  <Plus size={12}/> Agregar item
                </button>
              )}
            </div>
            {form.items.length === 0 && (
              <div className="flex items-center justify-center py-6 border border-dashed border-white/10 rounded-lg text-[12px] text-white/25">
                Agrega al menos un producto
              </div>
            )}
            <div className="flex flex-col gap-2">
              {esEdicion ? (
                // Items inmutables en edición — mostrar como lista
                form.items.map((it, i) => {
                  const prod = productos.find(p => p.id === it.productoId)
                  return (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-white/3 rounded-lg">
                      <Package size={14} className="text-[#5f6f80] shrink-0"/>
                      <div className="flex-1 min-w-0 truncate text-[13px] text-white/70">{prod?.nombre || it.productoId}</div>
                      <div className="text-[12px] font-semibold text-white/60 shrink-0">
                        {it.cantidad} <span className="text-[11px] font-normal text-white/35">{it.unidadMedida || prod?.unidadMedida}</span>
                      </div>
                    </div>
                  )
                })
              ) : (
                form.items.map((it, i) => {
                  const prod = productos.find(p => p.id === it.productoId)
                  return (
                    <div key={i} className="grid grid-cols-[minmax(0,1fr)_80px_60px_auto] gap-2 items-center">
                      <Select value={it.productoId}
                        onChange={e => updateItem(i, 'productoId', e.target.value)}>
                        <option value="">Producto...</option>
                        {productosActivos.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </Select>
                      <Input type="number" min="0.01" step="0.01" placeholder="Cant."
                        value={it.cantidad}
                        onChange={e => updateItem(i, 'cantidad', Number(e.target.value))}/>
                      <div className="text-[11px] text-white/40 text-center font-mono">
                        {prod?.unidadMedida || '—'}
                      </div>
                      <button onClick={() => removeItem(i)}
                        className="text-white/25 hover:text-red-400 transition-colors">
                        <X size={14}/>
                      </button>
                    </div>
                  )
                })
              )}
            </div>
            {esEdicion && (
              <p className="text-[11px] text-white/25 mt-2">Los ítems no pueden modificarse después de crear el pedido.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Notas de solicitud</label>
            <Textarea className="resize-none h-16" placeholder="Observaciones opcionales..."
              value={form.notasSolicitud}
              onChange={e => setForm(f => ({...f, notasSolicitud: e.target.value}))}/>
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-lg text-[13px] text-red-400">{error}</div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/8">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-white/50 hover:text-white/80 transition-colors">
            Cancelar
          </button>
          <div className="flex items-center gap-2">
            {puedeEnviar && (
              <button disabled={saving} onClick={() => handleSave(false)}
                className="px-4 py-2 bg-white/8 hover:bg-white/12 text-white text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50">
                Guardar borrador
              </button>
            )}
            {puedeEnviar && (
              <button disabled={saving} onClick={() => handleSave(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#00c896] hover:bg-[#009e76] text-[#082e1e] text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50">
                <Send size={14}/> {saving ? 'Enviando...' : 'Enviar pedido'}
              </button>
            )}
            {!puedeEnviar && (
              <button disabled={saving} onClick={() => handleSave(false)}
                className="px-4 py-2 bg-[#00c896] hover:bg-[#009e76] text-[#082e1e] text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
