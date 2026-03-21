import { useState, useMemo } from 'react'
import { Plus, Search, ArrowUpFromLine, FileText, Eye, XCircle, DollarSign, Calendar, TrendingDown, ShoppingBag, Download, X } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoy, generarNumDoc } from '../utils/helpers'
import { procesarSalida, calcularPMP } from '../utils/valorizacion'
import * as storage from '../services/storage'
import { Modal, ConfirmDialog, EmptyState, Btn, Field, Badge, Alert } from '../components/ui/index'
import { exportarMovimientosXLSX } from '../utils/exportXLSX'
import { exportarMovimientosPDF } from '../utils/exportPDF'

const SI  = 'px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 w-full font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'
const MOTIVOS = ['Venta','Consumo interno','Muestra','Merma','Transferencia','Devolución a proveedor','Otro']

export default function Salidas() {
  const { movimientos, productos, almacenes, recargarProductos, recargarMovimientos, toast, formulaValorizacion, simboloMoneda , config } = useApp()
  const [modal, setModal]       = useState(false)
  const [verMov, setVerMov]     = useState(null)
  const [anular, setAnular]     = useState(null)
  const [busqueda,   setBusqueda]   = useState('')
  const [filtProd,   setFiltProd]   = useState('')  // texto producto/SKU
  const [filtAlm,    setFiltAlm]    = useState('')
  const [filtMotivo, setFiltMotivo] = useState('')

  const salidas = useMemo(() =>
    movimientos
      .filter(m => m.tipo === 'SALIDA')
      .filter(m => {
        const p = productos.find(x => x.id === m.productoId)
        // Búsqueda general: nombre producto o documento
        if (busqueda) {
          const q = busqueda.toLowerCase()
          if (!p?.nombre.toLowerCase().includes(q) && !m.documento?.toLowerCase().includes(q)) return false
        }
        // Filtro producto por SKU/nombre
        if (filtProd) {
          const q = filtProd.toLowerCase()
          if (!p?.nombre.toLowerCase().includes(q) && !p?.sku.toLowerCase().includes(q)) return false
        }
        // Filtro almacén
        if (filtAlm    && m.almacenId !== filtAlm)  return false
        // Filtro motivo
        if (filtMotivo && !m.motivo?.toLowerCase().includes(filtMotivo.toLowerCase())) return false
        // Filtro N° documento
        return true
      })
  , [movimientos, busqueda, filtProd, filtAlm, filtMotivo, productos])

  const kpis = useMemo(() => {
    const todas  = movimientos.filter(m => m.tipo === 'SALIDA')
    const hoy    = new Date().toISOString().split('T')[0]
    const ini30  = new Date(); ini30.setDate(ini30.getDate() - 30)
    const ini30s = ini30.toISOString().split('T')[0]

    const costoTotal    = todas.reduce((s, m) => s + (m.costoTotal || 0), 0)
    const totalUnidades = todas.reduce((s, m) => s + m.cantidad, 0)
    const hoy30         = todas.filter(m => m.fecha >= ini30s)
    const costo30       = hoy30.reduce((s, m) => s + (m.costoTotal || 0), 0)
    const salidasHoy    = todas.filter(m => m.fecha === hoy)
    const costoHoy      = salidasHoy.reduce((s, m) => s + (m.costoTotal || 0), 0)

    // Producto con más salidas en valor (últimos 30 días)
    const valProd = {}
    hoy30.forEach(m => { valProd[m.productoId] = (valProd[m.productoId] || 0) + (m.costoTotal || 0) })
    const topProdId = Object.entries(valProd).sort((a, b) => b[1] - a[1])[0]?.[0]
    const topProd   = productos.find(p => p.id === topProdId)?.nombre?.slice(0, 24) || '—'

    // Motivo más frecuente
    const contMotivo = {}
    hoy30.forEach(m => { const mot = m.motivo?.split(']').pop()?.trim() || m.motivo || '—'; contMotivo[mot] = (contMotivo[mot] || 0) + 1 })
    const topMotivo = Object.entries(contMotivo).sort((a, b) => b[1] - a[1])[0]?.[0]?.slice(0, 18) || '—'

    return { costoTotal, totalUnidades, costo30, salidasHoy: salidasHoy.length, costoHoy, topProd, topMotivo, count30: hoy30.length, countTotal: todas.length }
  }, [movimientos, productos])

  const hayFiltros = busqueda || filtProd || filtAlm || filtMotivo
  function limpiarFiltros() { setBusqueda(''); setFiltProd(''); setFiltAlm(''); setFiltMotivo('') }

  function handleRegistrar(data) {
    const prod = storage.getProductoById(data.productoId).data
    if (!prod) return toast('Producto no encontrado', 'error')
    if (+data.cantidad > prod.stockActual) return toast(`Stock insuficiente. Disponible: ${prod.stockActual} ${prod.unidadMedida}`, 'error')
    let resultado
    try { resultado = procesarSalida(prod.batches || [], +data.cantidad, formulaValorizacion) }
    catch (e) { return toast(e.message, 'error') }
    storage._actualizarBatchesProducto(prod.id, resultado.batches, prod.stockActual - +data.cantidad)
    storage.registrarMovimiento({
      tipo: 'SALIDA', productoId: data.productoId, almacenId: data.almacenId,
      cantidad: +data.cantidad, costoUnitario: resultado.costoUnitario, costoTotal: resultado.costoTotal,
      lote: '', fecha: data.fecha, motivo: data.motivo,
      documento: data.documento || generarNumDoc('SAL', '001'),
      notas: data.notas, formula: formulaValorizacion,
    })
    recargarProductos(); recargarMovimientos()
    toast(`Salida registrada — ${data.cantidad} ${prod.unidadMedida} de ${prod.nombre} · Costo: ${formatCurrency(resultado.costoTotal, simboloMoneda)}`, 'success')
    setModal(false)
  }

  function handleAnular(mov) {
    const prod = storage.getProductoById(mov.productoId).data
    if (!prod) return toast('Producto no encontrado', 'error')
    const batch = { id: Date.now().toString(36), cantidad: mov.cantidad, costo: mov.costoUnitario, fecha: fechaHoy(), lote: `REST-${mov.documento}` }
    storage._actualizarBatchesProducto(prod.id, [...(prod.batches || []), batch], prod.stockActual + mov.cantidad)
    storage.registrarMovimiento({
      tipo: 'AJUSTE', productoId: mov.productoId, almacenId: mov.almacenId,
      cantidad: mov.cantidad, costoUnitario: mov.costoUnitario, costoTotal: mov.costoTotal,
      lote: '', fecha: fechaHoy(), motivo: `[+ AJUSTE] Anulación salida ${mov.documento}`,
      documento: `ANU-${mov.documento}`, notas: `Anulación de salida ${mov.documento}`,
    })
    recargarProductos(); recargarMovimientos()
    toast(`Salida ${mov.documento} anulada — stock repuesto`, 'success')
    setAnular(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">

        <div className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-red-500"/>
          <div className="absolute top-3 right-4 opacity-[0.06]"><DollarSign size={44}/></div>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={13} className="text-red-400"/>
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">Costo total despachado</span>
          </div>
          <div className="text-[20px] font-semibold text-[#e8edf2] font-mono">{formatCurrency(kpis.costoTotal, simboloMoneda)}</div>
          <div className="text-[11px] text-[#5f6f80] mt-1">{kpis.countTotal} salidas registradas</div>
        </div>

        <div className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-amber-500"/>
          <div className="absolute top-3 right-4 opacity-[0.06]"><Calendar size={44}/></div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={13} className="text-amber-400"/>
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">Últimos 30 días</span>
          </div>
          <div className="text-[20px] font-semibold text-[#e8edf2] font-mono">{formatCurrency(kpis.costo30, simboloMoneda)}</div>
          <div className="text-[11px] text-[#5f6f80] mt-1">{kpis.count30} salidas · {formulaValorizacion}</div>
        </div>

        <div className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-orange-500"/>
          <div className="absolute top-3 right-4 opacity-[0.06]"><ArrowUpFromLine size={44}/></div>
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpFromLine size={13} className="text-orange-400"/>
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">Salidas hoy</span>
          </div>
          <div className="text-[28px] font-semibold text-[#e8edf2]">{kpis.salidasHoy}</div>
          <div className="text-[11px] text-[#5f6f80] mt-1">
            {kpis.salidasHoy > 0 ? formatCurrency(kpis.costoHoy, simboloMoneda) : 'Sin movimientos hoy'}
          </div>
        </div>

        <div className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-purple-500"/>
          <div className="absolute top-3 right-4 opacity-[0.06]"><ShoppingBag size={44}/></div>
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={13} className="text-purple-400"/>
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">Unidades despachadas</span>
          </div>
          <div className="text-[28px] font-semibold text-[#e8edf2]">{kpis.totalUnidades.toLocaleString('es-PE')}</div>
          <div className="text-[11px] text-[#5f6f80] mt-1 truncate" title={kpis.topProd}>Top: {kpis.topProd}</div>
        </div>

      </div>

      {/* Tabla */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        {/* ── Fila 1: título + botones ── */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] whitespace-nowrap">Registro de Salidas</span>
          <div className="flex items-center gap-2 shrink-0">
            <Btn variant="ghost" size="sm" onClick={async () => { await exportarMovimientosXLSX(salidas, productos, almacenes, simboloMoneda) }}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={async () => { await exportarMovimientosPDF(salidas, productos, almacenes, simboloMoneda, config?.empresa, 'Salidas de Stock') }}>
              <FileText size={13}/> PDF
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={13}/> Nueva Salida</Btn>
          </div>
        </div>

        {/* ── Fila 2: buscador izquierda + filtros derecha ── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Buscador general — izquierda, flex-1 */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI + ' pl-8 !py-[5px] text-[12px]'} placeholder="Buscar producto o documento..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          {/* Producto (SKU / nombre) */}
          <select className={SEL} style={{width:180,padding:'5px 8px',fontSize:12}} value={filtProd} onChange={e=>setFiltProd(e.target.value)}>
            <option value="">Todos los productos</option>
            {[...new Map(movimientos.filter(m=>m.tipo==='SALIDA').map(m=>{
              const p = productos.find(x=>x.id===m.productoId)
              return p ? [p.id, p] : null
            }).filter(Boolean)).values()]
              .sort((a,b)=>a.nombre.localeCompare(b.nombre))
              .map(p => <option key={p.id} value={p.nombre}>{p.sku} — {p.nombre.slice(0,22)}</option>)
            }
          </select>
          {/* Almacén */}
          <select className={SEL} style={{width:148,padding:'5px 8px',fontSize:12}} value={filtAlm} onChange={e=>setFiltAlm(e.target.value)}>
            <option value="">Todos los almacenes</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          {/* Motivo — lista fija del formulario de registro */}
          <select className={SEL} style={{width:165,padding:'5px 8px',fontSize:12}} value={filtMotivo} onChange={e=>setFiltMotivo(e.target.value)}>
            <option value="">Todos los motivos</option>
            {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {/* Contador + limpiar */}
          <span className="text-[11px] text-[#5f6f80] whitespace-nowrap">
            {salidas.length} resultado{salidas.length !== 1 ? 's' : ''}
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
              {['Fecha','Documento','Producto','Cantidad','Costo Unit.','Total','Motivo','Fórmula','Acciones'].map((h, i) => (
                <th key={h} className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/[0.08] ${[3,4,5].includes(i) ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {salidas.length === 0 && <tr><td colSpan={9}><EmptyState icon={ArrowUpFromLine} title="Sin salidas" description="Registra tu primera salida de stock."/></td></tr>}
              {salidas.map(m => {
                const p = productos.find(x => x.id === m.productoId)
                return (
                  <tr key={m.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(m.fecha)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-red-400 font-semibold">{m.documento || '—'}</td>
                    <td className="px-3.5 py-2.5"><div className="font-medium text-[#e8edf2]">{p?.nombre || '—'}</div><div className="text-[11px] text-[#5f6f80]">{p?.sku}</div></td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-right text-red-400 font-semibold">-{m.cantidad} <span className="text-[#5f6f80] font-normal text-[11px]">{p?.unidadMedida}</span></td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-right">{formatCurrency(m.costoUnitario, simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-right font-semibold">{formatCurrency(m.costoTotal, simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6] max-w-[140px] truncate">{m.motivo}</td>
                    <td className="px-3.5 py-2.5"><Badge variant="neutral">{m.formula || 'PMP'}</Badge></td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex gap-1">
                        <Btn variant="ghost" size="icon" title="Ver detalle" onClick={() => setVerMov(m)}><Eye size={13}/></Btn>
                        <Btn variant="ghost" size="icon" title="Anular" className="text-red-400 hover:text-red-300" onClick={() => setAnular(m)}><XCircle size={13}/></Btn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ModalSalida open={modal} onClose={() => setModal(false)} onSave={handleRegistrar}
        productos={productos} almacenes={almacenes} formulaValorizacion={formulaValorizacion} simboloMoneda={simboloMoneda}/>
      {verMov && <ModalDetalle mov={verMov} productos={productos} almacenes={almacenes} simboloMoneda={simboloMoneda} onClose={() => setVerMov(null)}/>}
      <ConfirmDialog open={!!anular} onClose={() => setAnular(null)} onConfirm={() => handleAnular(anular)}
        danger title="Anular salida"
        message={`¿Anular ${anular?.documento}? Se repondrán ${anular?.cantidad} ${productos.find(p => p.id === anular?.productoId)?.unidadMedida || 'unidades'} al stock.`}/>
    </div>
  )
}

function ModalDetalle({ mov, productos, almacenes, simboloMoneda, onClose }) {
  const prod = productos.find(p => p.id === mov.productoId)
  const alm  = almacenes.find(a => a.id === mov.almacenId)
  return (
    <Modal open title={`Salida — ${mov.documento || 'Detalle'}`} onClose={onClose} size="sm"
      footer={<Btn variant="secondary" onClick={onClose}>Cerrar</Btn>}>
      <div className="flex flex-col divide-y divide-white/[0.05]">
        {[['Documento',mov.documento||'—'],['Fecha',formatDate(mov.fecha)],['Producto',prod?`${prod.sku} — ${prod.nombre}`:'—'],['Almacén',alm?.nombre||'—'],['Cantidad',`-${mov.cantidad} ${prod?.unidadMedida||''}`],['Costo Unit.',formatCurrency(mov.costoUnitario,simboloMoneda)],['Total',formatCurrency(mov.costoTotal,simboloMoneda)],['Fórmula',mov.formula||'PMP'],['Motivo',mov.motivo||'—'],['Notas',mov.notas||'—']].map(([k,v]) => (
          <div key={k} className="flex justify-between gap-3 py-2">
            <span className="text-[12px] text-[#5f6f80] shrink-0">{k}</span>
            <span className="text-[12px] text-[#e8edf2] font-medium text-right">{v}</span>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function ModalSalida({ open, onClose, onSave, productos, almacenes, formulaValorizacion, simboloMoneda }) {
  const init = { productoId:'', almacenId:almacenes[0]?.id||'', cantidad:'', fecha:fechaHoy(), motivo:'Venta', documento:'', notas:'' }
  const [form, setForm] = useState(init)
  const [err,  setErr]  = useState({})
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const prod     = productos.find(p => p.id === form.productoId)
  const pmp      = prod ? calcularPMP(prod.batches || []) : 0
  const totalEst = form.cantidad && pmp ? +(+form.cantidad * pmp).toFixed(2) : 0
  const validate = () => {
    const e = {}
    if (!form.productoId)                          e.productoId = 'Requerido'
    if (!form.cantidad || +form.cantidad <= 0)     e.cantidad   = 'Mayor a 0'
    if (prod && +form.cantidad > prod.stockActual) e.cantidad   = `Stock insuf. (disp: ${prod.stockActual})`
    setErr(e); return Object.keys(e).length === 0
  }
  function handleSave() { if (!validate()) return; onSave(form); setForm(init); setErr({}) }
  return (
    <Modal open={open} onClose={onClose} title="Nueva Salida de Stock" size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="danger" onClick={handleSave}><ArrowUpFromLine size={13}/>Registrar Salida</Btn></>}>
      <Alert variant="info">Las salidas se valorizan con el método <b>{formulaValorizacion}</b> configurado en el sistema.</Alert>
      <Field label="Producto *" error={err.productoId}>
        <select className={SEL} value={form.productoId} onChange={e => f('productoId', e.target.value)}>
          <option value="">Seleccionar...</option>
          {productos.filter(p => p.activo !== false && p.stockActual > 0).map(p => (
            <option key={p.id} value={p.id}>{p.sku} — {p.nombre} (Stock: {p.stockActual} {p.unidadMedida})</option>
          ))}
        </select>
        {prod && <span className="text-[11px] text-[#5f6f80] mt-1">Disponible: <span className="text-green-400 font-semibold">{prod.stockActual} {prod.unidadMedida}</span> · PMP: {formatCurrency(pmp, simboloMoneda)}</span>}
      </Field>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Cantidad *" error={err.cantidad}>
          <input type="number" className={SI} value={form.cantidad} onChange={e => f('cantidad',e.target.value)} min="0.01" step="0.01" max={prod?.stockActual}/>
          {totalEst > 0 && <span className="text-[11px] text-[#5f6f80] mt-1">Costo est. ({formulaValorizacion}): <span className="text-amber-400 font-semibold">{formatCurrency(totalEst,simboloMoneda)}</span></span>}
        </Field>
        <Field label="Fecha"><input type="date" className={SI} value={form.fecha} onChange={e => f('fecha',e.target.value)}/></Field>
        <Field label="Motivo"><select className={SEL} value={form.motivo} onChange={e => f('motivo',e.target.value)}>{MOTIVOS.map(m => <option key={m}>{m}</option>)}</select></Field>
        <Field label="N° Documento"><input className={SI} value={form.documento} onChange={e => f('documento',e.target.value)} placeholder="GR-001-0001"/></Field>
      </div>
      <Field label="Almacén"><select className={SEL} value={form.almacenId} onChange={e => f('almacenId',e.target.value)}>{almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></Field>
      <Field label="Notas"><textarea className={SI+' resize-y min-h-[56px]'} value={form.notas} onChange={e => f('notas',e.target.value)} placeholder="Observaciones..."/></Field>
    </Modal>
  )
}
