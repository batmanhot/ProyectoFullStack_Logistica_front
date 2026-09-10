import { useMemo, useState } from 'react'
import { addMonths, addYears, format } from 'date-fns'
import {
  RefreshCw, DollarSign, CalendarClock, AlertTriangle, Search, Plus, Download, Save, History, Receipt,
} from 'lucide-react'
import {
  Modal, EmptyState, Badge, Btn, Field, TableWrap, Th, Td, KpiCard, Input, Select, Alert,
} from '../../components/ui/index'
import { today, estadoEfectivo, ESTADO_LABEL, ESTADO_BADGE } from './constants'
import { money, descargarCsv } from './_shared'
import TabRenovaciones from './TabRenovaciones'

// ══════════════════════════════════════════════════════════
// TAB: SUSCRIPCIONES — contrato/vigencia por negocio
//   Suscripciones (estado de contrato) · Renovaciones (pagos, CRUD) · Historial
//   Todo derivado de negocios + planes + renovaciones (sin backend nuevo).
// ══════════════════════════════════════════════════════════

const SUB_TABS = [
  { id: 'suscripciones', label: 'Suscripciones' },
  { id: 'renovaciones',  label: 'Renovaciones' },
  { id: 'historial',     label: 'Historial' },
]

const PAGO = {
  al_dia:    { label: 'Al día',    badge: 'success' },
  pendiente: { label: 'Pendiente', badge: 'warning' },
  vencido:   { label: 'Vencida',   badge: 'danger'  },
}

const METODOS = ['transferencia', 'tarjeta', 'efectivo', 'yape', 'paypal']

export default function TabSuscripciones({ negocios = [], planes = [], renovaciones = [], crearRenovacion, anularRenovacion, toast }) {
  const [subTab, setSubTab] = useState('suscripciones')
  const [search, setSearch] = useState('')
  const [modalOpen, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [histNegocio, setHistNegocio] = useState('')

  // Última renovación por negocio (renovaciones llega ordenada por fechaPago desc).
  const ultimaRenov = useMemo(() => {
    const m = new Map()
    for (const r of renovaciones) if (!m.has(r.negocioId)) m.set(r.negocioId, r)
    return m
  }, [renovaciones])

  const suscripciones = useMemo(() => negocios
    .filter(n => !['cancelado', 'archivado'].includes(estadoEfectivo(n)))
    .map((n, i) => {
      const plan = planes.find(p => p.id === n.plan)
      const ren = ultimaRenov.get(n.id)
      const ciclo = ren?.ciclo || 'mensual'
      const ef = estadoEfectivo(n)
      const dias = n.fechaVencimiento ? Math.ceil((new Date(n.fechaVencimiento) - new Date()) / 86400000) : null
      const importe = ren?.monto ?? (ciclo === 'anual' ? (plan?.precioAnual || 0) : (plan?.precioMensual || 0))
      const importeMensual = ciclo === 'anual'
        ? (ren?.monto ? ren.monto / 12 : (plan?.precioAnual ? plan.precioAnual / 12 : (plan?.precioMensual || 0)))
        : (ren?.monto ?? plan?.precioMensual ?? 0)
      const vigente = ['activo', 'trial', 'por_vencer'].includes(ef)
      let pago = 'al_dia'
      if (ef === 'suspendido') pago = 'pendiente'
      else if (['gracia', 'vencido'].includes(ef) || (dias != null && dias < 0)) pago = 'vencido'
      return {
        id: n.id,
        codigo: `SUS-${String(n.empresaId || i + 1).toUpperCase()}`,
        negocio: n.nombre,
        planId: n.plan,
        planNombre: plan?.nombre || n.plan,
        planColor: plan?.color,
        ciclo,
        metodoPago: ren?.metodoPago || '—',
        pago,
        fechaVencimiento: n.fechaVencimiento || null,
        dias,
        importe,
        importeMensual,
        moneda: ren?.moneda || 'PEN',
        estadoEf: ef,
        vigente,
        pagoPendiente: !!(ren && ['pendiente', 'fallido'].includes(ren.estado)),
      }
    }), [negocios, planes, ultimaRenov])

  const kpis = useMemo(() => ({
    vigentes: suscripciones.filter(s => s.vigente).length,
    mrr: suscripciones.filter(s => s.vigente).reduce((a, s) => a + (s.importeMensual || 0), 0),
    porRenovar: suscripciones.filter(s => ['por_vencer', 'gracia', 'vencido'].includes(s.estadoEf)).length,
    pagosVencidos: suscripciones.filter(s => s.pagoPendiente).length,
  }), [suscripciones])

  const filtradas = useMemo(() => {
    if (!search.trim()) return suscripciones
    const q = search.toLowerCase()
    return suscripciones.filter(s =>
      s.negocio.toLowerCase().includes(q) || s.planNombre.toLowerCase().includes(q) || s.codigo.toLowerCase().includes(q))
  }, [suscripciones, search])

  function abrirNueva(negocioId = '') {
    const n = negocios.find(x => x.id === negocioId)
    const plan = planes.find(p => p.id === (n?.plan || planes[0]?.id))
    const ren = negocioId ? ultimaRenov.get(negocioId) : null
    const ciclo = ren?.ciclo || 'mensual'
    setForm({
      negocioId,
      planId: plan?.id || '',
      ciclo,
      monto: ren?.monto ?? (ciclo === 'anual' ? (plan?.precioAnual || 0) : (plan?.precioMensual || 0)),
      moneda: ren?.moneda || 'PEN',
      metodoPago: ren?.metodoPago || 'transferencia',
      periodoInicio: today(),
      comprobante: `REC-${new Date().getFullYear()}-${String(renovaciones.length + 1).padStart(3, '0')}`,
    })
    setModal(true)
  }

  function fechaFin(inicio, ciclo) {
    const d = new Date(inicio || today())
    return format(ciclo === 'anual' ? addYears(d, 1) : addMonths(d, 1), 'yyyy-MM-dd')
  }

  async function guardar() {
    if (!form.negocioId) { toast('Selecciona un negocio', 'error'); return }
    if (!form.planId) { toast('Selecciona un plan', 'error'); return }
    const periodoFin = fechaFin(form.periodoInicio, form.ciclo)
    const monto = parseFloat(form.monto) || 0
    if (monto <= 0) { toast('El importe debe ser mayor a 0. Para un trial sin cargo, gestiona el vencimiento desde Negocios.', 'error'); return }
    const res = await crearRenovacion.mutateAsync({
      empresaId: form.negocioId, planId: form.planId, monto,
      moneda: form.moneda, ciclo: form.ciclo, fechaPago: form.periodoInicio || undefined,
      metodoPago: form.metodoPago, periodoInicio: form.periodoInicio, periodoFin,
      comprobante: form.comprobante || undefined,
    })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Suscripción registrada — vigencia extendida', 'success')
    setModal(false)
  }

  function exportar() {
    const filas = [
      ['Negocio', 'Código', 'Plan', 'Ciclo', 'Pago', 'Método', 'Vencimiento', 'Días', 'Importe', 'MRR equiv.', 'Estado'],
      ...filtradas.map(s => [
        s.negocio, s.codigo, s.planNombre, s.ciclo, PAGO[s.pago].label, s.metodoPago,
        s.fechaVencimiento ? String(s.fechaVencimiento).slice(0, 10) : '', s.dias ?? '',
        (s.importe || 0).toFixed(2), (s.importeMensual || 0).toFixed(2),
        ESTADO_LABEL[s.estadoEf] || s.estadoEf,
      ]),
    ]
    descargarCsv(`suscripciones-${new Date().toISOString().slice(0, 10)}`, filas)
    toast(`${filtradas.length} suscripción(es) exportada(s)`, 'success')
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const planForm = planes.find(p => p.id === form.planId)

  // ── Historial: renovaciones del negocio elegido ──
  const negociosConRenov = useMemo(() => {
    const ids = new Set(renovaciones.map(r => r.negocioId))
    return negocios.filter(n => ids.has(n.id))
  }, [negocios, renovaciones])
  const histSeleccion = histNegocio || negociosConRenov[0]?.id || ''
  const histRows = useMemo(
    () => renovaciones.filter(r => r.negocioId === histSeleccion),
    [renovaciones, histSeleccion],
  )
  const histSusc = suscripciones.find(s => s.id === histSeleccion)

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Suscripciones vigentes" value={kpis.vigentes} sub="Activas, trial o por vencer" accentColor="#3b82f6" icon={<Receipt size={30}/>} />
        <KpiCard label="MRR administrado" value={money(kpis.mrr)} sub="Ingreso mensual equivalente" accentColor="#10b981" icon={<DollarSign size={30}/>} />
        <KpiCard label="Por renovar" value={kpis.porRenovar} sub="Vencidas o próximas" accentColor={kpis.porRenovar > 0 ? '#f59e0b' : '#22c55e'} icon={<CalendarClock size={30}/>} />
        <KpiCard label="Pagos vencidos" value={kpis.pagosVencidos} sub="Requieren gestión" accentColor={kpis.pagosVencidos > 0 ? '#ef4444' : '#22c55e'} icon={<AlertTriangle size={30}/>} />
      </div>

      {/* Sub-navegación + acción */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)]">
        <div className="flex gap-1">
          {SUB_TABS.map(t => (
            <button key={t.id} type="button" onClick={() => setSubTab(t.id)}
              className={`px-3.5 py-2 text-[12px] font-semibold -mb-px border-b-2 transition-colors ${
                subTab === t.id ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        {subTab === 'suscripciones' && (
          <div className="flex items-center gap-2">
            <Btn variant="secondary" onClick={exportar}><Download size={14}/>Exportar</Btn>
            <Btn variant="primary" onClick={() => abrirNueva()}><Plus size={14}/>Nueva suscripción</Btn>
          </div>
        )}
      </div>

      {/* ── SUSCRIPCIONES ── */}
      {subTab === 'suscripciones' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por negocio, plan o código…" className="pl-8" />
            </div>
            <span className="text-[12px] text-[var(--text-muted)] ml-auto">{filtradas.length} contrato(s)</span>
          </div>

          {filtradas.length === 0 ? (
            <EmptyState icon={RefreshCw} title="Sin suscripciones" description="Registra el plan y la vigencia de un negocio para comenzar." />
          ) : (
            <TableWrap>
              <thead>
                <tr><Th>Negocio</Th><Th>Plan / ciclo</Th><Th>Pago</Th><Th>Vencimiento</Th><Th right>Importe</Th><Th>Estado</Th><Th right>Acciones</Th></tr>
              </thead>
              <tbody>
                {filtradas.map(s => (
                  <tr key={s.id} className="border-t border-white/5 hover:bg-white/2">
                    <Td>
                      <div className="font-medium text-[var(--text-primary)]">{s.negocio}</div>
                      <div className="text-[11px] text-[var(--text-muted)] font-mono">{s.codigo}</div>
                    </Td>
                    <Td>
                      <div className="text-[var(--text-primary)]">{s.planNombre}</div>
                      <div className="text-[11px] text-[var(--text-muted)] capitalize">{s.ciclo}</div>
                    </Td>
                    <Td>
                      <Badge variant={PAGO[s.pago].badge}>{PAGO[s.pago].label}</Badge>
                      <div className="text-[11px] text-[var(--text-muted)] mt-1 capitalize">{s.metodoPago}</div>
                    </Td>
                    <Td>
                      <div className="text-[13px] text-[var(--text-primary)]">{s.fechaVencimiento ? format(new Date(s.fechaVencimiento), 'dd MMM yyyy') : '—'}</div>
                      {s.dias != null && (
                        <div className={`text-[11px] font-medium ${s.dias < 0 ? 'text-red-400' : s.dias <= 15 ? 'text-amber-500' : 'text-[var(--text-muted)]'}`}>
                          {s.dias < 0 ? `Vencida hace ${-s.dias} d` : s.dias === 0 ? 'Vence hoy' : `Vence en ${s.dias} d`}
                        </div>
                      )}
                    </Td>
                    <Td right mono>{money(s.importe, s.moneda)}<span className="text-[11px] text-[var(--text-muted)]">/{s.ciclo === 'anual' ? 'año' : 'mes'}</span></Td>
                    <Td><Badge variant={ESTADO_BADGE[s.estadoEf] || 'neutral'}>{ESTADO_LABEL[s.estadoEf] || s.estadoEf}</Badge></Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-1">
                        <Btn variant="ghost" size="sm" onClick={() => abrirNueva(s.id)}><DollarSign size={12}/>Renovar</Btn>
                        <Btn variant="ghost" size="icon" title="Ver historial" onClick={() => { setHistNegocio(s.id); setSubTab('historial') }}><History size={13}/></Btn>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      )}

      {/* ── RENOVACIONES (CRUD de pagos, sin cambios) ── */}
      {subTab === 'renovaciones' && (
        <TabRenovaciones
          renovaciones={renovaciones} crearRenovacion={crearRenovacion} anularRenovacion={anularRenovacion}
          negocios={negocios} planes={planes} toast={toast}
        />
      )}

      {/* ── HISTORIAL por negocio ── */}
      {subTab === 'historial' && (
        <div className="space-y-4">
          <Select value={histSeleccion} onChange={e => setHistNegocio(e.target.value)} style={{ width: 280 }}>
            {negociosConRenov.length === 0 && <option value="">Sin renovaciones registradas</option>}
            {negociosConRenov.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </Select>

          {histSusc && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div><div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Plan actual</div><div className="text-[13px] font-semibold text-[var(--text-primary)]">{histSusc.planNombre}</div></div>
              <div><div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Ciclo</div><div className="text-[13px] text-[var(--text-primary)] capitalize">{histSusc.ciclo}</div></div>
              <div><div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Vence</div><div className="text-[13px] text-[var(--text-primary)]">{histSusc.fechaVencimiento ? format(new Date(histSusc.fechaVencimiento), 'dd MMM yyyy') : '—'}</div></div>
              <div><div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">MRR equiv.</div><div className="text-[13px] font-semibold text-[var(--accent)]">{money(histSusc.importeMensual, histSusc.moneda)}</div></div>
            </div>
          )}

          {histRows.length === 0 ? (
            <Alert variant="info">Este negocio todavía no tiene renovaciones registradas.</Alert>
          ) : (
            <TableWrap>
              <thead>
                <tr><Th>Fecha de pago</Th><Th>Plan</Th><Th>Período</Th><Th right>Monto</Th><Th>Método</Th><Th>Comprobante</Th><Th>Estado</Th></tr>
              </thead>
              <tbody>
                {histRows.map(r => {
                  const plan = planes.find(p => p.id === r.plan)
                  const badge = { pagado: 'success', pendiente: 'warning', fallido: 'danger', anulado: 'neutral' }[r.estado] || 'neutral'
                  return (
                    <tr key={r.id} className="border-t border-white/5">
                      <Td muted>{r.fechaPago}</Td>
                      <Td>{plan?.nombre || r.plan} <span className="text-[11px] text-[var(--text-muted)] capitalize">· {r.ciclo}</span></Td>
                      <Td muted>{r.periodoInicio} → {r.periodoFin}</Td>
                      <Td right mono>{money(r.monto, r.moneda)}</Td>
                      <Td muted className="capitalize">{r.metodoPago}</Td>
                      <Td mono muted>{r.comprobante || '—'}</Td>
                      <Td><Badge variant={badge}>{r.estado}</Badge></Td>
                    </tr>
                  )
                })}
              </tbody>
            </TableWrap>
          )}
        </div>
      )}

      {/* Modal Nueva suscripción / Renovar */}
      <Modal open={modalOpen} onClose={() => setModal(false)} title={form.negocioId && negocios.find(n => n.id === form.negocioId) ? `Renovar suscripción — ${negocios.find(n => n.id === form.negocioId).nombre}` : 'Nueva suscripción'} size="md"
        footer={<>
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn variant="primary" onClick={guardar} disabled={crearRenovacion?.isPending}><Save size={14}/>Registrar</Btn>
        </>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Negocio *" className="col-span-2">
            <Select value={form.negocioId || ''} onChange={e => abrirNueva(e.target.value)}>
              <option value="">Seleccionar negocio…</option>
              {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </Select>
          </Field>
          <Field label="Plan">
            <Select value={form.planId || ''} onChange={e => {
              const p = planes.find(x => x.id === e.target.value)
              f('planId', e.target.value)
              f('monto', form.ciclo === 'anual' ? (p?.precioAnual || 0) : (p?.precioMensual || 0))
            }}>
              {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </Select>
          </Field>
          <Field label="Ciclo">
            <Select value={form.ciclo || 'mensual'} onChange={e => {
              f('ciclo', e.target.value)
              f('monto', e.target.value === 'anual' ? (planForm?.precioAnual || 0) : (planForm?.precioMensual || 0))
            }}>
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </Select>
          </Field>
          <Field label="Importe">
            <Input type="number" min="0" step="0.01" value={form.monto ?? ''} onChange={e => f('monto', parseFloat(e.target.value) || 0)} />
          </Field>
          <Field label="Moneda">
            <Select value={form.moneda || 'PEN'} onChange={e => f('moneda', e.target.value)}>
              <option value="PEN">PEN (S/)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option>
            </Select>
          </Field>
          <Field label="Método de pago">
            <Select value={form.metodoPago || 'transferencia'} onChange={e => f('metodoPago', e.target.value)}>
              {METODOS.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
            </Select>
          </Field>
          <Field label="Inicio del período">
            <Input type="date" value={form.periodoInicio || ''} onChange={e => f('periodoInicio', e.target.value)} />
          </Field>
          <Field label="N° Comprobante" className="col-span-2">
            <Input value={form.comprobante || ''} onChange={e => f('comprobante', e.target.value)} />
          </Field>
          <div className="col-span-2 text-[11px] text-[var(--text-muted)]">
            Vigencia hasta <span className="font-semibold text-[var(--text-secondary)]">{form.periodoInicio ? fechaFin(form.periodoInicio, form.ciclo) : '—'}</span> · el negocio se marca activo y se extiende su vencimiento.
          </div>
        </div>
      </Modal>
    </div>
  )
}
