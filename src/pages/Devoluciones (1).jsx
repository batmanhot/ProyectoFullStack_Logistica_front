import { useState, useMemo } from 'react'
import { Plus, Search, RotateCcw, ArrowDownToLine, ArrowUpFromLine, Eye, Trash2, ChevronUp, ChevronDown, Download, FileText, X } from 'lucide-react'

import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoy, generarNumDoc } from '../utils/helpers'
import { calcularPMP } from '../utils/valorizacion'
import * as storage from '../services/storage'
import { Modal, ConfirmDialog, EmptyState, Badge, Btn, Field, Alert } from '../components/ui/index'
import { exportarDevolucionesXLSX } from '../utils/exportXLSX'
import { exportarDevolucionesPDF } from '../utils/exportPDF'

const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'
const ESTADOS_ITEM   = ['BUENO','DAÑADO','VENCIDO','PARA REVISIÓN']
const MOTIVOS_CLIENTE = ['Error en pedido','Producto defectuoso','No solicitado','Exceso de cantidad','Cambio de producto','Otro']
const MOTIVOS_PROV    = ['Producto en mal estado','Cantidad incorrecta','Producto vencido','No coincide con OC','Acuerdo comercial','Otro']

export default function Devoluciones() {
  const { devoluciones, productos, almacenes, proveedores, clientes, sesion, recargarProductos, recargarMovimientos, recargarDevoluciones, toast, formulaValorizacion, simboloMoneda, config } = useApp()
  const [modal, setModal]       = useState(false)
  const [verDev, setVerDev]     = useState(null)
  const [eliminar, setEliminar] = useState(null)
  const [busqueda,    setBusqueda]    = useState('')
  const [filtTipo,    setFiltTipo]    = useState('')
  const [filtAlm,     setFiltAlm]     = useState('')
  const [filtMotivo,  setFiltMotivo]  = useState('')
  const [filtEstItem, setFiltEstItem] = useState('')
  const [filtDoc,     setFiltDoc]     = useState('')
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

  const hayFiltros = busqueda || filtTipo || filtAlm || filtMotivo || filtEstItem || filtDoc
  function limpiarFiltros() { setBusqueda(''); setFiltTipo(''); setFiltAlm(''); setFiltMotivo(''); setFiltEstItem(''); setFiltDoc('') }

  const filtered = useMemo(() => {
    let d = [...devoluciones]
    if (filtTipo)    d = d.filter(x => x.tipo === filtTipo)
    if (filtAlm)     d = d.filter(x => x.almacenId === filtAlm)
    if (filtMotivo)  d = d.filter(x => x.motivo?.toLowerCase().includes(filtMotivo.toLowerCase()))
    if (filtEstItem) d = d.filter(x => x.estadoItem === filtEstItem)
    if (filtDoc)     d = d.filter(x => x.documento?.toLowerCase().includes(filtDoc.toLowerCase()))
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(x => {
        const p = productos.find(pr => pr.id === x.productoId)
        return p?.nombre.toLowerCase().includes(q) || x.documento?.toLowerCase().includes(q) || x.motivo?.toLowerCase().includes(q)
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
  }, [devoluciones, filtTipo, filtAlm, filtMotivo, filtEstItem, filtDoc, busqueda, productos, sortConfig])



  const totales = useMemo(() => ({
    clientes:    filtered.filter(d => d.tipo==='CLIENTE').length,
    proveedores: filtered.filter(d => d.tipo==='PROVEEDOR').length,
    valorTotal:  filtered.reduce((s,d) => s+(d.costoTotal||0), 0),
  }), [filtered])

  function handleRegistrar(data) {
    const prod = storage.getProductoById(data.productoId).data
    if (!prod) return toast('Producto no encontrado', 'error')
    const cantidad    = +data.cantidad
    const esCliente   = data.tipo === 'CLIENTE'
    const reingresa   = esCliente && data.estadoItem === 'BUENO'
    const esProveedor = data.tipo === 'PROVEEDOR'
    const pmp         = calcularPMP(prod.batches||[])
    const costoUnit   = pmp || 0
    const costoTotal  = +(costoUnit * cantidad).toFixed(2)
    let nuevoStock    = prod.stockActual
    let nuevosBatches = prod.batches || []
    if (reingresa) {
      nuevosBatches = [...nuevosBatches, { id:Date.now().toString(36), cantidad, costo:costoUnit, fecha:data.fecha, lote:`DEV-${data.documento}` }]
      nuevoStock = prod.stockActual + cantidad
    } else if (esProveedor) {
      if (cantidad > prod.stockActual) { toast(`Stock insuficiente. Disponible: ${prod.stockActual} ${prod.unidadMedida}`, 'error'); return }
      const factor = prod.stockActual > 0 ? (prod.stockActual-cantidad)/prod.stockActual : 0
      nuevosBatches = nuevosBatches.map(b => ({...b,cantidad:b.cantidad*factor})).filter(b=>b.cantidad>0.001)
      nuevoStock = prod.stockActual - cantidad
    }
    storage._actualizarBatchesProducto(prod.id, nuevosBatches, nuevoStock)
    storage.registrarMovimiento({
      tipo:reingresa?'ENTRADA':esProveedor?'SALIDA':'AJUSTE',
      productoId:data.productoId, almacenId:data.almacenId, cantidad, costoUnitario:costoUnit, costoTotal,
      lote:'', fecha:data.fecha, motivo:`[DEV ${data.tipo}] ${data.motivo}`,
      documento:data.documento, notas:data.notas, usuarioId:sesion?.id||'usr1',
    })
    storage.registrarDevolucion({ tipo:data.tipo, productoId:data.productoId, almacenId:data.almacenId, proveedorId:data.proveedorId||null, cantidad, costoUnitario:costoUnit, costoTotal, estadoItem:data.estadoItem, motivo:data.motivo, documento:data.documento, referenciaDoc:data.referenciaDoc, fecha:data.fecha, notas:data.notas, usuarioId:sesion?.id||'usr1' })
    recargarProductos(); recargarMovimientos(); recargarDevoluciones()
    const accion = reingresa?'reingresó al stock':esProveedor?'redujo del stock':'documentado (no reingresa)'
    toast(`Devolución ${data.tipo==='CLIENTE'?'de cliente':'a proveedor'}: ${cantidad} unidades de ${prod.nombre} — ${accion}`, 'success')
    setModal(false)
  }

  function handleEliminar(dev) {
    const lista = (storage.getDevoluciones().data||[]).filter(d => d.id !== dev.id)
    localStorage.setItem('sp_devoluciones', JSON.stringify(lista))
    recargarDevoluciones()
    toast(`Devolución ${dev.documento} eliminada`, 'success')
    setEliminar(null)
  }

  const provNombre = id => proveedores.find(p=>p.id===id)?.razonSocial||'—'

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3.5">
        {[
          ['Dev. de clientes',   totales.clientes,    '#3b82f6', ArrowDownToLine],
          ['Dev. a proveedores', totales.proveedores, '#f59e0b', ArrowUpFromLine],
          ['Valor total',        formatCurrency(totales.valorTotal,simboloMoneda), '#00c896', RotateCcw],
        ].map(([l,v,c,Icon]) => (
          <div key={l} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{background:c}}/>
            <div className="flex items-center gap-2 mb-2"><Icon size={13} style={{color:c}}/><span className="text-[11px] text-[#5f6f80] uppercase tracking-[0.05em]">{l}</span></div>
            <div className={`font-semibold text-[#e8edf2] ${typeof v==='number'?'text-[28px]':'text-[18px] font-mono'}`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        {/* ── Fila 1: título + botones ── */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] whitespace-nowrap">Historial de Devoluciones</span>
          <div className="flex items-center gap-2 shrink-0">
            <Btn variant="ghost" size="sm" onClick={async()=>{ await exportarDevolucionesXLSX(filtered, productos, proveedores, clientes, simboloMoneda) }}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={async()=>{ await exportarDevolucionesPDF(filtered, productos, simboloMoneda, config?.empresa) }}>
              <FileText size={13}/> PDF
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={13}/> Nueva Devolución</Btn>
          </div>
        </div>

        {/* ── Fila 2: buscador izquierda + filtros derecha ── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Buscador — izquierda, flex-1 */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI + ' pl-8 !py-[5px] text-[12px]'} placeholder="Buscar producto, documento..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          {/* Tipo */}
          <select className={SEL} style={{width:148,padding:'5px 8px',fontSize:12}} value={filtTipo} onChange={e=>setFiltTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="CLIENTE">De cliente</option>
            <option value="PROVEEDOR">A proveedor</option>
          </select>
          {/* Almacén */}
          <select className={SEL} style={{width:148,padding:'5px 8px',fontSize:12}} value={filtAlm} onChange={e=>setFiltAlm(e.target.value)}>
            <option value="">Todos los almacenes</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          {/* Estado del ítem — lista fija del formulario */}
          <select className={SEL} style={{width:155,padding:'5px 8px',fontSize:12}} value={filtEstItem} onChange={e=>setFiltEstItem(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS_ITEM.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {/* Motivo — ambas listas del formulario */}
          <select className={SEL} style={{width:185,padding:'5px 8px',fontSize:12}} value={filtMotivo} onChange={e=>setFiltMotivo(e.target.value)}>
            <option value="">Todos los motivos</option>
            <optgroup label="Devolución de cliente">
              {MOTIVOS_CLIENTE.map(m => <option key={m} value={m}>{m}</option>)}
            </optgroup>
            <optgroup label="Devolución a proveedor">
              {MOTIVOS_PROV.map(m => <option key={m} value={m}>{m}</option>)}
            </optgroup>
          </select>
          {/* N° Documento */}
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI + ' pl-7 !py-[5px] text-[12px]'} style={{width:148}}
              placeholder="N° Documento..." value={filtDoc} onChange={e => setFiltDoc(e.target.value)}/>
          </div>
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
                { l: 'Documento', k: 'documento' },
                { l: 'Tipo', k: 'tipo' },
                { l: 'Producto', k: 'producto' },
                { l: 'Cantidad', k: 'cantidad' },
                { l: 'Estado ítem', k: 'estadoItem' },
                { l: 'Motivo', k: 'motivo' },
                { l: 'Impacto' },
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
              {filtered.length===0 && <tr><td colSpan={9}><EmptyState icon={RotateCcw} title="Sin devoluciones" description="Registra la primera devolución."/></td></tr>}
              {filtered.map(d => {
                const prod = productos.find(p=>p.id===d.productoId)
                const reingresa = d.tipo==='CLIENTE'&&d.estadoItem==='BUENO'
                const reduce    = d.tipo==='PROVEEDOR'
                return (
                  <tr key={d.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(d.fecha)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#00c896] font-semibold">{d.documento||'—'}</td>
                    <td className="px-3.5 py-2.5"><Badge variant={d.tipo==='CLIENTE'?'info':'warning'}>{d.tipo==='CLIENTE'?'De cliente':'A proveedor'}</Badge></td>
                    <td className="px-3.5 py-2.5"><div className="font-medium text-[#e8edf2]">{prod?.nombre||'—'}</div><div className="text-[11px] text-[#5f6f80]">{prod?.sku}</div></td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px]">{d.cantidad} <span className="text-[#5f6f80] text-[11px]">{prod?.unidadMedida}</span></td>
                    <td className="px-3.5 py-2.5"><Badge variant={d.estadoItem==='BUENO'?'success':d.estadoItem==='DAÑADO'?'danger':'neutral'}>{d.estadoItem}</Badge></td>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6] max-w-[140px] truncate">{d.motivo}</td>
                    <td className="px-3.5 py-2.5">
                      {reingresa?<Badge variant="success"><ArrowDownToLine size={10}/>Reingresó</Badge>
                      :reduce?<Badge variant="warning"><ArrowUpFromLine size={10}/>Redujo</Badge>
                      :<Badge variant="neutral">Solo doc.</Badge>}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex gap-1">
                        <Btn variant="ghost" size="icon" title="Ver detalle" onClick={()=>setVerDev(d)}><Eye size={13}/></Btn>
                        <Btn variant="ghost" size="icon" title="Eliminar" className="text-red-400 hover:text-red-300" onClick={()=>setEliminar(d)}><Trash2 size={13}/></Btn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ModalDevolucion open={modal} onClose={()=>setModal(false)} onSave={handleRegistrar}
        productos={productos} almacenes={almacenes} proveedores={proveedores} simboloMoneda={simboloMoneda}/>

      {verDev && <ModalDetalleDev dev={verDev} productos={productos} almacenes={almacenes}
        proveedores={proveedores} simboloMoneda={simboloMoneda} onClose={()=>setVerDev(null)}/>}

      <ConfirmDialog open={!!eliminar} onClose={()=>setEliminar(null)} onConfirm={()=>handleEliminar(eliminar)}
        danger title="Eliminar devolución"
        message={`¿Eliminar la devolución ${eliminar?.documento}? Solo se borra el registro, el impacto en stock no se revierte.`}/>
    </div>
  )
}

function ModalDetalleDev({ dev, productos, almacenes, proveedores, simboloMoneda, onClose }) {
  const prod = productos.find(p=>p.id===dev.productoId)
  const prov = proveedores.find(p=>p.id===dev.proveedorId)
  const alm  = almacenes.find(a=>a.id===dev.almacenId)
  return (
    <Modal open title={`Devolución — ${dev.documento||'Detalle'}`} onClose={onClose} size="sm"
      footer={<Btn variant="secondary" onClick={onClose}>Cerrar</Btn>}>
      <div className="flex flex-col divide-y divide-white/[0.05]">
        {[
          ['Documento',       dev.documento||'—'],
          ['Fecha',           formatDate(dev.fecha)],
          ['Tipo',            dev.tipo==='CLIENTE'?'Devolución de cliente':'Devolución a proveedor'],
          ['Producto',        prod?`${prod.sku} — ${prod.nombre}`:'—'],
          ['Almacén',         alm?.nombre||'—'],
          ['Proveedor',       prov?.razonSocial||'—'],
          ['Cantidad',        `${dev.cantidad} ${prod?.unidadMedida||''}`],
          ['Estado del ítem', dev.estadoItem],
          ['Costo Unit.',     formatCurrency(dev.costoUnitario,simboloMoneda)],
          ['Costo Total',     formatCurrency(dev.costoTotal,simboloMoneda)],
          ['Motivo',          dev.motivo||'—'],
          ['Doc. referencia', dev.referenciaDoc||'—'],
          ['Notas',           dev.notas||'—'],
        ].map(([k,v]) => (
          <div key={k} className="flex justify-between gap-3 py-2">
            <span className="text-[12px] text-[#5f6f80] shrink-0">{k}</span>
            <span className="text-[12px] text-[#e8edf2] font-medium text-right">{v}</span>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function ModalDevolucion({ open, onClose, onSave, productos, almacenes, proveedores, simboloMoneda }) {
  const init = { tipo:'CLIENTE', productoId:'', almacenId:almacenes[0]?.id||'', proveedorId:'', cantidad:'', estadoItem:'BUENO', motivo:'', documento:'', referenciaDoc:'', notas:'', fecha:fechaHoy() }
  const [form, setForm] = useState(init)
  const [err,  setErr]  = useState({})
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const prod    = productos.find(p=>p.id===form.productoId)
  const pmp     = prod ? calcularPMP(prod.batches||[]) : 0
  const motivos = form.tipo==='CLIENTE' ? MOTIVOS_CLIENTE : MOTIVOS_PROV
  const esCliente   = form.tipo==='CLIENTE'
  const reingresara = esCliente && form.estadoItem==='BUENO'
  const validate = () => {
    const e = {}
    if (!form.productoId)                     e.productoId  = 'Requerido'
    if (!form.cantidad||+form.cantidad<=0)    e.cantidad    = 'Mayor a 0'
    if (!form.motivo)                         e.motivo      = 'Requerido'
    if (!esCliente && !form.proveedorId)      e.proveedorId = 'Requerido'
    setErr(e); return Object.keys(e).length === 0
  }
  function handleSave() {
    if (!validate()) return
    const doc = form.documento || generarNumDoc('DEV','001')
    onSave({...form,documento:doc}); setForm(init); setErr({})
  }
  return (
    <Modal open={open} onClose={onClose} title="Nueva Devolución" size="lg"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={handleSave}><RotateCcw size={14}/>Registrar Devolución</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        {[['CLIENTE','Devolución de Cliente','El cliente devuelve mercadería','info',ArrowDownToLine],['PROVEEDOR','Devolución a Proveedor','Devolvemos mercadería al proveedor','warning',ArrowUpFromLine]].map(([val,label,desc,,Icon]) => (
          <div key={val} onClick={()=>{f('tipo',val);f('motivo','');f('proveedorId','')}}
            className={`p-3.5 rounded-xl cursor-pointer border transition-all ${form.tipo===val?(val==='CLIENTE'?'bg-blue-500/10 border-blue-500/40':'bg-amber-500/10 border-amber-500/40'):'bg-[#1a2230] border-white/[0.06] hover:border-white/[0.12]'}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.tipo===val?(val==='CLIENTE'?'border-blue-400 bg-blue-400':'border-amber-400 bg-amber-400'):'border-white/20'}`}>
                {form.tipo===val&&<div className="w-1.5 h-1.5 rounded-full bg-[#0e1117]"/>}
              </div>
              <Icon size={13} className={form.tipo===val?(val==='CLIENTE'?'text-blue-400':'text-amber-400'):'text-[#5f6f80]'}/>
              <span className={`text-[13px] font-medium ${form.tipo===val?'text-[#e8edf2]':'text-[#9ba8b6]'}`}>{label}</span>
            </div>
            <p className="text-[11px] text-[#5f6f80] ml-6">{desc}</p>
          </div>
        ))}
      </div>
      <Field label="Producto *" error={err.productoId}>
        <select className={SEL} value={form.productoId} onChange={e=>f('productoId',e.target.value)}>
          <option value="">Seleccionar producto...</option>
          {productos.filter(p=>p.activo!==false).map(p=><option key={p.id} value={p.id}>{p.sku} — {p.nombre} (Stock: {p.stockActual} {p.unidadMedida})</option>)}
        </select>
        {prod&&<span className="text-[11px] text-[#5f6f80] mt-1">PMP actual: {formatCurrency(pmp,simboloMoneda)}</span>}
      </Field>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Cantidad *" error={err.cantidad}><input type="number" className={SI} value={form.cantidad} onChange={e=>f('cantidad',e.target.value)} min="0.01" step="0.01"/></Field>
        <Field label="Estado del ítem"><select className={SEL} value={form.estadoItem} onChange={e=>f('estadoItem',e.target.value)}>{ESTADOS_ITEM.map(s=><option key={s} value={s}>{s}</option>)}</select></Field>
      </div>
      {form.productoId&&form.cantidad>0&&(
        <Alert variant={reingresara?'success':esCliente?'info':'warning'}>
          {reingresara?`El stock aumentará en ${form.cantidad} ${prod?.unidadMedida||'unidades'}.`
          :esCliente?`Ítem ${form.estadoItem?.toLowerCase()} — solo se documentará, no reingresará al stock.`
          :`El stock se reducirá en ${form.cantidad} ${prod?.unidadMedida||'unidades'}.`}
        </Alert>
      )}
      {!esCliente&&<Field label="Proveedor *" error={err.proveedorId}><select className={SEL} value={form.proveedorId} onChange={e=>f('proveedorId',e.target.value)}><option value="">Seleccionar...</option>{proveedores.map(p=><option key={p.id} value={p.id}>{p.razonSocial}</option>)}</select></Field>}
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Motivo *" error={err.motivo}><select className={SEL} value={form.motivo} onChange={e=>f('motivo',e.target.value)}><option value="">Seleccionar...</option>{motivos.map(m=><option key={m} value={m}>{m}</option>)}</select></Field>
        <Field label="Fecha"><input type="date" className={SI} value={form.fecha} onChange={e=>f('fecha',e.target.value)}/></Field>
        <Field label="N° Documento"><input className={SI} value={form.documento} onChange={e=>f('documento',e.target.value)} placeholder="DEV-001-0001"/></Field>
        <Field label="Referencia (doc. original)"><input className={SI} value={form.referenciaDoc} onChange={e=>f('referenciaDoc',e.target.value)} placeholder="GR-001-0001"/></Field>
      </div>
      <Field label="Almacén"><select className={SEL} value={form.almacenId} onChange={e=>f('almacenId',e.target.value)}>{almacenes.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}</select></Field>
      <Field label="Notas"><textarea className={SI+' resize-y min-h-[56px]'} value={form.notas} onChange={e=>f('notas',e.target.value)} placeholder="Observaciones..."/></Field>
    </Modal>
  )
}
