import { useState, useMemo } from 'react'
import { Plus, Search, ArrowRightLeft, Warehouse, Eye, Trash2, ChevronUp, ChevronDown, Download, FileText, X } from 'lucide-react'

import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoy, generarNumDoc } from '../utils/helpers'
import { calcularPMP } from '../utils/valorizacion'
import * as storage from '../services/storage'
import { Modal, ConfirmDialog, EmptyState, Badge, Btn, Field, Alert } from '../components/ui/index'
import { exportarTransferenciasXLSX } from '../utils/exportXLSX'
import { exportarTransferenciasPDF } from '../utils/exportPDF'

const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'
const MOTIVOS = ['Rebalanceo de stock','Consolidación de almacén','Pedido urgente','Reorganización','Otro']

export default function Transferencias() {
  const { config,
   transferencias, productos, almacenes, sesion, recargarProductos, recargarMovimientos, recargarTransferencias, toast, simboloMoneda } = useApp()
  const [modal, setModal]       = useState(false)
  const [verTr, setVerTr]       = useState(null)
  const [eliminar, setEliminar] = useState(null)
  const [busqueda,   setBusqueda]   = useState('')
  const [filtOrigen, setFiltOrigen] = useState('')
  const [filtDestino,setFiltDestino]= useState('')
  const [filtMotivo, setFiltMotivo] = useState('')
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

  const hayFiltros = busqueda || filtOrigen || filtDestino || filtMotivo
  function limpiarFiltros() { setBusqueda(''); setFiltOrigen(''); setFiltDestino(''); setFiltMotivo('') }

  const filtered = useMemo(() => {
    let d = [...transferencias]
    if (filtOrigen)  d = d.filter(t => t.almacenOrigenId  === filtOrigen)
    if (filtDestino) d = d.filter(t => t.almacenDestinoId === filtDestino)
    if (filtMotivo)  d = d.filter(t => t.motivo?.toLowerCase().includes(filtMotivo.toLowerCase()))
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(t => {
        const p = productos.find(x=>x.id===t.productoId)
        return p?.nombre.toLowerCase().includes(q)||p?.sku.toLowerCase().includes(q)||t.numero?.toLowerCase().includes(q)
      })
    }

    d.sort((a, b) => {
      const valA = toISODate(a.fecha)
      const valB = toISODate(b.fecha)
      return valB.localeCompare(valA)
    })

    d.sort((a, b) => {
      let aV = a[sortConfig.key]
      let bV = b[sortConfig.key]

      if (sortConfig.key === 'fecha') {
        aV = toISODate(a.fecha)
        bV = toISODate(b.fecha)
      } else if (sortConfig.key === 'producto') {
        aV = productos.find(x => x.id === a.productoId)?.nombre || ''
        bV = productos.find(x => x.id === b.productoId)?.nombre || ''
      } else if (typeof aV === 'string') {
        aV = aV.toLowerCase()
        bV = bV.toLowerCase()
      }

      if (aV < bV) return sortConfig.direction === 'asc' ? -1 : 1
      if (aV > bV) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return d
  }, [transferencias, busqueda, filtOrigen, filtDestino, filtMotivo, productos, sortConfig])



  const almNombre = id => almacenes.find(a=>a.id===id)?.nombre||id

  function handleRegistrar(data) {
    const prod = storage.getProductoById(data.productoId).data
    if (!prod) return toast('Producto no encontrado', 'error')
    const cantidad = +data.cantidad
    if (cantidad > prod.stockActual) { toast(`Stock insuficiente. Disponible: ${prod.stockActual} ${prod.unidadMedida}`, 'error'); return }
    if (data.almacenOrigenId === data.almacenDestinoId) { toast('El origen y destino no pueden ser el mismo almacén', 'error'); return }
    const costoUnit  = calcularPMP(prod.batches||[])
    const costoTotal = +(costoUnit * cantidad).toFixed(2)
    const numero     = data.numero || generarNumDoc('TR','001')
    storage.registrarMovimiento({ tipo:'TRANSFERENCIA', productoId:prod.id, almacenId:data.almacenOrigenId, cantidad, costoUnitario:costoUnit, costoTotal, lote:'', fecha:data.fecha, motivo:`[TRANSFER OUT → ${almNombre(data.almacenDestinoId)}] ${data.motivo}`, documento:numero, notas:data.notas, usuarioId:sesion?.id||'usr1' })
    storage.registrarMovimiento({ tipo:'TRANSFERENCIA', productoId:prod.id, almacenId:data.almacenDestinoId, cantidad, costoUnitario:costoUnit, costoTotal, lote:'', fecha:data.fecha, motivo:`[TRANSFER IN ← ${almNombre(data.almacenOrigenId)}] ${data.motivo}`, documento:numero, notas:data.notas, usuarioId:sesion?.id||'usr1' })
    storage.registrarTransferencia({ numero, productoId:prod.id, almacenOrigenId:data.almacenOrigenId, almacenDestinoId:data.almacenDestinoId, cantidad, costoUnitario:costoUnit, costoTotal, fecha:data.fecha, motivo:data.motivo, notas:data.notas, usuarioId:sesion?.id||'usr1' })
    storage.saveProducto({ ...prod, almacenId:data.almacenDestinoId })
    recargarProductos(); recargarMovimientos(); recargarTransferencias()
    toast(`Transferencia ${numero}: ${cantidad} ${prod.unidadMedida} de ${prod.nombre} → ${almNombre(data.almacenDestinoId)}`, 'success')
    setModal(false)
  }

  function handleEliminar(tr) {
    const lista = (storage.getTransferencias().data||[]).filter(t=>t.id!==tr.id)
    localStorage.setItem('sp_transferencias', JSON.stringify(lista))
    recargarTransferencias()
    toast(`Transferencia ${tr.numero} eliminada del historial`, 'success')
    setEliminar(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3.5">
        {almacenes.slice(0,3).map(alm => {
          const count = transferencias.filter(t=>t.almacenOrigenId===alm.id||t.almacenDestinoId===alm.id).length
          const prods = productos.filter(p=>p.almacenId===alm.id).length
          return (
            <div key={alm.id} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-[#00c896]"/>
              <div className="flex items-center gap-2 mb-1"><Warehouse size={13} className="text-[#5f6f80]"/><span className="text-[11px] text-[#5f6f80] uppercase tracking-[0.05em] truncate">{alm.nombre}</span></div>
              <div className="text-[22px] font-semibold text-[#e8edf2]">{prods}</div>
              <div className="text-[11px] text-[#5f6f80] mt-0.5">productos · {count} transferencias</div>
            </div>
          )
        })}
      </div>

      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        {/* ── Fila 1: título + botones ── */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] whitespace-nowrap">Historial de Transferencias</span>
          <div className="flex items-center gap-2 shrink-0">
            <Btn variant="ghost" size="sm" onClick={async()=>{ await exportarTransferenciasXLSX(filtered, productos, almacenes, simboloMoneda) }}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={async()=>{ await exportarTransferenciasPDF(filtered, productos, almacenes, simboloMoneda, config?.empresa) }}>
              <FileText size={13}/> PDF
            </Btn>
            <Btn variant="primary" size="sm" onClick={()=>setModal(true)}><Plus size={13}/> Nueva Transferencia</Btn>
          </div>
        </div>

        {/* ── Fila 2: buscador izquierda + filtros derecha ── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Buscador — izquierda, flex-1 */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI + ' pl-8 !py-[5px] text-[12px]'} placeholder="Buscar producto o N° transferencia..."
              value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
          </div>
          {/* Almacén origen */}
          <select className={SEL} style={{width:155,padding:'5px 8px',fontSize:12}} value={filtOrigen} onChange={e=>setFiltOrigen(e.target.value)}>
            <option value="">Origen: todos</option>
            {almacenes.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          {/* Almacén destino */}
          <select className={SEL} style={{width:155,padding:'5px 8px',fontSize:12}} value={filtDestino} onChange={e=>setFiltDestino(e.target.value)}>
            <option value="">Destino: todos</option>
            {almacenes.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          {/* Motivo — lista fija del formulario de registro */}
          <select className={SEL} style={{width:175,padding:'5px 8px',fontSize:12}} value={filtMotivo} onChange={e=>setFiltMotivo(e.target.value)}>
            <option value="">Todos los motivos</option>
            {MOTIVOS.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          {/* Contador + limpiar */}
          <span className="text-[11px] text-[#5f6f80] whitespace-nowrap">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
          {hayFiltros && (
            <Btn variant="ghost" size="sm" onClick={limpiarFiltros}>
              <X size={12}/> Limpiar
            </Btn>
          )}
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {[
                { l: 'Fecha', k: 'fecha' },
                { l: 'N° Transfer.', k: 'numero' },
                { l: 'Producto', k: 'producto' },
                { l: 'Origen', k: 'almacenOrigenId' },
                { l: 'Destino', k: 'almacenDestinoId' },
                { l: 'Cantidad', k: 'cantidad' },
                { l: 'Costo Total', k: 'costoTotal' },
                { l: 'Motivo', k: 'motivo' },
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
              {filtered.length===0&&<tr><td colSpan={9}><EmptyState icon={ArrowRightLeft} title="Sin transferencias" description="Registra la primera transferencia."/></td></tr>}
              {filtered.map(t=>{
                const prod=productos.find(p=>p.id===t.productoId)
                return(
                  <tr key={t.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(t.fecha)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#00c896] font-semibold">{t.numero}</td>
                    <td className="px-3.5 py-2.5"><div className="font-medium text-[#e8edf2]">{prod?.nombre||'—'}</div><div className="text-[11px] text-[#5f6f80]">{prod?.sku}</div></td>
                    <td className="px-3.5 py-2.5"><Badge variant="neutral">{almNombre(t.almacenOrigenId)}</Badge></td>
                    <td className="px-3.5 py-2.5"><div className="flex items-center gap-1.5"><ArrowRightLeft size={11} className="text-[#00c896]"/><Badge variant="teal">{almNombre(t.almacenDestinoId)}</Badge></div></td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] font-semibold text-[#e8edf2]">{t.cantidad} <span className="text-[#5f6f80] font-normal text-[11px]">{prod?.unidadMedida}</span></td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px]">{formatCurrency(t.costoTotal,simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6] max-w-[140px] truncate">{t.motivo}</td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex gap-1">
                        <Btn variant="ghost" size="icon" title="Ver detalle" onClick={()=>setVerTr(t)}><Eye size={13}/></Btn>
                        <Btn variant="ghost" size="icon" title="Eliminar" className="text-red-400 hover:text-red-300" onClick={()=>setEliminar(t)}><Trash2 size={13}/></Btn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ModalTransferencia open={modal} onClose={()=>setModal(false)} onSave={handleRegistrar}
        productos={productos} almacenes={almacenes} simboloMoneda={simboloMoneda}/>

      {verTr&&<ModalDetalleTr tr={verTr} productos={productos} almacenes={almacenes}
        simboloMoneda={simboloMoneda} onClose={()=>setVerTr(null)}/>}

      <ConfirmDialog open={!!eliminar} onClose={()=>setEliminar(null)} onConfirm={()=>handleEliminar(eliminar)}
        danger title="Eliminar transferencia"
        message={`¿Eliminar la transferencia ${eliminar?.numero}? Solo se borra el registro histórico.`}/>
    </div>
  )
}

function ModalDetalleTr({ tr, productos, almacenes, simboloMoneda, onClose }) {
  const prod = productos.find(p=>p.id===tr.productoId)
  const ori  = almacenes.find(a=>a.id===tr.almacenOrigenId)
  const dest = almacenes.find(a=>a.id===tr.almacenDestinoId)
  return (
    <Modal open title={`Transferencia — ${tr.numero}`} onClose={onClose} size="sm"
      footer={<Btn variant="secondary" onClick={onClose}>Cerrar</Btn>}>
      <div className="flex flex-col divide-y divide-white/[0.05]">
        {[
          ['N° Transferencia', tr.numero],
          ['Fecha',            formatDate(tr.fecha)],
          ['Producto',         prod?`${prod.sku} — ${prod.nombre}`:'—'],
          ['Almacén origen',   ori?.nombre||'—'],
          ['Almacén destino',  dest?.nombre||'—'],
          ['Cantidad',         `${tr.cantidad} ${prod?.unidadMedida||''}`],
          ['Costo Unit.',      formatCurrency(tr.costoUnitario,simboloMoneda)],
          ['Costo Total',      formatCurrency(tr.costoTotal,simboloMoneda)],
          ['Motivo',           tr.motivo||'—'],
          ['Notas',            tr.notas||'—'],
        ].map(([k,v])=>(
          <div key={k} className="flex justify-between gap-3 py-2">
            <span className="text-[12px] text-[#5f6f80] shrink-0">{k}</span>
            <span className="text-[12px] text-[#e8edf2] font-medium text-right">{v}</span>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function ModalTransferencia({ open, onClose, onSave, productos, almacenes, simboloMoneda }) {
  const init = { productoId:'', almacenOrigenId:almacenes[0]?.id||'', almacenDestinoId:almacenes[1]?.id||'', cantidad:'', motivo:'Rebalanceo de stock', numero:'', notas:'', fecha:fechaHoy() }
  const [form, setForm] = useState(init)
  const [err,  setErr]  = useState({})
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const prod      = productos.find(p=>p.id===form.productoId)
  const pmp       = prod ? calcularPMP(prod.batches||[]) : 0
  const totalEst  = form.cantidad && pmp ? +(+form.cantidad*pmp).toFixed(2) : 0
  const mismoAlm  = form.almacenOrigenId && form.almacenOrigenId===form.almacenDestinoId
  const validate  = () => {
    const e = {}
    if (!form.productoId)                     e.productoId = 'Requerido'
    if (!form.cantidad||+form.cantidad<=0)    e.cantidad   = 'Mayor a 0'
    if (mismoAlm)                             e.almacenDestinoId = 'Distinto al origen'
    if (prod&&+form.cantidad>prod.stockActual) e.cantidad  = `Máx: ${prod.stockActual}`
    setErr(e); return Object.keys(e).length === 0
  }
  function handleSave() { if (!validate()) return; onSave(form); setForm(init); setErr({}) }
  return (
    <Modal open={open} onClose={onClose} title="Nueva Transferencia entre Almacenes" size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={handleSave}><ArrowRightLeft size={14}/>Registrar Transferencia</Btn></>}>
      <Alert variant="info">La transferencia mueve stock de un almacén a otro con trazabilidad completa.</Alert>
      <Field label="Producto *" error={err.productoId}>
        <select className={SEL} value={form.productoId} onChange={e=>f('productoId',e.target.value)}>
          <option value="">Seleccionar producto...</option>
          {productos.filter(p=>p.activo!==false&&p.stockActual>0).map(p=><option key={p.id} value={p.id}>{p.sku} — {p.nombre} (Stock: {p.stockActual} {p.unidadMedida})</option>)}
        </select>
        {prod&&<span className="text-[11px] text-[#5f6f80] mt-1">Disponible: <span className="text-[#e8edf2] font-medium">{prod.stockActual} {prod.unidadMedida}</span> · PMP: <span className="text-[#e8edf2] font-medium">{formatCurrency(pmp,simboloMoneda)}</span></span>}
      </Field>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
        <Field label="Almacén origen"><select className={SEL} value={form.almacenOrigenId} onChange={e=>f('almacenOrigenId',e.target.value)}>{almacenes.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}</select></Field>
        <div className="pb-2 flex items-center justify-center"><div className="w-8 h-8 rounded-full bg-[#00c896]/10 flex items-center justify-center"><ArrowRightLeft size={14} className="text-[#00c896]"/></div></div>
        <Field label="Almacén destino" error={err.almacenDestinoId}><select className={SEL} value={form.almacenDestinoId} onChange={e=>f('almacenDestinoId',e.target.value)}>{almacenes.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}</select></Field>
      </div>
      {mismoAlm&&<p className="text-[12px] text-red-400 -mt-2">El origen y destino deben ser almacenes distintos</p>}
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Cantidad *" error={err.cantidad}>
          <input type="number" className={SI} value={form.cantidad} onChange={e=>f('cantidad',e.target.value)} min="0.01" step="0.01" max={prod?.stockActual}/>
          {totalEst>0&&<span className="text-[11px] text-[#5f6f80] mt-1">Valor: <span className="text-[#00c896] font-semibold">{formatCurrency(totalEst,simboloMoneda)}</span></span>}
        </Field>
        <Field label="Fecha"><input type="date" className={SI} value={form.fecha} onChange={e=>f('fecha',e.target.value)}/></Field>
        <Field label="Motivo"><select className={SEL} value={form.motivo} onChange={e=>f('motivo',e.target.value)}>{MOTIVOS.map(m=><option key={m} value={m}>{m}</option>)}</select></Field>
        <Field label="N° Documento"><input className={SI} value={form.numero} onChange={e=>f('numero',e.target.value)} placeholder="Auto-generado"/></Field>
      </div>
      <Field label="Notas"><textarea className={SI+' resize-y min-h-[56px]'} value={form.notas} onChange={e=>f('notas',e.target.value)} placeholder="Observaciones..."/></Field>
    </Modal>
  )
}
