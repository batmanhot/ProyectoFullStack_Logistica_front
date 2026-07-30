import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Eye, Edit2, Trash2, FileText, CheckCircle, Copy, Download, X } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoy } from '../utils/helpers'
import { Modal, ConfirmDialog, EmptyState, Badge, Btn, Field } from '../components/ui/index'
import { imprimirProforma } from '../utils/pdfTemplates'
import { exportarProformasXLSX } from '../utils/exportXLSX'
import { exportarProformasPDF } from '../utils/exportPDF'
import { useProformasList, useCrearProforma, useActualizarProforma, useEliminarProforma } from '../queries/proformas.queries'
import { useClientesList } from '../queries/clientes.queries'
import { useProductosList } from '../queries/productos.queries'

const simboloMoneda = 'S/'
const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'
const TH  = ({ c, r }) => <th className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/8 ${r ? 'text-right' : 'text-left'}`}>{c}</th>

const ESTADO_META = {
  BORRADOR:  { label: 'Borrador',  color: 'neutral'  },
  ENVIADA:   { label: 'Enviada',   color: 'info'     },
  ACEPTADA:  { label: 'Aceptada',  color: 'success'  },
  RECHAZADA: { label: 'Rechazada', color: 'danger'   },
  VENCIDA:   { label: 'Vencida',   color: 'neutral'  },
}

// El backend rechaza (403) cualquier update sobre proformas ACEPTADA/RECHAZADA
// (proformas.service.ts#update) — se refleja aquí para no exponer un botón que siempre falla.
const NO_EDITABLE = ['ACEPTADA', 'RECHAZADA']

export default function Proformas() {
  const { sesion, toast } = useApp()

  const { data: proformas = [], isLoading } = useProformasList()
  const { data: clientes  = [] }            = useClientesList()
  const { data: productos = [] }            = useProductosList()

  const crearProforma     = useCrearProforma()
  const actualizarProforma = useActualizarProforma()
  const eliminarProforma  = useEliminarProforma()

  const [modal,      setModal]      = useState(false)
  const [detalle,    setDetalle]    = useState(null)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [busqueda,   setBusqueda]   = useState('')
  const [filtro,     setFiltro]     = useState('')
  const [filtDesde,  setFiltDesde]  = useState('')
  const [filtHasta,  setFiltHasta]  = useState('')

  const cliNombre = id => clientes.find(c => c.id === id)?.razonSocial || '—'

  const filtered = useMemo(() => {
    let d = [...proformas]
    if (filtro)    d = d.filter(x => x.estado === filtro)
    if (filtDesde) d = d.filter(x => (x.fecha || '') >= filtDesde)
    if (filtHasta) d = d.filter(x => (x.fecha || '') <= filtHasta)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(x => x.numero?.toLowerCase().includes(q) || cliNombre(x.clienteId).toLowerCase().includes(q))
    }
    return d
  }, [proformas, filtro, busqueda, filtDesde, filtHasta, clientes])

  const kpis = useMemo(() => ({
    total:     proformas.length,
    enviadas:  proformas.filter(x => x.estado === 'ENVIADA').length,
    aceptadas: proformas.filter(x => x.estado === 'ACEPTADA').length,
    valor:     proformas.filter(x => ['ENVIADA', 'ACEPTADA'].includes(x.estado)).reduce((s, x) => s + Number(x.total || 0), 0),
  }), [proformas])

  async function handleSave(data) {
    const isEdit = !!data.id
    let res
    if (isEdit) {
      // UpdateProformaDto: solo fechaVencimiento, notas, estado (no BORRADOR, no clienteId, no items)
      const dto = {
        fechaVencimiento: data.fechaVencimiento || undefined,
        notas:            data.notas || undefined,
        ...(data.estado && data.estado !== 'BORRADOR' && { estado: data.estado }),
      }
      res = await actualizarProforma.mutateAsync({ id: data.id, ...dto })
    } else {
      // CreateProformaDto: clienteId, fechaVencimiento?, notas?, items (NO estado)
      const dto = {
        clienteId:        data.clienteId,
        fechaVencimiento: data.fechaVencimiento || undefined,
        notas:            data.notas || undefined,
        items: (data.items || []).map(it => ({
          productoId:     it.productoId,
          descripcion:    it.descripcion || undefined,
          cantidad:       Number(it.cantidad),
          precioUnitario: Number(it.precioUnitario),
        })),
      }
      res = await crearProforma.mutateAsync(dto)
    }
    if (res?.error) { toast(res.error, 'error'); return }
    setModal(false)
    toast(isEdit ? 'Proforma actualizada' : 'Proforma creada', 'success')
  }

  async function duplicar(doc) {
    const res = await crearProforma.mutateAsync({
      clienteId:        doc.clienteId,
      fechaVencimiento: doc.fechaVencimiento || undefined,
      notas:            doc.notas || undefined,
      items: (doc.items || []).map(it => ({
        productoId:     it.productoId,
        descripcion:    it.descripcion || undefined,
        cantidad:       Number(it.cantidad),
        precioUnitario: Number(it.precioUnitario),
      })),
    })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Proforma duplicada', 'success')
  }

  async function marcarAceptada(doc) {
    const res = await actualizarProforma.mutateAsync({ id: doc.id, estado: 'ACEPTADA' })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Proforma aceptada', 'success')
  }

  async function handleDelete(id) {
    const res = await eliminarProforma.mutateAsync(id)
    if (res?.error) { toast(res.error, 'error'); return }
    setConfirmDel(null)
    toast('Proforma eliminada', 'success')
  }

  const isSaving = crearProforma.isPending || actualizarProforma.isPending

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label: 'Total proformas',  val: kpis.total,                                   color: '#00c896' },
          { label: 'Enviadas',         val: kpis.enviadas,                                color: '#3b82f6' },
          { label: 'Aceptadas',        val: kpis.aceptadas,                               color: '#22c55e' },
          { label: 'Valor en cartera', val: formatCurrency(kpis.valor, simboloMoneda),    color: '#f59e0b', mono: true },
        ].map(({ label, val, color, mono }) => (
          <div key={label} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em] mb-2">{label}</div>
            <div className={`font-bold text-[#e8edf2] leading-none ${mono ? 'text-[14px] font-mono' : 'text-[26px]'}`}>{val}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Proformas / Cotizaciones de Venta</span>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={async () => { await exportarProformasXLSX(proformas, clientes, simboloMoneda) }}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={async () => { await exportarProformasPDF(proformas, clientes, simboloMoneda, sesion?.nombre) }}>
              <FileText size={13}/> PDF
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => { setEditando(null); setModal(true) }}><Plus size={13}/> Nueva Proforma</Btn>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-50">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI + ' pl-8'} placeholder="Buscar número o cliente..." value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <select className={SEL} style={{ width: 145, padding: '5px 8px', fontSize: 12 }} value={filtro} onChange={e => setFiltro(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#5f6f80] whitespace-nowrap font-semibold uppercase tracking-wide">Desde</span>
            <input type="date" className={SI + ' py-1.25! text-[12px]'} style={{ width: 138 }} value={filtDesde} onChange={e => setFiltDesde(e.target.value)}/>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#5f6f80] whitespace-nowrap font-semibold uppercase tracking-wide">Hasta</span>
            <input type="date" className={SI + ' py-1.25! text-[12px]'} style={{ width: 138 }} value={filtHasta} onChange={e => setFiltHasta(e.target.value)}/>
          </div>
          {(busqueda || filtro || filtDesde || filtHasta) && (
            <Btn variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltro(''); setFiltDesde(''); setFiltHasta('') }}>
              <X size={12}/> Limpiar
            </Btn>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse text-[12px]">
            <thead><tr>
              <TH c="N° Proforma"/><TH c="Cliente"/><TH c="Fecha"/><TH c="Válida hasta"/>
              <TH c="Ítems" r/><TH c="Total" r/><TH c="Estado"/><TH c="Acciones"/>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="text-center text-[#5f6f80] py-8 text-[12px]">Cargando proformas...</td></tr>}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={8}><EmptyState icon={FileText} title="Sin proformas" description="Crea la primera cotización de venta."/></td></tr>
              )}
              {filtered.map(doc => {
                const meta = ESTADO_META[doc.estado] || ESTADO_META.BORRADOR
                return (
                  <tr key={doc.id} className="border-b border-white/6 last:border-0 hover:bg-white/2">
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#00c896] font-semibold">{doc.numero}</td>
                    <td className="px-3.5 py-2.5 font-medium text-[#e8edf2]">{cliNombre(doc.clienteId)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">{formatDate(doc.fecha)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">{formatDate(doc.fechaVencimiento)}</td>
                    <td className="px-3.5 py-2.5 text-right text-[#9ba8b6]">{doc.items?.length || 0}</td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-[#e8edf2]">{formatCurrency(doc.total, simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5"><Badge variant={meta.color}>{meta.label}</Badge></td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex gap-1">
                        <Btn variant="ghost" size="icon" title="Ver" onClick={() => setDetalle(doc)}><Eye size={12}/></Btn>
                        <Btn variant="ghost" size="icon" disabled={NO_EDITABLE.includes(doc.estado)}
                          title={NO_EDITABLE.includes(doc.estado) ? `No se puede editar una proforma ${meta.label.toLowerCase()}` : 'Editar'}
                          onClick={() => { setEditando(doc); setModal(true) }}><Edit2 size={12}/></Btn>
                        <Btn variant="ghost" size="icon" title="Imprimir" className="text-[#00c896]"
                          onClick={() => imprimirProforma({ doc, cliente: clientes.find(c => c.id === doc.clienteId), productos, config: { simboloMoneda, empresa: sesion?.nombre } })}>
                          <FileText size={12}/>
                        </Btn>
                        <Btn variant="ghost" size="icon" title="Duplicar" onClick={() => duplicar(doc)}><Copy size={12}/></Btn>
                        {doc.estado === 'ENVIADA' && (
                          <Btn variant="ghost" size="icon" title="Marcar aceptada" className="text-green-400" onClick={() => marcarAceptada(doc)}>
                            <CheckCircle size={12}/>
                          </Btn>
                        )}
                        <Btn variant="ghost" size="icon" className="text-red-400" onClick={() => setConfirmDel(doc.id)}><Trash2 size={12}/></Btn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detalle && (
        <ModalDetalle
          doc={detalle}
          clientes={clientes}
          productos={productos}
          simboloMoneda={simboloMoneda}
          empresaNombre={sesion?.nombre}
          onClose={() => setDetalle(null)}
        />
      )}

      <ModalProforma
        open={modal}
        onClose={() => setModal(false)}
        editando={editando}
        clientes={clientes}
        productos={productos}
        simboloMoneda={simboloMoneda}
        saving={isSaving}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => handleDelete(confirmDel)}
        danger
        title="Eliminar proforma"
        message="¿Eliminar esta proforma? La acción no se puede deshacer."
      />
    </div>
  )
}

function ModalDetalle({ doc, clientes, productos, simboloMoneda, empresaNombre, onClose }) {
  const cli = clientes.find(c => c.id === doc.clienteId)
  return (
    <Modal open title={`Proforma — ${doc.numero}`} onClose={onClose} size="lg"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
        <Btn variant="primary" onClick={() => imprimirProforma({ doc, cliente: cli, productos, config: { simboloMoneda, empresa: empresaNombre } })}>
          <FileText size={13}/> Imprimir PDF
        </Btn>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        {[
          ['Cliente',     cli?.razonSocial || '—'],
          ['Fecha',       formatDate(doc.fecha)],
          ['Válida hasta', formatDate(doc.fechaVencimiento)],
          ['Estado',      doc.estado],
        ].map(([k, v]) => (
          <div key={k} className="bg-[#1a2230] rounded-lg px-3.5 py-2.5">
            <div className="text-[10px] text-[#5f6f80] mb-0.5">{k}</div>
            <div className="text-[13px] font-medium text-[#e8edf2]">{v}</div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full border-collapse text-[12px]">
          <thead><tr>
            {['Producto', 'Cant.', 'P. Unitario', 'Subtotal'].map(h => (
              <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[10px] font-semibold text-[#5f6f80] uppercase border-b border-white/8">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {(doc.items || []).map((item, i) => {
              const p = productos.find(x => x.id === item.productoId)
              return (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  <td className="px-3.5 py-2.5 text-[#e8edf2]">{item.descripcion || p?.nombre || '—'}</td>
                  <td className="px-3.5 py-2.5 text-[#9ba8b6]">{item.cantidad} {p?.unidadMedida || ''}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[#9ba8b6]">{formatCurrency(item.precioUnitario, simboloMoneda)}</td>
                  <td className="px-3.5 py-2.5 font-mono font-semibold text-[#e8edf2]">{formatCurrency(item.subtotal, simboloMoneda)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col items-end gap-1.5 text-[12px]">
        <div className="flex gap-6"><span className="text-[#5f6f80]">Subtotal</span><span className="font-mono">{formatCurrency(doc.subtotal, simboloMoneda)}</span></div>
        <div className="flex gap-6"><span className="text-[#5f6f80]">IGV (18%)</span><span className="font-mono">{formatCurrency(doc.igv, simboloMoneda)}</span></div>
        <div className="flex gap-6 text-[14px] font-bold text-[#00c896]"><span>TOTAL</span><span className="font-mono">{formatCurrency(doc.total, simboloMoneda)}</span></div>
      </div>
      {doc.notas && (
        <div className="px-3.5 py-2.5 bg-[#1a2230] rounded-lg text-[12px] text-[#9ba8b6] border-l-2 border-[#00c896]/40">{doc.notas}</div>
      )}
    </Modal>
  )
}

// Estados válidos para actualizar (UpdateProformaDto excluye BORRADOR)
const ESTADOS_EDIT = ['ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA']

function ModalProforma({ open, onClose, editando, clientes, productos, simboloMoneda, saving, onSave }) {
  const init = { clienteId: '', fechaVencimiento: '', estado: 'BORRADOR', items: [], notas: '' }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const isEdit = !!editando

  useEffect(() => {
    if (!open) return
    setForm(editando ? { ...init, ...editando } : init)
  }, [open, editando])

  function addItem() {
    f('items', [...(form.items || []), { productoId: '', descripcion: '', cantidad: 1, precioUnitario: 0, subtotal: 0 }])
  }

  function setItem(i, k, v) {
    const items = [...(form.items || [])]
    items[i] = { ...items[i], [k]: v }
    if (k === 'cantidad' || k === 'precioUnitario') {
      items[i].subtotal = +(Number(items[i].cantidad) * Number(items[i].precioUnitario)).toFixed(2)
    }
    if (k === 'productoId') {
      const p = productos.find(x => x.id === v)
      items[i].descripcion    = p?.nombre || ''
      items[i].precioUnitario = Number(p?.precioVenta || p?.precioCompra || 0)
      items[i].subtotal       = +(Number(items[i].cantidad) * items[i].precioUnitario).toFixed(2)
    }
    f('items', items)
  }

  function removeItem(i) { f('items', form.items.filter((_, idx) => idx !== i)) }

  const subtotal = (form.items || []).reduce((s, it) => s + Number(it.subtotal || 0), 0)
  const igv      = +(subtotal * 0.18).toFixed(2)
  const total    = +(subtotal + igv).toFixed(2)

  const canSave = isEdit ? true : (!!form.clienteId && form.items?.length > 0)

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Proforma' : 'Nueva Proforma'} size="xl"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={!canSave || saving}
          onClick={() => onSave({ ...form, id: editando?.id })}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Btn>
      </>}>

      {/* Campos editables: en edición solo fecha, notas y estado (no clienteId ni items) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <Field label="Cliente">
          {isEdit
            ? <div className={SI + ' opacity-50 cursor-not-allowed'}>{clientes.find(c => c.id === form.clienteId)?.razonSocial || '—'}</div>
            : <select className={SEL} value={form.clienteId} onChange={e => f('clienteId', e.target.value)}>
                <option value="">Seleccionar...</option>
                {clientes.filter(c => c.activo !== false).map(c => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}
              </select>
          }
        </Field>
        <Field label="Estado">
          {isEdit
            ? <select className={SEL} value={form.estado} onChange={e => f('estado', e.target.value)}>
                {ESTADOS_EDIT.map(k => <option key={k} value={k}>{ESTADO_META[k]?.label || k}</option>)}
              </select>
            : <div className={SI + ' opacity-50 cursor-not-allowed'}>{ESTADO_META.BORRADOR.label}</div>
          }
        </Field>
        <Field label="Válida hasta">
          <input type="date" className={SI} value={form.fechaVencimiento} onChange={e => f('fechaVencimiento', e.target.value)}/>
        </Field>
        <div className="col-span-full">
          <Field label="Notas">
            <input className={SI} value={form.notas} onChange={e => f('notas', e.target.value)} placeholder="Condiciones, plazos, observaciones..."/>
          </Field>
        </div>
      </div>

      {/* Ítems: editables solo al crear; read-only al editar (backend no permite cambiarlos) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide">
            Ítems {isEdit && <span className="text-[#5f6f80] font-normal">(no se pueden modificar después de crear)</span>}
          </span>
          {!isEdit && <Btn variant="ghost" size="sm" onClick={addItem}><Plus size={12}/> Agregar ítem</Btn>}
        </div>

        {isEdit
          ? /* Solo lectura en edición */
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full border-collapse text-[12px]">
                <thead><tr>
                  {['Producto', 'Cant.', 'P. Unitario', 'Subtotal'].map(h => (
                    <th key={h} className="bg-[#1a2230] px-3.5 py-2 text-left text-[10px] font-semibold text-[#5f6f80] uppercase border-b border-white/8">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {(form.items || []).map((item, i) => {
                    const p = productos.find(x => x.id === item.productoId)
                    return (
                      <tr key={i} className="border-b border-white/5 last:border-0">
                        <td className="px-3.5 py-2 text-[#e8edf2]">{item.descripcion || p?.nombre || '—'}</td>
                        <td className="px-3.5 py-2 text-[#9ba8b6]">{item.cantidad}</td>
                        <td className="px-3.5 py-2 font-mono text-[#9ba8b6]">{formatCurrency(item.precioUnitario, simboloMoneda)}</td>
                        <td className="px-3.5 py-2 font-mono font-semibold text-[#e8edf2]">{formatCurrency(item.subtotal ?? (item.cantidad * item.precioUnitario), simboloMoneda)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          : /* Editable al crear */
            <>
              {(form.items || []).map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
                  <div className="col-span-4">
                    {i === 0 && <div className="text-[10px] text-[#5f6f80] mb-1">Producto</div>}
                    <select className={SEL} value={item.productoId} onChange={e => setItem(i, 'productoId', e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {productos.filter(p => p.estado === 'Activo').map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    {i === 0 && <div className="text-[10px] text-[#5f6f80] mb-1">Descripción</div>}
                    <input className={SI} value={item.descripcion} onChange={e => setItem(i, 'descripcion', e.target.value)} placeholder="Descripción"/>
                  </div>
                  <div className="col-span-1">
                    {i === 0 && <div className="text-[10px] text-[#5f6f80] mb-1">Cant.</div>}
                    <input type="number" className={SI} value={item.cantidad} onChange={e => setItem(i, 'cantidad', +e.target.value)} min="0.01" step="0.01"/>
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <div className="text-[10px] text-[#5f6f80] mb-1">P. Unitario</div>}
                    <input type="number" className={SI} value={item.precioUnitario} onChange={e => setItem(i, 'precioUnitario', +e.target.value)} min="0" step="0.01"/>
                  </div>
                  <div className="col-span-1 text-right pt-1">
                    {i === 0 && <div className="text-[10px] text-[#5f6f80] mb-1">Subtotal</div>}
                    <div className="text-[12px] font-mono font-semibold text-[#00c896] py-2">{formatCurrency(item.subtotal, simboloMoneda)}</div>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Btn variant="ghost" size="icon" className="text-red-400" onClick={() => removeItem(i)}><Trash2 size={12}/></Btn>
                  </div>
                </div>
              ))}
              {!form.items?.length && <div className="text-center text-[12px] text-[#5f6f80] py-6">Agrega al menos un ítem</div>}
            </>
        }
      </div>

      <div className="flex flex-col items-end gap-1.5 text-[12px] border-t border-white/6 pt-3">
        <div className="flex gap-8"><span className="text-[#5f6f80]">Subtotal</span><span className="font-mono">{formatCurrency(subtotal, simboloMoneda)}</span></div>
        <div className="flex gap-8"><span className="text-[#5f6f80]">IGV (18%)</span><span className="font-mono">{formatCurrency(igv, simboloMoneda)}</span></div>
        <div className="flex gap-8 text-[15px] font-bold text-[#00c896]"><span>TOTAL</span><span className="font-mono">{formatCurrency(total, simboloMoneda)}</span></div>
      </div>
    </Modal>
  )
}
