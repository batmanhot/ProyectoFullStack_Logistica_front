import { useState, useMemo } from 'react'
import { Plus, Search, SlidersHorizontal, TrendingUp, TrendingDown, Eye, XCircle, X, Download, FileText } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoyISO, generarNumDoc } from '../utils/helpers'
import { Modal, ConfirmDialog, Badge, Btn, Field, Input, Select, DataTable } from '../components/ui/index'
import { useMovimientosList, useCrearMovimiento } from '../queries/movimientos.queries'
import { useProductosList } from '../queries/productos.queries'
import { useAlmacenesList } from '../queries/almacenes.queries'
import { exportarAjustesXLSX } from '../utils/exportXLSX'
import { exportarAjustesPDF } from '../utils/exportPDF'

const MOTIVOS_POS = ['Sobrante en conteo físico','Devolución no registrada','Error en sistema','Reposición emergencia','Otro']
const MOTIVOS_NEG = ['Faltante en conteo físico','Merma / daño','Robo / pérdida','Producto vencido / dado de baja','Error en sistema','Otro']

export default function Ajustes() {
  const { toast, sesion } = useApp()
  const simboloMoneda = 'S/'

  const { data: movimientos = [], isLoading } = useMovimientosList({ tipo: 'AJUSTE' })
  const { data: productos   = [] }            = useProductosList()
  const { data: almacenes   = [] }            = useAlmacenesList()
  const crearMovimiento                       = useCrearMovimiento()

  const [modal,    setModal]    = useState(false)
  const [verAj,    setVerAj]    = useState(null)
  const [anular,   setAnular]   = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtDir,  setFiltDir]  = useState('')
  const [filtAlm,  setFiltAlm]  = useState('')
  const [filtMotivo, setFiltMotivo] = useState('')

  const productMap = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos])

  const filtered = useMemo(() => {
    return movimientos.filter(m => {
      if (filtDir && m.direccion !== filtDir) return false
      if (filtAlm && m.almacenId !== filtAlm) return false
      if (filtMotivo && !m.motivo?.toLowerCase().includes(filtMotivo.toLowerCase())) return false
      if (busqueda) {
        const q = busqueda.toLowerCase()
        const p = productMap.get(m.productoId)
        if (!p?.nombre?.toLowerCase().includes(q) && !m.documento?.toLowerCase().includes(q) && !m.motivo?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [movimientos, filtDir, filtAlm, filtMotivo, busqueda, productMap])

  const totales = useMemo(() => ({
    incrementos: filtered.filter(m => m.direccion === 'incremento').reduce((s, m) => s + Number(m.costoTotal || 0), 0),
    decrementos: filtered.filter(m => m.direccion === 'decremento').reduce((s, m) => s + Number(m.costoTotal || 0), 0),
    count: filtered.length,
  }), [filtered])

  const hayFiltros = busqueda || filtDir || filtAlm || filtMotivo
  function limpiarFiltros() { setBusqueda(''); setFiltDir(''); setFiltAlm(''); setFiltMotivo('') }

  async function handleRegistrar(data) {
    const res = await crearMovimiento.mutateAsync(data)
    if (res.error) { toast(res.error, 'error'); return }
    toast('Ajuste registrado', 'success')
    setModal(false)
  }

  async function handleAnular(mov) {
    // mov.cantidad ya viene firmado desde el backend (positivo = incremento,
    // negativo = decremento) — el campo `direccion` nunca se persiste, así
    // que el sentido original se lee del signo de la cantidad, no de mov.direccion.
    const eraIncremento = Number(mov.cantidad) >= 0
    const res = await crearMovimiento.mutateAsync({
      tipo:          'AJUSTE',
      direccion:     eraIncremento ? 'decremento' : 'incremento',
      productoId:    mov.productoId,
      almacenId:     mov.almacenId,
      cantidad:      Math.abs(Number(mov.cantidad)),
      costoUnitario: Number(mov.costoUnitario || 0),
      motivo:        `Anulación de ${mov.documento || 'ajuste'}`,
      documento:     `ANUL-${mov.documento || String(mov.id).slice(0, 8)}`,
    })
    if (res.error) { toast(res.error, 'error'); setAnular(null); return }
    toast('Ajuste anulado', 'success')
    setAnular(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-[#22c55e]"/>
          <div className="absolute top-3 right-4 opacity-[0.06]"><TrendingUp size={44}/></div>
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={13} className="text-green-400"/><span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">Incrementos</span></div>
          <div className="text-[17px] font-semibold text-[#e8edf2] font-mono">{formatCurrency(totales.incrementos, simboloMoneda)}</div>
          <div className="text-[11px] text-[#5f6f80] mt-1">{filtered.filter(m => m.direccion === 'incremento').length} ajustes positivos</div>
        </div>
        <div className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-red-500"/>
          <div className="absolute top-3 right-4 opacity-[0.06]"><TrendingDown size={44}/></div>
          <div className="flex items-center gap-2 mb-2"><TrendingDown size={13} className="text-red-400"/><span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">Decrementos</span></div>
          <div className="text-[17px] font-semibold text-[#e8edf2] font-mono">{formatCurrency(totales.decrementos, simboloMoneda)}</div>
          <div className="text-[11px] text-[#5f6f80] mt-1">{filtered.filter(m => m.direccion === 'decremento').length} ajustes negativos</div>
        </div>
        <div className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-[#3b82f6]"/>
          <div className="absolute top-3 right-4 opacity-[0.06]"><SlidersHorizontal size={44}/></div>
          <div className="flex items-center gap-2 mb-2"><SlidersHorizontal size={13} className="text-blue-400"/><span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">Total ajustes</span></div>
          <div className="text-[28px] font-semibold text-[#e8edf2]">{movimientos.length}</div>
          <div className="text-[11px] text-[#5f6f80] mt-1">{totales.count} en vista actual</div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] whitespace-nowrap">Ajustes de Inventario</span>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={() => exportarAjustesXLSX(filtered, productos, almacenes, simboloMoneda)}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => exportarAjustesPDF(filtered, productos, almacenes, simboloMoneda, sesion?.nombre)}>
              <FileText size={13}/> PDF
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={13}/> Nuevo Ajuste</Btn>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <Input className="pl-8 !py-[5px] text-[12px]" placeholder="Buscar producto, motivo o documento..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <Select style={{width:160,padding:'5px 8px',fontSize:12}} value={filtDir} onChange={e => setFiltDir(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="incremento">Positivo (+)</option>
            <option value="decremento">Negativo (-)</option>
          </Select>
          <Select style={{width:148,padding:'5px 8px',fontSize:12}} value={filtAlm} onChange={e => setFiltAlm(e.target.value)}>
            <option value="">Todos los almacenes</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
          <span className="text-[11px] text-[#5f6f80] whitespace-nowrap">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          {hayFiltros && <Btn variant="ghost" size="sm" onClick={limpiarFiltros}><X size={12}/> Limpiar</Btn>}
        </div>

        <DataTable
          loading={isLoading}
          rows={filtered}
          rowKey={m => m.id}
          onRowClick={m => setVerAj(m)}
          emptyIcon={SlidersHorizontal}
          emptyTitle="Sin ajustes"
          emptyDescription="Registra tu primer ajuste de inventario."
          columns={[
            { key:'fecha', header:'Fecha', render: m => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatDate(m.fecha || m.createdAt)}</span> },
            { key:'documento', header:'Documento', render: m => <span className="font-mono text-[12px] text-[#00c896]">{m.documento || '—'}</span> },
            { key:'producto', header:'Producto', render: m => {
              const p = productMap.get(m.productoId)
              return <><div className="font-medium text-[#e8edf2]">{p?.nombre || '—'}</div><div className="text-[11px] text-[#5f6f80]">{p?.sku}</div></>
            } },
            { key:'tipo', header:'Tipo', render: m => {
              const pos = Number(m.cantidad) >= 0
              return <Badge variant={pos ? 'success' : 'danger'}>{pos ? <TrendingUp size={10}/> : <TrendingDown size={10}/>} {pos ? 'Positivo' : 'Negativo'}</Badge>
            } },
            { key:'cantidad', header:'Cantidad', align:'right', render: m => {
              const cant = Number(m.cantidad)
              const pos  = cant >= 0
              return <span className={`font-mono text-[12px] font-semibold ${pos ? 'text-green-400' : 'text-red-400'}`}>{pos ? '+' : ''}{cant}</span>
            } },
            { key:'costoUnit', header:'Costo Unit.', align:'right', render: m => <span className="font-mono text-[12px]">{formatCurrency(Number(m.costoUnitario || 0), simboloMoneda)}</span> },
            { key:'total', header:'Total', align:'right', render: m => <span className="font-mono text-[12px] font-semibold">{formatCurrency(Number(m.costoTotal || 0), simboloMoneda)}</span> },
            { key:'motivo', header:'Motivo', render: m => <span className="text-[12px] text-[#9ba8b6] max-w-[140px] truncate block">{m.motivo}</span> },
            { key:'acciones', header:'Acciones', stopPropagation: true, render: m => (
              <div className="flex gap-1">
                <Btn variant="ghost" size="icon" title="Ver detalle" onClick={() => setVerAj(m)}><Eye size={13}/></Btn>
                <Btn variant="ghost" size="icon" title="Anular" className="text-red-400 hover:text-red-300" onClick={() => setAnular(m)}><XCircle size={13}/></Btn>
              </div>
            ) },
          ]}
        />
      </div>

      {/* Guía de uso */}
      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Ajustes?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {[
            ['1. Elegir tipo',        'Positivo (+) suma stock al almacén — ej. sobrante en conteo físico. Negativo (-) resta stock — ej. merma, daño o pérdida.'],
            ['2. Producto y almacén', 'Selecciona el producto y el almacén afectado. En ajustes negativos, el sistema valida que haya stock TOTAL suficiente (sin asignar + en ubicaciones).'],
            ['3. Costo y motivo',     'El costo unitario es opcional pero recomendado — sirve para valorizar el impacto contable del ajuste. El motivo queda registrado para auditoría.'],
            ['4. Queda en el Kardex', 'Un Ajuste es un Movimiento definitivo: no se edita ni se borra. Si te equivocaste, corrige con un nuevo Ajuste en sentido contrario.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      <ModalAjuste open={modal} onClose={() => setModal(false)} onSave={handleRegistrar}
        productos={productos} almacenes={almacenes} simboloMoneda={simboloMoneda}
        saving={crearMovimiento.isPending}/>

      {verAj && <ModalDetalle aj={verAj} productMap={productMap} almacenes={almacenes} simboloMoneda={simboloMoneda} onClose={() => setVerAj(null)}/>}

      <ConfirmDialog open={!!anular} onClose={() => setAnular(null)} onConfirm={() => handleAnular(anular)}
        danger title="Anular ajuste"
        message={`¿Anular ${anular?.documento}? Se creará un ajuste en sentido contrario que revertirá el efecto en el stock.`}/>
    </div>
  )
}

function ModalDetalle({ aj, productMap, almacenes, simboloMoneda, onClose }) {
  const p    = productMap.get(aj.productoId)
  const alm  = almacenes.find(a => a.id === aj.almacenId)
  const cant = Number(aj.cantidad)
  const pos  = cant >= 0
  return (
    <Modal open title={`Ajuste — ${aj.documento || 'Detalle'}`} onClose={onClose} size="sm"
      footer={<Btn variant="secondary" onClick={onClose}>Cerrar</Btn>}>
      <div className="flex flex-col divide-y divide-white/5">
        {[
          ['Documento',  aj.documento || '—'],
          ['Fecha',      formatDate(aj.fecha || aj.createdAt)],
          ['Producto',   p ? `${p.sku} — ${p.nombre}` : '—'],
          ['Almacén',    alm?.nombre || '—'],
          ['Tipo',       pos ? 'Positivo (+)' : 'Negativo (-)'],
          ['Cantidad',   `${pos ? '+' : ''}${cant} ${p?.unidadMedida || ''}`],
          ['Costo Unit.',formatCurrency(Number(aj.costoUnitario || 0), simboloMoneda)],
          ['Total',      formatCurrency(Number(aj.costoTotal || 0), simboloMoneda)],
          ['Motivo',     aj.motivo || '—'],
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

function ModalAjuste({ open, onClose, onSave, productos, almacenes, simboloMoneda, saving }) {
  const INIT = { productoId:'', almacenId:'', direccion:'incremento', cantidad:'', costoUnitario:'', fecha: fechaHoyISO(), motivo: MOTIVOS_POS[0], documento:'' }
  const [form, setForm] = useState(INIT)
  const [err,  setErr]  = useState({})
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useMemo(() => {
    if (open) { setForm({ ...INIT, almacenId: almacenes[0]?.id || '', documento: generarNumDoc('AJU') }); setErr({}) }
  }, [open]) // eslint-disable-line

  const motivosDisp = form.direccion === 'incremento' ? MOTIVOS_POS : MOTIVOS_NEG

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
    onSave({
      tipo:          'AJUSTE',
      direccion:     form.direccion,
      productoId:    form.productoId,
      almacenId:     form.almacenId,
      cantidad:      +form.cantidad,
      costoUnitario: +form.costoUnitario || 0,
      motivo:        form.motivo,
      documento:     form.documento || undefined,
    })
  }

  const productosActivos = productos.filter(p => p.estado === 'Activo' || p.activo !== false)

  return (
    <Modal open={open} onClose={onClose} title="Nuevo Ajuste de Inventario" size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Registrar Ajuste'}</Btn></>}>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Documento"><Input value={form.documento} onChange={e => f('documento', e.target.value)} placeholder="AJU-001"/></Field>
        <Field label="Fecha"><Input type="date" value={form.fecha} onChange={e => f('fecha', e.target.value)}/></Field>
      </div>

      <Field label="Tipo de ajuste *">
        <div className="flex gap-3">
          {[['incremento','Positivo (+)','text-green-400'],['decremento','Negativo (-)','text-red-400']].map(([val, lbl, cls]) => (
            <label key={val} className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${form.direccion === val ? 'border-[#00c896] bg-[#00c896]/10' : 'border-white/8 bg-[#1a2230]'}`}>
              <input type="radio" name="direccion" value={val} checked={form.direccion === val}
                onChange={() => { f('direccion', val); f('motivo', val === 'incremento' ? MOTIVOS_POS[0] : MOTIVOS_NEG[0]) }} className="accent-[#00c896]"/>
              <span className={`text-[13px] font-medium ${cls}`}>{lbl}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field label="Producto *" error={err.productoId}>
        <Select value={form.productoId} onChange={e => f('productoId', e.target.value)}>
          <option value="">Seleccionar producto...</option>
          {productosActivos.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>)}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Almacén *" error={err.almacenId}>
          <Select value={form.almacenId} onChange={e => f('almacenId', e.target.value)}>
            <option value="">Seleccionar...</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Motivo">
          <Select value={form.motivo} onChange={e => f('motivo', e.target.value)}>
            {motivosDisp.map(m => <option key={m}>{m}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Cantidad *" error={err.cantidad}>
          <Input type="number" value={form.cantidad} onChange={e => f('cantidad', e.target.value)} min="0.001" step="any" placeholder="0"/>
        </Field>
        <Field label={`Costo unitario (${simboloMoneda})`}>
          <Input type="number" value={form.costoUnitario} onChange={e => f('costoUnitario', e.target.value)} min="0" step="0.01" placeholder="0.00"/>
        </Field>
      </div>
    </Modal>
  )
}
