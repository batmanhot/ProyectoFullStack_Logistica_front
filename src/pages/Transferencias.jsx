import { useState, useMemo } from 'react'
import { Plus, Search, ArrowRightLeft, Eye, XCircle, X, Download, FileText } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoyISO, generarNumDoc } from '../utils/helpers'
import { Modal, ConfirmDialog, Btn, Field, Input, Select, DataTable } from '../components/ui/index'
import { useMovimientosList, useCrearMovimiento } from '../queries/movimientos.queries'
import { useProductosList } from '../queries/productos.queries'
import { useAlmacenesList } from '../queries/almacenes.queries'
import { exportarTransferenciasXLSX } from '../utils/exportXLSX'
import { exportarTransferenciasPDF } from '../utils/exportPDF'

const MOTIVOS = ['Rebalanceo de stock','Consolidación de almacén','Pedido urgente','Reorganización','Otro']

export default function Transferencias() {
  const { toast, sesion } = useApp()
  const simboloMoneda = 'S/'

  const { data: movimientos = [], isLoading } = useMovimientosList({ tipo: 'TRANSFERENCIA' })
  const { data: productos   = [] }            = useProductosList()
  const { data: almacenes   = [] }            = useAlmacenesList()
  const crearMovimiento                       = useCrearMovimiento()

  const [modal,    setModal]    = useState(false)
  const [verTr,    setVerTr]    = useState(null)
  const [anular,   setAnular]   = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtOrigen, setFiltOrigen]  = useState('')
  const [filtDestino, setFiltDestino] = useState('')
  const [filtMotivo,  setFiltMotivo]  = useState('')

  const productMap = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos])
  const almacenMap = useMemo(() => new Map(almacenes.map(a => [a.id, a])), [almacenes])

  const filtered = useMemo(() => {
    return movimientos.filter(m => {
      if (filtOrigen  && m.almacenId       !== filtOrigen)  return false
      if (filtDestino && m.almacenDestinoId !== filtDestino) return false
      if (filtMotivo  && !m.motivo?.toLowerCase().includes(filtMotivo.toLowerCase())) return false
      if (busqueda) {
        const q = busqueda.toLowerCase()
        const p = productMap.get(m.productoId)
        if (!p?.nombre?.toLowerCase().includes(q) && !m.documento?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [movimientos, filtOrigen, filtDestino, filtMotivo, busqueda, productMap])

  const kpis = useMemo(() => {
    const totalUnidades = movimientos.reduce((s, m) => s + Number(m.cantidad || 0), 0)
    const ini30 = new Date(); ini30.setDate(ini30.getDate() - 30)
    const ini30s = ini30.toISOString().split('T')[0]
    const count30 = movimientos.filter(m => (m.fecha || m.createdAt || '')?.slice(0,10) >= ini30s).length
    return { total: movimientos.length, totalUnidades, count30 }
  }, [movimientos])

  const hayFiltros = busqueda || filtOrigen || filtDestino || filtMotivo
  function limpiarFiltros() { setBusqueda(''); setFiltOrigen(''); setFiltDestino(''); setFiltMotivo('') }

  async function handleRegistrar(data) {
    const res = await crearMovimiento.mutateAsync(data)
    if (res.error) { toast(res.error, 'error'); return }
    toast('Transferencia registrada', 'success')
    setModal(false)
  }

  async function handleAnular(mov) {
    const res = await crearMovimiento.mutateAsync({
      tipo:             'TRANSFERENCIA',
      productoId:       mov.productoId,
      almacenId:        mov.almacenDestinoId,
      almacenDestinoId: mov.almacenId,
      cantidad:         Number(mov.cantidad),
      costoUnitario:    Number(mov.costoUnitario || 0),
      motivo:           `Anulación de ${mov.documento || 'transferencia'}`,
      documento:        `ANUL-${mov.documento || String(mov.id).slice(0, 8)}`,
    })
    if (res.error) { toast(res.error, 'error'); setAnular(null); return }
    toast('Transferencia anulada', 'success')
    setAnular(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {[
          { label:'Total transferencias', val: kpis.total, sub:'registradas en total', color:'#00c896', Icon:ArrowRightLeft },
          { label:'Últimos 30 días',       val: kpis.count30, sub:'transferencias en el período', color:'#3b82f6', Icon:ArrowRightLeft },
          { label:'Unidades transferidas', val: kpis.totalUnidades.toLocaleString('es-PE'), sub:'en todos los registros', color:'#f59e0b', Icon:ArrowRightLeft },
        ].map(({ label, val, sub, color, Icon }) => (
          <div key={label} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="absolute top-3 right-4 opacity-[0.06]"><Icon size={44}/></div>
            <div className="flex items-center gap-2 mb-2"><Icon size={13} style={{ color }}/><span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">{label}</span></div>
            <div className="text-[28px] font-semibold text-[#e8edf2]">{val}</div>
            <div className="text-[11px] text-[#5f6f80] mt-1">{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] whitespace-nowrap">Transferencias entre Almacenes</span>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={() => exportarTransferenciasXLSX(filtered, productos, almacenes, simboloMoneda)}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => exportarTransferenciasPDF(filtered, productos, almacenes, simboloMoneda, sesion?.nombre)}>
              <FileText size={13}/> PDF
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={13}/> Nueva Transferencia</Btn>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <Input className="pl-8 !py-[5px] text-[12px]" placeholder="Buscar producto o documento..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <Select style={{width:148,padding:'5px 8px',fontSize:12}} value={filtOrigen} onChange={e => setFiltOrigen(e.target.value)}>
            <option value="">Origen: todos</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
          <Select style={{width:148,padding:'5px 8px',fontSize:12}} value={filtDestino} onChange={e => setFiltDestino(e.target.value)}>
            <option value="">Destino: todos</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
          <span className="text-[11px] text-[#5f6f80] whitespace-nowrap">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          {hayFiltros && <Btn variant="ghost" size="sm" onClick={limpiarFiltros}><X size={12}/> Limpiar</Btn>}
        </div>

        <DataTable
          loading={isLoading}
          rows={filtered}
          rowKey={m => m.id}
          onRowClick={m => setVerTr(m)}
          emptyIcon={ArrowRightLeft}
          emptyTitle="Sin transferencias"
          emptyDescription="Registra la primera transferencia entre almacenes."
          columns={[
            { key:'fecha', header:'Fecha', render: m => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatDate(m.fecha || m.createdAt)}</span> },
            { key:'documento', header:'Documento', render: m => <span className="font-mono text-[12px] text-[#00c896]">{m.documento || '—'}</span> },
            { key:'producto', header:'Producto', render: m => {
              const p = productMap.get(m.productoId)
              return <><div className="font-medium text-[#e8edf2]">{p?.nombre || '—'}</div><div className="text-[11px] text-[#5f6f80]">{p?.sku}</div></>
            } },
            { key:'origen', header:'Origen', render: m => <span className="text-[12px] text-[#9ba8b6]">{almacenMap.get(m.almacenId)?.nombre || '—'}</span> },
            { key:'destino', header:'Destino', render: m => <span className="text-[12px] text-[#00c896]">{almacenMap.get(m.almacenDestinoId)?.nombre || '—'}</span> },
            { key:'cantidad', header:'Cantidad', align:'right', render: m => {
              const p = productMap.get(m.productoId)
              return <span className="font-mono text-[12px] font-semibold">{m.cantidad} <span className="text-[#5f6f80] font-normal text-[11px]">{p?.unidadMedida}</span></span>
            } },
            { key:'motivo', header:'Motivo', render: m => <span className="text-[12px] text-[#9ba8b6] max-w-[130px] truncate block">{m.motivo}</span> },
            { key:'acciones', header:'Acciones', stopPropagation: true, render: m => (
              <div className="flex gap-1">
                <Btn variant="ghost" size="icon" title="Ver detalle" onClick={() => setVerTr(m)}><Eye size={13}/></Btn>
                <Btn variant="ghost" size="icon" title="Anular" className="text-red-400 hover:text-red-300" onClick={() => setAnular(m)}><XCircle size={13}/></Btn>
              </div>
            ) },
          ]}
        />
      </div>

      {/* Guía de uso */}
      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Transferencias?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {[
            ['1. Elegir origen y destino',  'Selecciona el producto, el almacén origen (de donde sale el stock) y el almacén destino. Ambos deben ser diferentes.'],
            ['2. Validación de stock',      'El sistema valida el stock TOTAL disponible del producto en el almacén origen (suma del stock sin asignar más el guardado en ubicaciones del Mapa de Almacén).'],
            ['3. Registrar',                'Al confirmar, se genera un único movimiento TRANSFERENCIA: descuenta la cantidad del origen y la suma al destino. El stock total de la empresa no cambia.'],
            ['4. Stock en destino',         'El stock transferido llega "sin asignar" en el almacén destino. Si quieres guardarlo en un rack específico, hazlo luego desde Mapa de Almacén.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      <ModalTransferencia open={modal} onClose={() => setModal(false)} onSave={handleRegistrar}
        productos={productos} almacenes={almacenes} simboloMoneda={simboloMoneda}
        saving={crearMovimiento.isPending}/>

      {verTr && <ModalDetalle tr={verTr} productMap={productMap} almacenMap={almacenMap} onClose={() => setVerTr(null)}/>}

      <ConfirmDialog open={!!anular} onClose={() => setAnular(null)} onConfirm={() => handleAnular(anular)}
        danger title="Anular transferencia"
        message={`¿Anular ${anular?.documento}? Se creará una transferencia en sentido contrario, de vuelta al almacén de origen.`}/>
    </div>
  )
}

function ModalDetalle({ tr, productMap, almacenMap, onClose }) {
  const p    = productMap.get(tr.productoId)
  const orig = almacenMap.get(tr.almacenId)
  const dest = almacenMap.get(tr.almacenDestinoId)
  return (
    <Modal open title={`Transferencia — ${tr.documento || 'Detalle'}`} onClose={onClose} size="sm"
      footer={<Btn variant="secondary" onClick={onClose}>Cerrar</Btn>}>
      <div className="flex flex-col divide-y divide-white/5">
        {[
          ['Documento',  tr.documento || '—'],
          ['Fecha',      formatDate(tr.fecha || tr.createdAt)],
          ['Producto',   p ? `${p.sku} — ${p.nombre}` : '—'],
          ['Almacén origen', orig?.nombre || '—'],
          ['Almacén destino', dest?.nombre || '—'],
          ['Cantidad',   `${tr.cantidad} ${p?.unidadMedida || ''}`],
          ['Motivo',     tr.motivo || '—'],
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

function ModalTransferencia({ open, onClose, onSave, productos, almacenes, simboloMoneda, saving }) {
  const INIT = { productoId:'', almacenId:'', almacenDestinoId:'', cantidad:'', fecha: fechaHoyISO(), motivo: MOTIVOS[0], documento:'' }
  const [form, setForm] = useState(INIT)
  const [err,  setErr]  = useState({})
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useMemo(() => {
    if (open) { setForm({ ...INIT, documento: generarNumDoc('TRF') }); setErr({}) }
  }, [open]) // eslint-disable-line

  function validate() {
    const e = {}
    if (!form.productoId)       e.productoId = 'Requerido'
    if (!form.almacenId)        e.almacenId  = 'Requerido'
    if (!form.almacenDestinoId) e.almacenDestinoId = 'Requerido'
    if (form.almacenId && form.almacenDestinoId && form.almacenId === form.almacenDestinoId) e.almacenDestinoId = 'Debe ser diferente al origen'
    if (!form.cantidad || +form.cantidad <= 0) e.cantidad = 'Debe ser > 0'
    setErr(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    onSave({
      tipo:             'TRANSFERENCIA',
      productoId:       form.productoId,
      almacenId:        form.almacenId,
      almacenDestinoId: form.almacenDestinoId,
      cantidad:         +form.cantidad,
      motivo:           form.motivo,
      documento:        form.documento || undefined,
    })
  }

  const productosActivos = productos.filter(p => p.estado === 'Activo' || p.activo !== false)

  return (
    <Modal open={open} onClose={onClose} title="Nueva Transferencia" size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Registrar Transferencia'}</Btn></>}>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Documento"><Input value={form.documento} onChange={e => f('documento', e.target.value)} placeholder="TRF-001"/></Field>
        <Field label="Fecha"><Input type="date" value={form.fecha} onChange={e => f('fecha', e.target.value)}/></Field>
      </div>

      <Field label="Producto *" error={err.productoId}>
        <Select value={form.productoId} onChange={e => f('productoId', e.target.value)}>
          <option value="">Seleccionar producto...</option>
          {productosActivos.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>)}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Almacén origen *" error={err.almacenId}>
          <Select value={form.almacenId} onChange={e => f('almacenId', e.target.value)}>
            <option value="">Seleccionar...</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Almacén destino *" error={err.almacenDestinoId}>
          <Select value={form.almacenDestinoId} onChange={e => f('almacenDestinoId', e.target.value)}>
            <option value="">Seleccionar...</option>
            {almacenes.filter(a => a.id !== form.almacenId).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Cantidad *" error={err.cantidad}>
          <Input type="number" value={form.cantidad} onChange={e => f('cantidad', e.target.value)} min="0.001" step="any" placeholder="0"/>
        </Field>
        <Field label="Motivo">
          <Select value={form.motivo} onChange={e => f('motivo', e.target.value)}>
            {MOTIVOS.map(m => <option key={m}>{m}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  )
}
