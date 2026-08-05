import { useState, useMemo } from 'react'
import { Plus, Search, Eye, Truck, Package, CheckCircle, X,
         ClipboardList, ArrowRight, FileText, MapPin, Printer, Download, CreditCard } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoyISO, generarNumDoc } from '../utils/helpers'
import { Modal, ConfirmDialog, Badge, Btn, Field, Input, Select, Textarea, Alert, DataTable } from '../components/ui/index'
import DireccionInput from '../components/ui/DireccionInput'
import PdfSharePanel from '../components/ui/PdfSharePanel'
import { imprimirGuia, imprimirPickingList } from '../utils/pdfTemplates'
import {
  useDespachosList, useCrearDespacho,
  useAprobarDespacho, useIniciarPicking, useMarcarListo, useDespachar,
  useEntregarDespacho, useCancelarDespacho, useAsignarGuia,
} from '../queries/despachos.queries'
import { usePickingByDespacho, useConfirmarLineaPicking } from '../queries/picking.queries'
import { useClientesList } from '../queries/clientes.queries'
import { useAlmacenesList } from '../queries/almacenes.queries'
import { useProductosList } from '../queries/productos.queries'
import { useInventarioList } from '../queries/inventario.queries'
import { useTransportistasList } from '../queries/transportistas.queries'
import { useCrearCxC } from '../queries/cuentas-por-cobrar.queries'
import { exportarDespachosXLSX } from '../utils/exportXLSX'
import { exportarDespachosPDF } from '../utils/exportPDF'

const FORMA_PAGO_META = {
  CONTADO: { label: 'Contado', color: 'neutral' },
  CREDITO: { label: 'Crédito', color: 'info' },
}

const ESTADOS = {
  PEDIDO:     { label:'Pedido',     color:'neutral', next:'APROBADO',   accion:'Aprobar',          icon:ClipboardList },
  APROBADO:   { label:'Aprobado',   color:'info',    next:'PICKING',    accion:'Iniciar Picking',  icon:Package       },
  PICKING:    { label:'Picking',    color:'warning', next:'LISTO',      accion:'Marcar Listo',     icon:Package       },
  LISTO:      { label:'Listo',      color:'teal',    next:'DESPACHADO', accion:'Despachar',        icon:Truck         },
  DESPACHADO: { label:'Despachado', color:'info',    next:'ENTREGADO',  accion:'Confirmar Entrega',icon:Truck         },
  ENTREGADO:  { label:'Entregado',  color:'success', next:null,         accion:null,               icon:CheckCircle   },
  CANCELADO:  { label:'Anulado',    color:'danger',  next:null,         accion:null,               icon:X             },
}

export default function Despachos() {
  const { toast, sesion } = useApp()
  const simboloMoneda = 'S/'

  const { data: despachos   = [], isLoading } = useDespachosList()
  const { data: clientesRaw = [] }            = useClientesList({ incluirInactivos: true })
  const { data: almacenes   = [] }            = useAlmacenesList()
  const { data: productosRaw= [] }            = useProductosList()
  const { data: inventario  = [] }            = useInventarioList()
  const { data: transportistas = [] }         = useTransportistasList()

  const crearDespacho    = useCrearDespacho()
  const aprobarDespacho    = useAprobarDespacho()
  const iniciarPicking     = useIniciarPicking()
  const marcarListo        = useMarcarListo()
  const despachar          = useDespachar()
  const entregarDespacho   = useEntregarDespacho()
  const cancelarDespacho   = useCancelarDespacho()
  const asignarGuia        = useAsignarGuia()
  const crearCxC           = useCrearCxC()

  const clientes = useMemo(() => clientesRaw.map(c => ({ ...c, activo: c.activo === true })), [clientesRaw])
  const productos = useMemo(() => {
    const stockMap = {}
    inventario.forEach(i => { stockMap[i.productoId] = (stockMap[i.productoId] || 0) + Number(i.cantidad || 0) })
    return productosRaw.map(p => ({ ...p, activo: p.estado === 'Activo', stockActual: stockMap[p.id] || 0 }))
  }, [productosRaw, inventario])

  const [modal,         setModal]         = useState(false)
  const [detalle,       setDetalle]       = useState(null)
  const [shareDoc,      setShareDoc]      = useState(null)
  const [confirmAnu,    setConfirmAnu]    = useState(null)
  const [evidenciaModal,setEvidenciaModal]= useState(null)
  const [guiaModal,     setGuiaModal]     = useState(null)
  const [pickingModal,  setPickingModal]  = useState(null)
  const [cxcModal,      setCxcModal]      = useState(null)
  const [busqueda,      setBusqueda]      = useState('')
  const [filtEst,       setFiltEst]       = useState('')
  const [filtAlm,       setFiltAlm]       = useState('')
  const [sortConfig,    setSortConfig]    = useState({ key:'fecha', direction:'desc' })

  const handleSort = key => setSortConfig(s => ({ key, direction: s.key === key && s.direction === 'asc' ? 'desc' : 'asc' }))

  const cliMap = useMemo(() => new Map(clientes.map(c => [c.id, c])), [clientes])
  const almMap = useMemo(() => new Map(almacenes.map(a => [a.id, a])), [almacenes])
  const cliNombre = id => cliMap.get(id)?.razonSocial || '—'
  const almNombre = id => almMap.get(id)?.nombre     || '—'

  const filtered = useMemo(() => {
    let d = [...despachos]
    if (filtEst)  d = d.filter(x => x.estado === filtEst)
    if (filtAlm)  d = d.filter(x => x.almacenId === filtAlm)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(x =>
        x.numero?.toLowerCase().includes(q) ||
        cliNombre(x.clienteId).toLowerCase().includes(q) ||
        x.guiaNumero?.toLowerCase().includes(q)
      )
    }
    d.sort((a, b) => {
      let aV = sortConfig.key === 'cliente' ? cliNombre(a.clienteId) : (a[sortConfig.key] || '')
      let bV = sortConfig.key === 'cliente' ? cliNombre(b.clienteId) : (b[sortConfig.key] || '')
      if (typeof aV === 'string') { aV = aV.toLowerCase(); bV = bV.toLowerCase() }
      if (aV < bV) return sortConfig.direction === 'asc' ? -1 : 1
      if (aV > bV) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return d
  }, [despachos, filtEst, filtAlm, busqueda, sortConfig, cliNombre])

  const kpis = useMemo(() => ({
    pedidos:    despachos.filter(d => d.estado === 'PEDIDO').length,
    enProceso:  despachos.filter(d => ['APROBADO','PICKING','LISTO'].includes(d.estado)).length,
    despachados:despachos.filter(d => d.estado === 'DESPACHADO').length,
    entregados: despachos.filter(d => d.estado === 'ENTREGADO').length,
    valorTotal: despachos.filter(d => d.estado !== 'CANCELADO').reduce((s, d) => s + Number(d.total || 0), 0),
  }), [despachos])

  async function avanzarEstado(des) {
    const sig = ESTADOS[des.estado]?.next
    if (!sig) return

    if (sig === 'ENTREGADO') {
      setEvidenciaModal(des)
      return
    }

    const mutations = {
      APROBADO:   () => aprobarDespacho.mutateAsync(des.id),
      PICKING:    () => iniciarPicking.mutateAsync(des.id),
      LISTO:      () => marcarListo.mutateAsync(des.id),
      DESPACHADO: () => despachar.mutateAsync({ id: des.id, guiaNumero: des.guiaNumero || generarNumDoc('GR') }),
    }
    const res = await mutations[sig]()
    if (res.error) { toast(res.error, 'error'); return }

    const msg = {
      APROBADO:   `${des.numero} aprobado`,
      PICKING:    `${des.numero} en preparación (Picking)`,
      LISTO:      `${des.numero} listo para despachar`,
      DESPACHADO: `Guía ${res.data?.guiaNumero || ''} emitida`,
    }
    toast(msg[sig] || 'Estado actualizado', 'success')

    if (detalle?.id === des.id) setDetalle(res.data)
  }

  async function confirmarEntrega(des, evidencia) {
    const res = await entregarDespacho.mutateAsync({
      id: des.id,
      receptorNombre: evidencia.receptor || undefined,
      evidenciaFoto:  evidencia.foto || undefined,
      evidenciaNotas: evidencia.notas || undefined,
    })
    if (res.error) { toast(res.error, 'error'); return }
    setEvidenciaModal(null)
    toast(`Despacho ${des.numero} entregado`, 'success')
    if (detalle?.id === des.id) setDetalle(null)
  }

  async function handleAsignarGuia(des, guiaNumero) {
    const res = await asignarGuia.mutateAsync({ id: des.id, guiaNumero })
    if (res.error) { toast(res.error, 'error'); return }
    setGuiaModal(null)
    toast(`Guía ${guiaNumero} asignada a ${des.numero}`, 'success')
    if (detalle?.id === des.id) setDetalle(res.data)
  }

  async function anular(des) {
    const res = await cancelarDespacho.mutateAsync(des.id)
    if (res.error) { toast(res.error, 'error'); return }
    toast(`Despacho ${des.numero} anulado`, 'warning')
    setConfirmAnu(null)
    if (detalle?.id === des.id) setDetalle(null)
  }

  async function handleGenerarCxC(des, datos) {
    const res = await crearCxC.mutateAsync({
      clienteId: des.clienteId,
      despachoId: des.id,
      monto: Number(des.total),
      diasCredito: datos.diasCredito,
      notas: datos.notas || undefined,
    })
    if (res.error) { toast(res.error, 'error'); return }
    setCxcModal(null)
    toast(`Cuenta por cobrar ${res.data?.numero || ''} generada`, 'success')
  }

  async function handleNuevo(data) {
    const res = await crearDespacho.mutateAsync(data)
    if (res.error) { toast(res.error, 'error'); return }
    setModal(false)
    toast(`Pedido registrado`, 'success')
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ['Pedidos',    kpis.pedidos,     '#5f6f80', ClipboardList],
          ['En proceso', kpis.enProceso,   '#f59e0b', Package      ],
          ['Despachados',kpis.despachados, '#3b82f6', Truck        ],
          ['Entregados', kpis.entregados,  '#22c55e', CheckCircle  ],
          ['Valor total',formatCurrency(kpis.valorTotal, simboloMoneda), '#00c896', null],
        ].map(([label, val, color, Icon]) => (
          <div key={label} className="relative bg-[#161d28] border border-white/8 rounded-xl px-4 py-3.5 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="flex items-center gap-1.5 mb-2">
              {Icon && <Icon size={12} style={{ color }} className="opacity-70"/>}
              <span className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">{label}</span>
            </div>
            <div className={`font-semibold text-[#e8edf2] ${typeof val === 'number' ? 'text-[28px]' : 'text-[17px] font-mono'}`}>{val}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl px-5 py-4">
        <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">Flujo de Despacho</div>
        <div className="flex items-center gap-1 flex-wrap">
          {Object.entries(ESTADOS).filter(([k]) => k !== 'CANCELADO').map(([key, meta], i, arr) => (
            <div key={key} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                filtEst === key
                  ? 'bg-[#00c896]/10 border-[#00c896]/40 text-[#00c896]'
                  : 'bg-[#1a2230] border-white/6 text-[#9ba8b6] hover:border-white/12 cursor-pointer'
              }`} onClick={() => setFiltEst(filtEst === key ? '' : key)}>
                <meta.icon size={11}/>
                {meta.label}
                <span className="text-[10px] opacity-60">({despachos.filter(d => d.estado === key).length})</span>
              </div>
              {i < arr.length - 1 && <ArrowRight size={12} className="text-[#5f6f80] shrink-0"/>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] whitespace-nowrap">
            Despachos {filtEst && <span className="ml-2 text-[#00c896]">— {ESTADOS[filtEst]?.label}</span>}
          </span>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={() => exportarDespachosXLSX(filtered, clientes, almacenes, transportistas, simboloMoneda)}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => exportarDespachosPDF(filtered, clientes, almacenes, transportistas, simboloMoneda, sesion?.nombre)}>
              <FileText size={13}/> PDF
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={13}/> Nuevo Pedido</Btn>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <Input className="pl-8 !py-[5px] text-[12px]" placeholder="Buscar número, cliente, guía..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <Select aria-label="Filtrar por estado" style={{ width:155, padding:'5px 8px', fontSize:12 }} value={filtEst} onChange={e => setFiltEst(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <Select aria-label="Filtrar por almacén" style={{ width:165, padding:'5px 8px', fontSize:12 }} value={filtAlm} onChange={e => setFiltAlm(e.target.value)}>
            <option value="">Todos los almacenes</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
          <span className="text-[11px] text-[#5f6f80] whitespace-nowrap">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          {(busqueda || filtEst || filtAlm) && (
            <Btn variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltEst(''); setFiltAlm('') }}><X size={12}/> Limpiar</Btn>
          )}
        </div>

        <DataTable
          loading={isLoading}
          rows={filtered}
          rowKey={des => des.id}
          onRowClick={des => setDetalle(des)}
          emptyIcon={Truck}
          emptyTitle="Sin despachos"
          emptyDescription="Registra el primer pedido de despacho."
          sortConfig={sortConfig}
          onSort={handleSort}
          columns={[
            { key:'numero', header:'N° Despacho', sortable:true, render: des => <span className="font-mono text-[12px] font-semibold text-[#00c896]">{des.numero}</span> },
            { key:'cliente', header:'Cliente', sortable:true, render: des => (
              <>
                <div className="font-medium text-[#e8edf2] max-w-[160px] truncate">{cliNombre(des.clienteId)}</div>
                <div className="text-[11px] text-[#5f6f80]">{almNombre(des.almacenId)}</div>
              </>
            ) },
            { key:'fecha', header:'Fecha Pedido', sortable:true, render: des => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatDate(des.fecha || des.createdAt)}</span> },
            { key:'fechaEntrega', header:'F. Entrega', sortable:true, render: des => <span className="font-mono text-[12px] text-[#9ba8b6]">{des.fechaEntrega ? formatDate(des.fechaEntrega) : '—'}</span> },
            { key:'items', header:'Ítems', render: des => <span className="text-[#9ba8b6]">{des.items?.length || des._count?.items || 0}</span> },
            { key:'total', header:'Total', sortable:true, render: des => <span className="font-mono text-[12px] font-semibold">{formatCurrency(Number(des.total || 0), simboloMoneda)}</span> },
            { key:'guiaNumero', header:'Guía', sortable:true, render: des => <span className="font-mono text-[12px] text-[#9ba8b6]">{des.guiaNumero || '—'}</span> },
            { key:'estado', header:'Estado', sortable:true, render: des => {
              const estadoMeta = ESTADOS[des.estado] || ESTADOS.PEDIDO
              const EstIcon = estadoMeta.icon
              return <Badge variant={estadoMeta.color}><EstIcon size={9}/> {estadoMeta.label}</Badge>
            } },
            { key:'acciones', header:'Acciones', stopPropagation:true, render: des => {
              const estadoMeta = ESTADOS[des.estado] || ESTADOS.PEDIDO
              return (
                <div className="flex gap-1 items-center">
                  <Btn variant="ghost" size="icon" title="Ver detalle" onClick={() => setDetalle(des)}><Eye size={13}/></Btn>
                  {estadoMeta.next && (
                    <Btn variant="primary" size="sm" onClick={() => des.estado === 'PICKING' ? setPickingModal(des) : avanzarEstado(des)}>{estadoMeta.accion}</Btn>
                  )}
                  {des.guiaNumero && (
                    <Btn variant="ghost" size="icon" title="PDF / Compartir" className="text-[#00c896]" onClick={() => setShareDoc(des)}>
                      <FileText size={13}/>
                    </Btn>
                  )}
                  {!des.guiaNumero && ['DESPACHADO','ENTREGADO'].includes(des.estado) && (
                    <Btn variant="ghost" size="icon" title="Asignar guía de remisión" className="text-amber-400" onClick={() => setGuiaModal(des)}>
                      <FileText size={13}/>
                    </Btn>
                  )}
                  {des.estado === 'DESPACHADO' && (
                    <Btn variant="ghost" size="icon" title="Registrar entrega" className="text-green-400" onClick={() => setEvidenciaModal(des)}>
                      <CheckCircle size={13}/>
                    </Btn>
                  )}
                  {['DESPACHADO','ENTREGADO'].includes(des.estado) && des.formaPago !== 'CONTADO' && (
                    <Btn variant="ghost" size="icon" title="Generar Cuenta por Cobrar" className="text-[#00c896]" onClick={() => setCxcModal(des)}>
                      <CreditCard size={13}/>
                    </Btn>
                  )}
                  {['APROBADO','PICKING'].includes(des.estado) && (
                    <Btn variant="ghost" size="icon" title="Picking List" className="text-amber-400"
                      onClick={() => imprimirPickingList({ des, cliente: cliMap.get(des.clienteId), productos, almacen: almMap.get(des.almacenId), config: null, sesion })}>
                      <Printer size={13}/>
                    </Btn>
                  )}
                  {!['ENTREGADO','CANCELADO','DESPACHADO'].includes(des.estado) && (
                    <Btn variant="ghost" size="icon" title="Anular" className="text-red-400" onClick={() => setConfirmAnu(des)}>
                      <X size={13}/>
                    </Btn>
                  )}
                </div>
              )
            } },
          ]}
        />
      </div>

      <ModalNuevoPedido
        open={modal} onClose={() => setModal(false)} onSave={handleNuevo}
        productos={productos} clientes={clientes} almacenes={almacenes} transportistas={transportistas}
        simboloMoneda={simboloMoneda} saving={crearDespacho.isPending}/>

      {detalle && (
        <ModalDetalle
          des={detalle} productos={productos} clientes={clientes} almacenes={almacenes}
          simboloMoneda={simboloMoneda} onClose={() => setDetalle(null)}
          onAvanzar={() => detalle.estado === 'PICKING' ? setPickingModal(detalle) : avanzarEstado(detalle)}
          onAnular={() => setConfirmAnu(detalle)}/>
      )}

      {shareDoc && (
        <Modal open title={`PDF / Compartir — ${shareDoc.guiaNumero}`} onClose={() => setShareDoc(null)} size="sm"
          footer={<Btn variant="secondary" onClick={() => setShareDoc(null)}>Cerrar</Btn>}>
          <PdfSharePanel
            tipo="Guía de Remisión" numero={shareDoc.guiaNumero}
            onClose={() => setShareDoc(null)}
            onPrint={() => imprimirGuia({ des: shareDoc, cliente: cliMap.get(shareDoc.clienteId), productos, config: null })}
            extra={{
              whatsapp: `https://wa.me/${cliMap.get(shareDoc.clienteId)?.telefono?.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(`Estimado cliente, adjunto la Guía de Remisión ${shareDoc.guiaNumero}. Por favor confirmar recepción.`)}`,
              mailto: `mailto:${cliMap.get(shareDoc.clienteId)?.email||''}?subject=${encodeURIComponent(`Guía de Remisión ${shareDoc.guiaNumero}`)}&body=${encodeURIComponent(`Estimado cliente,\n\nAdjunto la Guía de Remisión ${shareDoc.guiaNumero} por un total de ${formatCurrency(Number(shareDoc.total||0), simboloMoneda)}.\n\nQuedamos a su disposición.`)}`,
            }}
          />
        </Modal>
      )}

      <ConfirmDialog open={!!confirmAnu} onClose={() => setConfirmAnu(null)} onConfirm={() => anular(confirmAnu)} danger
        title="Anular despacho" message={`¿Anular el despacho ${confirmAnu?.numero}? Esta acción no se puede deshacer.`}/>

      {evidenciaModal && (
        <ModalEvidencia des={evidenciaModal} onClose={() => setEvidenciaModal(null)}
          onConfirm={evidencia => confirmarEntrega(evidenciaModal, evidencia)}/>
      )}

      {guiaModal && (
        <ModalAsignarGuia des={guiaModal} onClose={() => setGuiaModal(null)}
          onSave={guiaNumero => handleAsignarGuia(guiaModal, guiaNumero)}
          saving={asignarGuia.isPending}/>
      )}

      {cxcModal && (
        <ModalGenerarCxC des={cxcModal} simboloMoneda={simboloMoneda} onClose={() => setCxcModal(null)}
          onSave={datos => handleGenerarCxC(cxcModal, datos)}
          saving={crearCxC.isPending}/>
      )}

      {pickingModal && (
        <ModalPicking despacho={pickingModal} onClose={() => setPickingModal(null)}
          onListo={() => {
            toast(`${pickingModal.numero} listo para despachar`, 'success')
            if (detalle?.id === pickingModal.id) setDetalle(null)
            setPickingModal(null)
          }}/>
      )}

      {/* Guía de uso */}
      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Despachos?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
          {[
            ['1. Pedido',     'Se registra la solicitud del cliente: qué productos, qué cantidades y dirección de entrega.'],
            ['2. Aprobado',   'Un supervisor aprueba el pedido antes de preparar.'],
            ['3. Picking',    'El almacenero prepara físicamente los productos.'],
            ['4. Listo',      'Picking 100% completo y empaque confirmado — pasa a Listo automáticamente en cuanto se cumplen ambas condiciones (en cualquier orden). Si tu operación no usa empaque formal, "Marcar Listo" en Despachos sigue disponible con solo el picking completo.'],
            ['5. Despachado', 'Se emite la Guía de Remisión y el stock se descuenta.'],
            ['6. Entregado',  'El cliente confirma la recepción. El ciclo se cierra.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Modal Nuevo Pedido ────────────────────────────────────
export function ModalNuevoPedido({ open, onClose, onSave, productos, clientes, almacenes, transportistas=[], simboloMoneda, saving }) {
  const initForm = { clienteId:'', almacenId: almacenes[0]?.id || '', fecha: fechaHoyISO(), fechaEntrega:'', transportistaId:'', direccionEntrega:'', observaciones:'', formaPago:'CREDITO' }
  const [form, setForm]   = useState(initForm)
  const [items, setItems] = useState([])
  const [ni, setNi]       = useState({ productoId:'', cantidad:'', precioVenta:'' })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useMemo(() => {
    if (open) {
      setForm({ ...initForm, almacenId: almacenes[0]?.id || '' })
      setItems([])
      setNi({ productoId:'', cantidad:'', precioVenta:'' })
    }
  }, [open, almacenes]) // eslint-disable-line

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
  const igv      = +(subtotal * 0.18).toFixed(2)
  const total    = +(subtotal + igv).toFixed(2)

  function addItem() {
    if (!ni.productoId || !ni.cantidad || !ni.precioVenta) return
    if (items.find(i => i.productoId === ni.productoId)) return
    const prod = productos.find(p => p.id === ni.productoId)
    setItems(prev => [...prev, {
      productoId:   ni.productoId,
      nombre:       prod?.nombre || '',
      unidadMedida: prod?.unidadMedida || '',
      cantidad:     +ni.cantidad,
      precioVenta:  +ni.precioVenta,
      subtotal:     +(+ni.cantidad * +ni.precioVenta).toFixed(2),
    }])
    setNi({ productoId:'', cantidad:'', precioVenta:'' })
  }

  function handleSave() {
    if (!form.clienteId || !items.length) return
    onSave({
      clienteId:        form.clienteId,
      almacenId:        form.almacenId,
      fecha:            form.fecha,
      fechaEntrega:     form.fechaEntrega || undefined,
      estado:           'PEDIDO',
      transportistaId:  form.transportistaId || undefined,
      direccionEntrega: form.direccionEntrega || undefined,
      observaciones:    form.observaciones  || undefined,
      formaPago:        form.formaPago,
      items: items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad, precioVenta: i.precioVenta })),
      subtotal, igv, total,
    })
  }

  const productosConStock = productos.filter(p => p.activo !== false && p.stockActual > 0 && !items.find(i => i.productoId === p.id))

  return (
    <Modal open={open} onClose={onClose} title="Nuevo Pedido de Despacho" size="xl"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" disabled={!form.clienteId || !items.length || saving} onClick={handleSave}><Truck size={13}/> {saving ? 'Registrando...' : 'Registrar Pedido'}</Btn></>}>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Cliente *">
          <Select value={form.clienteId} onChange={e => {
            const cli = clientes.find(c => c.id === e.target.value)
            f('clienteId', e.target.value)
            if (cli?.direccion) f('direccionEntrega', cli.direccion)
          }}>
            <option value="">Seleccionar cliente...</option>
            {clientes.filter(c => c.activo).map(c => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}
          </Select>
        </Field>
        <Field label="Almacén de despacho">
          <Select value={form.almacenId} onChange={e => f('almacenId', e.target.value)}>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Fecha pedido"><Input type="date" value={form.fecha} onChange={e => f('fecha', e.target.value)}/></Field>
        <Field label="Fecha entrega comprometida"><Input type="date" value={form.fechaEntrega} onChange={e => f('fechaEntrega', e.target.value)}/></Field>
        <Field label="Forma de pago">
          <Select value={form.formaPago} onChange={e => f('formaPago', e.target.value)}>
            <option value="CREDITO">Crédito</option>
            <option value="CONTADO">Contado</option>
          </Select>
        </Field>
      </div>

      <DireccionInput label="Dirección de entrega" value={form.direccionEntrega} onChange={v => f('direccionEntrega', v)} placeholder="Av. Principal 123, Distrito, Lima" required/>
      <Field label="Transportista / Carrier">
        <Select value={form.transportistaId} onChange={e => f('transportistaId', e.target.value)}>
          <option value="">Sin asignar (se puede asignar al armar la Ruta)</option>
          {transportistas.filter(t => t.activo !== false).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </Select>
      </Field>

      <div className="text-[13px] font-semibold text-[#e8edf2]">Productos a despachar</div>
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex-[2] min-w-[180px]">
          <Field label="Producto">
            <Select value={ni.productoId} onChange={e => {
              const p = productos.find(x => x.id === e.target.value)
              setNi(prev => ({ ...prev, productoId: e.target.value, precioVenta: p?.precioVenta || '' }))
            }}>
              <option value="">Seleccionar...</option>
              {productosConStock.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.nombre} (Stock: {p.stockActual} {p.unidadMedida})</option>)}
            </Select>
          </Field>
        </div>
        <div className="flex-1 min-w-[90px]"><Field label="Cantidad"><Input type="number" value={ni.cantidad} onChange={e => setNi(p => ({ ...p, cantidad: e.target.value }))} min="0.01" step="0.01"/></Field></div>
        <div className="flex-1 min-w-[100px]"><Field label="Precio Venta"><Input type="number" value={ni.precioVenta} onChange={e => setNi(p => ({ ...p, precioVenta: e.target.value }))} min="0" step="0.01"/></Field></div>
        <Btn variant="secondary" onClick={addItem}>+ Agregar</Btn>
      </div>

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>{['Producto','Cantidad','P. Venta','Subtotal',''].map(h => <th key={h} className="bg-[#1a2230] px-3 py-2 text-left text-[11px] font-semibold text-[#5f6f80] uppercase border-b border-white/8">{h}</th>)}</tr></thead>
            <tbody>{items.map((it, i) => (
              <tr key={i} className="border-b border-white/6 last:border-0">
                <td className="px-3 py-2">{it.nombre}</td>
                <td className="px-3 py-2 font-mono text-[12px]">{it.cantidad} {it.unidadMedida}</td>
                <td className="px-3 py-2 font-mono text-[12px]">{formatCurrency(it.precioVenta, simboloMoneda)}</td>
                <td className="px-3 py-2 font-mono text-[12px] font-semibold">{formatCurrency(it.subtotal, simboloMoneda)}</td>
                <td className="px-3 py-2"><Btn variant="ghost" size="icon" className="text-red-400" onClick={() => setItems(p => p.filter((_,j) => j !== i))}><X size={12}/></Btn></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col items-end gap-1 text-[13px]">
        <div className="text-[#9ba8b6]">Subtotal: <span className="font-medium text-[#e8edf2]">{formatCurrency(subtotal, simboloMoneda)}</span></div>
        <div className="text-[#9ba8b6]">IGV (18%): <span className="font-medium text-[#e8edf2]">{formatCurrency(igv, simboloMoneda)}</span></div>
        <div className="text-[16px] font-semibold text-[#00c896]">Total: {formatCurrency(total, simboloMoneda)}</div>
      </div>

      <Field label="Observaciones">
        <Textarea className="min-h-14" value={form.observaciones} onChange={e => f('observaciones', e.target.value)} placeholder="Instrucciones especiales de entrega..."/>
      </Field>
    </Modal>
  )
}

// ── Modal Detalle Despacho ────────────────────────────────
function ModalDetalle({ des, productos, clientes, almacenes, simboloMoneda, onClose, onAvanzar, onAnular }) {
  const cli      = clientes.find(c => c.id === des.clienteId)
  const alm      = almacenes.find(a => a.id === des.almacenId)
  const estMeta  = ESTADOS[des.estado]
  const EstIcon  = estMeta?.icon || ClipboardList
  const prodMap  = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos])
  const pasos    = ['PEDIDO','APROBADO','PICKING','LISTO','DESPACHADO','ENTREGADO']
  const paso     = pasos.indexOf(des.estado)

  return (
    <Modal open title={`Despacho — ${des.numero}`} onClose={onClose} size="lg"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
        {!['ENTREGADO','CANCELADO'].includes(des.estado) && (
          <Btn variant="ghost" className="text-red-400 hover:text-red-300" onClick={onAnular}>Anular</Btn>
        )}
        {estMeta?.next && <Btn variant="primary" onClick={onAvanzar}><EstIcon size={14}/> {estMeta.accion}</Btn>}
      </>}>

      {des.estado !== 'CANCELADO' && (
        <div className="flex items-center gap-1 mb-2">
          {pasos.map((p, i) => (
            <div key={p} className="flex items-center gap-1 flex-1">
              <div className={`h-1.5 rounded-full flex-1 ${i <= paso ? 'bg-[#00c896]' : 'bg-white/8'}`}/>
              <div className={`w-2 h-2 rounded-full shrink-0 ${i <= paso ? 'bg-[#00c896]' : 'bg-white/8'}`}/>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <Badge variant={estMeta?.color || 'neutral'}><EstIcon size={9}/> {estMeta?.label}</Badge>
        {des.guiaNumero && <span className="font-mono text-[12px] text-[#00c896] font-semibold">{des.guiaNumero}</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          ['Cliente',        cli?.razonSocial || '—'],
          ['Almacén',        alm?.nombre || '—'],
          ['Fecha Pedido',   formatDate(des.fecha || des.createdAt)],
          ['Fecha Entrega',  des.fechaEntrega ? formatDate(des.fechaEntrega) : '—'],
          ['Fecha Despacho', des.fechaDespacho ? formatDate(des.fechaDespacho) : '—'],
          ['Transportista',  des.transportista?.nombre || '—'],
          ['Forma de pago',  (FORMA_PAGO_META[des.formaPago] || FORMA_PAGO_META.CREDITO).label],
        ].map(([k, v]) => (
          <div key={k} className="bg-[#1a2230] rounded-lg px-3.5 py-2.5">
            <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">{k}</div>
            <div className="text-[13px] font-medium text-[#e8edf2]">{v}</div>
          </div>
        ))}
      </div>

      {des.direccionEntrega && (
        <div className="flex items-start gap-2 px-3.5 py-2.5 bg-[#1a2230] rounded-lg mb-4">
          <MapPin size={13} className="text-[#5f6f80] mt-0.5 shrink-0"/>
          <span className="text-[12px] text-[#9ba8b6]">{des.direccionEntrega}</span>
        </div>
      )}

      {des.estado === 'ENTREGADO' && (des.receptorNombre || des.evidenciaFoto || des.evidenciaNotas) && (
        <div className="flex flex-col gap-2 px-3.5 py-3 bg-[#1a2230] rounded-lg mb-4">
          <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-wide">Evidencia de entrega</div>
          {des.receptorNombre && <div className="text-[12px] text-[#e8edf2]">Recibió: <span className="font-medium">{des.receptorNombre}</span></div>}
          {des.evidenciaNotas && <div className="text-[12px] text-[#9ba8b6]">{des.evidenciaNotas}</div>}
          {des.evidenciaFoto && <img src={des.evidenciaFoto} alt="Evidencia de entrega" className="w-full max-h-48 object-cover rounded-lg border border-white/8"/>}
        </div>
      )}

      {des.items?.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/8 mb-4">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>{['Producto','Cantidad','P. Venta','Subtotal'].map(h => <th key={h} className="bg-[#1a2230] px-3.5 py-2 text-left text-[11px] font-semibold text-[#5f6f80] uppercase border-b border-white/8">{h}</th>)}</tr></thead>
            <tbody>{des.items.map((it, i) => {
              const p = prodMap.get(it.productoId)
              return (
                <tr key={i} className="border-b border-white/6 last:border-0">
                  <td className="px-3.5 py-2"><div className="font-medium">{p?.nombre || it.productoId}</div><div className="text-[11px] text-[#5f6f80]">{p?.sku}</div></td>
                  <td className="px-3.5 py-2 font-mono text-[12px]">{it.cantidad} {p?.unidadMedida}</td>
                  <td className="px-3.5 py-2 font-mono text-[12px]">{formatCurrency(Number(it.precioVenta || 0), simboloMoneda)}</td>
                  <td className="px-3.5 py-2 font-mono text-[12px] font-semibold">{formatCurrency(Number(it.subtotal || 0), simboloMoneda)}</td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col items-end gap-1 text-[13px]">
        <span className="text-[#9ba8b6]">Subtotal: <span className="font-medium text-[#e8edf2]">{formatCurrency(Number(des.subtotal||0), simboloMoneda)}</span></span>
        <span className="text-[#9ba8b6]">IGV: <span className="font-medium text-[#e8edf2]">{formatCurrency(Number(des.igv||0), simboloMoneda)}</span></span>
        <span className="text-[16px] font-semibold text-[#00c896]">Total: {formatCurrency(Number(des.total||0), simboloMoneda)}</span>
      </div>
      {des.observaciones && (
        <div className="mt-3 px-3.5 py-2.5 bg-[#1a2230] rounded-lg text-[12px] text-[#9ba8b6]">
          <strong className="text-[#5f6f80]">Observaciones: </strong>{des.observaciones}
        </div>
      )}
    </Modal>
  )
}

// ── Modal Evidencia de Entrega ────────────────────────────
function ModalEvidencia({ des, onClose, onConfirm }) {
  const [foto,    setFoto]    = useState(null)
  const [preview, setPreview] = useState(null)
  const [receptor,setReceptor]= useState('')
  const [notas,   setNotas]   = useState('')

  function handleFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setFoto(ev.target.result); setPreview(ev.target.result) }
    reader.readAsDataURL(file)
  }

  return (
    <Modal open title={`Confirmar Entrega — ${des.numero}`} onClose={onClose} size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={() => onConfirm({ foto, receptor, notas })}><CheckCircle size={13}/> Confirmar Entrega</Btn></>}>

      <Alert variant="info">Registra la evidencia de entrega. La foto y nombre del receptor quedan guardados en el despacho.</Alert>

      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide">Foto de entrega (opcional)</label>
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Evidencia" className="w-full max-h-48 object-cover rounded-xl border border-white/8"/>
            <button onClick={() => { setFoto(null); setPreview(null) }} className="absolute top-2 right-2 w-7 h-7 bg-red-500/80 rounded-lg flex items-center justify-center text-white text-[12px] hover:bg-red-500">×</button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 h-32 bg-[#1a2230] border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-[#00c896]/40 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#5f6f80" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="12" cy="13" r="4" stroke="#5f6f80" strokeWidth="1.5"/></svg>
            <span className="text-[12px] text-[#5f6f80]">Toca para capturar foto</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto}/>
          </label>
        )}
      </div>

      <div className="flex flex-col gap-3.5">
        <div>
          <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Nombre del receptor *</label>
          <Input value={receptor} onChange={e => setReceptor(e.target.value)} placeholder="Nombre completo de quien recibe"/>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Observaciones de entrega</label>
          <Textarea className="min-h-14" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Condiciones del producto al entregar, incidencias, etc."/>
        </div>
      </div>

      <div className="px-3.5 py-2.5 bg-[#1a2230] rounded-lg text-[11px] text-[#5f6f80] flex items-start gap-2">
        <div className="w-1 h-1 rounded-full bg-[#00c896] mt-1.5 shrink-0"/>
        Al confirmar, el despacho pasará a estado ENTREGADO y se registrará la fecha y hora exacta de entrega.
      </div>
    </Modal>
  )
}

/** Asigna guiaNumero a despachos que salieron sin ella (p. ej. despachados vía Ruta, ver Transportes.jsx). */
export function ModalAsignarGuia({ des, onClose, onSave, saving }) {
  const [guiaNumero, setGuiaNumero] = useState(des.guiaNumero || generarNumDoc('GR'))

  return (
    <Modal open title={`Asignar Guía de Remisión — ${des.numero}`} onClose={onClose} size="sm"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" disabled={!guiaNumero.trim() || saving} onClick={() => onSave(guiaNumero.trim())}>{saving ? 'Guardando...' : 'Asignar Guía'}</Btn></>}>
      <Alert variant="info">Este despacho salió sin número de guía (habitual en despachos vía Ruta). Asígnale uno para poder emitir la GRE en Sunat.</Alert>
      <div>
        <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Número de guía *</label>
        <Input value={guiaNumero} onChange={e => setGuiaNumero(e.target.value)} placeholder="GR-00001"/>
      </div>
    </Modal>
  )
}

/** Genera una CxC vinculada a este despacho — atajo desde DESPACHADO/ENTREGADO en ventas a crédito. */
function ModalGenerarCxC({ des, simboloMoneda, onClose, onSave, saving }) {
  const [diasCredito, setDiasCredito] = useState(30)
  const [notas, setNotas] = useState('')

  return (
    <Modal open title={`Generar Cuenta por Cobrar — ${des.numero}`} onClose={onClose} size="sm"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={saving} onClick={() => onSave({ diasCredito: Number(diasCredito), notas })}>
          <CreditCard size={13}/> {saving ? 'Generando...' : 'Generar CxC'}
        </Btn>
      </>}>
      <Alert variant="info">Se creará una cuenta por cobrar por el total del despacho, vinculada a {des.numero}.</Alert>
      <div className="bg-[#1a2230] rounded-lg px-3.5 py-2.5">
        <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">Monto</div>
        <div className="text-[16px] font-mono font-semibold text-[#00c896]">{formatCurrency(Number(des.total || 0), simboloMoneda)}</div>
      </div>
      <Field label="Días de crédito">
        <Input type="number" min="0" step="1" value={diasCredito} onChange={e => setDiasCredito(e.target.value)}/>
      </Field>
      <Field label="Notas">
        <Textarea className="min-h-14" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones de la cuenta..."/>
      </Field>
    </Modal>
  )
}

// ── Modal Picking — ejecución de la lista de preparación ──
export function ModalPicking({ despacho, onClose, onListo }) {
  const { toast } = useApp()
  const { data: lista, isLoading } = usePickingByDespacho(despacho.id)
  const confirmarLinea = useConfirmarLineaPicking()
  const marcarListo    = useMarcarListo()
  const [cantidades, setCantidades] = useState({})

  const completa = lista?.estado === 'COMPLETADA'

  async function confirmar(linea) {
    const cantidad = cantidades[linea.id] ?? Number(linea.cantidadRequerida)
    const res = await confirmarLinea.mutateAsync({ despachoId: despacho.id, lineaId: linea.id, cantidad })
    if (res.error) { toast(res.error, 'error'); return }
  }

  async function handleMarcarListo() {
    const res = await marcarListo.mutateAsync(despacho.id)
    if (res.error) { toast(res.error, 'error'); return }
    onListo()
  }

  return (
    <Modal open title={`Picking — ${despacho.numero}`} onClose={onClose} size="lg"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
        <Btn variant="primary" disabled={!completa || marcarListo.isPending} onClick={handleMarcarListo}>
          <Package size={13}/> {marcarListo.isPending ? 'Guardando...' : 'Marcar Listo'}
        </Btn>
      </>}>

      <Alert variant={completa ? 'success' : 'info'}>
        {completa
          ? 'Todas las líneas fueron pickeadas. Ya puedes marcar el pedido como Listo para despachar.'
          : 'Confirma la cantidad realmente pickeada de cada producto. Debes completar el 100% de las líneas antes de poder marcar Listo — no se permite picking parcial.'}
      </Alert>

      {isLoading && <div className="text-center text-[#5f6f80] py-6 text-[12px]">Cargando lista de picking...</div>}

      {lista && (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {['Producto','Ubicación sugerida','Cant. Requerida','Cant. Pickeada','Estado',''].map(h => (
                <th key={h} className="bg-[#1a2230] px-3 py-2 text-left text-[11px] font-semibold text-[#5f6f80] uppercase border-b border-white/8">{h}</th>
              ))}
            </tr></thead>
            <tbody>{lista.lineas.map(linea => {
              const lineaCompleta = linea.estado === 'COMPLETA'
              return (
                <tr key={linea.id} className="border-b border-white/6 last:border-0">
                  <td className="px-3 py-2">
                    <div className="font-medium">{linea.producto?.nombre}</div>
                    <div className="text-[11px] text-[#5f6f80]">{linea.producto?.sku}</div>
                  </td>
                  <td className="px-3 py-2 text-[12px]">
                    {linea.ubicacion
                      ? <span className="inline-flex items-center gap-1 text-[#9ba8b6]"><MapPin size={11}/> {linea.ubicacion.codigo} <span className="text-[10px] text-[#5f6f80]">({linea.ubicacion.zona})</span></span>
                      : <span className="text-[#5f6f80]">Sin ubicar (stock general)</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-[12px]">{Number(linea.cantidadRequerida)} {linea.producto?.unidadMedida}</td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" max={Number(linea.cantidadRequerida)} step="0.01"
                      disabled={lineaCompleta}
                      aria-label={`Cantidad pickeada de ${linea.producto?.nombre || 'producto'}`}
                      className="w-24 px-2 py-1 bg-[#1e2835] border border-white/8 rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896] disabled:opacity-50 font-mono"
                      value={cantidades[linea.id] ?? Number(linea.cantidadRequerida)}
                      onChange={e => setCantidades(p => ({ ...p, [linea.id]: e.target.value === '' ? '' : +e.target.value }))}/>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={lineaCompleta ? 'success' : linea.estado === 'PARCIAL' ? 'warning' : 'neutral'}>
                      {lineaCompleta && <CheckCircle size={9}/>} {linea.estado}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    {!lineaCompleta && (
                      <Btn variant="secondary" size="sm" disabled={confirmarLinea.isPending} onClick={() => confirmar(linea)}>
                        Confirmar
                      </Btn>
                    )}
                  </td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}
