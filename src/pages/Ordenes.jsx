import { useState, useMemo } from 'react'
import { Plus, Search, CheckCircle, X, Eye, ShoppingCart, FileText, MessageCircle, Mail, ChevronUp, ChevronDown } from 'lucide-react'

import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoy, generarNumDoc } from '../utils/helpers'
import * as storage from '../services/storage'
import { Modal, ConfirmDialog, EmptyState, EstadoOCBadge, Badge, Btn, Field, Alert } from '../components/ui/index'
import { ModalRecepcionParcial } from '../components/ui/ModalRecepcionParcial'
import PdfSharePanel from '../components/ui/PdfSharePanel'
import { imprimirOC } from '../utils/pdfTemplates'

const IGV=0.18
const TH=({c,r})=><th className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/[0.08] sticky top-0 ${r?'text-right':'text-left'}`}>{c}</th>
const SI='px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 w-full font-[inherit] placeholder-[#5f6f80]'
const SEL=SI+' pr-8'

export default function Ordenes() {
  const { ordenes, productos, proveedores, almacenes, recargarProductos, recargarMovimientos, recargarOrdenes, toast, sesion, simboloMoneda, config } = useApp()
  const [modal, setModal]       = useState(false)
  const [detalle, setDetalle]   = useState(null)
  const [recepcion, setRecepcion] = useState(null)
  const [shareOC,   setShareOC]   = useState(null)
  const [filtEst, setFiltEst]   = useState('')
  const [busqueda, setBusqueda] = useState('')
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
    let d = [...ordenes]
    if (filtEst) d = d.filter(o => o.estado === filtEst)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(o => o.numero?.toLowerCase().includes(q) || proveedores.find(p=>p.id===o.proveedorId)?.razonSocial.toLowerCase().includes(q))
    }

    d.sort((a, b) => {
      let aV = a[sortConfig.key]
      let bV = b[sortConfig.key]

      if (sortConfig.key === 'fecha' || sortConfig.key === 'fechaEntrega') {
        aV = toISODate(a[sortConfig.key])
        bV = toISODate(b[sortConfig.key])
      } else if (sortConfig.key === 'proveedor') {
        aV = proveedores.find(x => x.id === a.proveedorId)?.razonSocial || ''
        bV = proveedores.find(x => x.id === b.proveedorId)?.razonSocial || ''
      } else if (typeof aV === 'string') {
        aV = aV.toLowerCase()
        bV = bV.toLowerCase()
      }

      if (aV < bV) return sortConfig.direction === 'asc' ? -1 : 1
      if (aV > bV) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return d
  }, [ordenes, filtEst, busqueda, proveedores, sortConfig])


  const provNombre = id => proveedores.find(p=>p.id===id)?.razonSocial || '—'

  function aprobar(oc) { storage.saveOrden({...oc,estado:'APROBADA'}); recargarOrdenes(); toast(`OC ${oc.numero} aprobada`,'success') }
  function cancelar(oc) { storage.saveOrden({...oc,estado:'CANCELADA'}); recargarOrdenes(); toast(`OC ${oc.numero} cancelada`,'warning') }

  function abrirRecepcion(oc) {
    setDetalle(null)
    setRecepcion({ ...oc, proveedorNombre: provNombre(oc.proveedorId) })
  }

  function confirmarRecepcion({ items, fecha, notas, esCompleta }) {
    const oc = recepcion
    const almacenId = almacenes[0]?.id || ''

    items.forEach(item => {
      if (!item.recibir || item.recibir <= 0) return
      const prod = storage.getProductoById(item.productoId).data
      if (!prod) return

      const batch = {
        id: Date.now().toString(36) + item.productoId,
        cantidad: item.recibir, costo: item.costoUnitario,
        fecha, lote: `OC-${oc.numero}`,
      }
      storage._actualizarBatchesProducto(prod.id, [...(prod.batches||[]), batch], prod.stockActual + item.recibir)
      storage.registrarMovimiento({
        tipo:'ENTRADA', productoId:item.productoId, almacenId,
        cantidad:item.recibir, costoUnitario:item.costoUnitario,
        costoTotal:+(item.recibir*item.costoUnitario).toFixed(2),
        lote:`OC-${oc.numero}`, fecha,
        motivo:`Recepción ${esCompleta?'completa':'parcial'} OC ${oc.numero}`,
        documento:oc.numero, notas, proveedorId:oc.proveedorId,
        usuarioId: sesion?.id || 'usr1',
      })
    })

    // Actualizar cantidades recibidas en la OC
    const itemsActualizados = oc.items.map(item => {
      const recibido = items.find(i => i.productoId === item.productoId)?.recibir || 0
      return { ...item, cantidadRecibida: (item.cantidadRecibida || 0) + recibido }
    })

    storage.saveOrden({
      ...oc,
      items: itemsActualizados,
      estado: esCompleta ? 'RECIBIDA' : 'PARCIAL',
      fechaRecepcion: fecha,
    })

    recargarProductos(); recargarMovimientos(); recargarOrdenes()
    toast(`OC ${oc.numero} ${esCompleta ? 'recibida completamente' : 'recepción parcial registrada'}`, 'success')
    setRecepcion(null)
  }

  const kpis = useMemo(() => ({
    pendientes: ordenes.filter(o => o.estado==='PENDIENTE').length,
    aprobadas:  ordenes.filter(o => o.estado==='APROBADA').length,
    parciales:  ordenes.filter(o => o.estado==='PARCIAL').length,
    total:      ordenes.filter(o => o.estado==='PENDIENTE'||o.estado==='APROBADA'||o.estado==='PARCIAL').reduce((s,o)=>s+o.total,0),
  }), [ordenes])

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3.5">
        {[
          ['OC Pendientes',  kpis.pendientes, '#f59e0b'],
          ['OC Aprobadas',   kpis.aprobadas,  '#3b82f6'],
          ['Recep. Parcial', kpis.parciales,  '#8b5cf6'],
          ['Valor abierto',  formatCurrency(kpis.total,simboloMoneda), '#00c896'],
        ].map(([l,v,c])=>(
          <div key={l} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{background:c}}/>
            <div className="text-[11px] text-[#5f6f80] uppercase tracking-[0.05em] mb-2">{l}</div>
            <div className={`font-semibold text-[#e8edf2] ${typeof v==='number'?'text-[28px]':'text-[17px] font-mono'}`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Órdenes de Compra</span>
          <Btn variant="primary" size="sm" onClick={()=>setModal(true)}><Plus size={13}/>Nueva OC</Btn>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI+' pl-8'} placeholder="Buscar número, proveedor..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
          </div>
          <select className={SEL} style={{width:160}} value={filtEst} onChange={e=>setFiltEst(e.target.value)}>
            <option value="">Todos los estados</option>
            {['PENDIENTE','APROBADA','PARCIAL','RECIBIDA','CANCELADA'].map(e=><option key={e}>{e}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {[
                { l: 'N° OC', k: 'numero' },
                { l: 'Proveedor', k: 'proveedor' },
                { l: 'Fecha', k: 'fecha' },
                { l: 'Entrega', k: 'fechaEntrega' },
                { l: 'Ítems' },
                { l: 'Total', k: 'total', r: true },
                { l: 'Estado', k: 'estado' },
                { l: 'Acciones' }
              ].map((h) => (
                <th key={h.l} 
                  className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/[0.08] cursor-pointer hover:bg-white/[0.02] ${h.r ? 'text-right' : 'text-left'}`}
                  onClick={() => h.k && handleSort(h.k)}
                >
                  <div className={`flex items-center gap-1.5 ${h.r ? 'justify-end' : ''}`}>
                    {h.l}
                    {sortConfig.key === h.k && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                    )}
                  </div>
                </th>
              ))}
            </tr></thead>

            <tbody>
              {filtered.length===0&&<tr><td colSpan={8}><EmptyState icon={ShoppingCart} title="Sin órdenes" description="Crea tu primera orden de compra."/></td></tr>}
              {filtered.map(oc=>(
                <tr key={oc.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-3.5 py-2.5 font-mono text-[12px] font-semibold text-[#00c896]">{oc.numero}</td>
                  <td className="px-3.5 py-2.5">
                    <div className="font-medium">{provNombre(oc.proveedorId)}</div>
                    {oc.notas&&<div className="text-[11px] text-[#5f6f80] truncate max-w-[180px]">{oc.notas}</div>}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(oc.fecha)}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(oc.fechaEntrega)||'—'}</td>
                  <td className="px-3.5 py-2.5 text-center text-[#9ba8b6]">{oc.items?.length||0}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-right font-semibold">{formatCurrency(oc.total,simboloMoneda)}</td>
                  <td className="px-3.5 py-2.5"><EstadoOCBadge estado={oc.estado}/></td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex gap-1">
                      <Btn variant="ghost" size="icon" title="Ver detalle" onClick={()=>setDetalle(oc)}><Eye size={13}/></Btn>
                      {oc.estado==='APROBADA'&&(
                        <Btn variant="ghost" size="icon" title="PDF / Compartir" className="text-[#00c896] hover:text-[#009e76]" onClick={()=>setShareOC(oc)}>
                          <FileText size={13}/>
                        </Btn>
                      )}
                      {oc.estado==='PENDIENTE'&&<Btn variant="ghost" size="icon" className="text-green-400 hover:text-green-300" title="Aprobar" onClick={()=>aprobar(oc)}><CheckCircle size={13}/></Btn>}
                      {(oc.estado==='APROBADA'||oc.estado==='PARCIAL')&&(
                        <Btn variant="primary" size="sm" onClick={()=>abrirRecepcion(oc)}>
                          <CheckCircle size={12}/>Recibir
                        </Btn>
                      )}
                      {(oc.estado==='PENDIENTE'||oc.estado==='APROBADA')&&<Btn variant="ghost" size="icon" className="text-red-400 hover:text-red-300" title="Cancelar" onClick={()=>cancelar(oc)}><X size={13}/></Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ModalNuevaOC open={modal} onClose={()=>setModal(false)} productos={productos} proveedores={proveedores} simboloMoneda={simboloMoneda}
        onSaved={()=>{recargarOrdenes();setModal(false);toast('Orden de compra creada','success')}}/>

      {detalle&&<ModalDetalleOC oc={detalle} productos={productos} provNombre={provNombre}
        onClose={()=>setDetalle(null)} onRecibir={()=>abrirRecepcion(detalle)} simboloMoneda={simboloMoneda}/>}

      {shareOC&&(
        <Modal open title={`PDF / Compartir — ${shareOC.numero}`} onClose={()=>setShareOC(null)} size="sm" footer={<Btn variant="secondary" onClick={()=>setShareOC(null)}>Cerrar</Btn>}>
          <PdfSharePanel
            tipo="Orden de Compra"
            numero={shareOC.numero}
            onClose={()=>setShareOC(null)}
            onPrint={()=>imprimirOC({oc:shareOC,proveedor:proveedores.find(p=>p.id===shareOC.proveedorId),productos,config})}
            extra={{
              whatsapp: `https://wa.me/${proveedores.find(p=>p.id===shareOC.proveedorId)?.telefono?.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(`Estimado proveedor, adjunto la Orden de Compra ${shareOC.numero} para su atención. Por favor confirme recepción.`)}`,
              mailto: `mailto:${proveedores.find(p=>p.id===shareOC.proveedorId)?.email||''}?subject=${encodeURIComponent(`Orden de Compra ${shareOC.numero}`)}&body=${encodeURIComponent(`Estimado proveedor,\n\nAdjunto la Orden de Compra ${shareOC.numero} por un total de ${formatCurrency(shareOC.total, simboloMoneda)}.\n\nQuedo a su disposición.\n\n${config?.empresa||''}`)}`,
            }}
          />
        </Modal>
      )}
      {recepcion&&<ModalRecepcionParcial oc={recepcion} productos={productos}
        simboloMoneda={simboloMoneda} onClose={()=>setRecepcion(null)} onConfirm={confirmarRecepcion}/>}
    </div>
  )
}

function ModalNuevaOC({open,onClose,productos,proveedores,onSaved,simboloMoneda}){
  const [form,setForm]=useState({proveedorId:'',fecha:fechaHoy(),fechaEntrega:'',notas:''})
  const [items,setItems]=useState([])
  const [ni,setNi]=useState({productoId:'',cantidad:'',costoUnitario:''})
  const f=(k,v)=>setForm(p=>({...p,[k]:v}))
  const subtotal=items.reduce((s,i)=>s+i.subtotal,0)
  const igv=+(subtotal*IGV).toFixed(2)
  const total=+(subtotal+igv).toFixed(2)
  function addItem(){if(!ni.productoId||!ni.cantidad||!ni.costoUnitario)return;const prod=productos.find(p=>p.id===ni.productoId);setItems(prev=>[...prev,{productoId:ni.productoId,nombre:prod?.nombre||'',cantidad:+ni.cantidad,costoUnitario:+ni.costoUnitario,subtotal:+(+ni.cantidad*+ni.costoUnitario).toFixed(2),cantidadRecibida:0}]);setNi({productoId:'',cantidad:'',costoUnitario:''})}
  function handleSave(){if(!form.proveedorId||!items.length)return;storage.saveOrden({numero:generarNumDoc('OC','001'),proveedorId:form.proveedorId,fecha:form.fecha,fechaEntrega:form.fechaEntrega,estado:'PENDIENTE',items,subtotal,igv,total,notas:form.notas,usuarioId:'usr1'});setForm({proveedorId:'',fecha:fechaHoy(),fechaEntrega:'',notas:''});setItems([]);onSaved()}
  return(
    <Modal open={open} onClose={onClose} title="Nueva Orden de Compra" size="xl"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={handleSave} disabled={!form.proveedorId||!items.length}>Crear OC</Btn></>}>
      <div className="grid grid-cols-3 gap-3.5">
        <Field label="Proveedor *"><select className={SEL} value={form.proveedorId} onChange={e=>f('proveedorId',e.target.value)}><option value="">Seleccionar...</option>{proveedores.map(p=><option key={p.id} value={p.id}>{p.razonSocial}</option>)}</select></Field>
        <Field label="Fecha"><input type="date" className={SI} value={form.fecha} onChange={e=>f('fecha',e.target.value)}/></Field>
        <Field label="Fecha de Entrega"><input type="date" className={SI} value={form.fechaEntrega} onChange={e=>f('fechaEntrega',e.target.value)}/></Field>
      </div>
      <div className="text-[13px] font-semibold text-[#e8edf2]">Agregar ítems</div>
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex-[2] min-w-[180px]"><Field label="Producto"><select className={SEL} value={ni.productoId} onChange={e=>setNi(p=>({...p,productoId:e.target.value}))}><option value="">Seleccionar...</option>{productos.filter(p=>p.activo!==false).map(p=><option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>)}</select></Field></div>
        <div className="flex-1 min-w-[90px]"><Field label="Cantidad"><input type="number" className={SI} value={ni.cantidad} onChange={e=>setNi(p=>({...p,cantidad:e.target.value}))} min="0.01" step="0.01"/></Field></div>
        <div className="flex-1 min-w-[90px]"><Field label="Costo Unit."><input type="number" className={SI} value={ni.costoUnitario} onChange={e=>setNi(p=>({...p,costoUnitario:e.target.value}))} min="0" step="0.01"/></Field></div>
        <Btn variant="secondary" onClick={addItem}>+ Agregar</Btn>
      </div>
      {items.length>0&&(
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>{['Producto','Cant.','Costo Unit.','Subtotal',''].map(h=><th key={h} className="bg-[#1a2230] px-3 py-2 text-left text-[11px] font-semibold text-[#5f6f80] uppercase border-b border-white/[0.08]">{h}</th>)}</tr></thead>
            <tbody>{items.map((it,i)=>(
              <tr key={i} className="border-b border-white/[0.06] last:border-0">
                <td className="px-3 py-2">{it.nombre}</td>
                <td className="px-3 py-2 font-mono text-[12px]">{it.cantidad}</td>
                <td className="px-3 py-2 font-mono text-[12px]">{formatCurrency(it.costoUnitario,simboloMoneda)}</td>
                <td className="px-3 py-2 font-mono text-[12px] font-semibold">{formatCurrency(it.subtotal,simboloMoneda)}</td>
                <td className="px-3 py-2"><Btn variant="ghost" size="icon" className="text-red-400" onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))}><X size={12}/></Btn></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div className="flex flex-col items-end gap-1 text-[13px]">
        <div className="text-[#9ba8b6]">Subtotal: <span className="text-[#e8edf2] font-medium">{formatCurrency(subtotal,simboloMoneda)}</span></div>
        <div className="text-[#9ba8b6]">IGV (18%): <span className="text-[#e8edf2] font-medium">{formatCurrency(igv,simboloMoneda)}</span></div>
        <div className="text-[16px] font-semibold text-[#00c896]">Total: {formatCurrency(total,simboloMoneda)}</div>
      </div>
      <Field label="Notas"><textarea className={SI+' resize-y min-h-[56px]'} value={form.notas} onChange={e=>f('notas',e.target.value)} placeholder="Condiciones, urgencia..."/></Field>
    </Modal>
  )
}

function ModalDetalleOC({oc,productos,provNombre,onClose,onRecibir,simboloMoneda}){
  return(
    <Modal open title={`Orden ${oc.numero}`} onClose={onClose} size="lg"
      footer={<><Btn variant="secondary" onClick={onClose}>Cerrar</Btn>{(oc.estado==='PENDIENTE'||oc.estado==='APROBADA'||oc.estado==='PARCIAL')&&<Btn variant="primary" onClick={onRecibir}><CheckCircle size={14}/>Recibir mercadería</Btn>}</>}>
      <div className="grid grid-cols-2 gap-3">
        {[['Proveedor',provNombre(oc.proveedorId)],['Estado',null],['Fecha OC',formatDate(oc.fecha)],['Fecha Entrega',formatDate(oc.fechaEntrega)]].map(([k,v])=>(
          <div key={k} className="bg-[#1a2230] rounded-lg px-3.5 py-2.5">
            <div className="text-[11px] text-[#5f6f80] mb-0.5">{k}</div>
            <div className="text-[13px] font-medium">{k==='Estado'?<EstadoOCBadge estado={oc.estado}/>:v||'—'}</div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full border-collapse text-[13px]">
          <thead><tr>{['Producto','Pedido','Recibido','Pendiente','Costo Unit.','Subtotal'].map(h=><th key={h} className="bg-[#1a2230] px-3.5 py-2 text-left text-[11px] font-semibold text-[#5f6f80] uppercase border-b border-white/[0.08]">{h}</th>)}</tr></thead>
          <tbody>{oc.items?.map((it,i)=>{
            const p=productos.find(x=>x.id===it.productoId)
            const recibido=it.cantidadRecibida||0
            const pendiente=Math.max(0,it.cantidad-recibido)
            return(
              <tr key={i} className="border-b border-white/[0.06] last:border-0">
                <td className="px-3.5 py-2">{p?.nombre||it.productoId}</td>
                <td className="px-3.5 py-2 font-mono text-[12px]">{it.cantidad}</td>
                <td className="px-3.5 py-2 font-mono text-[12px] text-green-400">{recibido}</td>
                <td className="px-3.5 py-2 font-mono text-[12px]">
                  <span className={pendiente>0?'text-amber-400':'text-green-400'}>{pendiente}</span>
                </td>
                <td className="px-3.5 py-2 font-mono text-[12px]">{formatCurrency(it.costoUnitario,simboloMoneda)}</td>
                <td className="px-3.5 py-2 font-mono text-[12px] font-semibold">{formatCurrency(it.subtotal,simboloMoneda)}</td>
              </tr>
            )
          })}</tbody>
        </table>
      </div>
      <div className="flex flex-col items-end gap-1 text-[13px]">
        <div className="text-[#9ba8b6]">Subtotal: <span className="font-medium text-[#e8edf2]">{formatCurrency(oc.subtotal,simboloMoneda)}</span></div>
        <div className="text-[#9ba8b6]">IGV: <span className="font-medium text-[#e8edf2]">{formatCurrency(oc.igv,simboloMoneda)}</span></div>
        <div className="text-[16px] font-semibold text-[#00c896]">Total: {formatCurrency(oc.total,simboloMoneda)}</div>
      </div>
      {oc.notas&&<p className="text-[13px] text-[#9ba8b6]">Notas: {oc.notas}</p>}
    </Modal>
  )
}
