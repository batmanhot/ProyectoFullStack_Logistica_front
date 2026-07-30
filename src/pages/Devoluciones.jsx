import { useState, useMemo } from 'react'
import { Plus, Search, RotateCcw, ArrowDownToLine, ArrowUpFromLine, Eye, X, Download, FileText } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoyISO, generarNumDoc } from '../utils/helpers'
import { Modal, EmptyState, Btn, Field } from '../components/ui/index'
import { useMovimientosList, useCrearMovimiento } from '../queries/movimientos.queries'
import { useProductosList } from '../queries/productos.queries'
import { useAlmacenesList } from '../queries/almacenes.queries'
import { useProveedoresList } from '../queries/proveedores.queries'
import { useClientesList } from '../queries/clientes.queries'
import { exportarDevolucionesXLSX } from '../utils/exportXLSX'
import { exportarDevolucionesPDF } from '../utils/exportPDF'

const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'
const MOTIVOS_CLI  = ['Error en pedido','Producto defectuoso','No solicitado','Exceso de cantidad','Cambio de producto','Otro']
const MOTIVOS_PROV = ['Producto en mal estado','Cantidad incorrecta','Producto vencido','No coincide con OC','Acuerdo comercial','Otro']
const ESTADOS_ITEM = ['BUENO','DAÑADO','VENCIDO','PARA REVISIÓN']

export default function Devoluciones() {
  const { toast, sesion } = useApp()
  const simboloMoneda = 'S/'

  // Cargamos todos los movimientos sin filtro de tipo y filtramos por motivo "devoluci"
  const { data: todosMovimientos = [], isLoading } = useMovimientosList()
  const { data: productos   = [] }                 = useProductosList()
  const { data: almacenes   = [] }                 = useAlmacenesList()
  const { data: proveedores = [] }                 = useProveedoresList()
  const { data: clientes    = [] }                 = useClientesList()
  const crearMovimiento                            = useCrearMovimiento()

  const [modal,    setModal]    = useState(false)
  const [verDev,   setVerDev]   = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtTipo, setFiltTipo] = useState('')
  const [filtAlm,  setFiltAlm]  = useState('')

  const productMap = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos])
  const almacenMap = useMemo(() => new Map(almacenes.map(a => [a.id, a])), [almacenes])

  // Devolucion = movimiento cuyo motivo contiene "devoluci" o documento empieza por "DEV"
  const devoluciones = useMemo(() => {
    return todosMovimientos.filter(m => {
      const isDev = m.motivo?.toLowerCase().includes('devoluci') || m.documento?.toUpperCase().startsWith('DEV')
      return isDev
    })
  }, [todosMovimientos])

  const filtered = useMemo(() => {
    return devoluciones.filter(m => {
      if (filtTipo && m.tipo !== filtTipo) return false
      if (filtAlm  && m.almacenId !== filtAlm) return false
      if (busqueda) {
        const q = busqueda.toLowerCase()
        const p = productMap.get(m.productoId)
        if (!p?.nombre?.toLowerCase().includes(q) && !m.documento?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [devoluciones, filtTipo, filtAlm, busqueda, productMap])

  const kpis = useMemo(() => {
    const deCliente   = devoluciones.filter(m => m.tipo === 'ENTRADA')
    const aProveedor  = devoluciones.filter(m => m.tipo === 'SALIDA')
    const valorCli    = deCliente.reduce((s, m) => s + Number(m.costoUnitario || 0) * Number(m.cantidad || 0), 0)
    const valorProv   = aProveedor.reduce((s, m) => s + Number(m.costoUnitario || 0) * Number(m.cantidad || 0), 0)
    return { total: devoluciones.length, cliente: deCliente.length, proveedor: aProveedor.length, valorCli, valorProv }
  }, [devoluciones])

  const hayFiltros = busqueda || filtTipo || filtAlm
  function limpiarFiltros() { setBusqueda(''); setFiltTipo(''); setFiltAlm('') }

  async function handleRegistrar(data) {
    const res = await crearMovimiento.mutateAsync(data)
    if (res.error) { toast(res.error, 'error'); return }
    toast('Devolución registrada', 'success')
    setModal(false)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {[
          { label:'Total devoluciones', val: kpis.total, sub:'registradas en sistema', color:'#a855f7', Icon:RotateCcw },
          { label:'De clientes (ENTRADA)', val: kpis.cliente, sub: formatCurrency(kpis.valorCli, simboloMoneda) + ' en stock recuperado', color:'#22c55e', Icon:ArrowDownToLine },
          { label:'A proveedores (SALIDA)', val: kpis.proveedor, sub: formatCurrency(kpis.valorProv, simboloMoneda) + ' en devoluciones', color:'#ef4444', Icon:ArrowUpFromLine },
        ].map(({ label, val, sub, color, Icon }) => (
          <div key={label} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="absolute top-3 right-4 opacity-[0.06]"><Icon size={44}/></div>
            <div className="flex items-center gap-2 mb-2"><Icon size={13} style={{ color }}/><span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">{label}</span></div>
            <div className="text-[28px] font-semibold text-[#e8edf2]">{val}</div>
            <div className="text-[11px] text-[#5f6f80] mt-1 truncate">{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] whitespace-nowrap">Registro de Devoluciones</span>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={() => exportarDevolucionesXLSX(filtered, productos, almacenes, simboloMoneda)}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => exportarDevolucionesPDF(filtered, productos, almacenes, simboloMoneda, sesion?.nombre)}>
              <FileText size={13}/> PDF
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={13}/> Nueva Devolución</Btn>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI + ' pl-8 !py-[5px] text-[12px]'} placeholder="Buscar producto o documento..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <select className={SEL} style={{width:165,padding:'5px 8px',fontSize:12}} value={filtTipo} onChange={e => setFiltTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="ENTRADA">De cliente (entrada)</option>
            <option value="SALIDA">A proveedor (salida)</option>
          </select>
          <select className={SEL} style={{width:148,padding:'5px 8px',fontSize:12}} value={filtAlm} onChange={e => setFiltAlm(e.target.value)}>
            <option value="">Todos los almacenes</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          <span className="text-[11px] text-[#5f6f80] whitespace-nowrap">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          {hayFiltros && <Btn variant="ghost" size="sm" onClick={limpiarFiltros}><X size={12}/> Limpiar</Btn>}
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {['Fecha','Documento','Tipo','Producto','Almacén','Cantidad','Total','Motivo','Acciones'].map((h, i) => (
                <th key={h} className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/8 ${[5,6].includes(i) ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={9} className="text-center text-[#5f6f80] py-8 text-[12px]">Cargando devoluciones...</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={9}><EmptyState icon={RotateCcw} title="Sin devoluciones" description="Registra la primera devolución de cliente o proveedor."/></td></tr>}
              {filtered.map(m => {
                const p   = productMap.get(m.productoId)
                const alm = almacenMap.get(m.almacenId)
                const esCli = m.tipo === 'ENTRADA'
                return (
                  <tr key={m.id} className="border-b border-white/6 last:border-0 hover:bg-white/2">
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(m.fecha || m.createdAt)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#00c896]">{m.documento || '—'}</td>
                    <td className="px-3.5 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${esCli ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                        {esCli ? <ArrowDownToLine size={9}/> : <ArrowUpFromLine size={9}/>}
                        {esCli ? 'Cliente' : 'Proveedor'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5"><div className="font-medium text-[#e8edf2]">{p?.nombre || '—'}</div><div className="text-[11px] text-[#5f6f80]">{p?.sku}</div></td>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6]">{alm?.nombre || '—'}</td>
                    <td className={`px-3.5 py-2.5 font-mono text-[12px] text-right font-semibold ${esCli ? 'text-green-400' : 'text-red-400'}`}>{esCli ? '+' : '-'}{m.cantidad}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-right">{formatCurrency(Number(m.costoTotal || 0), simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6] max-w-[130px] truncate">{m.motivo}</td>
                    <td className="px-3.5 py-2.5">
                      <Btn variant="ghost" size="icon" title="Ver detalle" onClick={() => setVerDev(m)}><Eye size={13}/></Btn>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guía de uso */}
      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Devoluciones?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {[
            ['1. Elegir tipo',        'De cliente: el producto vuelve a la empresa y ENTRA al stock. A proveedor: la empresa devuelve el producto y SALE del stock.'],
            ['2. Producto y almacén', 'Selecciona el producto, el almacén donde se recibe o desde donde sale, y opcionalmente el cliente o proveedor relacionado.'],
            ['3. Validación',         'En devoluciones a proveedor el sistema valida que haya stock TOTAL suficiente en el almacén (sin asignar + en ubicaciones) antes de descontarlo.'],
            ['4. Registro',           'Se guarda como un Movimiento ENTRADA o SALIDA con el motivo "Devolución de cliente/proveedor" — visible en el Kardex del producto.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      <ModalDevolucion open={modal} onClose={() => setModal(false)} onSave={handleRegistrar}
        productos={productos} almacenes={almacenes} proveedores={proveedores} clientes={clientes}
        simboloMoneda={simboloMoneda} saving={crearMovimiento.isPending}/>

      {verDev && <ModalDetalle mov={verDev} productMap={productMap} almacenMap={almacenMap}
        proveedores={proveedores} clientes={clientes} simboloMoneda={simboloMoneda} onClose={() => setVerDev(null)}/>}
    </div>
  )
}

function ModalDetalle({ mov, productMap, almacenMap, proveedores, clientes, simboloMoneda, onClose }) {
  const p   = productMap.get(mov.productoId)
  const alm = almacenMap.get(mov.almacenId)
  const esCli = mov.tipo === 'ENTRADA'
  const contraparte = esCli
    ? clientes.find(c => c.id === mov.clienteId)?.nombre || '—'
    : proveedores.find(pr => pr.id === mov.proveedorId)?.razonSocial || '—'
  return (
    <Modal open title={`Devolución — ${mov.documento || 'Detalle'}`} onClose={onClose} size="sm"
      footer={<Btn variant="secondary" onClick={onClose}>Cerrar</Btn>}>
      <div className="flex flex-col divide-y divide-white/5">
        {[
          ['Documento',  mov.documento || '—'],
          ['Fecha',      formatDate(mov.fecha || mov.createdAt)],
          ['Tipo',       esCli ? 'Devolución de cliente' : 'Devolución a proveedor'],
          [esCli ? 'Cliente' : 'Proveedor', contraparte],
          ['Producto',   p ? `${p.sku} — ${p.nombre}` : '—'],
          ['Almacén',    alm?.nombre || '—'],
          ['Cantidad',   `${esCli ? '+' : '-'}${mov.cantidad} ${p?.unidadMedida || ''}`],
          ['Costo Unit.',formatCurrency(Number(mov.costoUnitario || 0), simboloMoneda)],
          ['Total',      formatCurrency(Number(mov.costoTotal || 0), simboloMoneda)],
          ['Motivo',     mov.motivo || '—'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-2">
            <span className="text-[12px] text-[#5f6f80] shrink-0">{k}</span>
            <span className="text-[12px] text-[#e8edf2] font-medium text-right">{v}</span>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function ModalDevolucion({ open, onClose, onSave, productos, almacenes, proveedores, clientes, simboloMoneda, saving }) {
  const INIT = { tipoDev:'CLIENTE', productoId:'', almacenId:'', referenciaId:'', cantidad:'', costoUnitario:'', fecha: fechaHoyISO(), motivo: MOTIVOS_CLI[0], documento:'', estadoItem:'BUENO' }
  const [form, setForm] = useState(INIT)
  const [err,  setErr]  = useState({})
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useMemo(() => {
    if (open) { setForm({ ...INIT, almacenId: almacenes[0]?.id || '', documento: generarNumDoc('DEV') }); setErr({}) }
  }, [open]) // eslint-disable-line

  function validate() {
    const e = {}
    if (!form.productoId) e.productoId = 'Requerido'
    if (!form.almacenId)  e.almacenId  = 'Requerido'
    if (!form.cantidad || +form.cantidad <= 0) e.cantidad = 'Debe ser > 0'
    setErr(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const esCli = form.tipoDev === 'CLIENTE'
    onSave({
      tipo:          esCli ? 'ENTRADA' : 'SALIDA',
      productoId:    form.productoId,
      almacenId:     form.almacenId,
      cantidad:      +form.cantidad,
      costoUnitario: +form.costoUnitario || 0,
      motivo:        `Devolución de ${esCli ? 'cliente' : 'proveedor'}: ${form.motivo}`,
      documento:     form.documento || undefined,
      proveedorId:   !esCli ? form.referenciaId || undefined : undefined,
    })
  }

  const motivos           = form.tipoDev === 'CLIENTE' ? MOTIVOS_CLI : MOTIVOS_PROV
  const productosActivos  = productos.filter(p => p.estado === 'Activo' || p.activo !== false)
  const totalCosto        = (+form.cantidad || 0) * (+form.costoUnitario || 0)
  const esCli             = form.tipoDev === 'CLIENTE'

  return (
    <Modal open={open} onClose={onClose} title="Nueva Devolución" size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Registrar Devolución'}</Btn></>}>

      <Field label="Tipo de devolución *">
        <div className="flex gap-3">
          {[['CLIENTE','De cliente (entra al stock)','text-green-400'],['PROVEEDOR','A proveedor (sale del stock)','text-red-400']].map(([val, lbl, cls]) => (
            <label key={val} className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${form.tipoDev === val ? 'border-[#00c896] bg-[#00c896]/10' : 'border-white/8 bg-[#1a2230]'}`}>
              <input type="radio" name="tipoDev" value={val} checked={form.tipoDev === val}
                onChange={() => { f('tipoDev', val); f('motivo', val === 'CLIENTE' ? MOTIVOS_CLI[0] : MOTIVOS_PROV[0]); f('referenciaId', '') }}
                className="accent-[#00c896]"/>
              <span className={`text-[12px] font-medium ${cls}`}>{lbl}</span>
            </label>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Documento"><input className={SI} value={form.documento} onChange={e => f('documento', e.target.value)} placeholder="DEV-001"/></Field>
        <Field label="Fecha"><input type="date" className={SI} value={form.fecha} onChange={e => f('fecha', e.target.value)}/></Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={esCli ? 'Cliente (opcional)' : 'Proveedor (opcional)'}>
          <select className={SEL} value={form.referenciaId} onChange={e => f('referenciaId', e.target.value)}>
            <option value="">Seleccionar...</option>
            {(esCli ? clientes : proveedores).map(c => (
              <option key={c.id} value={c.id}>{esCli ? (c.nombre || c.razonSocial) : c.razonSocial}</option>
            ))}
          </select>
        </Field>
        <Field label="Estado del ítem">
          <select className={SEL} value={form.estadoItem} onChange={e => f('estadoItem', e.target.value)}>
            {ESTADOS_ITEM.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Producto *" error={err.productoId}>
        <select className={SEL} value={form.productoId} onChange={e => f('productoId', e.target.value)}>
          <option value="">Seleccionar producto...</option>
          {productosActivos.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>)}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Almacén *" error={err.almacenId}>
          <select className={SEL} value={form.almacenId} onChange={e => f('almacenId', e.target.value)}>
            <option value="">Seleccionar...</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </Field>
        <Field label="Motivo">
          <select className={SEL} value={form.motivo} onChange={e => f('motivo', e.target.value)}>
            {motivos.map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Cantidad *" error={err.cantidad}>
          <input type="number" className={SI} value={form.cantidad} onChange={e => f('cantidad', e.target.value)} min="0.001" step="any" placeholder="0"/>
        </Field>
        <Field label="Costo unitario (S/)">
          <input type="number" className={SI} value={form.costoUnitario} onChange={e => f('costoUnitario', e.target.value)} min="0" step="0.01" placeholder="0.00"/>
        </Field>
      </div>

      {totalCosto > 0 && (
        <div className="bg-[#1a2230] rounded-lg px-4 py-2.5 flex justify-between items-center">
          <span className="text-[12px] text-[#5f6f80]">Valor devolución:</span>
          <span className={`font-mono font-semibold ${esCli ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(totalCosto, simboloMoneda)}</span>
        </div>
      )}
    </Modal>
  )
}
