import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Eye, Edit2, CheckCircle, FileText, X, Download } from 'lucide-react'

import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoy } from '../utils/helpers'
import { Modal, Badge, Btn, Field, Input, Select, Textarea, DataTable } from '../components/ui/index'
import PdfSharePanel from '../components/ui/PdfSharePanel'
import { imprimirRFQ, armarHtmlRFQ } from '../utils/pdfTemplates'
import { exportarCotizacionesXLSX } from '../utils/exportXLSX'
import { exportarCotizacionesPDF } from '../utils/exportPDF'
import { useCotizacionesList, useCrearCotizacion, useActualizarCotizacion, useAgregarRespuesta, useMarcarGanadora } from '../queries/cotizaciones.queries'
import { useProductosList } from '../queries/productos.queries'
import { useProveedoresList } from '../queries/proveedores.queries'
import { useEmpresaPDFConfig } from '../queries/configuracion.queries'

const simboloMoneda = 'S/'

const ESTADOS_COT = {
  BORRADOR:   { color: 'neutral',  label: 'Borrador'   },
  ENVIADA:    { color: 'info',     label: 'Enviada'    },
  RESPONDIDA: { color: 'warning',  label: 'Respondida' },
  ADJUDICADA: { color: 'success',  label: 'Adjudicada' },
  CANCELADA:  { color: 'danger',   label: 'Cancelada'  },
}

export default function Cotizaciones() {
  const { toast } = useApp()

  const { data: cotizaciones = [], isLoading } = useCotizacionesList()
  const { data: productos    = [] }            = useProductosList()
  const { data: proveedores  = [] }            = useProveedoresList()
  const pdfConfig = useEmpresaPDFConfig()

  const crearCotizacion     = useCrearCotizacion()
  const actualizarCotizacion = useActualizarCotizacion()
  const agregarResp          = useAgregarRespuesta()
  const marcarGanadora       = useMarcarGanadora()

  const [modal,     setModal]     = useState(false)
  const [editando,  setEditando]  = useState(null)
  const [detalle,   setDetalle]   = useState(null)
  const [shareRFQ,  setShareRFQ]  = useState(null)
  const [provDestId, setProvDestId] = useState('')
  const [filtEst,   setFiltEst]   = useState('')
  const [busqueda,  setBusqueda]  = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' })

  const handleSort = (key) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }))
  }

  const filtered = useMemo(() => {
    let d = [...cotizaciones]
    if (filtEst) d = d.filter(c => c.estado === filtEst)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(c => c.numero?.toLowerCase().includes(q) || c.notas?.toLowerCase().includes(q))
    }
    d.sort((a, b) => {
      let aV = sortConfig.key === 'respuestas' ? (a.respuestas?.length || 0) : (a[sortConfig.key] || '')
      let bV = sortConfig.key === 'respuestas' ? (b.respuestas?.length || 0) : (b[sortConfig.key] || '')
      if (typeof aV === 'string') { aV = aV.toLowerCase(); bV = bV.toLowerCase() }
      if (aV < bV) return sortConfig.direction === 'asc' ? -1 : 1
      if (aV > bV) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return d
  }, [cotizaciones, filtEst, busqueda, sortConfig])

  const kpis = useMemo(() => ({
    total:      cotizaciones.length,
    pendientes: cotizaciones.filter(c => c.estado === 'ENVIADA').length,
    respond:    cotizaciones.filter(c => c.estado === 'RESPONDIDA').length,
    adjud:      cotizaciones.filter(c => c.estado === 'ADJUDICADA').length,
  }), [cotizaciones])

  const provNombre = id => proveedores.find(p => p.id === id)?.razonSocial || id

  async function handleCrear({ fechaVencimiento, notas, items }) {
    const res = await crearCotizacion.mutateAsync({ fechaVencimiento: fechaVencimiento || undefined, notas, items })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Solicitud de cotización creada', 'success')
    setModal(false)
  }

  async function handleEditar({ id, fechaVencimiento, notas, estado }) {
    // UpdateCotizacionDto: solo fechaVencimiento?, notas?, estado?: 'ENVIADA'|'CANCELADA'
    const dto = {
      fechaVencimiento: fechaVencimiento || undefined,
      notas:            notas || undefined,
      ...(estado && ['ENVIADA', 'CANCELADA'].includes(estado) && { estado }),
    }
    const res = await actualizarCotizacion.mutateAsync({ id, ...dto })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Cotización actualizada', 'success')
    setEditando(null)
  }

  async function handleAgregarRespuesta(cotiz, respForm) {
    const res = await agregarResp.mutateAsync({
      cotizacionId:  cotiz.id,
      proveedorId:   respForm.proveedorId,
      tiempoEntrega: respForm.tiempoEntrega || undefined,
      notas:         respForm.notas || undefined,
      items: respForm.items.map(it => ({
        productoId:    it.productoId,
        precioUnitario: Number(it.precioUnitario),
      })),
    })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Respuesta de proveedor registrada', 'success')
    setDetalle(null)
  }

  async function handleMarcarGanadora(cotiz, resp) {
    const res = await marcarGanadora.mutateAsync({ cotizacionId: cotiz.id, respuestaId: resp.id })
    if (res?.error) { toast(res.error, 'error'); return }
    toast(`Respuesta de ${provNombre(resp.proveedorId)} marcada como ganadora. Crea la OC desde Órdenes de Compra.`, 'success')
    setDetalle(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          ['Total RFQ',   kpis.total,      '#00c896'],
          ['Enviadas',    kpis.pendientes, '#3b82f6'],
          ['Respondidas', kpis.respond,    '#f59e0b'],
          ['Adjudicadas', kpis.adjud,      '#22c55e'],
        ].map(([l, v, c]) => (
          <div key={l} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.75 rounded-t-xl" style={{ background: c }}/>
            <div className="text-[11px] text-[#5f6f80] uppercase tracking-[0.05em] mb-2">{l}</div>
            <div className="text-[28px] font-semibold text-[#e8edf2]">{v}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] whitespace-nowrap">Solicitudes de Cotización</span>
          <div className="flex items-center gap-2 shrink-0">
            <Btn variant="ghost" size="sm" onClick={async () => { await exportarCotizacionesXLSX(cotizaciones, proveedores, productos) }}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={async () => { await exportarCotizacionesPDF(cotizaciones, proveedores, simboloMoneda, pdfConfig.empresa) }}>
              <FileText size={13}/> PDF
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={13}/> Nueva RFQ</Btn>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-44">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <Input className="pl-8 py-1.25! text-[12px]" placeholder="Buscar número, notas..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <Select style={{ width: 160, padding: '5px 8px', fontSize: 12 }} value={filtEst} onChange={e => setFiltEst(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.keys(ESTADOS_COT).map(k => <option key={k} value={k}>{ESTADOS_COT[k].label}</option>)}
          </Select>
          <span className="text-[11px] text-[#5f6f80] whitespace-nowrap">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          {(busqueda || filtEst) && (
            <Btn variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltEst('') }}><X size={12}/> Limpiar</Btn>
          )}
        </div>

        <DataTable
          loading={isLoading}
          rows={filtered}
          rowKey={c => c.id}
          onRowClick={c => setDetalle(c)}
          emptyIcon={FileText}
          emptyTitle="Sin cotizaciones"
          emptyDescription="Crea tu primera solicitud de cotización."
          sortConfig={sortConfig}
          onSort={handleSort}
          columns={[
            { key:'numero', header:'N° RFQ', sortable:true, render: c => <span className="font-mono text-[12px] font-semibold text-[#00c896]">{c.numero}</span> },
            { key:'fecha', header:'Fecha', sortable:true, render: c => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatDate(c.fecha)}</span> },
            { key:'fechaVencimiento', header:'Vence', sortable:true, render: c => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatDate(c.fechaVencimiento)}</span> },
            { key:'items', header:'Ítems', render: c => <span className="text-[#9ba8b6]">{c.items?.length || 0}</span> },
            { key:'respuestas', header:'Respuestas', sortable:true, render: c => (
              <span className={`font-semibold text-[13px] ${(c.respuestas?.length || 0) > 0 ? 'text-[#00c896]' : 'text-[#5f6f80]'}`}>{c.respuestas?.length || 0}</span>
            ) },
            { key:'estado', header:'Estado', sortable:true, render: c => <Badge variant={ESTADOS_COT[c.estado]?.color || 'neutral'}>{ESTADOS_COT[c.estado]?.label || c.estado}</Badge> },
            { key:'notas', header:'Notas', sortable:true, render: c => <span className="text-[12px] text-[#9ba8b6] max-w-40 truncate block">{c.notas}</span> },
            { key:'acciones', header:'Acciones', stopPropagation:true, render: c => (
              <div className="flex gap-1">
                <Btn variant="ghost" size="icon" title="Ver detalle" onClick={() => setDetalle(c)}><Eye size={13}/></Btn>
                {['BORRADOR', 'ENVIADA'].includes(c.estado) && (
                  <Btn variant="ghost" size="icon" title="Editar" onClick={() => setEditando(c)}><Edit2 size={13}/></Btn>
                )}
                {c.estado === 'ENVIADA' && (
                  <Btn variant="ghost" size="icon" title="PDF / Compartir" className="text-[#00c896]" onClick={() => { setShareRFQ(c); setProvDestId('') }}>
                    <FileText size={13}/>
                  </Btn>
                )}
              </div>
            ) },
          ]}
        />
      </div>

      {/* Guía de uso */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Cotizaciones?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {[
            ['1. Crear RFQ',           'Arma la Solicitud de Cotización con los productos y cantidades que necesitas cotizar. Queda en estado Borrador.'],
            ['2. Enviar',              'Desde "Editar" cambia el estado a Enviada, o comparte el PDF por WhatsApp/correo con el botón de la fila.'],
            ['3. Registrar respuestas','Por cada proveedor que cotice, abre el detalle de la RFQ y registra su precio por ítem, plazo de entrega y notas. La RFQ pasa a Respondida.'],
            ['4. Adjudicar',           'Compara las respuestas y marca la mejor como "Ganadora". La RFQ pasa a Adjudicada — esto NO crea la Orden de Compra automáticamente.'],
            ['5. Crear la OC',         'Ve al módulo Órdenes de Compra y crea la orden usando los datos de la respuesta ganadora (proveedor y precios).'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      <ModalNuevaRFQ
        open={modal}
        onClose={() => setModal(false)}
        productos={productos}
        saving={crearCotizacion.isPending}
        onSave={handleCrear}
      />

      {editando && (
        <ModalEditarCotizacion
          cotiz={editando}
          saving={actualizarCotizacion.isPending}
          onClose={() => setEditando(null)}
          onSave={handleEditar}
        />
      )}

      {shareRFQ && (() => {
        const provSel = proveedores.find(p => p.id === provDestId)
        const mensaje = `Estimado proveedor, le enviamos la Solicitud de Cotización ${shareRFQ.numero}. Por favor revisar los ítems adjuntos y enviarnos su mejor oferta.`
        return (
          <Modal open title={`PDF / Compartir — ${shareRFQ.numero}`} onClose={() => setShareRFQ(null)} size="sm"
            footer={<Btn variant="secondary" onClick={() => setShareRFQ(null)}>Cerrar</Btn>}>
            <Field label="Proveedor destinatario" hint="Elige a quién enviarle esta RFQ — puedes repetir el envío para varios proveedores">
              <Select value={provDestId} onChange={e => setProvDestId(e.target.value)}>
                <option value="">Sin seleccionar (compartir genérico)</option>
                {proveedores.filter(p => p.activo).map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
              </Select>
            </Field>
            <PdfSharePanel
              tipo="Solicitud de Cotización"
              numero={shareRFQ.numero}
              onClose={() => setShareRFQ(null)}
              onPrint={() => imprimirRFQ({ cotiz: shareRFQ, productos, config: pdfConfig })}
              getHtml={() => armarHtmlRFQ({ cotiz: shareRFQ, productos, config: pdfConfig })}
              asunto={`Solicitud de Cotización ${shareRFQ.numero}`}
              empresaNombre={pdfConfig.empresa}
              destinatarios={provSel ? [{
                label: 'Proveedor',
                nombre: provSel.razonSocial,
                email: provSel.email || undefined,
                whatsapp: `https://wa.me/${(provSel.telefono || '').replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`,
                mensaje: 'Le solicitamos su mejor cotización para los productos detallados en el documento adjunto. Agradeceremos remitirnos su propuesta de precios y condiciones a la brevedad.',
              }] : null}
              extra={!provSel ? {
                whatsapp: `https://wa.me/?text=${encodeURIComponent(mensaje)}`,
                mailto: `mailto:?subject=${encodeURIComponent(`Solicitud de Cotización ${shareRFQ.numero}`)}&body=${encodeURIComponent(`Estimado Proveedor,\n\nAdjuntamos la Solicitud de Cotización ${shareRFQ.numero}.\n\nQuedamos a la espera de su respuesta.`)}`,
              } : null}
            />
          </Modal>
        )
      })()}

      {detalle && (
        <ModalDetalleRFQ
          cotiz={detalle}
          productos={productos}
          proveedores={proveedores}
          simboloMoneda={simboloMoneda}
          onClose={() => setDetalle(null)}
          saving={agregarResp.isPending || marcarGanadora.isPending}
          onAgregarRespuesta={respForm => handleAgregarRespuesta(detalle, respForm)}
          onMarcarGanadora={resp => handleMarcarGanadora(detalle, resp)}
        />
      )}
    </div>
  )
}

/* ── Modal Nueva RFQ ─────────────────────────────── */
function ModalNuevaRFQ({ open, onClose, productos, saving, onSave }) {
  const [form,  setForm]  = useState({ fechaVencimiento: '', notas: '' })
  const [items, setItems] = useState([])
  const [ni,    setNi]    = useState({ productoId: '', cantidad: '' })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function addItem() {
    if (!ni.productoId || !ni.cantidad) return
    if (items.find(i => i.productoId === ni.productoId)) return
    const prod = productos.find(p => p.id === ni.productoId)
    setItems(prev => [...prev, { productoId: ni.productoId, descripcion: prod?.nombre || '', cantidad: +ni.cantidad }])
    setNi({ productoId: '', cantidad: '' })
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva Solicitud de Cotización (RFQ)" size="lg"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={!items.length || saving}
          onClick={() => onSave({ ...form, items })}>
          {saving ? 'Creando...' : 'Crear RFQ'}
        </Btn>
      </>}>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Fecha vencimiento" hint="Límite para recibir respuestas">
          <Input type="date" value={form.fechaVencimiento} onChange={e => f('fechaVencimiento', e.target.value)}/>
        </Field>
        <Field label="Notas / Especificaciones">
          <Input value={form.notas} onChange={e => f('notas', e.target.value)} placeholder="Condiciones especiales..."/>
        </Field>
      </div>

      <div className="text-[13px] font-semibold text-[#e8edf2]">Productos a cotizar</div>
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex-2 min-w-50">
          <Field label="Producto">
            <Select value={ni.productoId} onChange={e => setNi(p => ({ ...p, productoId: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {productos.filter(p => p.estado === 'Activo' && !items.find(i => i.productoId === p.id)).map(p => (
                <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex-1 min-w-25">
          <Field label="Cantidad">
            <Input type="number" value={ni.cantidad} onChange={e => setNi(p => ({ ...p, cantidad: e.target.value }))} min="1"/>
          </Field>
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
    </Modal>
  )
}

/* ── Modal Detalle RFQ ───────────────────────────── */
function ModalDetalleRFQ({ cotiz, productos, proveedores, simboloMoneda, onClose, saving, onAgregarRespuesta, onMarcarGanadora }) {
  const [tabResp,   setTabResp]   = useState(false)
  const [respForm,  setRespForm]  = useState(null)

  function initRespForm() {
    setRespForm({
      proveedorId: '',
      items: (cotiz.items || []).map(i => ({ productoId: i.productoId, precioUnitario: '', subtotal: 0 })),
      tiempoEntrega: '', notas: '',
    })
    setTabResp(true)
  }

  function calcTotal(items) {
    return items.reduce((s, i) => {
      const cant = cotiz.items?.find(x => x.productoId === i.productoId)?.cantidad || 0
      return s + (+i.precioUnitario * cant)
    }, 0)
  }

  function updatePrecio(productoId, precio) {
    const cant = cotiz.items?.find(i => i.productoId === productoId)?.cantidad || 0
    setRespForm(prev => {
      const items = prev.items.map(i => i.productoId === productoId
        ? { ...i, precioUnitario: precio, subtotal: +(+precio * cant).toFixed(2) }
        : i
      )
      return { ...prev, items }
    })
  }

  const provNombre = id => proveedores.find(p => p.id === id)?.razonSocial || id

  return (
    <Modal open title={`Cotización ${cotiz.numero}`} onClose={onClose} size="xl"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
        {!tabResp && cotiz.estado !== 'ADJUDICADA' && cotiz.estado !== 'CANCELADA' && (
          <Btn variant="primary" onClick={initRespForm}><Plus size={13}/> Registrar Respuesta</Btn>
        )}
      </>}>

      {/* Info general */}
      <div className="grid grid-cols-3 gap-3">
        {[
          ['N° RFQ',      cotiz.numero],
          ['Estado',      null],
          ['Fecha',       formatDate(cotiz.fecha)],
          ['Vence',       formatDate(cotiz.fechaVencimiento)],
          ['Ítems',       cotiz.items?.length],
          ['Respuestas',  cotiz.respuestas?.length || 0],
        ].map(([k, v]) => (
          <div key={k} className="bg-[#1a2230] rounded-lg px-3.5 py-2.5">
            <div className="text-[11px] text-[#5f6f80] mb-0.5">{k}</div>
            <div className="text-[13px] font-medium text-[#e8edf2]">
              {k === 'Estado'
                ? <Badge variant={ESTADOS_COT[cotiz.estado]?.color}>{ESTADOS_COT[cotiz.estado]?.label}</Badge>
                : v}
            </div>
          </div>
        ))}
      </div>

      {/* Ítems */}
      <div className="text-[13px] font-semibold text-[#e8edf2]">Ítems solicitados</div>
      <div className="overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full border-collapse text-[13px]">
          <thead><tr>
            {['Producto', 'Cantidad'].map(h => (
              <th key={h} className="bg-[#1a2230] px-3.5 py-2 text-left text-[11px] font-semibold text-[#5f6f80] uppercase border-b border-white/8">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {(cotiz.items || []).map((it, i) => {
              const p = productos.find(x => x.id === it.productoId)
              return (
                <tr key={i} className="border-b border-white/6 last:border-0">
                  <td className="px-3.5 py-2 font-medium text-[#e8edf2]">{p?.nombre || it.descripcion}</td>
                  <td className="px-3.5 py-2 font-mono text-[12px] text-[#9ba8b6]">{it.cantidad} {p?.unidadMedida}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Respuestas */}
      {(cotiz.respuestas?.length > 0) && (
        <>
          <div className="text-[13px] font-semibold text-[#e8edf2]">Respuestas de proveedores</div>
          <div className="flex flex-col gap-3">
            {cotiz.respuestas.map((resp, ri) => (
              <div key={resp.id || ri} className={`p-4 rounded-xl border ${resp.ganadora ? 'border-[#00c896]/40 bg-[#00c896]/5' : 'border-white/8 bg-[#1a2230]'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-[#e8edf2]">{provNombre(resp.proveedorId)}</div>
                    <div className="text-[11px] text-[#5f6f80] mt-0.5">
                      Respondido: {formatDate(resp.fecha)} · Entrega: {resp.tiempoEntrega} días
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {resp.ganadora && <Badge variant="teal">Ganadora</Badge>}
                    <div className="text-[16px] font-semibold text-[#00c896]">{formatCurrency(resp.total, simboloMoneda)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {(resp.items || []).map((it, ii) => {
                    const p    = productos.find(x => x.id === it.productoId)
                    const cant = cotiz.items?.find(i => i.productoId === it.productoId)?.cantidad || 0
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
                  <Btn variant="primary" size="sm" disabled={saving} onClick={() => onMarcarGanadora(resp)}>
                    <CheckCircle size={13}/> Marcar ganadora → crear OC
                  </Btn>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Form agregar respuesta */}
      {tabResp && respForm && (
        <>
          <div className="h-px bg-white/8"/>
          <div className="text-[13px] font-semibold text-[#e8edf2]">Registrar respuesta de proveedor</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Field label="Proveedor *">
              <Select value={respForm.proveedorId} onChange={e => setRespForm(p => ({ ...p, proveedorId: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
              </Select>
            </Field>
            <Field label="Plazo entrega (días)">
              <Input type="number" value={respForm.tiempoEntrega} onChange={e => setRespForm(p => ({ ...p, tiempoEntrega: +e.target.value }))} min="0"/>
            </Field>
            <Field label="Notas">
              <Input value={respForm.notas} onChange={e => setRespForm(p => ({ ...p, notas: e.target.value }))} placeholder="Condiciones..."/>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {respForm.items.map(item => {
              const prod = productos.find(p => p.id === item.productoId)
              const cant = cotiz.items?.find(i => i.productoId === item.productoId)?.cantidad || 0
              return (
                <div key={item.productoId} className="bg-[#1a2230] rounded-lg p-3">
                  <div className="text-[12px] font-medium text-[#e8edf2] mb-2">{prod?.nombre} × {cant}</div>
                  <Field label="Precio unitario">
                    <Input type="number" value={item.precioUnitario} onChange={e => updatePrecio(item.productoId, e.target.value)} min="0" step="0.01"/>
                  </Field>
                  {item.subtotal > 0 && <div className="text-[11px] text-[#00c896] mt-1 font-mono">Subtotal: {formatCurrency(item.subtotal, simboloMoneda)}</div>}
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-right">
              <div className="text-[11px] text-[#5f6f80]">Total cotizado</div>
              <div className="text-[18px] font-semibold text-[#00c896]">{formatCurrency(calcTotal(respForm.items), simboloMoneda)}</div>
            </div>
            <div className="flex gap-2">
              <Btn variant="secondary" onClick={() => setTabResp(false)}>Cancelar</Btn>
              <Btn variant="primary" disabled={!respForm.proveedorId || saving}
                onClick={() => onAgregarRespuesta(respForm)}>
                <CheckCircle size={13}/> {saving ? 'Guardando...' : 'Guardar Respuesta'}
              </Btn>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}

/* ── Modal Editar Cotización ─────────────────────── */
// UpdateCotizacionDto: fechaVencimiento?, notas?, estado?: 'ENVIADA'|'CANCELADA'
function ModalEditarCotizacion({ cotiz, saving, onClose, onSave }) {
  const [form, setForm] = useState({ fechaVencimiento: '', notas: '', estado: '' })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    setForm({
      // `fechaVencimiento` llega del backend como datetime ISO completo — un
      // <input type="date"> solo acepta 'YYYY-MM-DD' exacto, si no se muestra en blanco.
      fechaVencimiento: cotiz.fechaVencimiento?.split('T')[0] || '',
      notas:            cotiz.notas || '',
      estado:           cotiz.estado || '',
    })
  }, [cotiz])

  // Solo estos estados son enviables via UpdateCotizacionDto
  const estadosEditables = cotiz.estado === 'BORRADOR'
    ? [['BORRADOR', 'Borrador (sin cambio)'], ['ENVIADA', 'Enviada → enviar a proveedores']]
    : cotiz.estado === 'ENVIADA'
      ? [['ENVIADA', 'Enviada'], ['CANCELADA', 'Cancelada']]
      : [[cotiz.estado, ESTADOS_COT[cotiz.estado]?.label || cotiz.estado]]

  return (
    <Modal open title={`Editar RFQ — ${cotiz.numero}`} onClose={onClose} size="sm"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={saving}
          onClick={() => onSave({ id: cotiz.id, ...form })}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Btn>
      </>}>
      <Field label="Estado">
        <Select value={form.estado} onChange={e => f('estado', e.target.value)}>
          {estadosEditables.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
      </Field>
      <Field label="Fecha vencimiento">
        <Input type="date" value={form.fechaVencimiento} onChange={e => f('fechaVencimiento', e.target.value)}/>
      </Field>
      <Field label="Notas">
        <Textarea className="min-h-13" value={form.notas} onChange={e => f('notas', e.target.value)} placeholder="Observaciones..."/>
      </Field>
    </Modal>
  )
}
