import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, ArrowDownToLine, Eye, XCircle, Package, DollarSign, Calendar, TrendingUp, Download, FileText, X } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoy, generarNumDoc } from '../utils/helpers'
import { calcularPMP } from '../utils/valorizacion'
import * as storage from '../services/storage'
import BarcodeScanner from '../components/ui/BarcodeScanner'
import { Modal, ConfirmDialog, EmptyState, Btn, Field } from '../components/ui/index'
import { exportarMovimientosXLSX } from '../utils/exportXLSX'
import { exportarMovimientosPDF } from '../utils/exportPDF'

const SI  = 'px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 w-full font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'
const MOTIVOS_E = ['Compra','Reposición','Devolución de cliente','Ajuste positivo','Inventario inicial','Otro']

export default function Entradas() {
  const { movimientos, productos, almacenes, proveedores, recargarProductos, recargarMovimientos, toast, simboloMoneda , config } = useApp()
  const [modal, setModal]       = useState(false)
  const [verMov, setVerMov]     = useState(null)
  const [anular, setAnular]     = useState(null)
  const [busqueda,  setBusqueda]  = useState('')
  const [filtAlm,   setFiltAlm]   = useState('')
  const [filtProv,  setFiltProv]  = useState('')
  const [filtMotivo,setFiltMotivo]= useState('')

  const entradas = useMemo(() =>
    movimientos
      .filter(m => m.tipo === 'ENTRADA')
      .filter(m => {
        // Búsqueda general: nombre producto o documento
        if (busqueda) {
          const q = busqueda.toLowerCase()
          const p = productos.find(x => x.id === m.productoId)
          if (!p?.nombre.toLowerCase().includes(q) && !m.documento?.toLowerCase().includes(q)) return false
        }
        // Filtro almacén
        if (filtAlm   && m.almacenId   !== filtAlm)   return false
        // Filtro proveedor
        if (filtProv  && m.proveedorId !== filtProv)  return false
        // Filtro motivo
        if (filtMotivo && !m.motivo?.toLowerCase().includes(filtMotivo.toLowerCase())) return false
        // Filtro N° documento
        return true
      })
  , [movimientos, busqueda, filtAlm, filtProv, filtMotivo, productos])

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

  const hayFiltros = busqueda || filtAlm || filtProv || filtMotivo
  function limpiarFiltros() { setBusqueda(''); setFiltAlm(''); setFiltProv(''); setFiltMotivo('') }

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
        {/* ── Fila 1: título + botones ── */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] whitespace-nowrap">Registro de Entradas</span>
          <div className="flex items-center gap-2 shrink-0">
            <Btn variant="ghost" size="sm" onClick={async () => { await exportarMovimientosXLSX(entradas, productos, almacenes, simboloMoneda) }}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={async () => { await exportarMovimientosPDF(entradas, productos, almacenes, simboloMoneda, config?.empresa, 'Entradas de Stock') }}>
              <FileText size={13}/> PDF
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={13}/> Nueva Entrada</Btn>
          </div>
        </div>

        {/* ── Fila 2: buscador izquierda + filtros derecha ── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Buscador — izquierda */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI + ' pl-8 !py-[5px] text-[12px]'} placeholder="Buscar producto o documento..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          {/* Almacén */}
          <select className={SEL} style={{width:148,padding:'5px 8px',fontSize:12}} value={filtAlm} onChange={e=>setFiltAlm(e.target.value)}>
            <option value="">Todos los almacenes</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          {/* Proveedor */}
          <select className={SEL} style={{width:165,padding:'5px 8px',fontSize:12}} value={filtProv} onChange={e=>setFiltProv(e.target.value)}>
            <option value="">Todos los proveedores</option>
            {proveedores.filter(p=>p.activo!==false).map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
          </select>
          {/* Motivo */}
          <select className={SEL} style={{width:148,padding:'5px 8px',fontSize:12}} value={filtMotivo} onChange={e=>setFiltMotivo(e.target.value)}>
            <option value="">Todos los motivos</option>
            {MOTIVOS_E.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {/* Contador + limpiar */}
          <span className="text-[11px] text-[#5f6f80] whitespace-nowrap">
            {entradas.length} resultado{entradas.length !== 1 ? 's' : ''}
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
              {['Fecha','Documento','Producto','Lote','Cantidad','Costo Unit.','Total','Motivo','Acciones'].map((h, i) => (
                <th key={h} className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/[0.08] ${[4,5,6].includes(i) ? 'text-right' : 'text-left'}`}>{h}</th>
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
        productos={productos} almacenes={almacenes} proveedores={proveedores} simboloMoneda={simboloMoneda}
        lectorHabilitado={config?.lectorBarras !== false}/>
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

function ModalEntrada({ open, onClose, onSave, productos, almacenes, proveedores, simboloMoneda, lectorHabilitado = true }) {
  const INIT = {
    productoId:'', almacenId: almacenes[0]?.id || '',
    proveedorId:'', cantidad:'', costoUnitario:'',
    lote:'', fecha: fechaHoy(), motivo:'Compra',
    documento:'', notas:'',
  }
  const [form,        setForm]        = useState(INIT)
  const [err,         setErr]         = useState({})
  const [scannerOpen, setScannerOpen] = useState(false)
  const [busqTexto,   setBusqTexto]   = useState('')
  const [showSugg,    setShowSugg]    = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Reset al abrir/cerrar
  if (!open && form.productoId !== '') { setForm(INIT); setErr({}); setScannerOpen(false); setBusqTexto('') }

  const prod  = productos.find(p => p.id === form.productoId)
  const pmp   = prod ? calcularPMP(prod.batches || []) : 0
  const total = form.cantidad && form.costoUnitario
    ? +(+form.cantidad * +form.costoUnitario).toFixed(2) : 0

  // Sugerencias de producto al escribir
  const sugerencias = useMemo(() => {
    if (!busqTexto.trim()) return []
    const q = busqTexto.toLowerCase()
    return productos.filter(p => p.activo !== false && (
      p.sku?.toLowerCase().includes(q) ||
      p.nombre?.toLowerCase().includes(q) ||
      p.descripcion?.toLowerCase().includes(q)
    )).slice(0, 6)
  }, [busqTexto, productos])

  // Cuando el scanner detecta un código
  function handleScan(codigo) {
    setScannerOpen(false)
    // Buscar por SKU exacto primero, luego parcial
    const encontrado =
      productos.find(p => p.sku?.toLowerCase() === codigo.toLowerCase()) ||
      productos.find(p => p.sku?.toLowerCase().includes(codigo.toLowerCase())) ||
      productos.find(p => p.nombre?.toLowerCase().includes(codigo.toLowerCase()))

    if (encontrado) {
      f('productoId', encontrado.id)
      setBusqTexto(encontrado.sku + ' — ' + encontrado.nombre)
      setShowSugg(false)
      // Pre-rellenar costo unitario con el PMP si no hay costo
      const pmpProd = calcularPMP(encontrado.batches || [])
      if (!form.costoUnitario && pmpProd > 0) f('costoUnitario', pmpProd.toFixed(2))
    } else {
      setBusqTexto(codigo)
      setShowSugg(true)
    }
  }

  function seleccionarProducto(p) {
    f('productoId', p.id)
    setBusqTexto(p.sku + ' — ' + p.nombre)
    setShowSugg(false)
    const pmpProd = calcularPMP(p.batches || [])
    if (!form.costoUnitario && pmpProd > 0) f('costoUnitario', pmpProd.toFixed(2))
  }

  function validate() {
    const e = {}
    if (!form.productoId)                               e.productoId    = 'Requerido'
    if (!form.cantidad || +form.cantidad <= 0)          e.cantidad      = 'Mayor a 0'
    if (!form.costoUnitario || +form.costoUnitario < 0) e.costoUnitario = 'Requerido'
    setErr(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    onSave(form)
    setForm(INIT)
    setErr({})
    setBusqTexto('')
    setScannerOpen(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva Entrada de Stock" size="lg"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSave}>
            <ArrowDownToLine size={13}/> Registrar Entrada
          </Btn>
        </>
      }>

      {/* ── Selector de Producto con Scanner ────────── */}
      <Field label="Producto *" error={err.productoId}>
        <div className="flex gap-2">
          {/* Campo de búsqueda por texto */}
          <div className="relative flex-1">
            <input
              className={SI}
              value={busqTexto}
              onChange={e => { setBusqTexto(e.target.value); setShowSugg(true); if (!e.target.value) f('productoId', '') }}
              onFocus={() => { if (busqTexto) setShowSugg(true) }}
              onBlur={() => setTimeout(() => setShowSugg(false), 180)}
              placeholder="Buscar por SKU o nombre del producto..."
              autoComplete="off"
            />
            {/* Dropdown de sugerencias */}
            {showSugg && sugerencias.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#1a2230] border border-white/[0.12] rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                {sugerencias.map(p => (
                  <button key={p.id} type="button"
                    onMouseDown={() => seleccionarProducto(p)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-white/[0.05] transition-colors border-b border-white/[0.05] last:border-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="font-mono text-[11px] text-[#00c896]">{p.sku}</span>
                        <span className="text-[13px] text-[#e8edf2] ml-2">{p.nombre}</span>
                      </div>
                      <span className={`text-[11px] font-semibold shrink-0 ${p.stockActual <= 0 ? 'text-red-400' : 'text-[#5f6f80]'}`}>
                        {p.stockActual} {p.unidadMedida}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botón Scan — solo si lectorBarras está habilitado en Configuración */}
          {lectorHabilitado && (
            <button type="button"
              onClick={() => setScannerOpen(o => !o)}
              title="Escanear código de barras"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-semibold transition-all shrink-0
                ${scannerOpen
                  ? 'bg-[#00c896]/20 text-[#00c896] border-[#00c896]/40'
                  : 'bg-[#1e2835] text-[#9ba8b6] border-white/[0.08] hover:text-[#00c896] hover:border-[#00c896]/30'
                }`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
                <line x1="7" y1="12" x2="17" y2="12"/>
              </svg>
              {scannerOpen ? 'Cerrar' : 'Scan'}
            </button>
          )}
        </div>

        {/* Panel del Scanner — solo si lectorHabilitado */}
        {lectorHabilitado && scannerOpen && (
          <div className="mt-2 p-4 bg-[#1a2230] rounded-xl border border-[#00c896]/20">
            <BarcodeScanner
              label="Escanear código de barras o QR del producto"
              onDetected={handleScan}
              onClose={() => setScannerOpen(false)}
            />
          </div>
        )}

        {/* Info del producto seleccionado */}
        {prod && (
          <div className="flex items-center gap-3 mt-1.5 px-3 py-2 bg-[#00c896]/8 border border-[#00c896]/20 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00c896] shrink-0"/>
            <span className="text-[12px] text-[#9ba8b6]">
              Stock: <strong className="text-[#e8edf2]">{prod.stockActual} {prod.unidadMedida}</strong>
              <span className="mx-2 text-[#5f6f80]">·</span>
              PMP: <strong className="text-[#00c896]">{formatCurrency(pmp, simboloMoneda)}</strong>
              {prod.stockActual <= 0 && <span className="ml-2 text-red-400 font-semibold">· Sin stock</span>}
            </span>
          </div>
        )}
      </Field>

      {/* ── Resto del formulario ─────────────────────── */}
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Cantidad *" error={err.cantidad}>
          <input type="number" className={SI} value={form.cantidad}
            onChange={e => f('cantidad', e.target.value)} min="0.01" step="0.01" placeholder="0"/>
        </Field>
        <Field label="Costo Unitario *" error={err.costoUnitario}>
          <input type="number" className={SI} value={form.costoUnitario}
            onChange={e => f('costoUnitario', e.target.value)} min="0" step="0.01" placeholder="0.00"/>
          {total > 0 && (
            <span className="text-[11px] text-[#5f6f80] mt-1">
              Total: <span className="text-[#00c896] font-semibold">{formatCurrency(total, simboloMoneda)}</span>
            </span>
          )}
        </Field>
        <Field label="Almacén">
          <select className={SEL} value={form.almacenId} onChange={e => f('almacenId', e.target.value)}>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </Field>
        <Field label="Proveedor">
          <select className={SEL} value={form.proveedorId} onChange={e => f('proveedorId', e.target.value)}>
            <option value="">Sin proveedor</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
          </select>
        </Field>
        <Field label="N° Lote">
          <input className={SI} value={form.lote} onChange={e => f('lote', e.target.value)} placeholder="L-2025-001"/>
        </Field>
        <Field label="Fecha">
          <input type="date" className={SI} value={form.fecha} onChange={e => f('fecha', e.target.value)}/>
        </Field>
        <Field label="N° Documento">
          <input className={SI} value={form.documento} onChange={e => f('documento', e.target.value)} placeholder="Auto-generado"/>
        </Field>
        <Field label="Motivo">
          <select className={SEL} value={form.motivo} onChange={e => f('motivo', e.target.value)}>
            {MOTIVOS_E.map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Notas">
        <textarea className={SI + ' resize-y min-h-[56px]'} value={form.notas}
          onChange={e => f('notas', e.target.value)} placeholder="Observaciones..."/>
      </Field>
    </Modal>
  )
}
