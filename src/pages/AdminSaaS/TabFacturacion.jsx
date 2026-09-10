import { useMemo, useState } from 'react'
import { addMonths, addYears, format } from 'date-fns'
import {
  Receipt, DollarSign, CircleDollarSign, AlertTriangle, Search, Plus, Download, Save,
  FileText, Send, XCircle, History, ChevronLeft, ChevronRight,
} from 'lucide-react'
import {
  Modal, EmptyState, Badge, Btn, Field, TableWrap, Th, Td, KpiCard, Input, Select, Textarea, Alert,
} from '../../components/ui/index'
import { today } from './constants'
import { money, fdate, descargarCsv } from './_shared'
import {
  useFacturas, useFacturasResumen, useFacturasHistorial, useFactura,
  useEmitirFactura, useEnviarFactura, useRegistrarCobroFactura, useAnularFactura,
} from '../../queries/admin.queries'

// ══════════════════════════════════════════════════════════
// TAB: FACTURACIÓN — documentos de cobro de la plataforma
//   Emitidos a partir de las suscripciones/renovaciones.
//   Documentos / Cobros pendientes / Historial
// ══════════════════════════════════════════════════════════

const SUB_TABS = [
  { id: 'documentos', label: 'Documentos' },
  { id: 'pendientes', label: 'Cobros pendientes' },
  { id: 'historial',  label: 'Historial' },
]

const ESTADO = {
  emitida: { label: 'Emitida', badge: 'info' },
  vencida: { label: 'Vencida', badge: 'danger' },
  pagada:  { label: 'Pagada',  badge: 'success' },
  anulada: { label: 'Anulada', badge: 'neutral' },
}

const EVENTO = {
  emitida:          { label: 'Emitida',          badge: 'info' },
  enviada:          { label: 'Enviada',          badge: 'info' },
  cobro_registrado: { label: 'Cobro registrado', badge: 'success' },
  anulada:          { label: 'Anulada',          badge: 'danger' },
}

const METODOS = ['transferencia', 'tarjeta', 'efectivo', 'yape', 'paypal']
const PAGE_SIZE = 25
const EMPTY = []

export default function TabFacturacion({ negocios = [], planes = [], renovaciones = [], toast }) {
  const [subTab, setSubTab] = useState('documentos')
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('Todos')
  const [page, setPage] = useState(1)
  const [emitOpen, setEmitOpen] = useState(false)
  const [cobro, setCobro] = useState(null)      // factura en cobro
  const [detalleId, setDetalleId] = useState(null)

  const filtros = useMemo(
    () => ({ estado: filtro, busqueda: search.trim() || undefined, page, pageSize: PAGE_SIZE }),
    [filtro, search, page],
  )
  const { data: lista = { items: [], total: 0 }, isLoading } = useFacturas(filtros)
  const { data: resumen = {} } = useFacturasResumen()
  const { data: historial = [] } = useFacturasHistorial()

  const emitir  = useEmitirFactura()
  const enviar  = useEnviarFactura()
  const cobrar  = useRegistrarCobroFactura()
  const anular  = useAnularFactura()

  const items = lista.items || EMPTY
  const totalPages = Math.max(1, Math.ceil((lista.total || 0) / PAGE_SIZE))
  const pendientes = useMemo(() => items.filter(f => ['emitida', 'vencida'].includes(f.estado)), [items])

  // ── Acciones ──────────────────────────────────────────
  async function handleEnviar(f) {
    const res = await enviar.mutateAsync(f.id)
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Documento marcado como enviado', 'success')
  }
  async function handleAnular(f) {
    const res = await anular.mutateAsync(f.id)
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Factura anulada', 'success')
  }
  async function handleCobro() {
    if (!cobroForm.referenciaPago.trim()) { toast('La referencia de pago es obligatoria', 'error'); return }
    const res = await cobrar.mutateAsync({
      id: cobro.id,
      metodoPago: cobroForm.metodoPago,
      referenciaPago: cobroForm.referenciaPago.trim(),
      pagadaEn: cobroForm.pagadaEn || undefined,
    })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Cobro registrado', 'success')
    setCobro(null)
  }

  const [cobroForm, setCobroForm] = useState({ metodoPago: 'transferencia', referenciaPago: '', pagadaEn: today() })
  function abrirCobro(f) {
    setCobroForm({ metodoPago: f.metodoPago || 'transferencia', referenciaPago: f.referenciaPago || '', pagadaEn: today() })
    setCobro(f)
  }

  function exportar() {
    const filas = [
      ['Documento', 'Negocio', 'Plan', 'Ciclo', 'Emisión', 'Vencimiento', 'Subtotal', 'IGV', 'Total', 'Estado', 'Cobro', 'Referencia'],
      ...items.map(f => [
        f.numero, f.empresaNombre, f.planNombre, f.ciclo,
        String(f.emitidaEn).slice(0, 10), String(f.venceEn).slice(0, 10),
        f.subtotal.toFixed(2), f.igv.toFixed(2), f.total.toFixed(2),
        ESTADO[f.estado]?.label || f.estado,
        f.estado === 'pagada' ? 'Confirmado' : 'Pendiente', f.referenciaPago || '',
      ]),
    ]
    descargarCsv(`facturacion-${new Date().toISOString().slice(0, 10)}`, filas)
    toast(`${items.length} documento(s) exportado(s)`, 'success')
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Facturado" value={money(resumen.facturado)} sub="Documentos emitidos" accentColor="#3b82f6" icon={<Receipt size={30}/>} />
        <KpiCard label="Cobrado" value={money(resumen.cobrado)} sub="Pagos confirmados" accentColor="#10b981" icon={<DollarSign size={30}/>} />
        <KpiCard label="Por cobrar" value={money(resumen.porCobrar)} sub={`${resumen.pendientes || 0} documento(s) pendiente(s)`} accentColor={resumen.porCobrar > 0 ? '#f59e0b' : '#22c55e'} icon={<CircleDollarSign size={30}/>} />
        <KpiCard label="Vencido" value={money(resumen.vencido)} sub={`${resumen.vencidas || 0} requiere(n) gestión`} accentColor={resumen.vencidas > 0 ? '#ef4444' : '#22c55e'} icon={<AlertTriangle size={30}/>} />
      </div>

      {/* Sub-navegación + acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)]">
        <div className="flex gap-1">
          {SUB_TABS.map(t => (
            <button key={t.id} type="button" onClick={() => setSubTab(t.id)}
              className={`px-3.5 py-2 text-[12px] font-semibold -mb-px border-b-2 transition-colors ${
                subTab === t.id ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}>
              {t.label}
              {t.id === 'pendientes' && (resumen.pendientes > 0) && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">{resumen.pendientes}</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="secondary" onClick={exportar}><Download size={14}/>Exportar</Btn>
          <Btn variant="primary" onClick={() => setEmitOpen(true)}><FileText size={14}/>Generar factura</Btn>
        </div>
      </div>

      {/* ── DOCUMENTOS ── */}
      {subTab === 'documentos' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar por documento, negocio, plan o referencia…" className="pl-8" />
            </div>
            <Select value={filtro} onChange={e => { setFiltro(e.target.value); setPage(1) }} style={{ width: 150 }}>
              <option>Todos</option>
              <option value="emitida">Emitida</option>
              <option value="pagada">Pagada</option>
              <option value="vencida">Vencida</option>
              <option value="anulada">Anulada</option>
            </Select>
            <span className="text-[12px] text-[var(--text-muted)] ml-auto">{lista.total || 0} documento(s)</span>
          </div>

          {isLoading ? (
            <div className="text-[12px] text-[var(--text-muted)] py-8 text-center">Cargando documentos…</div>
          ) : items.length === 0 ? (
            <EmptyState icon={Receipt} title="Sin documentos" description="Genera una factura a partir de una suscripción para comenzar." />
          ) : (
            <>
              <TableWrap>
                <thead>
                  <tr><Th>Documento</Th><Th>Cliente / plan</Th><Th>Emisión / vencimiento</Th><Th right>Total</Th><Th>Cobro</Th><Th>Estado</Th><Th right>Acciones</Th></tr>
                </thead>
                <tbody>
                  {items.map(f => {
                    const est = ESTADO[f.estado] || { label: f.estado, badge: 'neutral' }
                    return (
                      <tr key={f.id} className="border-t border-white/5 hover:bg-white/2 cursor-pointer" onClick={() => setDetalleId(f.id)}>
                        <Td>
                          <div className="font-semibold text-[var(--text-primary)]">{f.numero}</div>
                          <div className="text-[11px] text-[var(--text-muted)]">{f.enviada ? 'Enviado' : 'Pendiente de envío'}</div>
                        </Td>
                        <Td>
                          <div className="text-[var(--text-primary)]">{f.empresaNombre}</div>
                          <div className="text-[11px] text-[var(--text-muted)]">{f.planNombre} · {f.empresaRuc || 'Sin RUC'}</div>
                        </Td>
                        <Td>
                          <div className="text-[13px] text-[var(--text-primary)]">{fdate(f.emitidaEn)}</div>
                          <div className={`text-[11px] ${f.estado === 'vencida' ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>Vence {fdate(f.venceEn)}</div>
                        </Td>
                        <Td right mono>{money(f.total, f.moneda)}</Td>
                        <Td>
                          <span className={f.estado === 'pagada' ? 'text-emerald-400 font-semibold text-[12px]' : 'text-[var(--text-muted)] text-[12px]'}>
                            {f.estado === 'pagada' ? 'Confirmado' : 'Pendiente'}
                          </span>
                          {f.referenciaPago && <div className="text-[11px] text-[var(--text-muted)] max-w-[120px] truncate">{f.referenciaPago}</div>}
                        </Td>
                        <Td><Badge variant={est.badge}>{est.label}</Badge></Td>
                        <Td right onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {f.estado !== 'pagada' && f.estado !== 'anulada' && (
                              <Btn variant="ghost" size="sm" onClick={() => abrirCobro(f)}><CircleDollarSign size={12}/>Cobrar</Btn>
                            )}
                            {!f.enviada && f.estado !== 'anulada' && (
                              <Btn variant="ghost" size="icon" title="Marcar enviado" onClick={() => handleEnviar(f)}><Send size={13}/></Btn>
                            )}
                            {f.estado !== 'pagada' && f.estado !== 'anulada' && (
                              <Btn variant="danger" size="icon" title="Anular" onClick={() => handleAnular(f)}><XCircle size={13}/></Btn>
                            )}
                          </div>
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
              </TableWrap>

              {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 text-[12px] text-[var(--text-muted)]">
                  <Btn variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13}/>Anterior</Btn>
                  <span>Página {page} de {totalPages}</span>
                  <Btn variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente<ChevronRight size={13}/></Btn>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── COBROS PENDIENTES ── */}
      {subTab === 'pendientes' && (
        <div className="space-y-2">
          {pendientes.length === 0 ? (
            <Alert variant="success">No hay cobros pendientes en esta página de resultados.</Alert>
          ) : pendientes.map(f => (
            <div key={f.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border)]">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-[var(--text-primary)]">{f.empresaNombre}</span>
                  <Badge variant={ESTADO[f.estado]?.badge}>{ESTADO[f.estado]?.label}</Badge>
                </div>
                <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{f.numero} · {f.planNombre} · {money(f.total, f.moneda)}</p>
                <p className={`text-[12px] mt-0.5 ${f.estado === 'vencida' ? 'text-red-400 font-medium' : 'text-amber-400'}`}>
                  {f.estado === 'vencida' ? 'Vencida' : 'Vence'} {fdate(f.venceEn)}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Btn variant="secondary" size="sm" onClick={() => setDetalleId(f.id)}>Ver detalle</Btn>
                <Btn variant="primary" size="sm" onClick={() => abrirCobro(f)}><CircleDollarSign size={13}/>Registrar cobro</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── HISTORIAL ── */}
      {subTab === 'historial' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <History size={15} className="text-[var(--accent)]" />
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Movimientos de facturación</h3>
            <Badge variant="neutral">{historial.length}</Badge>
          </div>
          {historial.length === 0 ? (
            <Alert variant="info">Todavía no hay movimientos. Genera y cobra una factura para ver su rastro aquí.</Alert>
          ) : (
            <TableWrap>
              <thead>
                <tr><Th>Fecha</Th><Th>Documento</Th><Th>Negocio</Th><Th>Movimiento</Th><Th>Detalle</Th><Th right>Importe</Th></tr>
              </thead>
              <tbody>
                {historial.map(e => (
                  <tr key={e.id} className="border-t border-white/5">
                    <Td muted>{String(e.fecha).slice(0, 10)}</Td>
                    <Td mono>{e.numero}</Td>
                    <Td muted>{e.empresaNombre}</Td>
                    <Td><Badge variant={EVENTO[e.tipo]?.badge || 'neutral'}>{EVENTO[e.tipo]?.label || e.tipo}</Badge></Td>
                    <Td muted>{e.detalle}</Td>
                    <Td right mono>{money(e.monto)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      )}

      {emitOpen && (
        <ModalGenerar
          onClose={() => setEmitOpen(false)}
          negocios={negocios} planes={planes} renovaciones={renovaciones}
          emitir={emitir} toast={toast}
        />
      )}

      {/* Modal registrar cobro */}
      <Modal open={!!cobro} onClose={() => setCobro(null)} title={`Registrar cobro — ${cobro?.numero || ''}`} size="sm"
        footer={<>
          <Btn variant="secondary" onClick={() => setCobro(null)}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleCobro} disabled={cobrar.isPending}><Save size={14}/>Confirmar cobro</Btn>
        </>}>
        {cobro && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-3 text-center">
              <div><div className="text-[10px] uppercase text-[var(--text-muted)]">Total</div><div className="text-[14px] font-bold text-[var(--text-primary)]">{money(cobro.total, cobro.moneda)}</div></div>
              <div><div className="text-[10px] uppercase text-[var(--text-muted)]">Vence</div><div className="text-[13px] text-[var(--text-primary)]">{fdate(cobro.venceEn)}</div></div>
              <div><div className="text-[10px] uppercase text-[var(--text-muted)]">Estado</div><div className="text-[13px] font-semibold text-amber-400">{ESTADO[cobro.estado]?.label}</div></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Método de pago *">
                <Select value={cobroForm.metodoPago} onChange={e => setCobroForm(p => ({ ...p, metodoPago: e.target.value }))}>
                  {METODOS.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
                </Select>
              </Field>
              <Field label="Fecha de cobro *">
                <Input type="date" value={cobroForm.pagadaEn} onChange={e => setCobroForm(p => ({ ...p, pagadaEn: e.target.value }))} />
              </Field>
              <div className="col-span-2">
                <Field label="Referencia de pago *">
                  <Input autoFocus value={cobroForm.referenciaPago} onChange={e => setCobroForm(p => ({ ...p, referenciaPago: e.target.value }))} placeholder="N° de operación, voucher o ID de pasarela" />
                </Field>
              </div>
            </div>
            <Alert variant="success">Al confirmar, el documento queda <span className="font-semibold">pagado</span>. Si nació de una renovación pendiente, esa renovación se concilia (sin duplicar el pago).</Alert>
          </div>
        )}
      </Modal>

      <ModalDetalle id={detalleId} onClose={() => setDetalleId(null)} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Modal: Generar factura desde una suscripción
// ══════════════════════════════════════════════════════════
const IGV = 0.18

function ModalGenerar({ onClose, negocios, planes, renovaciones, emitir, toast }) {
  // Renovaciones "facturables": no anuladas. Se listan como origen preferente.
  const facturables = useMemo(
    () => renovaciones.filter(r => r.estado !== 'anulado'),
    [renovaciones],
  )

  // Se monta solo al abrir (ver el render del padre), así el inicializador
  // corre fresco cada vez sin necesitar un efecto.
  const [form, setForm] = useState(() => {
    const r0 = facturables[0]
    return r0
      ? { origen: 'renovacion', renovacionId: r0.id, empresaId: r0.negocioId, planId: r0.plan, ciclo: r0.ciclo || 'mensual', moneda: r0.moneda || 'PEN', subtotal: r0.monto || 0, emitidaEn: today(), venceEn: r0.periodoFin || today(), nota: '' }
      : { origen: 'manual', empresaId: '', planId: planes[0]?.id || '', ciclo: 'mensual', moneda: 'PEN', subtotal: 0, emitidaEn: today(), venceEn: today(), nota: '' }
  })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function usarRenovacion(r) {
    setForm({
      origen: 'renovacion', renovacionId: r.id,
      empresaId: r.negocioId, planId: r.plan, ciclo: r.ciclo || 'mensual',
      moneda: r.moneda || 'PEN', subtotal: r.monto || 0,
      emitidaEn: today(), venceEn: r.periodoFin || today(), nota: '',
    })
  }
  function aplicarRenovacion(id) {
    const r = facturables.find(x => x.id === id)
    if (r) usarRenovacion(r)
    else f('origen', 'manual')
  }
  function modoRenovacion() {
    const r0 = facturables[0]
    if (r0) usarRenovacion(r0)
    else setForm(p => ({ ...p, origen: 'renovacion' }))
  }

  const subtotal = parseFloat(form.subtotal) || 0
  const igv = Math.round(subtotal * IGV * 100) / 100
  const total = Math.round((subtotal + igv) * 100) / 100
  const negocio = negocios.find(n => n.id === form.empresaId)

  function fechaFin(inicio, ciclo) {
    const d = new Date(inicio || today())
    return format(ciclo === 'anual' ? addYears(d, 1) : addMonths(d, 1), 'yyyy-MM-dd')
  }

  async function guardar() {
    if (!form.empresaId) { toast('Selecciona un negocio', 'error'); return }
    if (!form.planId) { toast('Selecciona un plan', 'error'); return }
    if (subtotal <= 0) { toast('El importe base debe ser mayor a 0', 'error'); return }
    if (form.venceEn < form.emitidaEn) { toast('El vencimiento no puede ser anterior a la emisión', 'error'); return }
    const res = await emitir.mutateAsync({
      renovacionId: form.origen === 'renovacion' ? form.renovacionId : undefined,
      empresaId: form.empresaId, planId: form.planId, ciclo: form.ciclo,
      moneda: form.moneda, subtotal, emitidaEn: form.emitidaEn, venceEn: form.venceEn,
      nota: form.nota?.trim() || undefined,
    })
    if (res?.error) { toast(res.error, 'error'); return }
    toast(`Factura ${res?.data?.numero || ''} emitida`, 'success')
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Generar factura" size="md"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={guardar} disabled={emitir.isPending}><FileText size={14}/>Emitir factura</Btn>
      </>}>
      <div className="space-y-4">
        <Field label="Origen">
          <div className="flex gap-1.5">
            {[['renovacion', 'Desde una renovación'], ['manual', 'Manual']].map(([id, label]) => (
              <button key={id} type="button" onClick={() => id === 'manual' ? f('origen', 'manual') : modoRenovacion()}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                  (form.origen || 'renovacion') === id ? 'bg-[var(--accent-dim)] border-[var(--accent)]/40 text-[var(--accent)]' : 'bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text-muted)]'
                }`}>{label}</button>
            ))}
          </div>
        </Field>

        {form.origen === 'renovacion' && (
          <Field label="Renovación a facturar *" hint="Los datos del negocio, plan e importe se toman de la renovación seleccionada.">
            <Select value={form.renovacionId || ''} onChange={e => aplicarRenovacion(e.target.value)}>
              {facturables.length === 0 && <option value="">Sin renovaciones registradas</option>}
              {facturables.map(r => (
                <option key={r.id} value={r.id}>
                  {r.negocioNombre} · {r.plan} · {r.ciclo} · {money(r.monto, r.moneda)} ({r.periodoInicio}→{r.periodoFin})
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Negocio *">
            <Select value={form.empresaId || ''} onChange={e => f('empresaId', e.target.value)} disabled={form.origen === 'renovacion'}>
              <option value="">Seleccionar…</option>
              {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </Select>
          </Field>
          <Field label="Plan *">
            <Select value={form.planId || ''} onChange={e => f('planId', e.target.value)} disabled={form.origen === 'renovacion'}>
              <option value="">Seleccionar…</option>
              {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </Select>
          </Field>
          <Field label="Ciclo">
            <Select value={form.ciclo || 'mensual'} onChange={e => f('ciclo', e.target.value)}>
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </Select>
          </Field>
          <Field label="Moneda">
            <Select value={form.moneda || 'PEN'} onChange={e => f('moneda', e.target.value)}>
              <option value="PEN">PEN (S/)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option>
            </Select>
          </Field>
          <Field label="Importe base (sin IGV) *">
            <Input type="number" min="0" step="0.01" value={form.subtotal ?? ''} onChange={e => f('subtotal', e.target.value)} />
          </Field>
          <Field label="Emisión">
            <Input type="date" value={form.emitidaEn || today()} onChange={e => f('emitidaEn', e.target.value)} />
          </Field>
          <Field label="Vencimiento *">
            <Input type="date" min={form.emitidaEn} value={form.venceEn || today()} onChange={e => f('venceEn', e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Btn variant="ghost" size="sm" onClick={() => f('venceEn', fechaFin(form.emitidaEn, form.ciclo))}>Vencer al fin del ciclo</Btn>
          </div>
        </div>

        <Field label="Observaciones internas (opcional)">
          <Textarea rows={2} value={form.nota || ''} onChange={e => f('nota', e.target.value)} placeholder="Concepto adicional, acuerdo comercial u observación de emisión." />
        </Field>

        <div className="grid grid-cols-3 gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-3">
          <div><div className="text-[10px] uppercase text-[var(--text-muted)]">Subtotal</div><div className="text-[13px] font-semibold text-[var(--text-primary)]">{money(subtotal, form.moneda)}</div></div>
          <div><div className="text-[10px] uppercase text-[var(--text-muted)]">IGV (18%)</div><div className="text-[13px] font-semibold text-[var(--text-primary)]">{money(igv, form.moneda)}</div></div>
          <div><div className="text-[10px] uppercase text-[var(--text-muted)]">Total a cobrar</div><div className="text-[15px] font-bold text-[var(--accent)]">{money(total, form.moneda)}</div></div>
        </div>
        {negocio && <p className="text-[11px] text-[var(--text-muted)]">Cliente: <span className="text-[var(--text-secondary)] font-medium">{negocio.nombre}</span> · RUC {negocio.ruc || 'no registrado'}</p>}
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════
// Modal: Detalle de la factura + línea de tiempo
// ══════════════════════════════════════════════════════════
function ModalDetalle({ id, onClose }) {
  const { data: f, isLoading } = useFactura(id)
  return (
    <Modal open={!!id} onClose={onClose} title={f ? `Factura ${f.numero}` : 'Detalle de factura'} size="lg">
      {isLoading || !f ? (
        <div className="text-[12px] text-[var(--text-muted)] py-8 text-center">Cargando…</div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Badge variant={ESTADO[f.estado]?.badge}>{ESTADO[f.estado]?.label}</Badge>
            <span className="text-[12px] text-[var(--text-muted)]">{f.enviada ? `Enviado ${fdate(f.enviadaEn)}` : 'Pendiente de envío'}</span>
          </div>

          {f.estado === 'vencida' && (
            <Alert variant="warning">La fecha límite ya pasó. Registra el cobro o gestiona la recuperación con el cliente.</Alert>
          )}

          <div className="grid grid-cols-3 gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-3">
            <div><div className="text-[10px] uppercase text-[var(--text-muted)]">Subtotal</div><div className="text-[13px] font-semibold text-[var(--text-primary)]">{money(f.subtotal, f.moneda)}</div></div>
            <div><div className="text-[10px] uppercase text-[var(--text-muted)]">IGV (18%)</div><div className="text-[13px] font-semibold text-[var(--text-primary)]">{money(f.igv, f.moneda)}</div></div>
            <div><div className="text-[10px] uppercase text-[var(--text-muted)]">Total</div><div className="text-[15px] font-bold text-[var(--accent)]">{money(f.total, f.moneda)}</div></div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
            {[
              ['Cliente', f.empresaNombre],
              ['RUC', f.empresaRuc || 'No registrado'],
              ['Plan', `${f.planNombre} · ${f.ciclo}`],
              ['Emisión', fdate(f.emitidaEn)],
              ['Vencimiento', fdate(f.venceEn)],
              ['Método de pago', f.metodoPago || 'Pendiente'],
              ['Fecha de cobro', f.pagadaEn ? fdate(f.pagadaEn) : 'Pendiente'],
              ['Referencia', f.referenciaPago || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-white/5 py-1">
                <span className="text-[var(--text-muted)]">{k}</span><span className="text-[var(--text-primary)] text-right">{v}</span>
              </div>
            ))}
          </div>

          {f.nota && (
            <div className="rounded-xl bg-[var(--bg-muted)] p-3">
              <div className="text-[10px] uppercase text-[var(--text-muted)] mb-1">Observaciones internas</div>
              <p className="text-[12px] text-[var(--text-secondary)]">{f.nota}</p>
            </div>
          )}

          <div>
            <div className="text-[12px] font-semibold text-[var(--text-primary)] mb-2">Historial del documento</div>
            <div className="space-y-2">
              {(f.eventos || []).map(e => (
                <div key={e.id} className="flex gap-3 rounded-lg border border-[var(--border)] p-2.5">
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    e.tipo === 'cobro_registrado' ? 'bg-emerald-500' : e.tipo === 'anulada' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-[var(--text-primary)]">{EVENTO[e.tipo]?.label || e.tipo}</span>
                      <span className="text-[11px] text-[var(--text-muted)]">{String(e.fecha).slice(0, 10)}</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{e.detalle}</p>
                  </div>
                </div>
              ))}
              {(f.eventos || []).length === 0 && <p className="text-[11px] text-[var(--text-muted)]">Sin eventos.</p>}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
