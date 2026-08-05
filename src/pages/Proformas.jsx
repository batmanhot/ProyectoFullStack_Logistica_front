import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Eye, Edit2, Trash2, FileText, CheckCircle, Copy, Download, X, Truck } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate } from '../utils/helpers'
import { Modal, ConfirmDialog, Badge, Btn, Field, Input, Select, DataTable } from '../components/ui/index'
import { imprimirProforma } from '../utils/pdfTemplates'
import { exportarProformasXLSX } from '../utils/exportXLSX'
import { exportarProformasPDF } from '../utils/exportPDF'
import {
  useProformasList, useCrearProforma, useActualizarProforma, useEliminarProforma,
  useConvertirProformaDespacho,
} from '../queries/proformas.queries'
import { useClientesList } from '../queries/clientes.queries'
import { useProductosList } from '../queries/productos.queries'
import { useAlmacenesList } from '../queries/almacenes.queries'
import { useListasPreciosList } from '../queries/listas-precios.queries'
import { getPrecio } from '../utils/precios'

const simboloMoneda = 'S/'

const ESTADO_META = {
  BORRADOR:   { label: 'Borrador',   color: 'neutral'  },
  ENVIADA:    { label: 'Enviada',    color: 'info'     },
  ACEPTADA:   { label: 'Aceptada',   color: 'success'  },
  RECHAZADA:  { label: 'Rechazada', color: 'danger'   },
  VENCIDA:    { label: 'Vencida',    color: 'neutral'  },
  CONVERTIDA: { label: 'Convertida', color: 'teal'     },
}

const FORMA_PAGO_META = {
  CONTADO: { label: 'Contado', color: 'neutral' },
  CREDITO: { label: 'Crédito', color: 'info' },
}

// El backend rechaza (403) cualquier update sobre proformas ACEPTADA/RECHAZADA
// (proformas.service.ts#update) — se refleja aquí para no exponer un botón que siempre falla.
const NO_EDITABLE = ['ACEPTADA', 'RECHAZADA']

export default function Proformas() {
  const { sesion, toast } = useApp()

  const { data: proformas = [], isLoading } = useProformasList()
  const { data: clientes  = [] }            = useClientesList()
  const { data: productos = [] }            = useProductosList()
  const { data: almacenes = [] }            = useAlmacenesList()
  const { data: listasPrecios = [] }        = useListasPreciosList()

  const crearProforma     = useCrearProforma()
  const actualizarProforma = useActualizarProforma()
  const eliminarProforma  = useEliminarProforma()
  const convertirDespacho = useConvertirProformaDespacho()

  const [modal,      setModal]      = useState(false)
  const [detalle,    setDetalle]    = useState(null)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [convirtiendo, setConvirtiendo] = useState(null)
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
      // CreateProformaDto: clienteId, fechaVencimiento?, notas?, formaPago?, items (NO estado)
      const dto = {
        clienteId:        data.clienteId,
        fechaVencimiento: data.fechaVencimiento || undefined,
        notas:            data.notas || undefined,
        formaPago:        data.formaPago || 'CREDITO',
        listaPrecioId:    data.listaPrecioId || undefined,
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
      formaPago:        doc.formaPago || 'CREDITO',
      listaPrecioId:    doc.listaPrecioId || undefined,
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

  async function handleConvertir(doc, almacenId) {
    if (!almacenId) { toast('Selecciona el almacén desde el que se despacha', 'error'); return }
    const res = await convertirDespacho.mutateAsync({ id: doc.id, almacenId })
    if (res?.error) { toast(res.error, 'error'); return }
    const numero = res?.data?.despacho?.numero || '—'
    toast(`Proforma ${doc.numero} convertida a Despacho ${numero}`, 'success')
    setConvirtiendo(null)
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
            <Input className="pl-8" placeholder="Buscar número o cliente..." value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <Select className="w-auto" value={filtro} onChange={e => setFiltro(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#5f6f80] whitespace-nowrap font-semibold uppercase tracking-wide">Desde</span>
            <Input type="date" style={{ width: 138 }} value={filtDesde} onChange={e => setFiltDesde(e.target.value)}/>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#5f6f80] whitespace-nowrap font-semibold uppercase tracking-wide">Hasta</span>
            <Input type="date" style={{ width: 138 }} value={filtHasta} onChange={e => setFiltHasta(e.target.value)}/>
          </div>
          {(busqueda || filtro || filtDesde || filtHasta) && (
            <Btn variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltro(''); setFiltDesde(''); setFiltHasta('') }}>
              <X size={12}/> Limpiar
            </Btn>
          )}
        </div>

        <DataTable
          loading={isLoading}
          rows={filtered}
          rowKey={doc => doc.id}
          onRowClick={doc => setDetalle(doc)}
          emptyIcon={FileText}
          emptyTitle="Sin proformas"
          emptyDescription="Crea la primera cotización de venta."
          columns={[
            { key: 'numero', header: 'N° Proforma', render: doc => <span className="font-mono text-[11px] text-[#00c896] font-semibold">{doc.numero}</span> },
            { key: 'cliente', header: 'Cliente', render: doc => <span className="font-medium text-[#e8edf2]">{cliNombre(doc.clienteId)}</span> },
            { key: 'fecha', header: 'Fecha', render: doc => <span className="font-mono text-[11px] text-[#9ba8b6]">{formatDate(doc.fecha)}</span> },
            { key: 'venc', header: 'Válida hasta', render: doc => <span className="font-mono text-[11px] text-[#9ba8b6]">{formatDate(doc.fechaVencimiento)}</span> },
            { key: 'items', header: 'Ítems', align: 'right', render: doc => <span className="text-[#9ba8b6]">{doc.items?.length || 0}</span> },
            { key: 'total', header: 'Total', align: 'right', render: doc => <span className="font-mono font-semibold text-[#e8edf2]">{formatCurrency(doc.total, simboloMoneda)}</span> },
            { key: 'estado', header: 'Estado', render: doc => {
                const meta = ESTADO_META[doc.estado] || ESTADO_META.BORRADOR
                return <Badge variant={meta.color}>{meta.label}</Badge>
              } },
            { key: 'acciones', header: 'Acciones', stopPropagation: true, render: doc => {
                const meta = ESTADO_META[doc.estado] || ESTADO_META.BORRADOR
                return (
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
                    {doc.estado === 'ACEPTADA' && (
                      <Btn variant="ghost" size="icon" title="Convertir a Despacho" className="text-[#00c896]" onClick={() => setConvirtiendo(doc)}>
                        <Truck size={12}/>
                      </Btn>
                    )}
                    <Btn variant="ghost" size="icon" className="text-red-400" onClick={() => setConfirmDel(doc.id)}><Trash2 size={12}/></Btn>
                  </div>
                )
              } },
          ]}
        />
      </div>

      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Proformas / Cotizaciones?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {[
            ['1. Crear proforma', 'Elige cliente, forma de pago (Contado/Crédito) y agrega los ítems. La Lista de Precios se sugiere según la asignada al cliente, pero puedes cambiarla para esta proforma puntual — el precio de cada ítem sigue siendo editable a mano. Subtotal, IGV y total se calculan solos.'],
            ['2. Enviar y hacer seguimiento', 'Marca el estado (Enviada, Aceptada, Rechazada) según la respuesta del cliente. Una proforma Aceptada, Rechazada o Convertida ya no se puede editar.'],
            ['3. Convertir a Despacho', 'Una proforma Aceptada puede convertirse en un Despacho real (con reserva de stock) desde el botón dedicado, eligiendo el almacén — queda en estado Convertida y enlazada al despacho generado.'],
            ['4. Duplicar', 'Usa "Duplicar" para crear una nueva proforma con los mismos ítems, útil para cotizaciones recurrentes.'],
            ['5. Imprimir o exportar', 'Cada proforma se puede imprimir en PDF individual; Excel/PDF exportan la lista completa filtrada.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
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
        listasPrecios={listasPrecios}
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

      {convirtiendo && (
        <ModalConvertirDespacho
          doc={convirtiendo}
          almacenes={almacenes}
          convirtiendo={convertirDespacho.isPending}
          onClose={() => setConvirtiendo(null)}
          onConfirm={almacenId => handleConvertir(convirtiendo, almacenId)}
        />
      )}
    </div>
  )
}

// ── Modal Convertir a Despacho — mismo patrón que ModalDetallePedido en PortalPedidos.jsx ──
function ModalConvertirDespacho({ doc, almacenes, convirtiendo, onClose, onConfirm }) {
  const almacenesActivos = almacenes.filter(a => a.activo !== false)
  const [almacenId, setAlmacenId] = useState(almacenesActivos[0]?.id || '')

  return (
    <Modal open title={`Convertir a Despacho — ${doc.numero}`} onClose={onClose} size="sm"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={convirtiendo || !almacenId} onClick={() => onConfirm(almacenId)}>
          <Truck size={13}/> {convirtiendo ? 'Convirtiendo...' : 'Convertir a Despacho'}
        </Btn>
      </>}>
      <div className="px-3.5 py-2.5 bg-[#1a2230] rounded-lg text-[12px] text-[#9ba8b6]">
        Se creará un Despacho con los mismos ítems de esta proforma, reservando stock en el almacén elegido.
      </div>
      <Field label="Almacén desde el que se despacha *">
        <Select value={almacenId} onChange={e => setAlmacenId(e.target.value)}>
          {almacenesActivos.length === 0 && <option value="">Sin almacenes disponibles</option>}
          {almacenesActivos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </Select>
      </Field>
    </Modal>
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
          ['Forma de pago', (FORMA_PAGO_META[doc.formaPago] || FORMA_PAGO_META.CREDITO).label],
          ['Lista de precios', doc.listaPrecio?.nombre || 'Precio base de catálogo'],
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

// Precio de un producto según la lista elegida — sin lista, cae al precio de venta y,
// si tampoco hay, al costo (mejor sugerir el costo que un precio en S/0.00 en una cotización).
function resolverPrecio(p, lista) {
  return lista ? getPrecio(p, lista) : Number(p.precioVenta || p.precioCompra || 0)
}

function ModalProforma({ open, onClose, editando, clientes, productos, listasPrecios = [], simboloMoneda, saving, onSave }) {
  const init = { clienteId: '', fechaVencimiento: '', estado: 'BORRADOR', formaPago: 'CREDITO', listaPrecioId: '', items: [], notas: '' }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const isEdit = !!editando

  const clienteSeleccionado = clientes.find(c => c.id === form.clienteId)
  const listaSeleccionada = form.listaPrecioId
    ? listasPrecios.find(l => l.id === form.listaPrecioId && l.activa !== false)
    : null
  const esListaPorDefecto = clienteSeleccionado?.listaPrecioId === form.listaPrecioId

  useEffect(() => {
    if (!open) return
    setForm(editando ? { ...init, ...editando } : init)
  }, [open, editando])

  function addItem() {
    f('items', [...(form.items || []), { productoId: '', descripcion: '', cantidad: 1, precioUnitario: 0, subtotal: 0 }])
  }

  function recalcularItems(items, lista) {
    return items.map(it => {
      const p = productos.find(x => x.id === it.productoId)
      if (!p) return it
      const precioUnitario = resolverPrecio(p, lista)
      return { ...it, precioUnitario, subtotal: +(Number(it.cantidad) * precioUnitario).toFixed(2) }
    })
  }

  /**
   * Al cambiar de cliente, adopta la lista de precios asignada a ese cliente
   * (o ninguna) como punto de partida y recalcula los ítems YA cargados —
   * sin esto, un ítem agregado antes de elegir cliente (o al cambiar de
   * cliente con ítems ya cargados) se quedaba con el precio de la selección
   * anterior para siempre. El usuario puede después elegir otra lista a mano
   * con el selector "Lista de precios".
   */
  function handleClienteChange(clienteId) {
    const cliente = clientes.find(c => c.id === clienteId)
    const listaPrecioId = cliente?.listaPrecioId || ''
    const lista = listaPrecioId ? listasPrecios.find(l => l.id === listaPrecioId && l.activa !== false) : null
    setForm(prev => ({ ...prev, clienteId, listaPrecioId, items: recalcularItems(prev.items || [], lista) }))
  }

  /** Cambia la lista de precios usada en esta proforma puntual, sin tocar el cliente ni su asignación por defecto. */
  function handleListaChange(listaPrecioId) {
    const lista = listaPrecioId ? listasPrecios.find(l => l.id === listaPrecioId && l.activa !== false) : null
    setForm(prev => ({ ...prev, listaPrecioId, items: recalcularItems(prev.items || [], lista) }))
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
      items[i].precioUnitario = p ? resolverPrecio(p, listaSeleccionada) : 0
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
            ? <Input disabled readOnly className="opacity-50 cursor-not-allowed" value={clientes.find(c => c.id === form.clienteId)?.razonSocial || '—'}/>
            : <Select value={form.clienteId} onChange={e => handleClienteChange(e.target.value)}>
                <option value="">Seleccionar...</option>
                {clientes.filter(c => c.activo !== false).map(c => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}
              </Select>
          }
        </Field>
        <Field label="Estado">
          {isEdit
            ? <Select value={form.estado} onChange={e => f('estado', e.target.value)}>
                {/* BORRADOR no es un estado elegible (el backend lo rechaza), pero si es el
                    valor actual debe existir como <option> — si no, el <select> no tiene con
                    qué representarlo, el navegador cae a mostrar la primera opción (Enviada)
                    sin que React se entere, y si el usuario no la toca (ya la ve "seleccionada")
                    no se dispara onChange y el estado nunca se envía al guardar. */}
                {form.estado === 'BORRADOR' && <option value="BORRADOR">{ESTADO_META.BORRADOR.label}</option>}
                {ESTADOS_EDIT.map(k => <option key={k} value={k}>{ESTADO_META[k]?.label || k}</option>)}
              </Select>
            : <Input disabled readOnly className="opacity-50 cursor-not-allowed" value={ESTADO_META.BORRADOR.label}/>
          }
        </Field>
        <Field label="Válida hasta">
          <Input type="date" value={form.fechaVencimiento} onChange={e => f('fechaVencimiento', e.target.value)}/>
        </Field>
        <Field label="Forma de pago">
          {isEdit
            ? <Input disabled readOnly className="opacity-50 cursor-not-allowed" value={FORMA_PAGO_META[form.formaPago]?.label || form.formaPago}/>
            : <Select value={form.formaPago} onChange={e => f('formaPago', e.target.value)}>
                <option value="CREDITO">Crédito</option>
                <option value="CONTADO">Contado</option>
              </Select>
          }
        </Field>
        {!isEdit && (
          <Field label="Lista de precios">
            <Select value={form.listaPrecioId} onChange={e => handleListaChange(e.target.value)}>
              <option value="">Precio base de catálogo</option>
              {listasPrecios.filter(l => l.activa !== false).map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </Select>
          </Field>
        )}
        <div className="col-span-full">
          <Field label="Notas">
            <Input value={form.notas} onChange={e => f('notas', e.target.value)} placeholder="Condiciones, plazos, observaciones..."/>
          </Field>
        </div>
      </div>

      {!isEdit && listaSeleccionada && (
        <div className="px-3.5 py-2 bg-[#00c896]/10 border border-[#00c896]/20 rounded-lg text-[12px] text-[#00c896]">
          Precios sugeridos según la lista de precios "{listaSeleccionada.nombre}"
          {esListaPorDefecto ? ' asignada a este cliente' : ' (elegida manualmente para esta proforma)'} — siguen siendo editables.
        </div>
      )}

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
                    <Select value={item.productoId} onChange={e => setItem(i, 'productoId', e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {productos.filter(p => p.estado === 'Activo').map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </Select>
                  </div>
                  <div className="col-span-3">
                    {i === 0 && <div className="text-[10px] text-[#5f6f80] mb-1">Descripción</div>}
                    <Input value={item.descripcion} onChange={e => setItem(i, 'descripcion', e.target.value)} placeholder="Descripción"/>
                  </div>
                  <div className="col-span-1">
                    {i === 0 && <div className="text-[10px] text-[#5f6f80] mb-1">Cant.</div>}
                    <Input type="number" value={item.cantidad} onChange={e => setItem(i, 'cantidad', +e.target.value)} min="0.01" step="0.01"/>
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <div className="text-[10px] text-[#5f6f80] mb-1">P. Unitario</div>}
                    <Input type="number" value={item.precioUnitario} onChange={e => setItem(i, 'precioUnitario', +e.target.value)} min="0" step="0.01"/>
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
