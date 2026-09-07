import { useState, useMemo } from 'react'
import { Plus, Search, ArrowDownToLine, Eye, XCircle, Package, DollarSign, Calendar, TrendingUp, X, Download, FileText } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoyISO, generarNumDoc } from '../utils/helpers'
import { Modal, ConfirmDialog, Btn, Field, Input, Select, DataTable } from '../components/ui/index'
import { useMovimientosList, useCrearMovimiento } from '../queries/movimientos.queries'
import { useProductosList } from '../queries/productos.queries'
import { useAlmacenesList } from '../queries/almacenes.queries'
import { useProveedoresList } from '../queries/proveedores.queries'
import { MOTIVOS_ENTRADA } from '../config/constants'
import { exportarEntradasXLSX } from '../utils/exportXLSX'
import { exportarEntradasPDF } from '../utils/exportPDF'

export default function Entradas() {
  const { toast, sesion } = useApp()
  const simboloMoneda = 'S/'

  const { data: movimientos = [], isLoading }    = useMovimientosList({ tipo: 'ENTRADA' })
  const { data: productos   = [] }               = useProductosList()
  const { data: almacenes   = [] }               = useAlmacenesList()
  const { data: proveedores = [] }               = useProveedoresList()
  const crearMovimiento                          = useCrearMovimiento()

  const [modal,    setModal]    = useState(false)
  const [verMov,   setVerMov]   = useState(null)
  const [anular,   setAnular]   = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtAlm,  setFiltAlm]  = useState('')
  const [filtProv, setFiltProv] = useState('')
  const [filtMotivo, setFiltMotivo] = useState('')

  const productMap = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos])

  const entradas = useMemo(() => {
    return movimientos.filter(m => {
      if (busqueda) {
        const q = busqueda.toLowerCase()
        const p = productMap.get(m.productoId)
        if (!p?.nombre?.toLowerCase().includes(q) && !m.documento?.toLowerCase().includes(q)) return false
      }
      if (filtAlm  && m.almacenId  !== filtAlm)  return false
      if (filtProv && m.proveedorId !== filtProv) return false
      if (filtMotivo && !m.motivo?.toLowerCase().includes(filtMotivo.toLowerCase())) return false
      return true
    })
  }, [movimientos, busqueda, filtAlm, filtProv, filtMotivo, productMap])

  const kpis = useMemo(() => {
    const hoy   = new Date().toISOString().split('T')[0]
    const ini30 = new Date(); ini30.setDate(ini30.getDate() - 30)
    const ini30s = ini30.toISOString().split('T')[0]
    const valorTotal    = movimientos.reduce((s, m) => s + Number(m.costoTotal || 0), 0)
    const totalUnidades = movimientos.reduce((s, m) => s + Number(m.cantidad || 0), 0)
    const hoy30         = movimientos.filter(m => (m.fecha || m.createdAt || '')?.slice(0,10) >= ini30s)
    const valor30       = hoy30.reduce((s, m) => s + Number(m.costoTotal || 0), 0)
    const hoyItems      = movimientos.filter(m => (m.fecha || m.createdAt || '')?.slice(0,10) === hoy)
    const valorHoy      = hoyItems.reduce((s, m) => s + Number(m.costoTotal || 0), 0)
    const valProd = {}
    hoy30.forEach(m => { valProd[m.productoId] = (valProd[m.productoId] || 0) + Number(m.costoTotal || 0) })
    const topProdId = Object.entries(valProd).sort((a, b) => b[1] - a[1])[0]?.[0]
    const topProd   = productMap.get(topProdId)?.nombre?.slice(0, 24) || '—'
    return { valorTotal, totalUnidades, valor30, entradasHoy: hoyItems.length, valorHoy, topProd, count30: hoy30.length, countTotal: movimientos.length }
  }, [movimientos, productMap])

  const hayFiltros = busqueda || filtAlm || filtProv || filtMotivo
  function limpiarFiltros() { setBusqueda(''); setFiltAlm(''); setFiltProv(''); setFiltMotivo('') }

  async function handleRegistrar(data) {
    const res = await crearMovimiento.mutateAsync(data)
    if (res.error) { toast(res.error, 'error'); return }
    toast('Entrada registrada', 'success')
    setModal(false)
  }

  async function handleAnular(mov) {
    const res = await crearMovimiento.mutateAsync({
      tipo:          'AJUSTE',
      direccion:     'decremento',
      productoId:    mov.productoId,
      almacenId:     mov.almacenId,
      cantidad:      Number(mov.cantidad),
      costoUnitario: Number(mov.costoUnitario || 0),
      motivo:        `Anulación de ${mov.documento || 'entrada'}`,
      documento:     `ANUL-${mov.documento || String(mov.id).slice(0, 8)}`,
    })
    if (res.error) { toast(res.error, 'error'); setAnular(null); return }
    toast('Entrada anulada', 'success')
    setAnular(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label:'Valor total ingresado', val: formatCurrency(kpis.valorTotal, simboloMoneda), sub:`${kpis.countTotal} entradas registradas`, color:'#00c896', Icon:DollarSign, mono:true },
          { label:'Últimos 30 días',        val: formatCurrency(kpis.valor30,    simboloMoneda), sub:`${kpis.count30} entradas en el período`,  color:'#3b82f6', Icon:Calendar,  mono:true },
          { label:'Entradas hoy',           val: kpis.entradasHoy, sub: kpis.entradasHoy > 0 ? formatCurrency(kpis.valorHoy, simboloMoneda) : 'Sin movimientos hoy', color:'#22c55e', Icon:ArrowDownToLine },
          { label:'Unidades ingresadas',    val: kpis.totalUnidades.toLocaleString('es-PE'), sub:`Top: ${kpis.topProd}`, color:'#f59e0b', Icon:Package },
        ].map(({ label, val, sub, color, Icon, mono }) => (
          <div key={label} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="absolute top-3 right-4 opacity-[0.06]"><Icon size={44}/></div>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={13} style={{ color }}/>
              <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">{label}</span>
            </div>
            <div className={`font-semibold text-[#e8edf2] ${mono ? 'text-[20px] font-mono' : 'text-[28px]'}`}>{val}</div>
            <div className="text-[11px] text-[#5f6f80] mt-1 truncate">{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] whitespace-nowrap">Registro de Entradas</span>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={() => exportarEntradasXLSX(entradas, productos, almacenes, proveedores, simboloMoneda)}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => exportarEntradasPDF(entradas, productos, almacenes, proveedores, simboloMoneda, sesion?.nombre)}>
              <FileText size={13}/> PDF
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={13}/> Nueva Entrada</Btn>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <Input className="pl-8 !py-[5px] text-[12px]" placeholder="Buscar producto o documento..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <Select style={{width:148,padding:'5px 8px',fontSize:12}} value={filtAlm} onChange={e => setFiltAlm(e.target.value)}>
            <option value="">Todos los almacenes</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
          <Select style={{width:165,padding:'5px 8px',fontSize:12}} value={filtProv} onChange={e => setFiltProv(e.target.value)}>
            <option value="">Todos los proveedores</option>
            {proveedores.filter(p => p.estado !== 'Inactivo').map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
          </Select>
          <Select style={{width:148,padding:'5px 8px',fontSize:12}} value={filtMotivo} onChange={e => setFiltMotivo(e.target.value)}>
            <option value="">Todos los motivos</option>
            {MOTIVOS_ENTRADA.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
          <span className="text-[11px] text-[#5f6f80] whitespace-nowrap">{entradas.length} resultado{entradas.length !== 1 ? 's' : ''}</span>
          {hayFiltros && <Btn variant="ghost" size="sm" onClick={limpiarFiltros}><X size={12}/> Limpiar</Btn>}
        </div>

        <DataTable
          loading={isLoading}
          rows={entradas}
          rowKey={m => m.id}
          onRowClick={m => setVerMov(m)}
          emptyIcon={ArrowDownToLine}
          emptyTitle="Sin entradas"
          emptyDescription="Registra tu primera entrada de stock."
          columns={[
            { key:'fecha', header:'Fecha', render: m => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatDate(m.fecha || m.createdAt || '')}</span> },
            { key:'documento', header:'Documento', render: m => <span className="font-mono text-[12px] text-[#00c896]">{m.documento || '—'}</span> },
            { key:'producto', header:'Producto', render: m => {
              const p = productMap.get(m.productoId)
              return <><div className="font-medium text-[#e8edf2]">{p?.nombre || '—'}</div><div className="text-[11px] text-[#5f6f80]">{p?.sku}</div></>
            } },
            { key:'cantidad', header:'Cantidad', align:'right', render: m => {
              const p = productMap.get(m.productoId)
              return <span className="font-mono text-[12px] text-green-400 font-semibold">+{m.cantidad} <span className="text-[#5f6f80] font-normal text-[11px]">{p?.unidadMedida}</span></span>
            } },
            { key:'costoUnit', header:'Costo Unit.', align:'right', render: m => <span className="font-mono text-[12px]">{formatCurrency(Number(m.costoUnitario || 0), simboloMoneda)}</span> },
            { key:'total', header:'Total', align:'right', render: m => <span className="font-mono text-[12px] font-semibold">{formatCurrency(Number(m.costoTotal || 0), simboloMoneda)}</span> },
            { key:'motivo', header:'Motivo', render: m => <span className="text-[12px] text-[#9ba8b6] max-w-[140px] truncate block">{m.motivo}</span> },
            { key:'acciones', header:'Acciones', stopPropagation: true, render: m => (
              <div className="flex gap-1">
                <Btn variant="ghost" size="icon" title="Ver detalle" onClick={() => setVerMov(m)}><Eye size={13}/></Btn>
                <Btn variant="ghost" size="icon" title="Anular" className="text-red-400 hover:text-red-300" onClick={() => setAnular(m)}><XCircle size={13}/></Btn>
              </div>
            ) },
          ]}
        />
      </div>

      {/* Guía de uso */}
      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Entradas?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {[
            ['1. Elegir motivo',      'Compra, Devolución, Ajuste o Inicial — selecciona el que mejor describe el origen del stock que ingresa.'],
            ['2. Producto y almacén', 'Selecciona el producto y el almacén destino donde ingresa el stock. El proveedor es opcional.'],
            ['3. Costo unitario',     'Determina el costo con el que se valoriza el stock (PMP) — afecta el Kardex y los reportes de valorización.'],
            ['4. Corrección',         'Si te equivocaste, usa "Anular" en la fila: genera un ajuste negativo equivalente que reduce el stock.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      <ModalEntrada open={modal} onClose={() => setModal(false)} onSave={handleRegistrar}
        productos={productos} almacenes={almacenes} proveedores={proveedores} simboloMoneda={simboloMoneda}
        saving={crearMovimiento.isPending}/>

      {verMov && <ModalDetalle mov={verMov} productMap={productMap} proveedores={proveedores} almacenes={almacenes} simboloMoneda={simboloMoneda} onClose={() => setVerMov(null)}/>}

      <ConfirmDialog open={!!anular} onClose={() => setAnular(null)} onConfirm={() => handleAnular(anular)}
        danger title="Anular entrada"
        message={`¿Anular ${anular?.documento}? Se creará un ajuste negativo equivalente que reducirá el stock.`}/>
    </div>
  )
}

function ModalDetalle({ mov, productMap, proveedores, almacenes, simboloMoneda, onClose }) {
  const prod = productMap.get(mov.productoId)
  const prov = proveedores.find(p => p.id === mov.proveedorId)
  const alm  = almacenes.find(a => a.id === mov.almacenId)
  return (
    <Modal open title={`Entrada — ${mov.documento || 'Detalle'}`} onClose={onClose} size="sm"
      footer={<Btn variant="secondary" onClick={onClose}>Cerrar</Btn>}>
      <div className="flex flex-col divide-y divide-white/5">
        {[
          ['Documento',  mov.documento || '—'],
          ['Fecha',      formatDate(mov.fecha || mov.createdAt)],
          ['Producto',   prod ? `${prod.sku} — ${prod.nombre}` : '—'],
          ['Almacén',    alm?.nombre || '—'],
          ['Proveedor',  prov?.razonSocial || '—'],
          ['Cantidad',   `+${mov.cantidad} ${prod?.unidadMedida || ''}`],
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

function ModalEntrada({ open, onClose, onSave, productos, almacenes, proveedores, simboloMoneda, saving }) {
  const INIT = {
    productoId:'', almacenId:'', proveedorId:'', cantidad:'', costoUnitario:'',
    fecha: fechaHoyISO(), motivo: MOTIVOS_ENTRADA?.[0] || 'Compra', documento:'',
  }
  const [form, setForm] = useState(INIT)
  const [err,  setErr]  = useState({})
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useMemo(() => {
    if (open) { setForm({ ...INIT, almacenId: almacenes[0]?.id || '', documento: generarNumDoc('ENT') }); setErr({}) }
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
    onSave({
      tipo:          'ENTRADA',
      productoId:    form.productoId,
      almacenId:     form.almacenId,
      cantidad:      +form.cantidad,
      costoUnitario: +form.costoUnitario || 0,
      motivo:        form.motivo || 'Compra',
      documento:     form.documento || undefined,
      proveedorId:   form.proveedorId || undefined,
    })
  }

  const productosActivos = productos.filter(p => p.estado === 'Activo' || p.activo !== false)
  const totalCosto = (+form.cantidad || 0) * (+form.costoUnitario || 0)

  return (
    <Modal open={open} onClose={onClose} title="Nueva Entrada de Stock" size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Registrar Entrada'}</Btn></>}>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Documento"><Input value={form.documento} onChange={e => f('documento', e.target.value)} placeholder="ENT-001"/></Field>
        </div>
        <Field label="Fecha"><Input type="date" value={form.fecha} onChange={e => f('fecha', e.target.value)}/></Field>
        <Field label="Motivo">
          <Select value={form.motivo} onChange={e => f('motivo', e.target.value)}>
            {(MOTIVOS_ENTRADA || ['Compra','Devolución','Ajuste','Inicial']).map(m => <option key={m}>{m}</option>)}
          </Select>
        </Field>
      </div>

      <Field label="Producto *" error={err.productoId}>
        <Select value={form.productoId} onChange={e => f('productoId', e.target.value)}>
          <option value="">Seleccionar producto...</option>
          {productosActivos.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>)}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Almacén destino *" error={err.almacenId}>
          <Select value={form.almacenId} onChange={e => f('almacenId', e.target.value)}>
            <option value="">Seleccionar...</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Proveedor">
          <Select value={form.proveedorId} onChange={e => f('proveedorId', e.target.value)}>
            <option value="">Sin proveedor</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
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

      {totalCosto > 0 && (
        <div className="bg-[#1a2230] rounded-lg px-4 py-2.5 flex justify-between items-center">
          <span className="text-[12px] text-[#5f6f80]">Total ingreso:</span>
          <span className="font-mono font-semibold text-[#00c896]">{formatCurrency(totalCosto, simboloMoneda)}</span>
        </div>
      )}
    </Modal>
  )
}
