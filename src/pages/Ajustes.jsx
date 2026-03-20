import { useState, useMemo } from 'react'
import { Plus, Search, SlidersHorizontal, TrendingUp, TrendingDown, Eye, Trash2 , Download } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoy, generarNumDoc } from '../utils/helpers'
import { calcularPMP, procesarSalida } from '../utils/valorizacion'
import * as storage from '../services/storage'
import { Modal, ConfirmDialog, EmptyState, Badge, Btn, Field, Alert } from '../components/ui/index'
import { exportarMovimientosXLSX } from '../utils/exportXLSX'
import { exportarMovimientosPDF } from '../utils/exportPDF'

const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'
const MOTIVOS_POS = ['Sobrante en conteo físico','Devolución no registrada','Error en sistema','Reposición emergencia','Otro']
const MOTIVOS_NEG = ['Faltante en conteo físico','Merma / daño','Robo / pérdida','Producto vencido / dado de baja','Error en sistema','Otro']

export default function Ajustes() {
  const { ajustes, productos, almacenes, sesion, recargarProductos, recargarMovimientos, recargarAjustes, toast, formulaValorizacion, simboloMoneda , config } = useApp()
  const [modal, setModal]       = useState(false)
  const [verAj, setVerAj]       = useState(null)
  const [eliminar, setEliminar] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtTipo, setFiltTipo] = useState('')

  const filtered = useMemo(() => {
    let d = [...ajustes]
    if (filtTipo) d = d.filter(a => a.tipo === filtTipo)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(a => {
        const p = productos.find(x => x.id === a.productoId)
        return p?.nombre.toLowerCase().includes(q) || a.documento?.toLowerCase().includes(q) || a.motivo?.toLowerCase().includes(q)
      })
    }
    return d
  }, [ajustes, filtTipo, busqueda, productos])

  const totales = useMemo(() => ({
    positivos: filtered.filter(a => a.tipo === 'POSITIVO').reduce((s,a) => s + a.costoTotal, 0),
    negativos: filtered.filter(a => a.tipo === 'NEGATIVO').reduce((s,a) => s + a.costoTotal, 0),
    count: filtered.length,
  }), [filtered])

  function handleRegistrar(data) {
    const prod = storage.getProductoById(data.productoId).data
    if (!prod) return toast('Producto no encontrado', 'error')
    const cantidad   = +data.cantidad
    const esPositivo = data.tipo === 'POSITIVO'
    if (!esPositivo && cantidad > prod.stockActual) {
      toast(`Stock insuficiente para ajuste negativo. Disponible: ${prod.stockActual} ${prod.unidadMedida}`, 'error'); return
    }
    let nuevosBatches = prod.batches || []
    let costoUnitario = 0, costoTotal = 0
    if (esPositivo) {
      costoUnitario = calcularPMP(nuevosBatches) || +data.costoUnitario || 0
      costoTotal    = +(costoUnitario * cantidad).toFixed(2)
      nuevosBatches = [...nuevosBatches, { id: Date.now().toString(36), cantidad, costo: costoUnitario, fecha: data.fecha, lote: `AJ-${data.documento||''}` }]
    } else {
      try {
        const r = procesarSalida(nuevosBatches, cantidad, formulaValorizacion)
        nuevosBatches = r.batches; costoUnitario = r.costoUnitario; costoTotal = r.costoTotal
      } catch (e) { return toast(e.message, 'error') }
    }
    const nuevoStock = prod.stockActual + (esPositivo ? cantidad : -cantidad)
    storage._actualizarBatchesProducto(prod.id, nuevosBatches, nuevoStock)
    storage.registrarMovimiento({
      tipo:'AJUSTE', productoId:data.productoId, almacenId:data.almacenId,
      cantidad, costoUnitario, costoTotal, lote:'', fecha:data.fecha,
      motivo:`[${esPositivo?'+':'-'} AJUSTE] ${data.motivo}`,
      documento:data.documento, notas:data.notas, usuarioId:sesion?.id||'usr1',
    })
    storage.registrarAjuste({ productoId:data.productoId, almacenId:data.almacenId, tipo:data.tipo, cantidad, motivo:data.motivo, documento:data.documento, fecha:data.fecha, costoUnitario, costoTotal, usuarioId:sesion?.id||'usr1', notas:data.notas })
    recargarProductos(); recargarMovimientos(); recargarAjustes()
    toast(`Ajuste ${esPositivo?'+':'-'}${cantidad} ${prod.unidadMedida} de ${prod.nombre} registrado`, 'success')
    setModal(false)
  }

  function handleEliminar(aj) {
    // Revertir impacto en stock
    const prod = storage.getProductoById(aj.productoId).data
    if (prod) {
      const delta = aj.tipo === 'POSITIVO' ? -aj.cantidad : +aj.cantidad
      const nuevoStock = Math.max(0, prod.stockActual + delta)
      storage._actualizarBatchesProducto(prod.id, prod.batches || [], nuevoStock)
      storage.registrarMovimiento({
        tipo:'AJUSTE', productoId:aj.productoId, almacenId:aj.almacenId,
        cantidad:aj.cantidad, costoUnitario:aj.costoUnitario, costoTotal:aj.costoTotal,
        lote:'', fecha:fechaHoy(),
        motivo:`[${aj.tipo==='POSITIVO'?'-':'+'} AJUSTE] Eliminación de ${aj.documento}`,
        documento:`DEL-${aj.documento}`, notas:`Eliminación de ajuste ${aj.documento}`,
      })
    }
    // Eliminar el ajuste del listado (filtrar por id)
    const lista = (storage.getAjustes().data || []).filter(a => a.id !== aj.id)
    localStorage.setItem('sp_ajustes', JSON.stringify(lista))
    recargarProductos(); recargarMovimientos(); recargarAjustes()
    toast(`Ajuste ${aj.documento} eliminado`, 'success')
    setEliminar(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3.5">
        {[
          ['Ajustes positivos', totales.positivos, '#22c55e', TrendingUp],
          ['Ajustes negativos', totales.negativos, '#ef4444', TrendingDown],
          ['Total ajustes',     totales.count,     '#3b82f6', SlidersHorizontal],
        ].map(([l, v, c, Icon]) => (
          <div key={l} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: c }}/>
            <div className="flex items-center gap-2 mb-2"><Icon size={13} style={{ color: c }}/><span className="text-[11px] text-[#5f6f80] uppercase tracking-[0.05em]">{l}</span></div>
            <div className="text-[22px] font-semibold text-[#e8edf2] font-mono">
              {typeof v === 'number' && v > 100 ? formatCurrency(v, '') : v}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Historial de Ajustes</span>
          <div className="flex items-center gap-2">
            <Btn variant="secondary" size="sm"
              onClick={async () => { await exportarMovimientosXLSX(filtered, productos, almacenes, simboloMoneda) }}
              style={{background:'#1e7b47',color:'#fff',borderColor:'#1e7b47'}}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="secondary" size="sm"
              onClick={async () => { await exportarMovimientosPDF(filtered, productos, almacenes, simboloMoneda, config?.empresa, 'Ajustes de Inventario') }}
              style={{background:'#c0392b',color:'#fff',borderColor:'#c0392b'}}>
              <Download size={13}/> PDF
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={13}/>Nuevo Ajuste</Btn>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI+' pl-8'} placeholder="Buscar producto, motivo..." value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <select className={SEL} style={{ width:160 }} value={filtTipo} onChange={e => setFiltTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="POSITIVO">Positivo (+)</option>
            <option value="NEGATIVO">Negativo (-)</option>
          </select>
          {(busqueda||filtTipo) && <Btn variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltTipo('') }}>Limpiar</Btn>}
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {['Fecha','Documento','Tipo','Producto','Cantidad','Costo Total','Motivo','Acciones'].map(h => (
                <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/[0.08] whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8}><EmptyState icon={SlidersHorizontal} title="Sin ajustes" description="Registra el primer ajuste de inventario."/></td></tr>}
              {filtered.map(a => {
                const prod = productos.find(p => p.id === a.productoId)
                return (
                  <tr key={a.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(a.fecha)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#00c896] font-semibold">{a.documento||'—'}</td>
                    <td className="px-3.5 py-2.5">
                      <Badge variant={a.tipo==='POSITIVO'?'success':'danger'}>
                        {a.tipo==='POSITIVO'?<TrendingUp size={10}/>:<TrendingDown size={10}/>} {a.tipo==='POSITIVO'?'Positivo':'Negativo'}
                      </Badge>
                    </td>
                    <td className="px-3.5 py-2.5"><div className="font-medium text-[#e8edf2]">{prod?.nombre||'—'}</div><div className="text-[11px] text-[#5f6f80]">{prod?.sku}</div></td>
                    <td className={`px-3.5 py-2.5 font-mono text-[12px] font-semibold ${a.tipo==='POSITIVO'?'text-green-400':'text-red-400'}`}>
                      {a.tipo==='POSITIVO'?'+':'-'}{a.cantidad} <span className="text-[#5f6f80] font-normal text-[11px]">{prod?.unidadMedida}</span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px]">{formatCurrency(a.costoTotal,simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6] max-w-[160px] truncate">{a.motivo}</td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex gap-1">
                        <Btn variant="ghost" size="icon" title="Ver detalle" onClick={() => setVerAj(a)}><Eye size={13}/></Btn>
                        <Btn variant="ghost" size="icon" title="Eliminar ajuste" className="text-red-400 hover:text-red-300" onClick={() => setEliminar(a)}><Trash2 size={13}/></Btn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ModalAjuste open={modal} onClose={() => setModal(false)} onSave={handleRegistrar}
        productos={productos} almacenes={almacenes} formulaValorizacion={formulaValorizacion} simboloMoneda={simboloMoneda}/>

      {verAj && <ModalDetalleAj aj={verAj} productos={productos} almacenes={almacenes}
        simboloMoneda={simboloMoneda} onClose={() => setVerAj(null)}/>}

      <ConfirmDialog open={!!eliminar} onClose={() => setEliminar(null)} onConfirm={() => handleEliminar(eliminar)}
        danger title="Eliminar ajuste"
        message={`¿Eliminar el ajuste ${eliminar?.documento}? Se revertirá el impacto en el stock.`}/>
    </div>
  )
}

function ModalDetalleAj({ aj, productos, almacenes, simboloMoneda, onClose }) {
  const prod = productos.find(p => p.id === aj.productoId)
  const alm  = almacenes.find(a => a.id === aj.almacenId)
  return (
    <Modal open title={`Ajuste — ${aj.documento||'Detalle'}`} onClose={onClose} size="sm"
      footer={<Btn variant="secondary" onClick={onClose}>Cerrar</Btn>}>
      <div className="flex flex-col divide-y divide-white/[0.05]">
        {[
          ['Documento',    aj.documento||'—'],
          ['Fecha',        formatDate(aj.fecha)],
          ['Tipo',         aj.tipo],
          ['Producto',     prod?`${prod.sku} — ${prod.nombre}`:'—'],
          ['Almacén',      alm?.nombre||'—'],
          ['Cantidad',     `${aj.tipo==='POSITIVO'?'+':'-'}${aj.cantidad} ${prod?.unidadMedida||''}`],
          ['Costo Unit.',  formatCurrency(aj.costoUnitario,simboloMoneda)],
          ['Costo Total',  formatCurrency(aj.costoTotal,simboloMoneda)],
          ['Motivo',       aj.motivo||'—'],
          ['Notas',        aj.notas||'—'],
          ['Usuario',      aj.usuarioId||'—'],
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

function ModalAjuste({ open, onClose, onSave, productos, almacenes, formulaValorizacion, simboloMoneda }) {
  const init = { productoId:'', almacenId:almacenes[0]?.id||'', tipo:'POSITIVO', cantidad:'', costoUnitario:'', motivo:'', documento:'', notas:'', fecha:fechaHoy() }
  const [form, setForm] = useState(init)
  const [err,  setErr]  = useState({})
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const prod    = productos.find(p => p.id === form.productoId)
  const pmp     = prod ? calcularPMP(prod.batches||[]) : 0
  const motivos = form.tipo === 'POSITIVO' ? MOTIVOS_POS : MOTIVOS_NEG
  const validate = () => {
    const e = {}
    if (!form.productoId)                     e.productoId = 'Requerido'
    if (!form.cantidad||+form.cantidad<=0)    e.cantidad   = 'Mayor a 0'
    if (!form.motivo)                         e.motivo     = 'Requerido'
    setErr(e); return Object.keys(e).length === 0
  }
  function handleSave() {
    if (!validate()) return
    const doc = form.documento || generarNumDoc('AJ','001')
    onSave({ ...form, documento: doc }); setForm(init); setErr({})
  }
  return (
    <Modal open={open} onClose={onClose} title="Nuevo Ajuste de Inventario" size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={handleSave}><SlidersHorizontal size={14}/>Registrar Ajuste</Btn></>}>
      <Alert variant="info">Los ajustes corrigen discrepancias entre el sistema y el conteo físico. Deben tener un <b>motivo documentado</b>.</Alert>
      <div className="grid grid-cols-2 gap-3">
        {[['POSITIVO','Ajuste Positivo (+)','Sobrante — aumenta stock','success',TrendingUp],['NEGATIVO','Ajuste Negativo (-)','Faltante — reduce stock','danger',TrendingDown]].map(([val,label,desc,,Icon]) => (
          <div key={val} onClick={() => { f('tipo',val); f('motivo','') }}
            className={`p-3.5 rounded-xl cursor-pointer border transition-all ${form.tipo===val?(val==='POSITIVO'?'bg-green-500/10 border-green-500/40':'bg-red-500/10 border-red-500/40'):'bg-[#1a2230] border-white/[0.06] hover:border-white/[0.12]'}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.tipo===val?(val==='POSITIVO'?'border-green-400 bg-green-400':'border-red-400 bg-red-400'):'border-white/20'}`}>
                {form.tipo===val && <div className="w-1.5 h-1.5 rounded-full bg-[#0e1117]"/>}
              </div>
              <Icon size={13} className={form.tipo===val?(val==='POSITIVO'?'text-green-400':'text-red-400'):'text-[#5f6f80]'}/>
              <span className={`text-[13px] font-medium ${form.tipo===val?'text-[#e8edf2]':'text-[#9ba8b6]'}`}>{label}</span>
            </div>
            <p className="text-[11px] text-[#5f6f80] ml-6">{desc}</p>
          </div>
        ))}
      </div>
      <Field label="Producto *" error={err.productoId}>
        <select className={SEL} value={form.productoId} onChange={e => f('productoId',e.target.value)}>
          <option value="">Seleccionar producto...</option>
          {productos.filter(p=>p.activo!==false).map(p=><option key={p.id} value={p.id}>{p.sku} — {p.nombre} (Stock: {p.stockActual} {p.unidadMedida})</option>)}
        </select>
        {prod && <span className="text-[11px] text-[#5f6f80] mt-1">Stock actual: <span className="text-[#e8edf2] font-medium">{prod.stockActual} {prod.unidadMedida}</span> · PMP: <span className="text-[#e8edf2] font-medium">{formatCurrency(pmp,simboloMoneda)}</span></span>}
      </Field>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Cantidad *" error={err.cantidad}><input type="number" className={SI} value={form.cantidad} onChange={e => f('cantidad',e.target.value)} min="0.01" step="0.01"/></Field>
        <Field label="Fecha"><input type="date" className={SI} value={form.fecha} onChange={e => f('fecha',e.target.value)}/></Field>
        <Field label="Motivo *" error={err.motivo}><select className={SEL} value={form.motivo} onChange={e => f('motivo',e.target.value)}><option value="">Seleccionar...</option>{motivos.map(m=><option key={m} value={m}>{m}</option>)}</select></Field>
        <Field label="N° Documento"><input className={SI} value={form.documento} onChange={e => f('documento',e.target.value)} placeholder="Auto-generado"/></Field>
      </div>
      <Field label="Almacén"><select className={SEL} value={form.almacenId} onChange={e => f('almacenId',e.target.value)}>{almacenes.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}</select></Field>
      <Field label="Notas"><textarea className={SI+' resize-y min-h-[60px]'} value={form.notas} onChange={e => f('notas',e.target.value)} placeholder="Observaciones de auditoría..."/></Field>
    </Modal>
  )
}
