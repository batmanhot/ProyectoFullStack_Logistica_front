import { useState, useMemo } from 'react'
import { Plus, Search, CheckCircle, X, Eye, ShoppingCart, FileText, MessageCircle, Mail, ChevronUp, ChevronDown, Download } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { usePlanLimits } from '../hooks/usePlanLimits'
import { formatCurrency, formatDate } from '../utils/helpers'
import { Modal, EmptyState, EstadoOCBadge, Badge, Btn, Field } from '../components/ui/index'
import { ModalRecepcionParcial } from '../components/ui/ModalRecepcionParcial'
import PdfSharePanel from '../components/ui/PdfSharePanel'
import { imprimirOC } from '../utils/pdfTemplates'
import { useOrdenesCompraList, useCrearOrdenCompra, useActualizarOrdenCompra, useRecibirOrdenCompra } from '../queries/ordenes-compra.queries'
import { useProductosList } from '../queries/productos.queries'
import { useProveedoresList } from '../queries/proveedores.queries'
import { useAlmacenesList } from '../queries/almacenes.queries'
import { exportarOrdenesXLSX } from '../utils/exportXLSX'
import { exportarOrdenesPDF } from '../utils/exportPDF'

const IGV = 0.18
const TH  = ({ c, r }) => <th className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/8 ${r ? 'text-right' : 'text-left'}`}>{c}</th>
const SI  = 'px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 w-full font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'

export default function Ordenes() {
  const { toast, sesion } = useApp()
  const planLimits = usePlanLimits()
  const simboloMoneda = 'S/'

  const { data: ordenes    = [], isLoading } = useOrdenesCompraList()
  const { data: productos  = [] }            = useProductosList()
  const { data: proveedores= [] }            = useProveedoresList()
  const { data: almacenes  = [] }            = useAlmacenesList()

  const crearOC     = useCrearOrdenCompra()
  const actualizarOC= useActualizarOrdenCompra()
  const recibirOC   = useRecibirOrdenCompra()

  const [modal,    setModal]    = useState(false)
  const [detalle,  setDetalle]  = useState(null)
  const [recepcion,setRecepcion]= useState(null)
  const [shareOC,  setShareOC]  = useState(null)
  const [filtEst,  setFiltEst]  = useState('')
  const [filtProv, setFiltProv] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [sortConfig, setSortConfig] = useState({ key:'fecha', direction:'desc' })

  const provMap = useMemo(() => new Map(proveedores.map(p => [p.id, p])), [proveedores])
  const provNombre = id => provMap.get(id)?.razonSocial || '—'

  const handleSort = key => setSortConfig(s => ({ key, direction: s.key === key && s.direction === 'asc' ? 'desc' : 'asc' }))

  const filtered = useMemo(() => {
    let d = [...ordenes]
    if (filtEst)  d = d.filter(o => o.estado === filtEst)
    if (filtProv) d = d.filter(o => o.proveedorId === filtProv)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(o => o.numero?.toLowerCase().includes(q) || provNombre(o.proveedorId).toLowerCase().includes(q))
    }
    d.sort((a, b) => {
      let aV = a[sortConfig.key], bV = b[sortConfig.key]
      if (sortConfig.key === 'proveedor') { aV = provNombre(a.proveedorId); bV = provNombre(b.proveedorId) }
      if (typeof aV === 'string') aV = aV.toLowerCase(), bV = bV?.toLowerCase?.() || ''
      if (aV < bV) return sortConfig.direction === 'asc' ? -1 : 1
      if (aV > bV) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return d
  }, [ordenes, filtEst, filtProv, busqueda, sortConfig, provNombre])

  const kpis = useMemo(() => ({
    pendientes: ordenes.filter(o => o.estado === 'PENDIENTE').length,
    aprobadas:  ordenes.filter(o => o.estado === 'APROBADA').length,
    parciales:  ordenes.filter(o => o.estado === 'PARCIAL').length,
    total:      ordenes.filter(o => ['PENDIENTE','APROBADA','PARCIAL'].includes(o.estado)).reduce((s,o) => s + Number(o.total || 0), 0),
  }), [ordenes])

  async function aprobar(oc) {
    const res = await actualizarOC.mutateAsync({ id: oc.id, estado: 'APROBADA' })
    if (res.error) { toast(res.error, 'error'); return }
    toast(`OC ${oc.numero} aprobada`, 'success')
  }

  async function cancelar(oc) {
    const res = await actualizarOC.mutateAsync({ id: oc.id, estado: 'CANCELADA' })
    if (res.error) { toast(res.error, 'error'); return }
    toast(`OC ${oc.numero} cancelada`, 'warning')
  }

  function abrirRecepcion(oc) {
    setDetalle(null)
    setRecepcion({ ...oc, proveedorNombre: provNombre(oc.proveedorId) })
  }

  async function confirmarRecepcion({ items, esCompleta }) {
    const res = await recibirOC.mutateAsync({
      id:    recepcion.id,
      items: items.filter(i => i.recibir > 0).map(i => ({ ordenCompraItemId: i.id, cantidad: +i.recibir })),
    })
    if (res.error) { toast(res.error, 'error'); return }
    toast(`OC ${recepcion.numero} ${esCompleta ? 'recibida' : 'recepción parcial registrada'}`, 'success')
    setRecepcion(null)
  }

  async function handleCrearOC(data) {
    const res = await crearOC.mutateAsync(data)
    if (res.error) { toast(res.error, 'error'); return }
    setModal(false)
    toast('Orden de compra creada', 'success')
  }

  const COLS = [
    { l:'N° OC',    k:'numero'      },
    { l:'Proveedor',k:'proveedor'   },
    { l:'Fecha',    k:'fecha'       },
    { l:'Entrega',  k:'fechaEntrega'},
    { l:'Ítems'                     },
    { l:'Total',    k:'total', r:true},
    { l:'Estado',   k:'estado'      },
    { l:'Acciones'                  },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          ['OC Pendientes',   kpis.pendientes, '#f59e0b'],
          ['OC Aprobadas',    kpis.aprobadas,  '#3b82f6'],
          ['Recep. Parcial',  kpis.parciales,  '#8b5cf6'],
          ['Valor abierto',   formatCurrency(kpis.total, simboloMoneda), '#00c896'],
        ].map(([l, v, c]) => (
          <div key={l} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: c }}/>
            <div className="text-[11px] text-[#5f6f80] uppercase tracking-[0.05em] mb-2">{l}</div>
            <div className={`font-semibold text-[#e8edf2] ${typeof v === 'number' ? 'text-[28px]' : 'text-[17px] font-mono'}`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] whitespace-nowrap">Órdenes de Compra</span>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={() => exportarOrdenesXLSX(filtered, proveedores, productos, simboloMoneda)}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => exportarOrdenesPDF(filtered, proveedores, simboloMoneda, sesion?.nombre)}>
              <FileText size={13}/> PDF
            </Btn>
            {planLimits.ordenes?.maximo !== -1 && planLimits.ordenes && (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                !planLimits.ordenes.permitido ? 'bg-red-500/20 text-red-400' :
                planLimits.ordenes.porcentaje >= 80 ? 'bg-amber-500/20 text-amber-400' :
                'bg-white/6 text-[#5f6f80]'
              }`}>
                {planLimits.ordenes.actual}/{planLimits.ordenes.maximo}
              </span>
            )}
            <Btn variant="primary" size="sm" onClick={() => setModal(true)}>
              <Plus size={13}/> Nueva OC
            </Btn>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI + ' pl-8 !py-[5px] text-[12px]'} placeholder="Buscar número o proveedor..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <select className={SEL} style={{ width:148, padding:'5px 8px', fontSize:12 }} value={filtEst} onChange={e => setFiltEst(e.target.value)}>
            <option value="">Todos los estados</option>
            {['PENDIENTE','APROBADA','PARCIAL','RECIBIDA','CANCELADA'].map(e => <option key={e}>{e}</option>)}
          </select>
          <select className={SEL} style={{ width:185, padding:'5px 8px', fontSize:12 }} value={filtProv} onChange={e => setFiltProv(e.target.value)}>
            <option value="">Todos los proveedores</option>
            {proveedores.filter(p => p.estado !== 'Inactivo').map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
          </select>
          <span className="text-[11px] text-[#5f6f80] whitespace-nowrap">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          {(busqueda || filtEst || filtProv) && (
            <Btn variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltEst(''); setFiltProv('') }}>
              <X size={12}/> Limpiar
            </Btn>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {COLS.map(h => (
                <th key={h.l}
                  className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/8 ${h.k ? 'cursor-pointer hover:bg-white/2' : ''} ${h.r ? 'text-right' : 'text-left'}`}
                  onClick={() => h.k && handleSort(h.k)}>
                  <div className={`flex items-center gap-1.5 ${h.r ? 'justify-end' : ''}`}>
                    {h.l}
                    {sortConfig.key === h.k && (sortConfig.direction === 'asc' ? <ChevronUp size={10}/> : <ChevronDown size={10}/>)}
                  </div>
                </th>
              ))}
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="text-center text-[#5f6f80] py-8 text-[12px]">Cargando órdenes...</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={8}><EmptyState icon={ShoppingCart} title="Sin órdenes" description="Crea tu primera orden de compra."/></td></tr>}
              {filtered.map(oc => (
                <tr key={oc.id} className="border-b border-white/6 last:border-0 hover:bg-white/2">
                  <td className="px-3.5 py-2.5 font-mono text-[12px] font-semibold text-[#00c896]">{oc.numero}</td>
                  <td className="px-3.5 py-2.5">
                    <div className="font-medium">{provNombre(oc.proveedorId)}</div>
                    {oc.notas && <div className="text-[11px] text-[#5f6f80] truncate max-w-[180px]">{oc.notas}</div>}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(oc.fecha || oc.createdAt)}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{oc.fechaEntrega ? formatDate(oc.fechaEntrega) : '—'}</td>
                  <td className="px-3.5 py-2.5 text-center text-[#9ba8b6]">{oc.items?.length || oc._count?.items || 0}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-right font-semibold">{formatCurrency(Number(oc.total || 0), simboloMoneda)}</td>
                  <td className="px-3.5 py-2.5"><EstadoOCBadge estado={oc.estado}/></td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex gap-1">
                      <Btn variant="ghost" size="icon" title="Ver detalle" onClick={() => setDetalle(oc)}><Eye size={13}/></Btn>
                      {oc.estado === 'APROBADA' && (
                        <Btn variant="ghost" size="icon" title="PDF / Compartir" className="text-[#00c896]" onClick={() => setShareOC(oc)}>
                          <FileText size={13}/>
                        </Btn>
                      )}
                      {oc.estado === 'PENDIENTE' && (
                        <Btn variant="ghost" size="icon" className="text-green-400" title="Aprobar" onClick={() => aprobar(oc)}><CheckCircle size={13}/></Btn>
                      )}
                      {(oc.estado === 'APROBADA' || oc.estado === 'PARCIAL') && (
                        <Btn variant="primary" size="sm" onClick={() => abrirRecepcion(oc)}><CheckCircle size={12}/> Recibir</Btn>
                      )}
                      {(oc.estado === 'PENDIENTE' || oc.estado === 'APROBADA') && (
                        <Btn variant="ghost" size="icon" className="text-red-400" title="Cancelar" onClick={() => cancelar(oc)}><X size={13}/></Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guía de uso */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Órdenes de Compra?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {[
            ['1. Crear OC',          'Elige proveedor, almacén de destino (donde entrará la mercadería) y agrega los productos con cantidad y costo. Queda en estado Pendiente.'],
            ['2. Aprobar',           'Desde Pendiente, usa el botón ✓ para aprobar la orden. Solo una OC Aprobada (o en Parcial) puede recibir mercadería.'],
            ['3. Recibir',           'Con "Recibir" abres el detalle por ítem: indica cuánto llegó de cada producto. Puedes recibir todo o solo una parte.'],
            ['4. Estado automático', 'El sistema decide el estado según lo recibido: si algo quedó pendiente pasa a Parcial; cuando se completó el 100% de todos los ítems pasa a Recibida.'],
            ['5. Stock e Kardex',    'Cada recepción genera un movimiento de ENTRADA real por ítem, sumando stock al almacén de la OC y quedando visible en el Kardex del producto.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      <ModalNuevaOC
        open={modal} onClose={() => setModal(false)}
        productos={productos} proveedores={proveedores} almacenes={almacenes}
        simboloMoneda={simboloMoneda} saving={crearOC.isPending}
        onSaved={handleCrearOC}/>

      {detalle && (
        <ModalDetalleOC oc={detalle} productos={productos} provNombre={provNombre}
          onClose={() => setDetalle(null)} onRecibir={() => abrirRecepcion(detalle)}
          simboloMoneda={simboloMoneda}/>
      )}

      {shareOC && (
        <Modal open title={`PDF / Compartir — ${shareOC.numero}`} onClose={() => setShareOC(null)} size="sm"
          footer={<Btn variant="secondary" onClick={() => setShareOC(null)}>Cerrar</Btn>}>
          <PdfSharePanel
            tipo="Orden de Compra"
            numero={shareOC.numero}
            onClose={() => setShareOC(null)}
            onPrint={() => imprimirOC({ oc: shareOC, proveedor: provMap.get(shareOC.proveedorId), productos, config: null })}
            extra={{
              whatsapp: `https://wa.me/${provMap.get(shareOC.proveedorId)?.telefono?.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(`Estimado proveedor, adjunto la Orden de Compra ${shareOC.numero} para su atención.`)}`,
              mailto: `mailto:${provMap.get(shareOC.proveedorId)?.email||''}?subject=${encodeURIComponent(`Orden de Compra ${shareOC.numero}`)}&body=${encodeURIComponent(`Estimado proveedor,\n\nAdjunto la Orden de Compra ${shareOC.numero}.\n\nQuedo a su disposición.`)}`,
            }}
          />
        </Modal>
      )}

      {recepcion && (
        <ModalRecepcionParcial oc={recepcion} productos={productos}
          simboloMoneda={simboloMoneda} onClose={() => setRecepcion(null)} onConfirm={confirmarRecepcion}/>
      )}
    </div>
  )
}

function ModalNuevaOC({ open, onClose, productos, proveedores, almacenes, onSaved, simboloMoneda, saving }) {
  const [form, setForm] = useState({ proveedorId:'', almacenId:'', fechaEntrega:'', notas:'' })
  const [items, setItems] = useState([])
  const [ni, setNi] = useState({ productoId:'', cantidad:'', costoUnitario:'' })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useMemo(() => {
    if (open) { setForm({ proveedorId:'', almacenId:'', fechaEntrega:'', notas:'' }); setItems([]); setNi({ productoId:'', cantidad:'', costoUnitario:'' }) }
  }, [open])

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
  const igv      = +(subtotal * IGV).toFixed(2)
  const total    = +(subtotal + igv).toFixed(2)

  function addItem() {
    if (!ni.productoId || !ni.cantidad || !ni.costoUnitario) return
    const prod = productos.find(p => p.id === ni.productoId)
    setItems(prev => [...prev, {
      productoId:    ni.productoId,
      nombre:        prod?.nombre || '',
      cantidad:      +ni.cantidad,
      costoUnitario: +ni.costoUnitario,
      subtotal:      +(+ni.cantidad * +ni.costoUnitario).toFixed(2),
      cantidadRecibida: 0,
    }])
    setNi({ productoId:'', cantidad:'', costoUnitario:'' })
  }

  function handleSave() {
    if (!form.proveedorId || !form.almacenId || !items.length) return
    onSaved({
      proveedorId:  form.proveedorId,
      almacenId:    form.almacenId,
      fechaEntrega: form.fechaEntrega || undefined,
      notas:        form.notas || undefined,
      items:        items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad, costoUnitario: i.costoUnitario })),
    })
  }

  const productosActivos = productos.filter(p => p.estado === 'Activo' || p.activo !== false)

  return (
    <Modal open={open} onClose={onClose} title="Nueva Orden de Compra" size="xl"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={handleSave} disabled={!form.proveedorId || !form.almacenId || !items.length || saving}>{saving ? 'Creando...' : 'Crear OC'}</Btn></>}>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Field label="Proveedor *">
          <select className={SEL} value={form.proveedorId} onChange={e => f('proveedorId', e.target.value)}>
            <option value="">Seleccionar...</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
          </select>
        </Field>
        <Field label="Almacén de destino *" hint="Donde entrará la mercadería al recibirla">
          <select className={SEL} value={form.almacenId} onChange={e => f('almacenId', e.target.value)}>
            <option value="">Seleccionar...</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </Field>
        <Field label="Fecha de Entrega"><input type="date" className={SI} value={form.fechaEntrega} onChange={e => f('fechaEntrega', e.target.value)}/></Field>
      </div>

      <div className="text-[13px] font-semibold text-[#e8edf2]">Agregar ítems</div>
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex-[2] min-w-[180px]">
          <Field label="Producto">
            <select className={SEL} value={ni.productoId} onChange={e => setNi(p => ({ ...p, productoId: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {productosActivos.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex-1 min-w-[90px]">
          <Field label="Cantidad">
            <input type="number" className={SI} value={ni.cantidad} onChange={e => setNi(p => ({ ...p, cantidad: e.target.value }))} min="0.01" step="0.01"/>
          </Field>
        </div>
        <div className="flex-1 min-w-[90px]">
          <Field label="Costo Unit.">
            <input type="number" className={SI} value={ni.costoUnitario} onChange={e => setNi(p => ({ ...p, costoUnitario: e.target.value }))} min="0" step="0.01"/>
          </Field>
        </div>
        <Btn variant="secondary" onClick={addItem}>+ Agregar</Btn>
      </div>

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {['Producto','Cant.','Costo Unit.','Subtotal',''].map(h => (
                <th key={h} className="bg-[#1a2230] px-3 py-2 text-left text-[11px] font-semibold text-[#5f6f80] uppercase border-b border-white/8">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-b border-white/6 last:border-0">
                  <td className="px-3 py-2">{it.nombre}</td>
                  <td className="px-3 py-2 font-mono text-[12px]">{it.cantidad}</td>
                  <td className="px-3 py-2 font-mono text-[12px]">{formatCurrency(it.costoUnitario, simboloMoneda)}</td>
                  <td className="px-3 py-2 font-mono text-[12px] font-semibold">{formatCurrency(it.subtotal, simboloMoneda)}</td>
                  <td className="px-3 py-2">
                    <Btn variant="ghost" size="icon" className="text-red-400" onClick={() => setItems(p => p.filter((_,j) => j !== i))}><X size={12}/></Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col items-end gap-1 text-[13px]">
        <div className="text-[#9ba8b6]">Subtotal: <span className="text-[#e8edf2] font-medium">{formatCurrency(subtotal, simboloMoneda)}</span></div>
        <div className="text-[#9ba8b6]">IGV (18%): <span className="text-[#e8edf2] font-medium">{formatCurrency(igv, simboloMoneda)}</span></div>
        <div className="text-[16px] font-semibold text-[#00c896]">Total: {formatCurrency(total, simboloMoneda)}</div>
      </div>

      <Field label="Notas">
        <textarea className={SI + ' resize-y min-h-[56px]'} value={form.notas} onChange={e => f('notas', e.target.value)} placeholder="Condiciones, urgencia..."/>
      </Field>
    </Modal>
  )
}

function ModalDetalleOC({ oc, productos, provNombre, onClose, onRecibir, simboloMoneda }) {
  const prodMap = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos])
  return (
    <Modal open title={`Orden ${oc.numero}`} onClose={onClose} size="lg"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
          {['PENDIENTE','APROBADA','PARCIAL'].includes(oc.estado) && (
            <Btn variant="primary" onClick={onRecibir}><CheckCircle size={14}/> Recibir mercadería</Btn>
          )}
        </>
      }>
      <div className="grid grid-cols-2 gap-3">
        {[
          ['Proveedor',    provNombre(oc.proveedorId)],
          ['Estado',       null],
          ['Fecha OC',     formatDate(oc.fecha || oc.createdAt)],
          ['Fecha Entrega',oc.fechaEntrega ? formatDate(oc.fechaEntrega) : '—'],
        ].map(([k, v]) => (
          <div key={k} className="bg-[#1a2230] rounded-lg px-3.5 py-2.5">
            <div className="text-[11px] text-[#5f6f80] mb-0.5">{k}</div>
            <div className="text-[13px] font-medium">{k === 'Estado' ? <EstadoOCBadge estado={oc.estado}/> : v || '—'}</div>
          </div>
        ))}
      </div>

      {oc.items?.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {['Producto','Pedido','Recibido','Pendiente','Costo Unit.','Subtotal'].map(h => (
                <th key={h} className="bg-[#1a2230] px-3.5 py-2 text-left text-[11px] font-semibold text-[#5f6f80] uppercase border-b border-white/8">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {oc.items.map((it, i) => {
                const p        = prodMap.get(it.productoId)
                const recibido = it.cantidadRecibida || 0
                const pendiente= Math.max(0, it.cantidad - recibido)
                return (
                  <tr key={i} className="border-b border-white/6 last:border-0">
                    <td className="px-3.5 py-2">{p?.nombre || it.productoId}</td>
                    <td className="px-3.5 py-2 font-mono text-[12px]">{it.cantidad}</td>
                    <td className="px-3.5 py-2 font-mono text-[12px] text-green-400">{recibido}</td>
                    <td className="px-3.5 py-2 font-mono text-[12px]"><span className={pendiente > 0 ? 'text-amber-400' : 'text-green-400'}>{pendiente}</span></td>
                    <td className="px-3.5 py-2 font-mono text-[12px]">{formatCurrency(Number(it.costoUnitario || 0), simboloMoneda)}</td>
                    <td className="px-3.5 py-2 font-mono text-[12px] font-semibold">{formatCurrency(Number(it.subtotal || (it.cantidad * it.costoUnitario) || 0), simboloMoneda)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col items-end gap-1 text-[13px]">
        <div className="text-[#9ba8b6]">Subtotal: <span className="font-medium text-[#e8edf2]">{formatCurrency(Number(oc.subtotal || 0), simboloMoneda)}</span></div>
        <div className="text-[#9ba8b6]">IGV: <span className="font-medium text-[#e8edf2]">{formatCurrency(Number(oc.igv || 0), simboloMoneda)}</span></div>
        <div className="text-[16px] font-semibold text-[#00c896]">Total: {formatCurrency(Number(oc.total || 0), simboloMoneda)}</div>
      </div>
      {oc.notas && <p className="text-[13px] text-[#9ba8b6]">Notas: {oc.notas}</p>}
    </Modal>
  )
}
