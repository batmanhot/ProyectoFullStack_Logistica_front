import { useState, useMemo } from 'react'
import { Plus, Search, ArrowDownToLine, Eye, XCircle, Package, DollarSign, Calendar, TrendingUp, ChevronUp, ChevronDown } from 'lucide-react'

import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoy, generarNumDoc } from '../utils/helpers'
import { calcularPMP } from '../utils/valorizacion'
import * as storage from '../services/storage'
import { Modal, ConfirmDialog, EmptyState, Btn, Field } from '../components/ui/index'

const SI  = 'px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 w-full font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'
const MOTIVOS_E = ['Compra','Reposición','Devolución de cliente','Ajuste positivo','Inventario inicial','Otro']

export default function Entradas() {
  const { movimientos, productos, almacenes, proveedores, recargarProductos, recargarMovimientos, toast, simboloMoneda } = useApp()
  const [modal, setModal]       = useState(false)
  const [verMov, setVerMov]     = useState(null)
  const [anular, setAnular]     = useState(null)
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

  const entradas = useMemo(() => {
    let d = movimientos.filter(m => m.tipo === 'ENTRADA')
    
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(m => {
        const p = productos.find(x => x.id === m.productoId)
        return p?.nombre.toLowerCase().includes(q) || m.documento?.toLowerCase().includes(q)
      })
    }

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
  }, [movimientos, busqueda, productos, sortConfig])



  const kpis = useMemo(() => {
    const todas  = movimientos.filter(m => m.tipo === 'ENTRADA')
    const hoy    = new Date().toISOString().split('T')[0]
    const ini30  = new Date(); ini30.setDate(ini30.getDate() - 30)
    const ini30s = ini30.toISOString().split('T')[0]

    const valorTotal    = todas.reduce((s, m) => s + (m.costoTotal || 0), 0)
    const totalUnidades = todas.reduce((s, m) => s + m.cantidad, 0)
    const hoy30         = todas.filter(m => m.fecha >= ini30s)
    const valor30       = hoy30.reduce((s, m) => s + (m.costoTotal || 0), 0)
    const entradasHoy   = todas.filter(m => m.fecha === hoy)
    const valorHoy      = entradasHoy.reduce((s, m) => s + (m.costoTotal || 0), 0)

    const valProd = {}
    hoy30.forEach(m => { valProd[m.productoId] = (valProd[m.productoId] || 0) + (m.costoTotal || 0) })
    const topProdId = Object.entries(valProd).sort((a, b) => b[1] - a[1])[0]?.[0]
    const topProd   = productos.find(p => p.id === topProdId)?.nombre?.slice(0, 24) || '—'

    return { valorTotal, totalUnidades, valor30, entradasHoy: entradasHoy.length, valorHoy, topProd, count30: hoy30.length, countTotal: todas.length }
  }, [movimientos, productos])

  function handleRegistrar(data) {
    const prod = storage.getProductoById(data.productoId).data
    if (!prod) return toast('Producto no encontrado', 'error')
    const batch = { id: Date.now().toString(36), cantidad: +data.cantidad, costo: +data.costoUnitario, fecha: data.fecha, lote: data.lote || '' }
    storage._actualizarBatchesProducto(prod.id, [...(prod.batches || []), batch], prod.stockActual + +data.cantidad)
    storage.registrarMovimiento({
      tipo: 'ENTRADA', productoId: data.productoId, almacenId: data.almacenId,
      cantidad: +data.cantidad, costoUnitario: +data.costoUnitario,
      costoTotal: +(data.cantidad * data.costoUnitario).toFixed(2),
      lote: data.lote, fecha: data.fecha, motivo: data.motivo,
      documento: data.documento || generarNumDoc('ENT', '001'),
      notas: data.notas, proveedorId: data.proveedorId,
    })
    recargarProductos(); recargarMovimientos()
    toast(`Entrada registrada — ${data.cantidad} ${prod.unidadMedida} de ${prod.nombre}`, 'success')
    setModal(false)
  }

  function handleAnular(mov) {
    const prod = storage.getProductoById(mov.productoId).data
    if (!prod) return toast('Producto no encontrado', 'error')
    if (prod.stockActual < mov.cantidad) {
      toast(`No se puede anular: stock actual (${prod.stockActual}) es menor que la cantidad ingresada (${mov.cantidad})`, 'error')
      setAnular(null); return
    }
    const nuevosBatches = (prod.batches || []).filter(b => b.id !== mov.batchId)
    storage._actualizarBatchesProducto(prod.id, nuevosBatches, prod.stockActual - mov.cantidad)
    storage.registrarMovimiento({
      tipo: 'AJUSTE', productoId: mov.productoId, almacenId: mov.almacenId,
      cantidad: mov.cantidad, costoUnitario: mov.costoUnitario, costoTotal: mov.costoTotal,
      lote: '', fecha: fechaHoy(), motivo: `[- AJUSTE] Anulación entrada ${mov.documento}`,
      documento: `ANU-${mov.documento}`, notas: `Anulación de entrada ${mov.documento}`,
    })
    recargarProductos(); recargarMovimientos()
    toast(`Entrada ${mov.documento} anulada`, 'success')
    setAnular(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">

        <div className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-[#00c896]"/>
          <div className="absolute top-3 right-4 opacity-[0.06]"><DollarSign size={44}/></div>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={13} className="text-[#00c896]"/>
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">Valor total ingresado</span>
          </div>
          <div className="text-[20px] font-semibold text-[#e8edf2] font-mono">{formatCurrency(kpis.valorTotal, simboloMoneda)}</div>
          <div className="text-[11px] text-[#5f6f80] mt-1">{kpis.countTotal} entradas registradas</div>
        </div>

        <div className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-blue-500"/>
          <div className="absolute top-3 right-4 opacity-[0.06]"><Calendar size={44}/></div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={13} className="text-blue-400"/>
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">Últimos 30 días</span>
          </div>
          <div className="text-[20px] font-semibold text-[#e8edf2] font-mono">{formatCurrency(kpis.valor30, simboloMoneda)}</div>
          <div className="text-[11px] text-[#5f6f80] mt-1">{kpis.count30} entradas en el período</div>
        </div>

        <div className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-green-500"/>
          <div className="absolute top-3 right-4 opacity-[0.06]"><ArrowDownToLine size={44}/></div>
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownToLine size={13} className="text-green-400"/>
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">Entradas hoy</span>
          </div>
          <div className="text-[28px] font-semibold text-[#e8edf2]">{kpis.entradasHoy}</div>
          <div className="text-[11px] text-[#5f6f80] mt-1">
            {kpis.entradasHoy > 0 ? formatCurrency(kpis.valorHoy, simboloMoneda) : 'Sin movimientos hoy'}
          </div>
        </div>

        <div className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-amber-500"/>
          <div className="absolute top-3 right-4 opacity-[0.06]"><Package size={44}/></div>
          <div className="flex items-center gap-2 mb-2">
            <Package size={13} className="text-amber-400"/>
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">Unidades ingresadas</span>
          </div>
          <div className="text-[28px] font-semibold text-[#e8edf2]">{kpis.totalUnidades.toLocaleString('es-PE')}</div>
          <div className="text-[11px] text-[#5f6f80] mt-1 truncate" title={kpis.topProd}>Top: {kpis.topProd}</div>
        </div>

      </div>

      {/* Tabla */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Registro de Entradas</span>
          <Btn variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={13}/>Nueva Entrada</Btn>
        </div>
        <div className="relative mb-3 max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
          <input className={SI + ' pl-8'} placeholder="Buscar producto, documento..." value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {[
                { l: 'Fecha', k: 'fecha' },
                { l: 'Documento', k: 'documento' },
                { l: 'Producto', k: 'producto' },
                { l: 'Lote', k: 'lote' },
                { l: 'Cantidad', k: 'cantidad', r: true },
                { l: 'Costo Unit.', k: 'costoUnitario', r: true },
                { l: 'Total', k: 'costoTotal', r: true },
                { l: 'Motivo', k: 'motivo' },
                { l: 'Acciones' }
              ].map((h, i) => (
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
              {entradas.length === 0 && <tr><td colSpan={9}><EmptyState icon={ArrowDownToLine} title="Sin entradas" description="Registra tu primera entrada de stock."/></td></tr>}
              {entradas.map(m => {
                const p = productos.find(x => x.id === m.productoId)
                return (
                  <tr key={m.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(m.fecha)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#00c896] font-semibold">{m.documento || '—'}</td>
                    <td className="px-3.5 py-2.5"><div className="font-medium text-[#e8edf2]">{p?.nombre || '—'}</div><div className="text-[11px] text-[#5f6f80]">{p?.sku}</div></td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{m.lote || '—'}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-right text-green-400 font-semibold">+{m.cantidad} <span className="text-[#5f6f80] font-normal text-[11px]">{p?.unidadMedida}</span></td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-right">{formatCurrency(m.costoUnitario, simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-right font-semibold">{formatCurrency(m.costoTotal, simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6] max-w-[140px] truncate">{m.motivo}</td>
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

      <ModalEntrada open={modal} onClose={() => setModal(false)} onSave={handleRegistrar}
        productos={productos} almacenes={almacenes} proveedores={proveedores} simboloMoneda={simboloMoneda}/>
      {verMov && <ModalDetalle mov={verMov} productos={productos} proveedores={proveedores} almacenes={almacenes} simboloMoneda={simboloMoneda} onClose={() => setVerMov(null)}/>}
      <ConfirmDialog open={!!anular} onClose={() => setAnular(null)} onConfirm={() => handleAnular(anular)}
        danger title="Anular entrada"
        message={`¿Anular ${anular?.documento}? Se reducirá el stock en ${anular?.cantidad} ${productos.find(p => p.id === anular?.productoId)?.unidadMedida || 'unidades'} y se registrará un ajuste negativo.`}/>
    </div>
  )
}

function ModalDetalle({ mov, productos, proveedores, almacenes, simboloMoneda, onClose }) {
  const prod = productos.find(p => p.id === mov.productoId)
  const prov = proveedores.find(p => p.id === mov.proveedorId)
  const alm  = almacenes.find(a => a.id === mov.almacenId)
  return (
    <Modal open title={`Entrada — ${mov.documento || 'Detalle'}`} onClose={onClose} size="sm"
      footer={<Btn variant="secondary" onClick={onClose}>Cerrar</Btn>}>
      <div className="flex flex-col divide-y divide-white/[0.05]">
        {[['Documento',mov.documento||'—'],['Fecha',formatDate(mov.fecha)],['Producto',prod?`${prod.sku} — ${prod.nombre}`:'—'],['Almacén',alm?.nombre||'—'],['Proveedor',prov?.razonSocial||'—'],['Lote',mov.lote||'—'],['Cantidad',`+${mov.cantidad} ${prod?.unidadMedida||''}`],['Costo Unit.',formatCurrency(mov.costoUnitario,simboloMoneda)],['Total',formatCurrency(mov.costoTotal,simboloMoneda)],['Motivo',mov.motivo||'—'],['Notas',mov.notas||'—']].map(([k,v]) => (
          <div key={k} className="flex justify-between gap-3 py-2">
            <span className="text-[12px] text-[#5f6f80] shrink-0">{k}</span>
            <span className="text-[12px] text-[#e8edf2] font-medium text-right">{v}</span>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function ModalEntrada({ open, onClose, onSave, productos, almacenes, proveedores, simboloMoneda }) {
  const init = { productoId:'', almacenId:almacenes[0]?.id||'', proveedorId:'', cantidad:'', costoUnitario:'', lote:'', fecha:fechaHoy(), motivo:'Compra', documento:'', notas:'' }
  const [form, setForm] = useState(init)
  const [err,  setErr]  = useState({})
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const prod  = productos.find(p => p.id === form.productoId)
  const pmp   = prod ? calcularPMP(prod.batches || []) : 0
  const total = form.cantidad && form.costoUnitario ? +(+form.cantidad * +form.costoUnitario).toFixed(2) : 0
  const validate = () => {
    const e = {}
    if (!form.productoId)                               e.productoId    = 'Requerido'
    if (!form.cantidad || +form.cantidad <= 0)          e.cantidad      = 'Mayor a 0'
    if (!form.costoUnitario || +form.costoUnitario < 0) e.costoUnitario = 'Requerido'
    setErr(e); return Object.keys(e).length === 0
  }
  function handleSave() { if (!validate()) return; onSave(form); setForm(init); setErr({}) }
  return (
    <Modal open={open} onClose={onClose} title="Nueva Entrada de Stock" size="lg"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={handleSave}><ArrowDownToLine size={13}/>Registrar Entrada</Btn></>}>
      <Field label="Producto *" error={err.productoId}>
        <select className={SEL} value={form.productoId} onChange={e => f('productoId', e.target.value)}>
          <option value="">Seleccionar...</option>
          {productos.filter(p => p.activo !== false).map(p => <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>)}
        </select>
        {prod && <span className="text-[11px] text-[#5f6f80] mt-1">Stock actual: <span className="text-[#e8edf2] font-medium">{prod.stockActual} {prod.unidadMedida}</span> · PMP: <span className="text-[#00c896] font-medium">{formatCurrency(pmp, simboloMoneda)}</span></span>}
      </Field>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Cantidad *" error={err.cantidad}><input type="number" className={SI} value={form.cantidad} onChange={e => f('cantidad',e.target.value)} min="0.01" step="0.01"/></Field>
        <Field label="Costo Unitario *" error={err.costoUnitario}>
          <input type="number" className={SI} value={form.costoUnitario} onChange={e => f('costoUnitario',e.target.value)} min="0" step="0.01"/>
          {total > 0 && <span className="text-[11px] text-[#5f6f80] mt-1">Total: <span className="text-[#00c896] font-semibold">{formatCurrency(total,simboloMoneda)}</span></span>}
        </Field>
        <Field label="Almacén"><select className={SEL} value={form.almacenId} onChange={e => f('almacenId',e.target.value)}>{almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></Field>
        <Field label="Proveedor"><select className={SEL} value={form.proveedorId} onChange={e => f('proveedorId',e.target.value)}><option value="">Sin proveedor</option>{proveedores.map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}</select></Field>
        <Field label="N° Lote"><input className={SI} value={form.lote} onChange={e => f('lote',e.target.value)} placeholder="L-2025-001"/></Field>
        <Field label="Fecha"><input type="date" className={SI} value={form.fecha} onChange={e => f('fecha',e.target.value)}/></Field>
        <Field label="N° Documento"><input className={SI} value={form.documento} onChange={e => f('documento',e.target.value)} placeholder="Auto-generado"/></Field>
        <Field label="Motivo"><select className={SEL} value={form.motivo} onChange={e => f('motivo',e.target.value)}>{MOTIVOS_E.map(m => <option key={m}>{m}</option>)}</select></Field>
      </div>
      <Field label="Notas"><textarea className={SI+' resize-y min-h-[56px]'} value={form.notas} onChange={e => f('notas',e.target.value)} placeholder="Observaciones..."/></Field>
    </Modal>
  )
}
