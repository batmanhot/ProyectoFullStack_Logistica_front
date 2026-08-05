import { useState, useMemo } from 'react'
import { Plus, Search, CheckCircle, X, Eye, ShoppingCart, FileText, MessageCircle, Mail, Download, Globe, ArrowRight, Trash2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { usePlanLimits } from '../hooks/usePlanLimits'
import { formatCurrency, formatDate } from '../utils/helpers'
import { Modal, EstadoOCBadge, EstadoLogisticoBadge, Badge, Btn, Field, Input, Select, Textarea, DataTable } from '../components/ui/index'
import { ModalRecepcionParcial } from '../components/ui/ModalRecepcionParcial'
import PdfSharePanel from '../components/ui/PdfSharePanel'
import { imprimirOC } from '../utils/pdfTemplates'
import {
  useOrdenesCompraList, useCrearOrdenCompra, useActualizarOrdenCompra, useRecibirOrdenCompra,
  useAgregarGastoImportacion, useEliminarGastoImportacion, useActualizarEstadoLogistico,
} from '../queries/ordenes-compra.queries'
import { useProductosList } from '../queries/productos.queries'
import { useProveedoresList } from '../queries/proveedores.queries'
import { useAlmacenesList } from '../queries/almacenes.queries'
import { exportarOrdenesXLSX } from '../utils/exportXLSX'
import { exportarOrdenesPDF } from '../utils/exportPDF'

const IGV = 0.18

const MONEDAS = ['PEN', 'USD', 'EUR', 'CNY']

const SECUENCIA_LOGISTICA = ['EN_ORIGEN', 'EN_TRANSITO', 'EN_ADUANA', 'NACIONALIZADA']
const LABEL_LOGISTICO = { EN_ORIGEN: 'En Origen', EN_TRANSITO: 'En Tránsito', EN_ADUANA: 'En Aduana', NACIONALIZADA: 'Nacionalizada' }

const TIPOS_GASTO_IMPORTACION = [
  { value: 'FLETE',         label: 'Flete internacional' },
  { value: 'SEGURO',        label: 'Seguro' },
  { value: 'ARANCEL',       label: 'Arancel / Derechos' },
  { value: 'AGENTE_ADUANA', label: 'Agente de aduana' },
  { value: 'ALMACENAJE',    label: 'Almacenaje portuario' },
  { value: 'OTRO',          label: 'Otro' },
]

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
  const agregarGasto     = useAgregarGastoImportacion()
  const eliminarGasto    = useEliminarGastoImportacion()
  const actualizarEstadoLog = useActualizarEstadoLogistico()

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

  async function avanzarEstadoLogistico(oc, nuevoEstado, tipoCambio) {
    const res = await actualizarEstadoLog.mutateAsync({
      id: oc.id, estadoLogistico: nuevoEstado, ...(tipoCambio ? { tipoCambio: +tipoCambio } : {}),
    })
    if (res.error) { toast(res.error, 'error'); return }
    toast(`OC ${oc.numero}: ${LABEL_LOGISTICO[nuevoEstado]}`, 'success')
    setDetalle(res.data)
  }

  async function agregarGastoOC(oc, gasto) {
    const res = await agregarGasto.mutateAsync({ id: oc.id, ...gasto })
    if (res.error) { toast(res.error, 'error'); return }
    toast('Gasto de importación agregado', 'success')
    setDetalle(d => d ? { ...d, gastosImportacion: [...(d.gastosImportacion || []), res.data] } : d)
  }

  async function eliminarGastoOC(oc, gastoId) {
    const res = await eliminarGasto.mutateAsync({ id: oc.id, gastoId })
    if (res.error) { toast(res.error, 'error'); return }
    toast('Gasto eliminado', 'success')
    setDetalle(d => d ? { ...d, gastosImportacion: (d.gastosImportacion || []).filter(g => g.id !== gastoId) } : d)
  }

  async function handleCrearOC(data) {
    const res = await crearOC.mutateAsync(data)
    if (res.error) { toast(res.error, 'error'); return }
    setModal(false)
    toast('Orden de compra creada', 'success')
  }

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
            <Input className="pl-8 !py-[5px] text-[12px]" placeholder="Buscar número o proveedor..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <Select style={{ width:148, padding:'5px 8px', fontSize:12 }} value={filtEst} onChange={e => setFiltEst(e.target.value)}>
            <option value="">Todos los estados</option>
            {['PENDIENTE','APROBADA','PARCIAL','RECIBIDA','CANCELADA'].map(e => <option key={e}>{e}</option>)}
          </Select>
          <Select style={{ width:185, padding:'5px 8px', fontSize:12 }} value={filtProv} onChange={e => setFiltProv(e.target.value)}>
            <option value="">Todos los proveedores</option>
            {proveedores.filter(p => p.estado !== 'Inactivo').map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
          </Select>
          <span className="text-[11px] text-[#5f6f80] whitespace-nowrap">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          {(busqueda || filtEst || filtProv) && (
            <Btn variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltEst(''); setFiltProv('') }}>
              <X size={12}/> Limpiar
            </Btn>
          )}
        </div>

        <DataTable
          loading={isLoading}
          rows={filtered}
          rowKey={oc => oc.id}
          onRowClick={oc => setDetalle(oc)}
          emptyIcon={ShoppingCart}
          emptyTitle="Sin órdenes"
          emptyDescription="Crea tu primera orden de compra."
          sortConfig={sortConfig}
          onSort={handleSort}
          columns={[
            { key:'numero', header:'N° OC', sortable:true, render: oc => (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[12px] font-semibold text-[#00c896]">{oc.numero}</span>
                {oc.esImportacion && <Globe size={12} className="text-blue-400" title="Orden de importación"/>}
              </div>
            ) },
            { key:'proveedor', header:'Proveedor', sortable:true, render: oc => (
              <>
                <div className="font-medium">{provNombre(oc.proveedorId)}</div>
                {oc.notas && <div className="text-[11px] text-[#5f6f80] truncate max-w-[180px]">{oc.notas}</div>}
              </>
            ) },
            { key:'fecha', header:'Fecha', sortable:true, render: oc => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatDate(oc.fecha || oc.createdAt)}</span> },
            { key:'fechaEntrega', header:'Entrega', sortable:true, render: oc => <span className="font-mono text-[12px] text-[#9ba8b6]">{oc.fechaEntrega ? formatDate(oc.fechaEntrega) : '—'}</span> },
            { key:'items', header:'Ítems', render: oc => <span className="text-[#9ba8b6]">{oc.items?.length || oc._count?.items || 0}</span> },
            { key:'total', header:'Total', align:'right', sortable:true, render: oc => <span className="font-mono text-[12px] font-semibold">{formatCurrency(Number(oc.total || 0), simboloMoneda)}</span> },
            { key:'estado', header:'Estado', sortable:true, render: oc => (
              <div className="flex flex-col gap-1 items-start">
                <EstadoOCBadge estado={oc.estado}/>
                {oc.esImportacion && <EstadoLogisticoBadge estado={oc.estadoLogistico}/>}
              </div>
            ) },
            { key:'acciones', header:'Acciones', stopPropagation:true, render: oc => {
              const puedeRecibir = (oc.estado === 'APROBADA' || oc.estado === 'PARCIAL') && (!oc.esImportacion || oc.estadoLogistico === 'NACIONALIZADA')
              return (
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
                  {puedeRecibir && (
                    <Btn variant="primary" size="sm" onClick={() => abrirRecepcion(oc)}><CheckCircle size={12}/> Recibir</Btn>
                  )}
                  {(oc.estado === 'PENDIENTE' || oc.estado === 'APROBADA') && (
                    <Btn variant="ghost" size="icon" className="text-red-400" title="Cancelar" onClick={() => cancelar(oc)}><X size={13}/></Btn>
                  )}
                </div>
              )
            } },
          ]}
        />
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
          simboloMoneda={simboloMoneda}
          onAvanzarEstado={(nuevoEstado, tipoCambio) => avanzarEstadoLogistico(detalle, nuevoEstado, tipoCambio)}
          onAgregarGasto={(gasto) => agregarGastoOC(detalle, gasto)}
          onEliminarGasto={(gastoId) => eliminarGastoOC(detalle, gastoId)}
          savingEstado={actualizarEstadoLog.isPending}
          savingGasto={agregarGasto.isPending}/>
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

const FORM_OC_INICIAL = {
  proveedorId:'', almacenId:'', fechaEntrega:'', notas:'',
  esImportacion:false, moneda:'USD', tipoCambio:'', incoterm:'',
  numeroFacturaComercial:'', numeroBL:'', numeroDUA:'',
}

function ModalNuevaOC({ open, onClose, productos, proveedores, almacenes, onSaved, simboloMoneda, saving }) {
  const [form, setForm] = useState(FORM_OC_INICIAL)
  const [items, setItems] = useState([])
  const [ni, setNi] = useState({ productoId:'', cantidad:'', costoUnitario:'' })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useMemo(() => {
    if (open) { setForm(FORM_OC_INICIAL); setItems([]); setNi({ productoId:'', cantidad:'', costoUnitario:'' }) }
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
      ...(form.esImportacion && {
        esImportacion: true,
        moneda:        form.moneda,
        tipoCambio:    form.tipoCambio ? +form.tipoCambio : undefined,
        incoterm:      form.incoterm || undefined,
        numeroFacturaComercial: form.numeroFacturaComercial || undefined,
        numeroBL:               form.numeroBL || undefined,
        numeroDUA:              form.numeroDUA || undefined,
      }),
    })
  }

  const productosActivos = productos.filter(p => p.estado === 'Activo' || p.activo !== false)

  return (
    <Modal open={open} onClose={onClose} title="Nueva Orden de Compra" size="xl"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={handleSave} disabled={!form.proveedorId || !form.almacenId || !items.length || saving}>{saving ? 'Creando...' : 'Crear OC'}</Btn></>}>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Field label="Proveedor *">
          <Select value={form.proveedorId} onChange={e => f('proveedorId', e.target.value)}>
            <option value="">Seleccionar...</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
          </Select>
        </Field>
        <Field label="Almacén de destino *" hint="Donde entrará la mercadería al recibirla">
          <Select value={form.almacenId} onChange={e => f('almacenId', e.target.value)}>
            <option value="">Seleccionar...</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Fecha de Entrega"><Input type="date" value={form.fechaEntrega} onChange={e => f('fechaEntrega', e.target.value)}/></Field>
      </div>

      <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#9ba8b6]">
        <input type="checkbox" checked={form.esImportacion}
          onChange={e => f('esImportacion', e.target.checked)}
          className="accent-[#00c896]"/>
        <Globe size={14} className="text-blue-400"/> Es una orden de importación (proveedor extranjero)
      </label>

      {form.esImportacion && (
        <div className="bg-[#1a2230] rounded-lg p-3.5 flex flex-col gap-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Field label="Moneda de la orden" hint="En la que se pactó el precio FOB">
              <Select value={form.moneda} onChange={e => f('moneda', e.target.value)}>
                {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Tipo de cambio" hint="Opcional ahora, se puede fijar al nacionalizar">
              <Input type="number" value={form.tipoCambio} onChange={e => f('tipoCambio', e.target.value)} min="0" step="0.0001"/>
            </Field>
            <Field label="Incoterm">
              <Input value={form.incoterm} onChange={e => f('incoterm', e.target.value)} placeholder="FOB, CIF, EXW..."/>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Field label="Factura comercial">
              <Input value={form.numeroFacturaComercial} onChange={e => f('numeroFacturaComercial', e.target.value)}/>
            </Field>
            <Field label="BL / AWB">
              <Input value={form.numeroBL} onChange={e => f('numeroBL', e.target.value)}/>
            </Field>
            <Field label="DUA">
              <Input value={form.numeroDUA} onChange={e => f('numeroDUA', e.target.value)}/>
            </Field>
          </div>
        </div>
      )}

      <div className="text-[13px] font-semibold text-[#e8edf2]">Agregar ítems</div>
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex-[2] min-w-[180px]">
          <Field label="Producto">
            <Select value={ni.productoId} onChange={e => setNi(p => ({ ...p, productoId: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {productosActivos.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>)}
            </Select>
          </Field>
        </div>
        <div className="flex-1 min-w-[90px]">
          <Field label="Cantidad">
            <Input type="number" value={ni.cantidad} onChange={e => setNi(p => ({ ...p, cantidad: e.target.value }))} min="0.01" step="0.01"/>
          </Field>
        </div>
        <div className="flex-1 min-w-[90px]">
          <Field label={form.esImportacion ? `Costo FOB (${form.moneda})` : 'Costo Unit.'}>
            <Input type="number" value={ni.costoUnitario} onChange={e => setNi(p => ({ ...p, costoUnitario: e.target.value }))} min="0" step="0.01"/>
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
        <Textarea className="min-h-14" value={form.notas} onChange={e => f('notas', e.target.value)} placeholder="Condiciones, urgencia..."/>
      </Field>
    </Modal>
  )
}

function ModalDetalleOC({
  oc, productos, provNombre, onClose, onRecibir, simboloMoneda,
  onAvanzarEstado, onAgregarGasto, onEliminarGasto, savingEstado, savingGasto,
}) {
  const prodMap = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos])
  const [tipoCambioInput, setTipoCambioInput] = useState('')
  const [nuevoGasto, setNuevoGasto] = useState({ tipo:'FLETE', monto:'', moneda:'PEN', notas:'' })

  const nacionalizada = oc.estadoLogistico === 'NACIONALIZADA'
  const puedeRecibir  = ['PENDIENTE','APROBADA','PARCIAL'].includes(oc.estado) && (!oc.esImportacion || nacionalizada)
  const siguienteEstado = oc.esImportacion
    ? SECUENCIA_LOGISTICA[SECUENCIA_LOGISTICA.indexOf(oc.estadoLogistico) + 1]
    : null
  const requiereTipoCambio = siguienteEstado === 'NACIONALIZADA' && !oc.tipoCambio

  function avanzar() {
    if (requiereTipoCambio && !tipoCambioInput) return
    onAvanzarEstado(siguienteEstado, requiereTipoCambio ? tipoCambioInput : undefined)
    setTipoCambioInput('')
  }

  function agregarGasto() {
    if (!nuevoGasto.monto) return
    onAgregarGasto({ ...nuevoGasto, monto: +nuevoGasto.monto })
    setNuevoGasto({ tipo:'FLETE', monto:'', moneda:'PEN', notas:'' })
  }

  const totalGastos = (oc.gastosImportacion || []).reduce((s, g) =>
    s + (g.moneda === 'PEN' ? Number(g.monto) : Number(g.monto) * Number(oc.tipoCambio || 0)), 0)

  return (
    <Modal open title={`Orden ${oc.numero}`} onClose={onClose} size="lg"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
          {puedeRecibir && (
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

      {oc.esImportacion && (
        <div className="bg-[#1a2230] rounded-lg p-3.5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-blue-400"/>
              <span className="text-[12px] font-semibold text-[#e8edf2]">Importación</span>
              <EstadoLogisticoBadge estado={oc.estadoLogistico}/>
            </div>
            {siguienteEstado && (
              <div className="flex items-center gap-2">
                {requiereTipoCambio && (
                  <Input type="number" placeholder="Tipo de cambio" value={tipoCambioInput}
                    onChange={e => setTipoCambioInput(e.target.value)}
                    className="!w-32 !py-1 text-[12px]" min="0" step="0.0001"/>
                )}
                <Btn variant="secondary" size="sm" disabled={savingEstado || (requiereTipoCambio && !tipoCambioInput)} onClick={avanzar}>
                  {LABEL_LOGISTICO[siguienteEstado]} <ArrowRight size={12}/>
                </Btn>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[12px]">
            <div><div className="text-[#5f6f80]">Moneda</div><div className="font-medium">{oc.moneda}</div></div>
            <div><div className="text-[#5f6f80]">Tipo de cambio</div><div className="font-medium">{oc.tipoCambio ? Number(oc.tipoCambio).toFixed(4) : '—'}</div></div>
            <div><div className="text-[#5f6f80]">Incoterm</div><div className="font-medium">{oc.incoterm || '—'}</div></div>
            <div><div className="text-[#5f6f80]">Factura comercial</div><div className="font-medium">{oc.numeroFacturaComercial || '—'}</div></div>
            <div><div className="text-[#5f6f80]">BL / AWB</div><div className="font-medium">{oc.numeroBL || '—'}</div></div>
            <div><div className="text-[#5f6f80]">DUA</div><div className="font-medium">{oc.numeroDUA || '—'}</div></div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] mb-2">Gastos de importación</div>
            {(oc.gastosImportacion || []).length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-white/8 mb-2">
                <table className="w-full border-collapse text-[12px]">
                  <tbody>
                    {oc.gastosImportacion.map(g => (
                      <tr key={g.id} className="border-b border-white/6 last:border-0">
                        <td className="px-3 py-1.5">{TIPOS_GASTO_IMPORTACION.find(t => t.value === g.tipo)?.label || g.tipo}</td>
                        <td className="px-3 py-1.5 text-[#5f6f80]">{g.notas || '—'}</td>
                        <td className="px-3 py-1.5 font-mono text-right">{formatCurrency(Number(g.monto), g.moneda === 'PEN' ? simboloMoneda : g.moneda)}</td>
                        {!nacionalizada && (
                          <td className="px-3 py-1.5 w-8">
                            <Btn variant="ghost" size="icon" className="text-red-400" onClick={() => onEliminarGasto(g.id)}><Trash2 size={12}/></Btn>
                          </td>
                        )}
                      </tr>
                    ))}
                    <tr>
                      <td className="px-3 py-1.5 font-semibold" colSpan={2}>Total gastos (est. en {simboloMoneda})</td>
                      <td className="px-3 py-1.5 font-mono font-semibold text-right" colSpan={nacionalizada ? 1 : 2}>{formatCurrency(totalGastos, simboloMoneda)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            {!nacionalizada && (
              <div className="flex gap-2 flex-wrap items-end">
                <Select value={nuevoGasto.tipo} onChange={e => setNuevoGasto(p => ({ ...p, tipo: e.target.value }))} className="!py-1 text-[12px] !w-36">
                  {TIPOS_GASTO_IMPORTACION.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
                <Input type="number" placeholder="Monto" value={nuevoGasto.monto} onChange={e => setNuevoGasto(p => ({ ...p, monto: e.target.value }))} className="!w-24 !py-1 text-[12px]" min="0" step="0.01"/>
                <Select value={nuevoGasto.moneda} onChange={e => setNuevoGasto(p => ({ ...p, moneda: e.target.value }))} className="!py-1 text-[12px] !w-20">
                  {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
                </Select>
                <Input placeholder="Notas (opcional)" value={nuevoGasto.notas} onChange={e => setNuevoGasto(p => ({ ...p, notas: e.target.value }))} className="!py-1 text-[12px] flex-1 min-w-[120px]"/>
                <Btn variant="secondary" size="sm" disabled={savingGasto || !nuevoGasto.monto} onClick={agregarGasto}>+ Agregar</Btn>
              </div>
            )}
          </div>
        </div>
      )}

      {oc.items?.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {['Producto','Pedido','Recibido','Pendiente', oc.esImportacion ? 'Costo FOB' : 'Costo Unit.', ...(oc.esImportacion ? ['Costo Real'] : []),'Subtotal'].map(h => (
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
                    <td className="px-3.5 py-2 font-mono text-[12px]">{formatCurrency(Number(it.costoUnitario || 0), oc.esImportacion ? oc.moneda : simboloMoneda)}</td>
                    {oc.esImportacion && (
                      <td className="px-3.5 py-2 font-mono text-[12px] text-[#00c896]">{it.costoUnitarioReal != null ? formatCurrency(Number(it.costoUnitarioReal), simboloMoneda) : '—'}</td>
                    )}
                    <td className="px-3.5 py-2 font-mono text-[12px] font-semibold">{formatCurrency(Number(it.subtotal || (it.cantidad * it.costoUnitario) || 0), oc.esImportacion ? oc.moneda : simboloMoneda)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col items-end gap-1 text-[13px]">
        <div className="text-[#9ba8b6]">Subtotal: <span className="font-medium text-[#e8edf2]">{formatCurrency(Number(oc.subtotal || 0), oc.esImportacion ? oc.moneda : simboloMoneda)}</span></div>
        <div className="text-[#9ba8b6]">IGV: <span className="font-medium text-[#e8edf2]">{formatCurrency(Number(oc.igv || 0), oc.esImportacion ? oc.moneda : simboloMoneda)}</span></div>
        <div className="text-[16px] font-semibold text-[#00c896]">Total: {formatCurrency(Number(oc.total || 0), oc.esImportacion ? oc.moneda : simboloMoneda)}</div>
      </div>
      {oc.esImportacion && !puedeRecibir && oc.estado !== 'RECIBIDA' && oc.estado !== 'CANCELADA' && (
        <p className="text-[12px] text-amber-400">Esta orden debe llegar a "Nacionalizada" antes de poder recibir la mercadería.</p>
      )}
      {oc.notas && <p className="text-[13px] text-[#9ba8b6]">Notas: {oc.notas}</p>}
    </Modal>
  )
}
