import { useState, useMemo } from 'react'
import { Plus, Search, Eye, Truck, Package, CheckCircle, X,
         ClipboardList, ArrowRight, FileText, MapPin, MessageCircle, Mail, ChevronUp, ChevronDown, Printer } from 'lucide-react'

import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoy, generarNumDoc } from '../utils/helpers'
import { procesarSalida } from '../utils/valorizacion'
import * as storage from '../services/storage'
import { Modal, ConfirmDialog, EmptyState, Badge, Btn, Field, Alert } from '../components/ui/index'
import DireccionInput from '../components/ui/DireccionInput'
import PdfSharePanel from '../components/ui/PdfSharePanel'
import { imprimirGuia, imprimirPickingList } from '../utils/pdfTemplates'

const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'

// ── Metadatos por estado ─────────────────────────────────
const ESTADOS = {
  PEDIDO:     { label:'Pedido',     color:'neutral', next:'APROBADO',   accion:'Aprobar',     icon:ClipboardList },
  APROBADO:   { label:'Aprobado',   color:'info',    next:'PICKING',    accion:'Iniciar Picking', icon:Package   },
  PICKING:    { label:'Picking',    color:'warning', next:'LISTO',      accion:'Marcar Listo',icon:Package       },
  LISTO:      { label:'Listo',      color:'teal',    next:'DESPACHADO', accion:'Despachar',   icon:Truck         },
  DESPACHADO: { label:'Despachado', color:'info',    next:'ENTREGADO',  accion:'Confirmar Entrega', icon:Truck   },
  ENTREGADO:  { label:'Entregado',  color:'success', next:null,         accion:null,          icon:CheckCircle   },
  ANULADO:    { label:'Anulado',    color:'danger',  next:null,         accion:null,          icon:X             },
}

export default function Despachos() {
  const {
    despachos, productos, clientes, almacenes, sesion,
    recargarProductos, recargarMovimientos, recargarDespachos,
    toast, formulaValorizacion, simboloMoneda, config,
  } = useApp()

  const [modal,      setModal]      = useState(false)
  const [detalle,    setDetalle]    = useState(null)
  const [shareDoc,   setShareDoc]   = useState(null)
  const [confirmAnu, setConfirmAnu] = useState(null)
  const [evidenciaModal, setEvidenciaModal] = useState(null) // despacho para captura evidencia
  const [busqueda,   setBusqueda]   = useState('')
  const [filtEst,    setFiltEst]    = useState('')
  const [filtAlm,    setFiltAlm]    = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' })

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'
    setSortConfig({ key, direction })
  }

  const toISODate = (val) => {
    if (!val) return ''
    if (val instanceof Date) return val.toISOString().split('T')[0]
    const s = String(val).trim()
    if (s.includes('/')) {
      const parts = s.split('/')
      if (parts.length === 3) {
        const [d, m, y] = parts
        return y.length === 4 ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : `${d}-${m.padStart(2, '0')}-${y.padStart(2, '0')}`
      }
    }
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    return isoMatch ? isoMatch[0] : ''
  }


  const filtered = useMemo(() => {
    let d = [...despachos]
    if (filtEst)  d = d.filter(x => x.estado === filtEst)
    if (filtAlm)  d = d.filter(x => x.almacenId === filtAlm)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(x =>
        x.numero?.toLowerCase().includes(q) ||
        clientes.find(c => c.id === x.clienteId)?.razonSocial?.toLowerCase().includes(q) ||
        x.guiaNumero?.toLowerCase().includes(q)
      )
    }

    d.sort((a, b) => {
      let aV = a[sortConfig.key]
      let bV = b[sortConfig.key]

      if (sortConfig.key === 'fecha' || sortConfig.key === 'fechaEntrega') {
        aV = toISODate(a[sortConfig.key])
        bV = toISODate(b[sortConfig.key])
      } else if (sortConfig.key === 'cliente') {
        aV = clientes.find(x => x.id === a.clienteId)?.razonSocial || ''
        bV = clientes.find(x => x.id === b.clienteId)?.razonSocial || ''
      } else if (typeof aV === 'string') {
        aV = aV.toLowerCase()
        bV = bV.toLowerCase()
      }

      if (aV < bV) return sortConfig.direction === 'asc' ? -1 : 1
      if (aV > bV) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return d
  }, [despachos, filtEst, filtAlm, busqueda, clientes, sortConfig])


  const kpis = useMemo(() => ({
    pedidos:    despachos.filter(d => d.estado === 'PEDIDO').length,
    enProceso:  despachos.filter(d => ['APROBADO','PICKING','LISTO'].includes(d.estado)).length,
    despachados:despachos.filter(d => d.estado === 'DESPACHADO').length,
    entregados: despachos.filter(d => d.estado === 'ENTREGADO').length,
    valorTotal: despachos.filter(d => d.estado !== 'ANULADO').reduce((s, d) => s + (d.total || 0), 0),
  }), [despachos])

  const cliNombre = id => clientes.find(c => c.id === id)?.razonSocial || '—'
  const almNombre = id => almacenes.find(a => a.id === id)?.nombre     || '—'

  // ── Avanzar estado ──────────────────────────────────────
  function avanzarEstado(des) {
    const sig = ESTADOS[des.estado]?.next
    if (!sig) return

    const ahora = new Date().toISOString().split('T')[0]
    const actualizado = { ...des, estado: sig }

    // Al despachar: generar guía, descontar stock
    if (sig === 'DESPACHADO') {
      const guia = des.guiaNumero || generarNumDoc('GR', '001')
      actualizado.guiaNumero   = guia
      actualizado.fechaDespacho = ahora

      // Descontar stock por cada ítem
      let errStock = null
      des.items.forEach(item => {
        if (errStock) return
        const prod = storage.getProductoById(item.productoId).data
        if (!prod) return
        if (item.cantidad > prod.stockActual) {
          errStock = `Stock insuficiente para ${prod.nombre}. Disponible: ${prod.stockActual}`
          return
        }
        try {
          const res = procesarSalida(prod.batches || [], item.cantidad, formulaValorizacion)
          storage._actualizarBatchesProducto(prod.id, res.batches, prod.stockActual - item.cantidad)
          storage.registrarMovimiento({
            tipo: 'SALIDA', productoId: item.productoId, almacenId: des.almacenId,
            cantidad: item.cantidad, costoUnitario: res.costoUnitario, costoTotal: res.costoTotal,
            lote: '', fecha: ahora,
            motivo: `Despacho ${guia} — ${cliNombre(des.clienteId)}`,
            documento: guia, notas: '', formula: formulaValorizacion,
            usuarioId: sesion?.id || 'usr1',
          })
        } catch(e) {
          errStock = e.message
        }
      })

      if (errStock) { toast(errStock, 'error'); return }
      recargarProductos()
      recargarMovimientos()
      toast(`Guía ${guia} emitida — stock descontado`, 'success')
    }

    if (sig === 'ENTREGADO') {
      // Abrir modal de evidencia en vez de confirmar directo
      setEvidenciaModal(des)
      return
    }

    if (sig === 'PICKING') toast(`${des.numero} en preparación (Picking)`, 'info')
    if (sig === 'LISTO')   toast(`${des.numero} listo para despachar`, 'success')
    if (sig === 'APROBADO') toast(`${des.numero} aprobado`, 'success')

    storage.saveDespacho(actualizado)
    recargarDespachos()
    if (detalle?.id === des.id) setDetalle(actualizado)
  }

  function confirmarEntrega(des, evidencia) {
    const ahora = new Date().toISOString().split('T')[0]
    storage.saveDespacho({
      ...des,
      estado: 'ENTREGADO',
      fechaEntregaReal: ahora,
      evidenciaFoto:    evidencia.foto     || null,
      evidenciaFirma:   evidencia.firma    || null,
      evidenciaNotas:   evidencia.notas    || '',
      receptorNombre:   evidencia.receptor || '',
    })
    recargarDespachos()
    setEvidenciaModal(null)
    toast(`Despacho ${des.numero} entregado con evidencia registrada`, 'success')
  }

  function anular(des) {
    storage.saveDespacho({ ...des, estado: 'ANULADO' })
    recargarDespachos()
    toast(`Despacho ${des.numero} anulado`, 'warning')
    setConfirmAnu(null)
    if (detalle?.id === des.id) setDetalle(null)
  }

  function handleNuevo(data) {
    storage.saveDespacho(data)
    recargarDespachos()
    toast(`Pedido ${data.numero} registrado`, 'success')
    setModal(false)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ['Pedidos',     kpis.pedidos,    '#5f6f80', ClipboardList],
          ['En proceso',  kpis.enProceso,  '#f59e0b', Package      ],
          ['Despachados', kpis.despachados,'#3b82f6', Truck        ],
          ['Entregados',  kpis.entregados, '#22c55e', CheckCircle  ],
          ['Valor total', formatCurrency(kpis.valorTotal, simboloMoneda), '#00c896', null],
        ].map(([label, val, color, Icon]) => (
          <div key={label} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-4 py-3.5 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="flex items-center gap-1.5 mb-2">
              {Icon && <Icon size={12} style={{ color }} className="opacity-70"/>}
              <span className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">{label}</span>
            </div>
            <div className={`font-semibold text-[#e8edf2] ${typeof val === 'number' ? 'text-[26px]' : 'text-[15px] font-mono'}`}>{val}</div>
          </div>
        ))}
      </div>

      {/* Flujo visual de estados */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4">
        <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">Flujo de Despacho</div>
        <div className="flex items-center gap-1 flex-wrap">
          {Object.entries(ESTADOS).filter(([k]) => k !== 'ANULADO').map(([key, meta], i, arr) => (
            <div key={key} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                filtEst === key
                  ? 'bg-[#00c896]/10 border-[#00c896]/40 text-[#00c896]'
                  : 'bg-[#1a2230] border-white/[0.06] text-[#9ba8b6] hover:border-white/[0.12] cursor-pointer'
              }`}
                onClick={() => setFiltEst(filtEst === key ? '' : key)}>
                <meta.icon size={11}/>
                {meta.label}
                <span className="text-[10px] opacity-60">
                  ({despachos.filter(d => d.estado === key).length})
                </span>
              </div>
              {i < arr.length - 1 && <ArrowRight size={12} className="text-[#5f6f80] shrink-0"/>}
            </div>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        {/* ── Fila 1: título + botón ── */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] whitespace-nowrap">
            Despachos
            {filtEst && <span className="ml-2 text-[#00c896]">— {ESTADOS[filtEst]?.label}</span>}
          </span>
          <Btn variant="primary" size="sm" onClick={() => setModal(true)}>
            <Plus size={13}/> Nuevo Pedido
          </Btn>
        </div>

        {/* ── Fila 2: buscador + filtros ── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Buscador — izquierda, flex-1 */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI + ' pl-8 !py-[5px] text-[12px]'} placeholder="Buscar número, cliente, guía..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          {/* Estado */}
          <select className={SEL} style={{width:155,padding:'5px 8px',fontSize:12}} value={filtEst} onChange={e=>setFiltEst(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {/* Almacén de despacho */}
          <select className={SEL} style={{width:165,padding:'5px 8px',fontSize:12}} value={filtAlm} onChange={e=>setFiltAlm(e.target.value)}>
            <option value="">Todos los almacenes</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          {/* Contador + limpiar */}
          <span className="text-[11px] text-[#5f6f80] whitespace-nowrap">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
          {(busqueda || filtEst || filtAlm) && (
            <Btn variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltEst(''); setFiltAlm('') }}>
              <X size={12}/> Limpiar
            </Btn>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {[
                { l: 'N° Despacho', k: 'numero' },
                { l: 'Cliente', k: 'cliente' },
                { l: 'Fecha Pedido', k: 'fecha' },
                { l: 'F. Entrega', k: 'fechaEntrega' },
                { l: 'Ítems' },
                { l: 'Total', k: 'total' },
                { l: 'Guía', k: 'guiaNumero' },
                { l: 'Estado', k: 'estado' },
                { l: 'Acciones' }
              ].map((h) => (
                <th key={h.l} 
                  className={`bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/[0.08] cursor-pointer hover:bg-white/[0.02] whitespace-nowrap`}
                  onClick={() => h.k && handleSort(h.k)}
                >
                  <div className="flex items-center gap-1.5">
                    {h.l}
                    {sortConfig.key === h.k && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                    )}
                  </div>
                </th>
              ))}
            </tr></thead>

            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9}>
                  <EmptyState icon={Truck} title="Sin despachos" description="Registra el primer pedido de despacho."/>
                </td></tr>
              )}
              {filtered.map(des => {
                const estadoMeta = ESTADOS[des.estado] || ESTADOS.PEDIDO
                const EstIcon    = estadoMeta.icon
                return (
                  <tr key={des.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3.5 py-2.5 font-mono text-[12px] font-semibold text-[#00c896]">{des.numero}</td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-medium text-[#e8edf2] max-w-[160px] truncate">{cliNombre(des.clienteId)}</div>
                      <div className="text-[11px] text-[#5f6f80]">{almNombre(des.almacenId)}</div>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(des.fecha)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(des.fechaEntrega) || '—'}</td>
                    <td className="px-3.5 py-2.5 text-center text-[#9ba8b6]">{des.items?.length || 0}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] font-semibold">{formatCurrency(des.total, simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{des.guiaNumero || '—'}</td>
                    <td className="px-3.5 py-2.5">
                      <Badge variant={estadoMeta.color}>
                        <EstIcon size={9}/> {estadoMeta.label}
                      </Badge>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex gap-1 items-center">
                        <Btn variant="ghost" size="icon" title="Ver detalle" onClick={() => setDetalle(des)}>
                          <Eye size={13}/>
                        </Btn>
                        {estadoMeta.next && (
                          <Btn variant="primary" size="sm" onClick={() => avanzarEstado(des)}>
                            {estadoMeta.accion}
                          </Btn>
                        )}
                        {des.guiaNumero && (
                          <Btn variant="ghost" size="icon" title="PDF / Compartir"
                            className="text-[#00c896] hover:text-[#009e76]"
                            onClick={() => setShareDoc(des)}>
                            <FileText size={13}/>
                          </Btn>
                        )}
                        {des.estado === 'DESPACHADO' && (
                          <Btn variant="ghost" size="icon" title="Registrar entrega con evidencia"
                            className="text-green-400 hover:text-green-300"
                            onClick={() => setEvidenciaModal(des)}>
                            <CheckCircle size={13}/>
                          </Btn>
                        )}
                        {['APROBADO','PICKING'].includes(des.estado) && (
                          <Btn variant="ghost" size="icon" title="Imprimir Picking List"
                            className="text-amber-400 hover:text-amber-300"
                            onClick={() => imprimirPickingList({
                              des,
                              cliente: clientes.find(c => c.id === des.clienteId),
                              productos,
                              almacen: almacenes.find(a => a.id === des.almacenId),
                              config,
                              sesion,
                            })}>
                            <Printer size={13}/>
                          </Btn>
                        )}
                        {!['ENTREGADO','ANULADO','DESPACHADO'].includes(des.estado) && (
                          <Btn variant="ghost" size="icon" title="Anular"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => setConfirmAnu(des)}>
                            <X size={13}/>
                          </Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modales */}
      <ModalNuevoPedido
        open={modal} onClose={() => setModal(false)} onSave={handleNuevo}
        productos={productos} clientes={clientes} almacenes={almacenes} simboloMoneda={simboloMoneda}
      />

      {detalle && (
        <ModalDetalle
          des={detalle} productos={productos} clientes={clientes} almacenes={almacenes}
          simboloMoneda={simboloMoneda} onClose={() => setDetalle(null)}
          onAvanzar={() => avanzarEstado(detalle)}
          onAnular={() => setConfirmAnu(detalle)}
        />
      )}

      {shareDoc && (
        <Modal open title={`PDF / Compartir — ${shareDoc.guiaNumero}`}
          onClose={() => setShareDoc(null)} size="sm"
          footer={<Btn variant="secondary" onClick={() => setShareDoc(null)}>Cerrar</Btn>}>
          <PdfSharePanel
            tipo="Guía de Remisión"
            numero={shareDoc.guiaNumero}
            onClose={() => setShareDoc(null)}
            onPrint={() => imprimirGuia({ des: shareDoc, cliente: clientes.find(c => c.id === shareDoc.clienteId), productos, config })}
            extra={{
              whatsapp: `https://wa.me/${clientes.find(c=>c.id===shareDoc.clienteId)?.telefono?.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(`Estimado cliente, adjunto la Guía de Remisión ${shareDoc.guiaNumero}. Por favor confirmar recepción.`)}`,
              mailto: `mailto:${clientes.find(c=>c.id===shareDoc.clienteId)?.email||''}?subject=${encodeURIComponent(`Guía de Remisión ${shareDoc.guiaNumero}`)}&body=${encodeURIComponent(`Estimado cliente,\n\nAdjunto la Guía de Remisión ${shareDoc.guiaNumero} por un total de ${formatCurrency(shareDoc.total, simboloMoneda)}.\n\nQuedamos a su disposición.\n\n${config?.empresa||''}`)}`,
            }}
          />
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirmAnu} onClose={() => setConfirmAnu(null)}
        onConfirm={() => anular(confirmAnu)} danger
        title="Anular despacho"
        message={`¿Anular el despacho ${confirmAnu?.numero}? Esta acción no se puede deshacer.`}
      />

      {evidenciaModal && (
        <ModalEvidencia
          des={evidenciaModal}
          onClose={() => setEvidenciaModal(null)}
          onConfirm={(evidencia) => confirmarEntrega(evidenciaModal, evidencia)}
        />
      )}

      {/* ── Panel explicativo ─────────────────────────────── */}
      <div className="bg-[#161d28] border border-[#00c896]/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00c896]/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[#00c896] text-[14px] font-bold">?</span>
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-[#e8edf2] mb-2">¿Para qué sirve la Gestión de Despachos?</div>
            <p className="text-[12px] text-[#9ba8b6] leading-relaxed mb-3">
              La <strong className="text-[#e8edf2]">Gestión de Despachos</strong> controla todo el ciclo de salida
              de mercadería hacia el cliente: desde que se registra el pedido hasta que se confirma la entrega.
              Garantiza que ningún despacho se pierda, que el stock se descuente en el momento correcto
              y que cada entrega quede documentada con su Guía de Remisión.
            </p>

            {/* Flujo explicado */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
              {[
                ['📋 1. Pedido',      'Se registra la solicitud del cliente: qué productos, qué cantidades, precio de venta y dirección de entrega. El stock NO se descuenta aún.'],
                ['✅ 2. Aprobado',    'Un supervisor o administrador aprueba el pedido. Confirma que los precios y condiciones son correctas antes de preparar.'],
                ['📦 3. Picking',     'El almacenero prepara físicamente los productos: los ubica, verifica cantidades y los deja listos para empacar. El stock sigue sin descontarse.'],
                ['🟢 4. Listo',       'La mercadería está empacada y lista en el área de despacho. Se puede asignar a una ruta de transporte.'],
                ['🚚 5. Despachado',  'Se emite la Guía de Remisión, el stock se descuenta del sistema y el pedido queda en tránsito hacia el cliente.'],
                ['🏁 6. Entregado',   'El cliente confirma la recepción. El ciclo se cierra y queda registrado con fecha y hora real de entrega.'],
              ].map(([t, d]) => (
                <div key={t} className="bg-[#1a2230] rounded-lg p-3">
                  <div className="text-[11px] font-semibold text-[#e8edf2] mb-1">{t}</div>
                  <div className="text-[11px] text-[#9ba8b6] leading-snug">{d}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {[
                ['💡 Stock seguro',      'El stock solo se descuenta al momento del despacho (paso 5), no al crear el pedido. Así evitas bloquear stock por pedidos que aún no están confirmados.'],
                ['📄 Guía de Remisión', 'Se genera automáticamente al despachar. Puedes imprimirla o enviarla por WhatsApp/correo al cliente directamente desde el sistema.'],
                ['🔗 Integrado',         'Cada despacho está conectado con el Inventario, Transportes y el Kardex. Cuando asignas una ruta, el seguimiento de entrega se gestiona desde el módulo de Transportes.'],
              ].map(([t, d]) => (
                <div key={t} className="bg-[#1a2230] rounded-lg p-3 border-l-2 border-[#00c896]/30">
                  <div className="text-[11px] font-semibold text-[#e8edf2] mb-1">{t}</div>
                  <div className="text-[11px] text-[#9ba8b6] leading-snug">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

// ── Modal Nuevo Pedido ────────────────────────────────────
function ModalNuevoPedido({ open, onClose, onSave, productos, clientes, almacenes, simboloMoneda }) {
  const init = {
    clienteId: '', almacenId: almacenes[0]?.id || '',
    fecha: fechaHoy(), fechaEntrega: '', transportista: '',
    direccionEntrega: '', observaciones: '',
  }
  const [form, setForm]   = useState(init)
  const [items, setItems] = useState([])
  const [ni, setNi]       = useState({ productoId: '', cantidad: '', precioVenta: '' })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
  const igv      = +(subtotal * 0.18).toFixed(2)
  const total    = +(subtotal + igv).toFixed(2)

  function addItem() {
    if (!ni.productoId || !ni.cantidad || !ni.precioVenta) return
    const prod = productos.find(p => p.id === ni.productoId)
    if (items.find(i => i.productoId === ni.productoId)) return
    setItems(prev => [...prev, {
      productoId:   ni.productoId,
      nombre:       prod?.nombre || '',
      unidadMedida: prod?.unidadMedida || '',
      cantidad:     +ni.cantidad,
      precioVenta:  +ni.precioVenta,
      costoUnitario:0,
      subtotal:     +(+ni.cantidad * +ni.precioVenta).toFixed(2),
    }])
    setNi({ productoId: '', cantidad: '', precioVenta: '' })
  }

  function handleSave() {
    if (!form.clienteId || !items.length) return
    onSave({
      numero: generarNumDoc('GD', '001'),
      estado: 'PEDIDO',
      ...form,
      items, subtotal, igv, total,
      guiaNumero: null, fechaDespacho: null,
      usuarioId: 'usr1',
    })
    setForm(init); setItems([])
  }

  // Pre-rellenar dirección del cliente
  const cliente = clientes.find(c => c.id === form.clienteId)
  if (cliente && !form.direccionEntrega && cliente.direccion) {
    setForm(p => ({ ...p, direccionEntrega: cliente.direccion }))
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo Pedido de Despacho" size="xl"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={!form.clienteId || !items.length} onClick={handleSave}>
          <Truck size={13}/> Registrar Pedido
        </Btn>
      </>}>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Cliente *">
          <select className={SEL} value={form.clienteId} onChange={e => {
            const cli = clientes.find(c => c.id === e.target.value)
            f('clienteId', e.target.value)
            if (cli?.direccion) f('direccionEntrega', cli.direccion)
          }}>
            <option value="">Seleccionar cliente...</option>
            {clientes.filter(c => c.activo).map(c => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}
          </select>
        </Field>
        <Field label="Almacén de despacho">
          <select className={SEL} value={form.almacenId} onChange={e => f('almacenId', e.target.value)}>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </Field>
        <Field label="Fecha pedido">
          <input type="date" className={SI} value={form.fecha} onChange={e => f('fecha', e.target.value)}/>
        </Field>
        <Field label="Fecha entrega comprometida">
          <input type="date" className={SI} value={form.fechaEntrega} onChange={e => f('fechaEntrega', e.target.value)}/>
        </Field>
      </div>

      <DireccionInput
        label="Dirección de entrega"
        value={form.direccionEntrega}
        onChange={v => f('direccionEntrega', v)}
        placeholder="Av. Principal 123, Distrito, Lima"
        required
      />

      <Field label="Transportista / Carrier">
        <input className={SI} value={form.transportista} onChange={e => f('transportista', e.target.value)}
          placeholder="Nombre del transportista o empresa"/>
      </Field>

      {/* Agregar ítems */}
      <div className="text-[13px] font-semibold text-[#e8edf2]">Productos a despachar</div>
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex-[2] min-w-[180px]">
          <Field label="Producto">
            <select className={SEL} value={ni.productoId} onChange={e => {
              const p = productos.find(x => x.id === e.target.value)
              setNi(prev => ({ ...prev, productoId: e.target.value, precioVenta: p?.precioVenta || '' }))
            }}>
              <option value="">Seleccionar...</option>
              {productos.filter(p => p.activo !== false && p.stockActual > 0 && !items.find(i => i.productoId === p.id)).map(p => (
                <option key={p.id} value={p.id}>{p.sku} — {p.nombre} (Stock: {p.stockActual} {p.unidadMedida})</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex-1 min-w-[90px]">
          <Field label="Cantidad">
            <input type="number" className={SI} value={ni.cantidad}
              onChange={e => setNi(p => ({ ...p, cantidad: e.target.value }))} min="0.01" step="0.01"/>
          </Field>
        </div>
        <div className="flex-1 min-w-[100px]">
          <Field label="Precio Venta">
            <input type="number" className={SI} value={ni.precioVenta}
              onChange={e => setNi(p => ({ ...p, precioVenta: e.target.value }))} min="0" step="0.01"/>
          </Field>
        </div>
        <Btn variant="secondary" onClick={addItem}>+ Agregar</Btn>
      </div>

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {['Producto','Cantidad','P. Venta','Subtotal',''].map(h => (
                <th key={h} className="bg-[#1a2230] px-3 py-2 text-left text-[11px] font-semibold text-[#5f6f80] uppercase border-b border-white/[0.08]">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-b border-white/[0.06] last:border-0">
                  <td className="px-3 py-2">{it.nombre}</td>
                  <td className="px-3 py-2 font-mono text-[12px]">{it.cantidad} {it.unidadMedida}</td>
                  <td className="px-3 py-2 font-mono text-[12px]">{formatCurrency(it.precioVenta, simboloMoneda)}</td>
                  <td className="px-3 py-2 font-mono text-[12px] font-semibold">{formatCurrency(it.subtotal, simboloMoneda)}</td>
                  <td className="px-3 py-2">
                    <Btn variant="ghost" size="icon" className="text-red-400"
                      onClick={() => setItems(p => p.filter((_, j) => j !== i))}>
                      <X size={12}/>
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col items-end gap-1 text-[13px]">
        <div className="text-[#9ba8b6]">Subtotal: <span className="font-medium text-[#e8edf2]">{formatCurrency(subtotal, simboloMoneda)}</span></div>
        <div className="text-[#9ba8b6]">IGV (18%): <span className="font-medium text-[#e8edf2]">{formatCurrency(igv, simboloMoneda)}</span></div>
        <div className="text-[16px] font-semibold text-[#00c896]">Total: {formatCurrency(total, simboloMoneda)}</div>
      </div>

      <Field label="Observaciones">
        <textarea className={SI + ' resize-y min-h-[56px]'} value={form.observaciones}
          onChange={e => f('observaciones', e.target.value)} placeholder="Instrucciones especiales de entrega..."/>
      </Field>
    </Modal>
  )
}

// ── Modal Detalle Despacho ────────────────────────────────
function ModalDetalle({ des, productos, clientes, almacenes, simboloMoneda, onClose, onAvanzar, onAnular }) {
  const cli     = clientes.find(c => c.id === des.clienteId)
  const alm     = almacenes.find(a => a.id === des.almacenId)
  const estMeta = ESTADOS[des.estado]
  const EstIcon = estMeta?.icon || ClipboardList

  const pasos = ['PEDIDO','APROBADO','PICKING','LISTO','DESPACHADO','ENTREGADO']
  const paso  = pasos.indexOf(des.estado)

  return (
    <Modal open title={`Despacho — ${des.numero}`} onClose={onClose} size="lg"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
        {!['ENTREGADO','ANULADO'].includes(des.estado) && (
          <Btn variant="ghost" className="text-red-400 hover:text-red-300" onClick={onAnular}>Anular</Btn>
        )}
        {estMeta?.next && (
          <Btn variant="primary" onClick={onAvanzar}>
            <EstIcon size={14}/> {estMeta.accion}
          </Btn>
        )}
      </>}>

      {/* Progress bar */}
      {des.estado !== 'ANULADO' && (
        <div className="flex items-center gap-1 mb-2">
          {pasos.map((p, i) => (
            <div key={p} className="flex items-center gap-1 flex-1">
              <div className={`h-1.5 rounded-full flex-1 transition-all ${i <= paso ? 'bg-[#00c896]' : 'bg-white/[0.08]'}`}/>
              <div className={`w-2 h-2 rounded-full shrink-0 ${i <= paso ? 'bg-[#00c896]' : 'bg-white/[0.08]'}`}/>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <Badge variant={estMeta?.color || 'neutral'}><EstIcon size={9}/> {estMeta?.label}</Badge>
        {des.guiaNumero && <span className="font-mono text-[12px] text-[#00c896] font-semibold">{des.guiaNumero}</span>}
      </div>

      {/* Datos del despacho */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          ['Cliente', cli?.razonSocial || '—'],
          ['Almacén', alm?.nombre || '—'],
          ['Fecha Pedido', formatDate(des.fecha)],
          ['Fecha Entrega', formatDate(des.fechaEntrega) || '—'],
          ['Fecha Despacho', des.fechaDespacho ? formatDate(des.fechaDespacho) : '—'],
          ['Transportista', des.transportista || '—'],
        ].map(([k, v]) => (
          <div key={k} className="bg-[#1a2230] rounded-lg px-3.5 py-2.5">
            <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">{k}</div>
            <div className="text-[13px] font-medium text-[#e8edf2]">{v}</div>
          </div>
        ))}
      </div>

      {/* Dirección */}
      {des.direccionEntrega && (
        <div className="flex items-start gap-2 px-3.5 py-2.5 bg-[#1a2230] rounded-lg mb-4">
          <MapPin size={13} className="text-[#5f6f80] mt-0.5 shrink-0"/>
          <span className="text-[12px] text-[#9ba8b6]">{des.direccionEntrega}</span>
        </div>
      )}

      {/* Ítems */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.08] mb-4">
        <table className="w-full border-collapse text-[13px]">
          <thead><tr>
            {['Producto','Cantidad','P. Venta','Subtotal'].map(h => (
              <th key={h} className="bg-[#1a2230] px-3.5 py-2 text-left text-[11px] font-semibold text-[#5f6f80] uppercase border-b border-white/[0.08]">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {des.items?.map((it, i) => {
              const p = productos.find(x => x.id === it.productoId)
              return (
                <tr key={i} className="border-b border-white/[0.06] last:border-0">
                  <td className="px-3.5 py-2">
                    <div className="font-medium">{p?.nombre || it.productoId}</div>
                    <div className="text-[11px] text-[#5f6f80]">{p?.sku}</div>
                  </td>
                  <td className="px-3.5 py-2 font-mono text-[12px]">{it.cantidad} {p?.unidadMedida}</td>
                  <td className="px-3.5 py-2 font-mono text-[12px]">{formatCurrency(it.precioVenta, simboloMoneda)}</td>
                  <td className="px-3.5 py-2 font-mono text-[12px] font-semibold">{formatCurrency(it.subtotal, simboloMoneda)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-end gap-1 text-[13px]">
        <span className="text-[#9ba8b6]">Subtotal: <span className="font-medium text-[#e8edf2]">{formatCurrency(des.subtotal, simboloMoneda)}</span></span>
        <span className="text-[#9ba8b6]">IGV: <span className="font-medium text-[#e8edf2]">{formatCurrency(des.igv, simboloMoneda)}</span></span>
        <span className="text-[16px] font-semibold text-[#00c896]">Total: {formatCurrency(des.total, simboloMoneda)}</span>
      </div>

      {des.observaciones && (
        <div className="mt-3 px-3.5 py-2.5 bg-[#1a2230] rounded-lg text-[12px] text-[#9ba8b6]">
          <strong className="text-[#5f6f80]">Observaciones: </strong>{des.observaciones}
        </div>
      )}
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════
// MODAL DE EVIDENCIA DE ENTREGA
// ══════════════════════════════════════════════════════════
function ModalEvidencia({ des, onClose, onConfirm }) {
  const [foto,     setFoto]     = useState(null)
  const [preview,  setPreview]  = useState(null)
  const [receptor, setReceptor] = useState('')
  const [notas,    setNotas]    = useState('')

  const SI = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'

  function handleFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setFoto(ev.target.result)
      setPreview(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <Modal open title={`Confirmar Entrega — ${des.numero}`} onClose={onClose} size="md"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={() => onConfirm({ foto, receptor, notas })}>
          <CheckCircle size={13}/> Confirmar Entrega
        </Btn>
      </>}>

      <Alert variant="info">
        Registra la evidencia de entrega. La foto y nombre del receptor quedan guardados en el despacho.
      </Alert>

      {/* Captura de foto — funciona vía PWA en móvil con cámara */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide">
          Foto de entrega (opcional)
        </label>
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Evidencia" className="w-full max-h-48 object-cover rounded-xl border border-white/[0.08]"/>
            <button onClick={() => { setFoto(null); setPreview(null) }}
              className="absolute top-2 right-2 w-7 h-7 bg-red-500/80 rounded-lg flex items-center justify-center text-white text-[12px] hover:bg-red-500">
              ×
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 h-32 bg-[#1a2230] border-2 border-dashed border-white/[0.1] rounded-xl cursor-pointer hover:border-[#00c896]/40 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#5f6f80" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="12" cy="13" r="4" stroke="#5f6f80" strokeWidth="1.5"/></svg>
            <span className="text-[12px] text-[#5f6f80]">Toca para capturar foto</span>
            <span className="text-[10px] text-[#3d4f60]">Funciona con cámara en móvil (PWA)</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto}/>
          </label>
        )}
      </div>

      <div className="flex flex-col gap-3.5">
        <div>
          <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">
            Nombre del receptor *
          </label>
          <input className={SI} value={receptor} onChange={e=>setReceptor(e.target.value)}
            placeholder="Nombre completo de quien recibe"/>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">
            Observaciones de entrega
          </label>
          <textarea className={SI+' resize-y min-h-[56px]'} value={notas} onChange={e=>setNotas(e.target.value)}
            placeholder="Condiciones del producto al entregar, incidencias, etc."/>
        </div>
      </div>

      <div className="px-3.5 py-2.5 bg-[#1a2230] rounded-lg text-[11px] text-[#5f6f80] flex items-start gap-2">
        <div className="w-1 h-1 rounded-full bg-[#00c896] mt-1.5 shrink-0"/>
        Al confirmar, el despacho pasará a estado ENTREGADO y se registrará la fecha y hora exacta de entrega.
      </div>
    </Modal>
  )
}
