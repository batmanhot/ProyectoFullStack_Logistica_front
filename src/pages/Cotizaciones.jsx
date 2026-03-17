import { useState, useMemo } from 'react'
import { Plus, Search, Eye, CheckCircle, FileText, X, ShoppingCart, MessageCircle, Mail } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoy, generarNumDoc } from '../utils/helpers'
import * as storage from '../services/storage'
import { Modal, ConfirmDialog, EmptyState, Badge, Btn, Field, Alert } from '../components/ui/index'
import PdfSharePanel from '../components/ui/PdfSharePanel'
import { imprimirRFQ } from '../utils/pdfTemplates'

const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'

const ESTADOS_COT = {
  BORRADOR:    { color: 'neutral',  label: 'Borrador'    },
  ENVIADA:     { color: 'info',     label: 'Enviada'     },
  RESPONDIDA:  { color: 'warning',  label: 'Respondida'  },
  ADJUDICADA:  { color: 'success',  label: 'Adjudicada'  },
  CANCELADA:   { color: 'danger',   label: 'Cancelada'   },
}

export default function Cotizaciones() {
  const { productos, proveedores, recargarOrdenes, sesion, toast, simboloMoneda } = useApp()
  const [cotizaciones, setCotizaciones] = useState(() => storage.getCotizaciones().data || [])
  const [modal, setModal]       = useState(false)
  const [detalle, setDetalle]   = useState(null)
  const [shareRFQ, setShareRFQ]  = useState(null)
  const [filtEst, setFiltEst]   = useState('')
  const [busqueda, setBusqueda] = useState('')

  const recargar = () => setCotizaciones(storage.getCotizaciones().data || [])

  const filtered = useMemo(() => {
    let d = [...cotizaciones]
    if (filtEst) d = d.filter(c => c.estado === filtEst)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(c => c.numero?.toLowerCase().includes(q) || c.notas?.toLowerCase().includes(q))
    }
    return d
  }, [cotizaciones, filtEst, busqueda])

  const kpis = useMemo(() => ({
    total:      cotizaciones.length,
    pendientes: cotizaciones.filter(c => c.estado === 'ENVIADA').length,
    respond:    cotizaciones.filter(c => c.estado === 'RESPONDIDA').length,
    adjud:      cotizaciones.filter(c => c.estado === 'ADJUDICADA').length,
  }), [cotizaciones])

  function convertirAOC(cotiz, respuestaIdx) {
    const resp = cotiz.respuestas?.[respuestaIdx]
    if (!resp) return
    const items = resp.items.map(it => ({
      productoId: it.productoId,
      cantidad: cotiz.items.find(i => i.productoId === it.productoId)?.cantidad || 0,
      costoUnitario: it.precioUnitario,
      subtotal: it.subtotal,
      cantidadRecibida: 0,
    }))
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
    const igv      = +(subtotal * 0.18).toFixed(2)
    const total    = +(subtotal + igv).toFixed(2)
    storage.saveOrden({
      numero: generarNumDoc('OC', '001'),
      proveedorId: resp.proveedorId,
      fecha: fechaHoy(), fechaEntrega: '',
      estado: 'PENDIENTE', items, subtotal, igv, total,
      notas: `Generada desde cotización ${cotiz.numero}`,
      usuarioId: sesion?.id || 'usr1',
    })
    storage.saveCotizacion({ ...cotiz, estado: 'ADJUDICADA',
      respuestas: cotiz.respuestas.map((r, i) => ({ ...r, ganadora: i === respuestaIdx }))
    })
    recargar()
    recargarOrdenes()
    toast(`OC generada desde cotización ${cotiz.numero}`, 'success')
    setDetalle(null)
  }

  const provNombre = id => proveedores.find(p => p.id === id)?.razonSocial || id

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3.5">
        {[
          ['Total RFQ',     kpis.total,      '#00c896'],
          ['Enviadas',      kpis.pendientes, '#3b82f6'],
          ['Respondidas',   kpis.respond,    '#f59e0b'],
          ['Adjudicadas',   kpis.adjud,      '#22c55e'],
        ].map(([l, v, c]) => (
          <div key={l} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: c }}/>
            <div className="text-[11px] text-[#5f6f80] uppercase tracking-[0.05em] mb-2">{l}</div>
            <div className="text-[28px] font-semibold text-[#e8edf2]">{v}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
            Solicitudes de Cotización
          </span>
          <Btn variant="primary" size="sm" onClick={() => setModal(true)}>
            <Plus size={13}/> Nueva RFQ
          </Btn>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI + ' pl-8'} placeholder="Buscar número, notas..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <select className={SEL} style={{ width: 160 }} value={filtEst} onChange={e => setFiltEst(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.keys(ESTADOS_COT).map(k => <option key={k} value={k}>{ESTADOS_COT[k].label}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {['N° RFQ','Fecha','Vence','Ítems','Respuestas','Estado','Notas','Acciones'].map(h => (
                  <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/[0.08] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8}>
                  <EmptyState icon={FileText} title="Sin cotizaciones" description="Crea tu primera solicitud de cotización."/>
                </td></tr>
              )}
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-3.5 py-2.5 font-mono text-[12px] font-semibold text-[#00c896]">{c.numero}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(c.fecha)}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(c.fechaVencimiento)}</td>
                  <td className="px-3.5 py-2.5 text-center text-[#9ba8b6]">{c.items?.length || 0}</td>
                  <td className="px-3.5 py-2.5 text-center">
                    <span className={`font-semibold text-[13px] ${(c.respuestas?.length || 0) > 0 ? 'text-[#00c896]' : 'text-[#5f6f80]'}`}>
                      {c.respuestas?.length || 0}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Badge variant={ESTADOS_COT[c.estado]?.color || 'neutral'}>
                      {ESTADOS_COT[c.estado]?.label || c.estado}
                    </Badge>
                  </td>
                  <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6] max-w-[160px] truncate">{c.notas}</td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex gap-1">
                      <Btn variant="ghost" size="icon" onClick={() => setDetalle(c)}><Eye size={13}/></Btn>
                      {c.estado === 'ENVIADA' && (
                        <Btn variant="ghost" size="icon" title="PDF / Compartir" className="text-[#00c896] hover:text-[#009e76]" onClick={() => setShareRFQ(c)}>
                          <FileText size={13}/>
                        </Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ModalNuevaRFQ open={modal} onClose={() => setModal(false)} productos={productos} proveedores={proveedores}
        onSaved={() => { recargar(); setModal(false); toast('Solicitud de cotización creada', 'success') }}
        sesionId={sesion?.id}/>

      {shareRFQ && (
        <Modal open title={`PDF / Compartir — ${shareRFQ.numero}`} onClose={() => setShareRFQ(null)} size="sm"
          footer={<Btn variant="secondary" onClick={() => setShareRFQ(null)}>Cerrar</Btn>}>
          <PdfSharePanel
            tipo="Solicitud de Cotización"
            numero={shareRFQ.numero}
            onClose={() => setShareRFQ(null)}
            onPrint={() => imprimirRFQ({ cotiz: shareRFQ, productos, config: { simboloMoneda: simboloMoneda } })}
            extra={{
              whatsapp: `https://wa.me/?text=${encodeURIComponent(`Estimado proveedor, le enviamos la Solicitud de Cotización ${shareRFQ.numero}. Por favor revisar los ítems adjuntos y enviarnos su mejor oferta. Gracias.`)}`,
              mailto: `mailto:?subject=${encodeURIComponent(`Solicitud de Cotización ${shareRFQ.numero}`)}&body=${encodeURIComponent(`Estimado Proveedor,\n\nAdjuntamos la Solicitud de Cotización ${shareRFQ.numero} para su atención.\n\nQuedamos a la espera de su respuesta.`)}`,
            }}
          />
        </Modal>
      )}
      {detalle && (
        <ModalDetalleRFQ cotiz={detalle} productos={productos} provNombre={provNombre}
          simboloMoneda={simboloMoneda} onClose={() => setDetalle(null)}
          onAgregarRespuesta={(cotiz, resp) => {
            const actualizada = { ...cotiz, estado: 'RESPONDIDA', respuestas: [...(cotiz.respuestas||[]), resp] }
            storage.saveCotizacion(actualizada); recargar(); setDetalle(actualizada)
            toast('Respuesta de proveedor registrada', 'success')
          }}
          onConvertirOC={(cotiz, idx) => convertirAOC(cotiz, idx)}
        />
      )}
    </div>
  )
}

/* ── Modal Nueva RFQ ─────────────────────────────── */
function ModalNuevaRFQ({ open, onClose, productos, proveedores, onSaved, sesionId }) {
  const [form, setForm]   = useState({ fecha: fechaHoy(), fechaVencimiento: '', notas: '' })
  const [items, setItems] = useState([])
  const [ni, setNi]       = useState({ productoId: '', cantidad: '' })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function addItem() {
    if (!ni.productoId || !ni.cantidad) return
    const prod = productos.find(p => p.id === ni.productoId)
    if (items.find(i => i.productoId === ni.productoId)) return
    setItems(prev => [...prev, { productoId: ni.productoId, descripcion: prod?.nombre || '', cantidad: +ni.cantidad }])
    setNi({ productoId: '', cantidad: '' })
  }

  function handleSave() {
    if (!items.length) return
    storage.saveCotizacion({
      numero: generarNumDoc('RFQ', '001'),
      estado: 'BORRADOR', fecha: form.fecha,
      fechaVencimiento: form.fechaVencimiento,
      items, respuestas: [], notas: form.notas,
      usuarioId: sesionId || 'usr1',
    })
    setForm({ fecha: fechaHoy(), fechaVencimiento: '', notas: '' })
    setItems([])
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva Solicitud de Cotización (RFQ)" size="lg"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={!items.length}>Crear RFQ</Btn>
      </>}>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Fecha"><input type="date" className={SI} value={form.fecha} onChange={e => f('fecha', e.target.value)}/></Field>
        <Field label="Fecha vencimiento" hint="Límite para recibir respuestas"><input type="date" className={SI} value={form.fechaVencimiento} onChange={e => f('fechaVencimiento', e.target.value)}/></Field>
      </div>

      <div className="text-[13px] font-semibold text-[#e8edf2]">Productos a cotizar</div>
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex-[2] min-w-[200px]">
          <Field label="Producto">
            <select className={SEL} value={ni.productoId} onChange={e => setNi(p => ({ ...p, productoId: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {productos.filter(p => p.activo !== false && !items.find(i => i.productoId === p.id)).map(p => (
                <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex-1 min-w-[100px]">
          <Field label="Cantidad"><input type="number" className={SI} value={ni.cantidad} onChange={e => setNi(p => ({ ...p, cantidad: e.target.value }))} min="1"/></Field>
        </div>
        <Btn variant="secondary" onClick={addItem}>+ Agregar</Btn>
      </div>

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-center justify-between bg-[#1a2230] rounded-lg px-3.5 py-2.5">
              <div>
                <div className="text-[13px] font-medium text-[#e8edf2]">{it.descripcion}</div>
                <div className="text-[11px] text-[#5f6f80]">Cantidad: {it.cantidad}</div>
              </div>
              <Btn variant="ghost" size="icon" className="text-red-400" onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}>
                <X size={12}/>
              </Btn>
            </div>
          ))}
        </div>
      )}

      <Field label="Notas / Especificaciones">
        <textarea className={SI + ' resize-y min-h-[60px]'} value={form.notas} onChange={e => f('notas', e.target.value)} placeholder="Condiciones especiales, especificaciones técnicas..."/>
      </Field>
    </Modal>
  )
}

/* ── Modal Detalle RFQ ───────────────────────────── */
function ModalDetalleRFQ({ cotiz, productos, provNombre, simboloMoneda, onClose, onAgregarRespuesta, onConvertirOC }) {
  const [tabResp, setTabResp]   = useState(false)
  const [respForm, setRespForm] = useState(null)
  const { proveedores } = useApp()

  function initRespForm() {
    setRespForm({
      proveedorId: '', fecha: fechaHoy(),
      items: cotiz.items.map(i => ({ productoId: i.productoId, precioUnitario: '', subtotal: 0 })),
      total: 0, tiempoEntrega: '', notas: '',
    })
    setTabResp(true)
  }

  function calcTotal(items) {
    return items.reduce((s, i) => s + (+i.precioUnitario * (cotiz.items.find(x => x.productoId === i.productoId)?.cantidad || 0)), 0)
  }

  function updatePrecio(productoId, precio) {
    const cant = cotiz.items.find(i => i.productoId === productoId)?.cantidad || 0
    setRespForm(prev => {
      const items = prev.items.map(i => i.productoId === productoId
        ? { ...i, precioUnitario: precio, subtotal: +(+precio * cant).toFixed(2) }
        : i
      )
      return { ...prev, items, total: calcTotal(items) }
    })
  }

  return (
    <Modal open title={`Cotización ${cotiz.numero}`} onClose={onClose} size="xl"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
        {cotiz.estado !== 'ADJUDICADA' && cotiz.estado !== 'CANCELADA' && !tabResp && (
          <Btn variant="primary" onClick={initRespForm}><Plus size={13}/> Registrar Respuesta</Btn>
        )}
      </>}>

      {/* Info general */}
      <div className="grid grid-cols-3 gap-3">
        {[
          ['N° RFQ', cotiz.numero],
          ['Estado', null],
          ['Fecha', formatDate(cotiz.fecha)],
          ['Vence',  formatDate(cotiz.fechaVencimiento)],
          ['Ítems', cotiz.items?.length],
          ['Respuestas', cotiz.respuestas?.length || 0],
        ].map(([k, v]) => (
          <div key={k} className="bg-[#1a2230] rounded-lg px-3.5 py-2.5">
            <div className="text-[11px] text-[#5f6f80] mb-0.5">{k}</div>
            <div className="text-[13px] font-medium text-[#e8edf2]">
              {k === 'Estado' ? <Badge variant={ESTADOS_COT[cotiz.estado]?.color}>{ESTADOS_COT[cotiz.estado]?.label}</Badge> : v}
            </div>
          </div>
        ))}
      </div>

      {/* Ítems requeridos */}
      <div className="text-[13px] font-semibold text-[#e8edf2]">Ítems solicitados</div>
      <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full border-collapse text-[13px]">
          <thead><tr>
            {['Producto','Cantidad'].map(h => (
              <th key={h} className="bg-[#1a2230] px-3.5 py-2 text-left text-[11px] font-semibold text-[#5f6f80] uppercase border-b border-white/[0.08]">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {cotiz.items?.map((it, i) => {
              const p = productos.find(x => x.id === it.productoId)
              return (
                <tr key={i} className="border-b border-white/[0.06] last:border-0">
                  <td className="px-3.5 py-2 font-medium">{p?.nombre || it.descripcion}</td>
                  <td className="px-3.5 py-2 font-mono text-[12px]">{it.cantidad} {p?.unidadMedida}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Respuestas existentes */}
      {(cotiz.respuestas?.length > 0) && (
        <>
          <div className="text-[13px] font-semibold text-[#e8edf2]">Respuestas de proveedores</div>
          <div className="flex flex-col gap-3">
            {cotiz.respuestas.map((resp, ri) => (
              <div key={ri} className={`p-4 rounded-xl border ${resp.ganadora ? 'border-[#00c896]/40 bg-[#00c896]/5' : 'border-white/[0.08] bg-[#1a2230]'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-[#e8edf2]">{provNombre(resp.proveedorId)}</div>
                    <div className="text-[11px] text-[#5f6f80] mt-0.5">Respondido: {formatDate(resp.fecha)} · Entrega: {resp.tiempoEntrega} días</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {resp.ganadora && <Badge variant="teal">Ganadora</Badge>}
                    <div className="text-[16px] font-semibold text-[#00c896]">{formatCurrency(resp.total, simboloMoneda)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {resp.items.map((it, ii) => {
                    const p = productos.find(x => x.id === it.productoId)
                    const cant = cotiz.items.find(i => i.productoId === it.productoId)?.cantidad || 0
                    return (
                      <div key={ii} className="bg-[#0e1117]/40 rounded-lg px-3 py-2">
                        <div className="text-[11px] text-[#5f6f80] truncate">{p?.nombre || it.productoId}</div>
                        <div className="text-[12px] font-mono font-semibold text-[#e8edf2]">{formatCurrency(it.precioUnitario, simboloMoneda)} × {cant}</div>
                        <div className="text-[11px] text-[#00c896]">{formatCurrency(it.subtotal, simboloMoneda)}</div>
                      </div>
                    )
                  })}
                </div>
                {!resp.ganadora && cotiz.estado === 'RESPONDIDA' && (
                  <Btn variant="primary" size="sm" onClick={() => onConvertirOC(cotiz, ri)}>
                    <ShoppingCart size={13}/> Convertir en OC
                  </Btn>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Form para agregar respuesta */}
      {tabResp && respForm && (
        <>
          <div className="h-px bg-white/[0.08]"/>
          <div className="text-[13px] font-semibold text-[#e8edf2]">Registrar respuesta de proveedor</div>
          <div className="grid grid-cols-3 gap-3.5">
            <Field label="Proveedor *">
              <select className={SEL} value={respForm.proveedorId} onChange={e => setRespForm(p => ({ ...p, proveedorId: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
              </select>
            </Field>
            <Field label="Fecha respuesta"><input type="date" className={SI} value={respForm.fecha} onChange={e => setRespForm(p => ({ ...p, fecha: e.target.value }))}/></Field>
            <Field label="Plazo entrega (días)"><input type="number" className={SI} value={respForm.tiempoEntrega} onChange={e => setRespForm(p => ({ ...p, tiempoEntrega: +e.target.value }))} min="0"/></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {respForm.items.map(item => {
              const prod = productos.find(p => p.id === item.productoId)
              const cant = cotiz.items.find(i => i.productoId === item.productoId)?.cantidad || 0
              return (
                <div key={item.productoId} className="bg-[#1a2230] rounded-lg p-3">
                  <div className="text-[12px] font-medium text-[#e8edf2] mb-2">{prod?.nombre} × {cant}</div>
                  <Field label="Precio unitario">
                    <input type="number" className={SI} value={item.precioUnitario} onChange={e => updatePrecio(item.productoId, e.target.value)} min="0" step="0.01"/>
                  </Field>
                  {item.subtotal > 0 && <div className="text-[11px] text-[#00c896] mt-1 font-mono">Subtotal: {formatCurrency(item.subtotal, simboloMoneda)}</div>}
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between">
            <Field label="Notas del proveedor" className="flex-1">
              <input className={SI} value={respForm.notas} onChange={e => setRespForm(p => ({ ...p, notas: e.target.value }))} placeholder="Condiciones especiales..."/>
            </Field>
            <div className="ml-4 text-right shrink-0">
              <div className="text-[11px] text-[#5f6f80]">Total cotizado</div>
              <div className="text-[18px] font-semibold text-[#00c896]">{formatCurrency(calcTotal(respForm.items), simboloMoneda)}</div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setTabResp(false)}>Cancelar</Btn>
            <Btn variant="primary" disabled={!respForm.proveedorId}
              onClick={() => { onAgregarRespuesta(cotiz, { ...respForm, total: calcTotal(respForm.items), ganadora: false }); setTabResp(false) }}>
              <CheckCircle size={13}/> Guardar Respuesta
            </Btn>
          </div>
        </>
      )}
    </Modal>
  )
}
