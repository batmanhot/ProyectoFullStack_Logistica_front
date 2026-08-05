import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, DollarSign, AlertTriangle, CheckCircle, Clock, Edit2, Eye, FileText, Download, X } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate } from '../utils/helpers'
import { Modal, Badge, Btn, Field, Alert, Input, Select, Textarea, DataTable, EmptyState } from '../components/ui/index'
import { exportarCxCXLSX } from '../utils/exportXLSX'
import { exportarCxCPDF } from '../utils/exportPDF'
import { useCxCList, useCxC, useCrearCxC, useActualizarCxC, useRegistrarPago } from '../queries/cuentas-por-cobrar.queries'
import { useClientesList } from '../queries/clientes.queries'
import { useDespachosList } from '../queries/despachos.queries'

const simboloMoneda = 'S/'

const ESTADO_META = {
  PENDIENTE: { label: 'Pendiente', color: 'warning' },
  VENCIDA:   { label: 'Vencida',   color: 'danger'  },
  PARCIAL:   { label: 'Parcial',   color: 'info'    },
  COBRADA:   { label: 'Cobrada',   color: 'success' },
}

const METODOS_PAGO = [
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'yape',          label: 'Yape' },
  { value: 'plin',          label: 'Plin' },
  { value: 'otro',          label: 'Otro' },
]
const METODO_LABEL = Object.fromEntries(METODOS_PAGO.map(m => [m.value, m.label]))

// monto/saldo llegan del backend como string (Decimal de Prisma) — comparar como texto
// ordenaría "150.00" antes que "1200.00" (lexicográfico), por eso se convierten con Number().
const NUMERIC_KEYS = new Set(['monto', 'saldo'])

function diasMora(fechaVencimiento) {
  if (!fechaVencimiento) return 0
  const diff = new Date() - new Date(fechaVencimiento + 'T12:00:00')
  return Math.max(0, Math.ceil(diff / 86400000))
}

export default function CuentasPorCobrar() {
  const { sesion, toast } = useApp()

  const { data: cxcs     = [], isLoading } = useCxCList()
  const { data: clientes = [] }            = useClientesList()

  const crearCxC      = useCrearCxC()
  const actualizarCxC = useActualizarCxC()
  const registrarPago = useRegistrarPago()

  const [modal,     setModal]     = useState(false)
  const [editando,  setEditando]  = useState(null)
  const [pagoDoc,   setPagoDoc]   = useState(null)
  const [verPagos,  setVerPagos]  = useState(null)
  const [filtro,    setFiltro]    = useState('')
  const [busqueda,  setBusqueda]  = useState('')
  const [filtDesde, setFiltDesde] = useState('')
  const [filtHasta, setFiltHasta] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'numero', direction: 'desc' })

  const handleSort = key => setSortConfig(s => ({ key, direction: s.key === key && s.direction === 'asc' ? 'desc' : 'asc' }))

  const cliNombre = id => clientes.find(c => c.id === id)?.razonSocial || '—'

  const filtered = useMemo(() => {
    let d = [...cxcs]
    if (filtro)    d = d.filter(x => x.estado === filtro)
    if (filtDesde) d = d.filter(x => (x.fechaVencimiento || '') >= filtDesde)
    if (filtHasta) d = d.filter(x => (x.fechaVencimiento || '') <= filtHasta)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(x => x.numero?.toLowerCase().includes(q) || cliNombre(x.clienteId).toLowerCase().includes(q))
    }
    d.sort((a, b) => {
      let aV, bV
      if (sortConfig.key === 'cliente') {
        aV = cliNombre(a.clienteId); bV = cliNombre(b.clienteId)
      } else if (sortConfig.key === 'emision') {
        aV = a.fecha || a.createdAt || ''; bV = b.fecha || b.createdAt || ''
      } else if (NUMERIC_KEYS.has(sortConfig.key)) {
        aV = Number(a[sortConfig.key] || 0); bV = Number(b[sortConfig.key] || 0)
      } else {
        aV = a[sortConfig.key] || ''; bV = b[sortConfig.key] || ''
      }
      if (typeof aV === 'string') { aV = aV.toLowerCase(); bV = bV.toLowerCase() }
      if (aV < bV) return sortConfig.direction === 'asc' ? -1 : 1
      if (aV > bV) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return d
  }, [cxcs, filtro, busqueda, filtDesde, filtHasta, clientes, sortConfig])

  const kpis = useMemo(() => {
    const pendientes = cxcs.filter(x => ['PENDIENTE', 'PARCIAL', 'VENCIDA'].includes(x.estado))
    const vencidas   = cxcs.filter(x => x.estado === 'VENCIDA')
    return {
      total:    pendientes.reduce((s, x) => s + Number(x.saldo || 0), 0),
      mora:     vencidas.reduce((s, x) => s + Number(x.saldo || 0), 0),
      count:    pendientes.length,
      vencidas: vencidas.length,
    }
  }, [cxcs])

  async function handleSave(data) {
    const isEdit = !!data.id
    // UpdateCuentaPorCobrarDto solo admite fechaVencimiento/notas — monto/saldo/estado
    // se manejan exclusivamente vía registrarPago() (ver cuentas-por-cobrar.service.ts).
    const dto = isEdit
      ? {
          fechaVencimiento: data.fechaVencimiento || undefined,
          notas:            data.notas || undefined,
        }
      : {
          clienteId:        data.clienteId,
          monto:            Number(data.monto),
          diasCredito:      data.diasCredito ? Number(data.diasCredito) : undefined,
          fechaVencimiento: data.fechaVencimiento || undefined,
          notas:            data.notas || undefined,
          despachoId:       data.despachoId || undefined,
        }
    const res = isEdit
      ? await actualizarCxC.mutateAsync({ id: data.id, ...dto })
      : await crearCxC.mutateAsync(dto)
    if (res?.error) { toast(res.error, 'error'); return }
    setModal(false)
    toast(isEdit ? 'CxC actualizada' : 'CxC registrada', 'success')
  }

  async function handlePagar(doc, datos) {
    const res = await registrarPago.mutateAsync({ id: doc.id, ...datos })
    if (res?.error) { toast(res.error, 'error'); return }
    setPagoDoc(null)
    const completo = datos.monto >= Number(doc.saldo)
    toast(completo ? `${doc.numero} marcada como cobrada` : `Pago parcial registrado en ${doc.numero}`, 'success')
  }

  const isSaving = crearCxC.isPending || actualizarCxC.isPending

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label: 'Por cobrar',      val: formatCurrency(kpis.total, simboloMoneda), color: '#3b82f6', Icon: DollarSign,    mono: true },
          { label: 'En mora',         val: formatCurrency(kpis.mora,  simboloMoneda), color: '#ef4444', Icon: AlertTriangle, mono: true },
          { label: 'Documentos open', val: kpis.count,                               color: '#f59e0b', Icon: Clock              },
          { label: 'Vencidas',        val: kpis.vencidas,                            color: '#ef4444', Icon: AlertTriangle      },
        ].map(({ label, val, color, Icon, mono }) => (
          <div key={label} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="absolute top-3 right-4 opacity-[0.06]"><Icon size={40}/></div>
            <div className="flex items-center gap-1.5 mb-2">
              <Icon size={11} style={{ color, opacity: 0.8 }}/>
              <span className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em]">{label}</span>
            </div>
            <div className={`font-semibold text-[#e8edf2] leading-none ${mono ? 'text-[17px] font-mono' : 'text-[28px]'}`}>{val}</div>
          </div>
        ))}
      </div>

      {kpis.vencidas > 0 && (
        <Alert variant="danger">
          <strong>{kpis.vencidas} documento{kpis.vencidas > 1 ? 's' : ''} vencido{kpis.vencidas > 1 ? 's' : ''}.</strong>{' '}
          Total en mora: {formatCurrency(kpis.mora, simboloMoneda)}. Gestionar cobro urgente.
        </Alert>
      )}

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Cuentas por Cobrar</span>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={async () => { await exportarCxCXLSX(cxcs, clientes, simboloMoneda) }}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={async () => { await exportarCxCPDF(cxcs, clientes, simboloMoneda, sesion?.nombre) }}>
              <FileText size={13}/> PDF
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => { setEditando(null); setModal(true) }}>
              <Plus size={13}/> Nueva CxC
            </Btn>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-50">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <Input className="pl-8" placeholder="Buscar número o cliente..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <Select className="w-auto" value={filtro} onChange={e => setFiltro(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#5f6f80] whitespace-nowrap font-semibold uppercase tracking-wide">Venc. desde</span>
            <Input type="date" style={{ width: 138 }} value={filtDesde} onChange={e => setFiltDesde(e.target.value)}/>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#5f6f80] whitespace-nowrap font-semibold uppercase tracking-wide">hasta</span>
            <Input type="date" style={{ width: 138 }} value={filtHasta} onChange={e => setFiltHasta(e.target.value)}/>
          </div>
          {(busqueda || filtro || filtDesde || filtHasta) && (
            <Btn variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltro(''); setFiltDesde(''); setFiltHasta('') }}>
              <X size={12}/> Limpiar
            </Btn>
          )}
        </div>

        <DataTable
          loading={isLoading}
          rows={filtered}
          rowKey={doc => doc.id}
          onRowClick={doc => { setEditando(doc); setModal(true) }}
          emptyIcon={DollarSign}
          emptyTitle="Sin documentos"
          emptyDescription="Registra la primera factura pendiente."
          sortConfig={sortConfig}
          onSort={handleSort}
          columns={[
            { key: 'numero', header: 'N° Doc.', sortable: true, render: doc => <span className="font-mono text-[11px] text-[#00c896] font-semibold">{doc.numero}</span> },
            { key: 'cliente', header: 'Cliente', sortable: true, render: doc => <span className="font-medium text-[#e8edf2]">{cliNombre(doc.clienteId)}</span> },
            { key: 'emision', header: 'Emisión', sortable: true, render: doc => <span className="font-mono text-[11px] text-[#9ba8b6]">{formatDate(doc.fecha || doc.createdAt)}</span> },
            { key: 'vencimiento', header: 'Vencimiento', sortable: true, render: doc => {
                const mora = doc.estado === 'VENCIDA' ? diasMora(doc.fechaVencimiento) : 0
                return <span className={`font-mono text-[11px] ${mora > 0 ? 'text-red-400' : 'text-[#9ba8b6]'}`}>{formatDate(doc.fechaVencimiento)}</span>
              } },
            { key: 'mora', header: 'Días mora', align: 'right', render: doc => {
                const mora = doc.estado === 'VENCIDA' ? diasMora(doc.fechaVencimiento) : 0
                return mora > 0
                  ? <span className="font-mono font-bold text-red-400">{mora}d</span>
                  : <span className="text-[#5f6f80]">—</span>
              } },
            { key: 'monto', header: 'Monto', align: 'right', sortable: true, render: doc => <span className="font-mono text-[#9ba8b6]">{formatCurrency(doc.monto, simboloMoneda)}</span> },
            { key: 'saldo', header: 'Saldo', align: 'right', sortable: true, render: doc => (
                <span className={`font-mono font-bold ${doc.saldo > 0 ? 'text-[#e8edf2]' : 'text-green-600'}`}>{formatCurrency(doc.saldo, simboloMoneda)}</span>
              ) },
            { key: 'estado', header: 'Estado', sortable: true, render: doc => {
                const meta = ESTADO_META[doc.estado] || ESTADO_META.PENDIENTE
                return <Badge variant={meta.color}>{meta.label}</Badge>
              } },
            { key: 'acciones', header: 'Acciones', stopPropagation: true, render: doc => (
                <div className="flex gap-1">
                  {doc.estado !== 'COBRADA' && (
                    <Btn variant="primary" size="sm" disabled={registrarPago.isPending} onClick={() => setPagoDoc(doc)}>
                      <CheckCircle size={11}/> Cobrar
                    </Btn>
                  )}
                  <Btn variant="ghost" size="icon" title="Historial de pagos" onClick={() => setVerPagos(doc)}><Eye size={12}/></Btn>
                  <Btn variant="ghost" size="icon" title="Editar" onClick={() => { setEditando(doc); setModal(true) }}><Edit2 size={12}/></Btn>
                </div>
              ) },
          ]}
        />
      </div>

      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Cuentas por Cobrar?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {[
            ['1. Generar el documento', 'Lo más común: desde Despachos, en un pedido Despachado/Entregado con forma de pago Crédito, usa el botón "Generar Cuenta por Cobrar" — precarga cliente, monto y despacho. También puedes registrar una CxC manual desde aquí con "Nueva CxC".'],
            ['2. Monitorear vencimientos', 'Un documento pasa a "Vencida" automáticamente cuando se cumple la fecha de vencimiento sin cobro registrado.'],
            ['3. Cobrar', 'Usa "Cobrar" para registrar un pago total o parcial, con método de pago y notas opcionales — si es parcial, el documento queda en estado "Parcial" con el saldo restante.'],
            ['4. Ver historial', 'El ícono de ojo muestra todos los pagos registrados para ese documento: fecha, monto, método y notas de cada abono.'],
            ['5. Exportar', 'Excel/PDF exportan la cartera filtrada, útil para el reporte de cobranza.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      <ModalCxC
        open={modal}
        onClose={() => setModal(false)}
        editando={editando}
        clientes={clientes}
        simboloMoneda={simboloMoneda}
        saving={isSaving}
        onSave={handleSave}
      />

      <ModalPago
        doc={pagoDoc}
        simboloMoneda={simboloMoneda}
        saving={registrarPago.isPending}
        onClose={() => setPagoDoc(null)}
        onConfirm={datos => handlePagar(pagoDoc, datos)}
      />

      <ModalHistorialPagos
        doc={verPagos}
        simboloMoneda={simboloMoneda}
        onClose={() => setVerPagos(null)}
      />
    </div>
  )
}

function ModalHistorialPagos({ doc, simboloMoneda, onClose }) {
  const { data: detalle, isLoading } = useCxC(doc?.id)
  const pagos = detalle?.pagos || []

  return (
    <Modal open={!!doc} onClose={onClose} title={`Historial de pagos — ${doc?.numero || ''}`} size="md"
      footer={<Btn variant="secondary" onClick={onClose}>Cerrar</Btn>}>
      {doc && (
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Monto total', formatCurrency(doc.monto, simboloMoneda)],
              ['Pagado',      formatCurrency(Number(doc.monto) - Number(doc.saldo), simboloMoneda)],
              ['Saldo',       formatCurrency(doc.saldo, simboloMoneda)],
            ].map(([k, v]) => (
              <div key={k} className="bg-[#1a2230] rounded-lg px-3.5 py-2.5">
                <div className="text-[10px] text-[#5f6f80] mb-0.5">{k}</div>
                <div className="text-[13px] font-mono font-semibold text-[#e8edf2]">{v}</div>
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="text-center text-[12px] text-[#5f6f80] py-6">Cargando...</div>
          ) : pagos.length === 0 ? (
            <EmptyState icon={DollarSign} title="Sin pagos registrados" description="Todavía no se registró ningún abono para este documento."/>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full border-collapse text-[12px]">
                <thead><tr>
                  {['Fecha', 'Monto', 'Método', 'Notas'].map(h => (
                    <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[10px] font-semibold text-[#5f6f80] uppercase border-b border-white/8">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {pagos.map(p => (
                    <tr key={p.id} className="border-b border-white/5 last:border-0">
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">{formatDate(p.fecha)}</td>
                      <td className="px-3.5 py-2.5 font-mono font-semibold text-[#00c896]">{formatCurrency(p.monto, simboloMoneda)}</td>
                      <td className="px-3.5 py-2.5 text-[#e8edf2]">{METODO_LABEL[p.metodo] || p.metodo || '—'}</td>
                      <td className="px-3.5 py-2.5 text-[#9ba8b6]">{p.notas || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

export function ModalPago({ doc, simboloMoneda, saving, onClose, onConfirm }) {
  const [monto, setMonto]   = useState('')
  const [metodo, setMetodo] = useState('')
  const [notas, setNotas]   = useState('')

  useEffect(() => {
    if (doc) { setMonto(String(Number(doc.saldo))); setMetodo(''); setNotas('') }
  }, [doc])

  const montoNum = Number(monto)
  const valido = doc && montoNum > 0 && montoNum <= Number(doc.saldo)

  return (
    <Modal open={!!doc} onClose={onClose} title={`Registrar pago — ${doc?.numero || ''}`} size="sm"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={!valido || saving}
          onClick={() => onConfirm({ monto: montoNum, metodo: metodo || undefined, notas: notas || undefined })}>
          {saving ? 'Registrando...' : 'Confirmar pago'}
        </Btn>
      </>}>
      {doc && (
        <div className="flex flex-col gap-3.5">
          <div className="text-[13px] text-[#9ba8b6]">
            Saldo pendiente: <span className="font-mono font-semibold text-[#e8edf2]">{formatCurrency(doc.saldo, simboloMoneda)}</span>
          </div>
          <Field label="Monto a pagar *" hint="Se acepta un pago parcial — el saldo restante queda como PARCIAL">
            <Input type="number" value={monto} onChange={e => setMonto(e.target.value)}
              min="0.01" max={Number(doc.saldo)} step="0.01" autoFocus/>
          </Field>
          <Field label="Método de pago">
            <Select value={metodo} onChange={e => setMetodo(e.target.value)}>
              <option value="">Sin especificar</option>
              {METODOS_PAGO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
          </Field>
          <Field label="Notas" hint="Opcional — referencia, N° de operación...">
            <Textarea className="resize-y min-h-13" value={notas} onChange={e => setNotas(e.target.value)}/>
          </Field>
          {!valido && monto !== '' && (
            <Alert variant="error">El monto debe ser mayor a 0 y no puede superar el saldo pendiente.</Alert>
          )}
        </div>
      )}
    </Modal>
  )
}

/** Convierte días de crédito a fecha de vencimiento (hoy + N días) en formato 'YYYY-MM-DD' para <input type="date">. */
function diasCreditoAVencimiento(diasCredito) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + parseInt(diasCredito || 0))
  return d.toISOString().split('T')[0]
}

function ModalCxC({ open, onClose, editando, clientes, simboloMoneda, saving, onSave }) {
  const init = { clienteId: '', despachoId: '', monto: 0, diasCredito: 30, fechaVencimiento: diasCreditoAVencimiento(30), estado: 'PENDIENTE', notas: '' }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const isEdit = !!editando
  const bloqueada = isEdit && form.estado === 'COBRADA'

  useEffect(() => {
    if (!open) return
    setForm(editando
      // `fechaVencimiento` llega del backend como datetime ISO completo (con hora) — un
      // <input type="date"> solo acepta 'YYYY-MM-DD' exacto, si no lo recibe se muestra en
      // blanco sin avisar (mismo patrón ya resuelto en PedidosInternos/ModalPedido.jsx).
      ? { clienteId: editando.clienteId, despachoId: editando.despachoId || '', monto: editando.monto, diasCredito: editando.diasCredito ?? 30, fechaVencimiento: editando.fechaVencimiento?.split('T')[0] || '', estado: editando.estado || 'PENDIENTE', notas: editando.notas || '' }
      : { ...init, fechaVencimiento: diasCreditoAVencimiento(init.diasCredito) }
    )
  }, [open, editando])

  // Solo se listan despachos del cliente elegido — la CxC nace de una entrega ya
  // facturable, no tiene sentido ofrecer despachos de otros clientes.
  const { data: despachosCliente = [] } = useDespachosList({ clienteId: form.clienteId, enabled: open && !!form.clienteId })
  const despachosFacturables = despachosCliente.filter(d => d.estado !== 'CANCELADO')

  function elegirDespacho(despachoId) {
    const desp = despachosFacturables.find(d => d.id === despachoId)
    setForm(p => ({ ...p, despachoId, monto: desp ? Number(desp.total) : p.monto }))
  }

  /** Días de crédito recalcula el vencimiento automáticamente — sigue editable a mano después. */
  function handleDiasCredito(diasCredito) {
    setForm(p => ({ ...p, diasCredito, fechaVencimiento: diasCreditoAVencimiento(diasCredito) }))
  }

  const canSave = isEdit ? !bloqueada : (!!form.clienteId && Number(form.monto) > 0)

  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar CxC' : 'Nueva Cuenta por Cobrar'} size="md"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={!canSave || saving} onClick={() => onSave({ ...form, id: editando?.id })}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Btn>
      </>}>
      {/* Cliente, monto, días de crédito y estado se fijan al crear — el backend solo
          permite editar fechaVencimiento y notas (monto/estado cambian vía "Cobrar"), y ni
          eso si ya está Cobrada (el backend lo rechaza con 400). */}
      {bloqueada && (
        <Alert variant="warning">Esta cuenta ya está cobrada — no se puede modificar.</Alert>
      )}
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Cliente *">
          {isEdit
            ? <Input disabled readOnly className="opacity-50 cursor-not-allowed" value={clientes.find(c => c.id === form.clienteId)?.razonSocial || '—'}/>
            : <Select value={form.clienteId} onChange={e => f('clienteId', e.target.value)}>
                <option value="">Seleccionar...</option>
                {clientes.filter(c => c.activo !== false).map(c => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}
              </Select>
          }
        </Field>
        <Field label="Despacho relacionado" hint="Opcional — al elegirlo, precarga el monto con el total del despacho">
          {isEdit
            ? <Input disabled readOnly className="opacity-50 cursor-not-allowed"
                value={form.despachoId ? (despachosCliente.find(d => d.id === form.despachoId)?.numero || form.despachoId) : 'Sin despacho vinculado'}/>
            : <Select value={form.despachoId} onChange={e => elegirDespacho(e.target.value)} disabled={!form.clienteId}>
                <option value="">Sin vincular</option>
                {despachosFacturables.map(d => <option key={d.id} value={d.id}>{d.numero} — {formatCurrency(d.total, simboloMoneda)}</option>)}
              </Select>
          }
        </Field>
        <Field label="Monto total *">
          {isEdit
            ? <Input disabled readOnly className="opacity-50 cursor-not-allowed" value={formatCurrency(form.monto, simboloMoneda)}/>
            : <Input type="number" value={form.monto} onChange={e => f('monto', +e.target.value)} min="0" step="0.01"/>
          }
        </Field>
        {!isEdit && (
          <Field label="Días de crédito" hint="Recalcula el vencimiento automáticamente">
            <Input type="number" value={form.diasCredito} onChange={e => handleDiasCredito(+e.target.value)} min="0"/>
          </Field>
        )}
        <Field label="Vencimiento">
          <Input type="date" disabled={bloqueada} readOnly={bloqueada} className={bloqueada ? 'opacity-50 cursor-not-allowed' : ''}
            value={form.fechaVencimiento} onChange={e => f('fechaVencimiento', e.target.value)}/>
        </Field>
        {isEdit && (
          <Field label="Estado">
            <Input disabled readOnly className="opacity-50 cursor-not-allowed" value={ESTADO_META[form.estado]?.label || form.estado}/>
          </Field>
        )}
      </div>
      <Field label="Notas">
        <Textarea disabled={bloqueada} readOnly={bloqueada} className={`resize-y min-h-13 ${bloqueada ? 'opacity-50 cursor-not-allowed' : ''}`}
          value={form.notas} onChange={e => f('notas', e.target.value)} placeholder="Observaciones..."/>
      </Field>
    </Modal>
  )
}
