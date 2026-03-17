/**
 * ModalRecepcionParcial — componente reutilizable para recibir OC completa o parcialmente.
 * Se importa desde Ordenes.jsx reemplazando el ConfirmDialog simple anterior.
 */
import { useState, useMemo } from 'react'
import { CheckCircle, Package } from 'lucide-react'
import { formatCurrency, formatDate, fechaHoy } from './../../utils/helpers.js'
import { Modal, Badge, Btn, Alert } from '../ui/index.jsx'

const SI = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'

export function ModalRecepcionParcial({ oc, productos, simboloMoneda, onClose, onConfirm }) {
  const [cantidades, setCantidades] = useState(() => {
    const init = {}
    oc?.items?.forEach(item => { init[item.productoId] = item.cantidad })
    return init
  })
  const [fecha, setFecha] = useState(fechaHoy())
  const [notas, setNotas] = useState('')

  const itemsConCant = useMemo(() => {
    if (!oc?.items) return []
    return oc.items.map(item => {
      const prod   = productos.find(p => p.id === item.productoId)
      const recibir = +( cantidades[item.productoId] ?? item.cantidad )
      const pendiente = Math.max(0, item.cantidad - (item.cantidadRecibida || 0))
      return { ...item, prod, recibir: Math.min(recibir, pendiente), pendiente }
    })
  }, [oc, cantidades, productos])

  const totalRecibir  = itemsConCant.reduce((s, i) => s + i.recibir * i.costoUnitario, 0)
  const esCompleta    = itemsConCant.every(i => i.recibir >= i.pendiente)
  const esParcial     = !esCompleta && itemsConCant.some(i => i.recibir > 0)
  const sinRecepcion  = itemsConCant.every(i => i.recibir <= 0)

  function setItem(productoId, val) {
    setCantidades(prev => ({ ...prev, [productoId]: Math.max(0, +val) }))
  }

  if (!oc) return null

  return (
    <Modal open title={`Recepción — ${oc.numero}`} onClose={onClose} size="lg"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={sinRecepcion}
          onClick={() => onConfirm({ items: itemsConCant, fecha, notas, esCompleta })}>
          <CheckCircle size={14}/>
          {esCompleta ? 'Confirmar recepción completa' : esParcial ? 'Confirmar recepción parcial' : 'Recibir'}
        </Btn>
      </>}>

      <div className="grid grid-cols-2 gap-3">
        {[
          ['Proveedor', oc.proveedorNombre || oc.proveedorId],
          ['Fecha OC',  formatDate(oc.fecha)],
          ['F. Entrega',formatDate(oc.fechaEntrega)],
          ['Estado',    <Badge variant={oc.estado === 'RECIBIDA' ? 'success' : oc.estado === 'PARCIAL' ? 'warning' : 'info'}>{oc.estado}</Badge>],
        ].map(([k, v]) => (
          <div key={k} className="bg-[#1a2230] rounded-lg px-3.5 py-2.5">
            <div className="text-[11px] text-[#5f6f80] mb-0.5">{k}</div>
            <div className="text-[13px] font-medium text-[#e8edf2]">{v}</div>
          </div>
        ))}
      </div>

      {/* Ítems con cantidades editables */}
      <div className="text-[13px] font-semibold text-[#e8edf2]">Cantidades a recibir</div>
      <div className="flex flex-col gap-2">
        {itemsConCant.map(item => {
          const porcentaje = item.pendiente > 0 ? Math.min(100, Math.round((item.recibir / item.pendiente) * 100)) : 0
          return (
            <div key={item.productoId} className="bg-[#1a2230] rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#00c896]/10 flex items-center justify-center shrink-0">
                    <Package size={14} className="text-[#00c896]"/>
                  </div>
                  <div>
                    <div className="font-medium text-[#e8edf2]">{item.prod?.nombre || item.productoId}</div>
                    <div className="text-[11px] text-[#5f6f80]">{item.prod?.sku} · {formatCurrency(item.costoUnitario, simboloMoneda)} c/u</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-[#5f6f80]">Pendiente</div>
                  <div className="text-[13px] font-semibold text-amber-400">{item.pendiente} {item.prod?.unidadMedida}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-[11px] text-[#5f6f80] mb-1">
                    <span>Cantidad a recibir ahora</span>
                    <span className="text-[#00c896]">{porcentaje}% del pendiente</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#0e1117] rounded-full mb-2 overflow-hidden">
                    <div className="h-full rounded-full bg-[#00c896] transition-all" style={{ width: `${porcentaje}%` }}/>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setItem(item.productoId, 0)}
                    className="px-2 py-1 text-[11px] text-[#5f6f80] hover:text-[#9ba8b6] border border-white/[0.08] rounded-lg transition-colors">
                    0
                  </button>
                  <input type="number" className={SI} style={{ width: 90 }}
                    value={cantidades[item.productoId] ?? item.pendiente}
                    onChange={e => setItem(item.productoId, e.target.value)}
                    min="0" max={item.pendiente} step="0.01"/>
                  <button onClick={() => setItem(item.productoId, item.pendiente)}
                    className="px-2 py-1 text-[11px] text-[#00c896] hover:text-[#009e76] border border-[#00c896]/30 rounded-lg transition-colors">
                    Max
                  </button>
                </div>
              </div>

              {item.recibir > 0 && (
                <div className="mt-2 text-right text-[12px] text-[#9ba8b6]">
                  Subtotal: <span className="text-[#e8edf2] font-medium">
                    {formatCurrency(item.recibir * item.costoUnitario, simboloMoneda)}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Resumen */}
      {!sinRecepcion && (
        <Alert variant={esCompleta ? 'success' : 'warning'}>
          {esCompleta
            ? 'Se recibirá el total pendiente. La OC pasará a estado RECIBIDA.'
            : 'Se registrará una recepción parcial. La OC quedará en estado PARCIAL hasta completarse.'
          }
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3.5">
        <div>
          <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">
            Fecha de recepción
          </label>
          <input type="date" className={SI} value={fecha} onChange={e => setFecha(e.target.value)}/>
        </div>
        <div className="flex items-end">
          <div className="text-right w-full">
            <div className="text-[11px] text-[#5f6f80] mb-1">Total a ingresar</div>
            <div className="text-[20px] font-semibold text-[#00c896]">{formatCurrency(totalRecibir, simboloMoneda)}</div>
          </div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Notas</label>
        <textarea className={SI + ' resize-y min-h-[56px]'} value={notas}
          onChange={e => setNotas(e.target.value)} placeholder="Observaciones de la recepción..."/>
      </div>
    </Modal>
  )
}
