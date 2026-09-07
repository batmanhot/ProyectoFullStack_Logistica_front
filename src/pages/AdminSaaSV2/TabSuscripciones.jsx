import { useState, useMemo } from 'react'
import { RefreshCw, DollarSign, Clock, AlertTriangle, Search, Plus, Trash2, Save, Download } from 'lucide-react'
import {
  PageHeader, Card, Badge, Btn, Field, Input, Select,
  TableWrap, Th, Td, EmptyState, Modal, ConfirmDialog,
} from './ui'
import { today, estadoEfectivo, ESTADO_BADGE, ESTADO_LABEL } from '../AdminSaaS/constants'
import { exportCsv } from './export-utils'

const ESTADO_VARIANT = { pagado:'success', pendiente:'warning', fallido:'danger', anulado:'neutral' }
const ESTADOS_EN_PIE = ['activo', 'trial', 'por_vencer', 'gracia']
const SUB_TABS = ['Vigentes', 'Por vencer', 'Historial']

/**
 * Suscripciones — mismo hook/mutaciones/validaciones que "Historial de
 * Renovaciones" del panel clásico, pero reestructurado en 3 pestañas
 * (Vigentes / Por vencer / Historial) siguiendo SubscriptionsView del
 * mockup de referencia. A diferencia del mockup no existe una entidad
 * "Suscripción" separada en el backend real — "Vigentes" y "Por vencer" se
 * derivan de `negocios` (su plan y fecha de vencimiento actuales), e
 * "Historial" sigue siendo la tabla real de pagos (`renovaciones`).
 */
export default function TabSuscripciones({ renovaciones, negocios, planes, crearRenovacion, anularRenovacion, toast }) {
  const [subTab, setSubTab]       = useState('Vigentes')
  const [modalOpen, setModal]     = useState(false)
  const [form, setForm]           = useState({})
  const [filtroNeg, setFiltroNeg] = useState('todos')
  const [filtroEst, setFiltroEst] = useState('todos')
  const [search, setSearch]       = useState('')
  const [confirmDel, setConfirmDel] = useState(null)

  const stats = useMemo(() => {
    const precios = new Map(planes.map(p => [p.id, p.precioMensual || 0]))
    let mrr = 0, porVencer = 0
    for (const n of negocios) {
      const e = estadoEfectivo(n)
      if (ESTADOS_EN_PIE.includes(e)) mrr += precios.get(n.plan) || 0
      if (e === 'por_vencer' || e === 'gracia') porVencer++
    }
    return {
      vigentes: negocios.filter(n => ESTADOS_EN_PIE.includes(estadoEfectivo(n))).length,
      mrr, porVencer,
      pendientes: renovaciones.filter(r => r.estado === 'pendiente').length,
    }
  }, [negocios, planes, renovaciones])

  const vigentes = useMemo(() => negocios.filter(n => ESTADOS_EN_PIE.includes(estadoEfectivo(n))), [negocios])
  const porVencer = useMemo(() =>
    negocios.filter(n => ['por_vencer','gracia'].includes(estadoEfectivo(n)))
      .sort((a,b) => (a.fechaVencimiento||'').localeCompare(b.fechaVencimiento||''))
  , [negocios])

  const filtered = useMemo(() => {
    let r = [...renovaciones].sort((a,b) => b.fechaPago?.localeCompare(a.fechaPago))
    if (filtroNeg !== 'todos') r = r.filter(x => x.negocioId === filtroNeg)
    if (filtroEst !== 'todos') r = r.filter(x => x.estado   === filtroEst)
    if (search) { const q = search.toLowerCase(); r = r.filter(x => x.negocioNombre?.toLowerCase().includes(q) || x.comprobante?.toLowerCase().includes(q)) }
    return r
  }, [renovaciones, filtroNeg, filtroEst, search])

  function openNew(negocio) {
    setForm({
      negocioId: negocio?.id || '', plan: negocio?.plan || 'basico', monto: negocio ? (planes.find(p=>p.id===negocio.plan)?.precioMensual||0) : 0,
      moneda:'PEN', ciclo:'anual', fechaPago:today(), metodoPago:'tarjeta', periodoInicio:today(), periodoFin:'', estado:'pagado',
      comprobante:`REC-${new Date().getFullYear()}-${String(renovaciones.length+1).padStart(3,'0')}`,
    })
    setModal(true)
  }

  async function save() {
    if (!form.negocioId) { toast('Selecciona un negocio', 'error'); return }
    if (!form.periodoFin) { toast('Ingresa la fecha de fin del período', 'error'); return }
    const res = await crearRenovacion.mutateAsync({ empresaId: form.negocioId, planId: form.plan, monto: parseFloat(form.monto)||0, moneda: form.moneda, ciclo: form.ciclo, fechaPago: form.fechaPago || undefined, metodoPago: form.metodoPago, periodoInicio: form.periodoInicio, periodoFin: form.periodoFin, comprobante: form.comprobante || undefined })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Renovación registrada', 'success')
    setModal(false)
  }

  function exportar() {
    const rows = [
      ['Empresa','Plan','Período inicio','Período fin','Monto','Moneda','Método','Comprobante','Estado'],
      ...filtered.map(r => [r.negocioNombre, planes.find(p=>p.id===r.plan)?.nombre||r.plan, r.periodoInicio, r.periodoFin, r.monto, r.moneda, r.metodoPago, r.comprobante, r.estado]),
    ]
    exportCsv(rows, 'suscripciones-historial')
    toast(`${filtered.length} registro(s) exportado(s)`, 'success')
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const montoTotal = filtered.reduce((s,r) => s + (r.monto||0), 0)

  return (
    <div>
      <PageHeader
        breadcrumb="Operación SaaS"
        title="Suscripciones"
        description="Contratos, pagos y renovaciones que gobiernan la vigencia de cada negocio."
        actions={<Btn variant="primary" onClick={() => openNew()}><Plus size={14}/>Nueva suscripción</Btn>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card><p className="text-[13px] font-semibold text-[#687386]">Suscripciones vigentes</p><p className="mt-2 text-[24px] font-bold text-[#172033]">{stats.vigentes}</p><p className="mt-1 text-[12.5px] text-[#8893a3]">Activas, trial o en gracia</p></Card>
        <Card><p className="text-[13px] font-semibold text-[#687386]">MRR administrado</p><p className="mt-2 text-[24px] font-bold text-[#172033]">S/ {stats.mrr.toLocaleString()}</p><p className="mt-1 text-[12.5px] text-[#8893a3]">Ingreso mensual equivalente</p></Card>
        <Card><p className="text-[13px] font-semibold text-[#687386]">Por renovar</p><p className={`mt-2 text-[24px] font-bold ${stats.porVencer > 0 ? 'text-amber-600' : 'text-[#172033]'}`}>{stats.porVencer}</p><p className="mt-1 text-[12.5px] text-[#8893a3]">Vencidas o próximas</p></Card>
        <Card><p className="text-[13px] font-semibold text-[#687386]">Pagos pendientes</p><p className={`mt-2 text-[24px] font-bold ${stats.pendientes > 0 ? 'text-amber-600' : 'text-[#172033]'}`}>{stats.pendientes}</p><p className="mt-1 text-[12.5px] text-[#8893a3]">Requieren gestión</p></Card>
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-[#eef1f6] px-5 pt-3">
          {SUB_TABS.map(t => (
            <button key={t} onClick={() => setSubTab(t)} className={`whitespace-nowrap border-b-2 px-3 py-3 text-[13.5px] font-semibold transition-colors ${subTab === t ? 'border-[#355fd1] text-[#355fd1]' : 'border-transparent text-[#8893a3] hover:text-[#172033]'}`}>{t}</button>
          ))}
        </div>

        {subTab === 'Vigentes' && (
          vigentes.length === 0 ? <div className="p-10"><EmptyState icon={RefreshCw} title="Sin suscripciones vigentes" /></div> : (
            <TableWrap>
              <thead><tr><Th>Negocio</Th><Th>Plan</Th><Th>Estado</Th><Th>Vencimiento</Th><Th right>Acciones</Th></tr></thead>
              <tbody>
                {vigentes.map(n => {
                  const plan = planes.find(p => p.id === n.plan)
                  return (
                    <tr key={n.id} className="border-t border-[#eef1f6] hover:bg-[#f9fafc]">
                      <Td><div className="font-semibold text-[#172033]">{n.nombre}</div><div className="text-[11.5px] text-[#8893a3]">{n.empresaId}</div></Td>
                      <Td>{plan && <Badge variant="info">{plan.nombre}</Badge>}</Td>
                      <Td><Badge variant={ESTADO_BADGE[estadoEfectivo(n)]||'neutral'}>{ESTADO_LABEL[estadoEfectivo(n)]||estadoEfectivo(n)}</Badge></Td>
                      <Td muted>{n.fechaVencimiento || '—'}</Td>
                      <Td right><Btn variant="secondary" size="sm" onClick={() => openNew(n)}><Plus size={12}/>Registrar pago</Btn></Td>
                    </tr>
                  )
                })}
              </tbody>
            </TableWrap>
          )
        )}

        {subTab === 'Por vencer' && (
          porVencer.length === 0 ? <div className="p-10 text-center text-[13px] text-[#8893a3]">Aún no hay negocios por vencer o en gracia.</div> : (
            <div className="divide-y divide-[#eef1f6]">
              {porVencer.map(n => {
                const plan = planes.find(p => p.id === n.plan)
                const estado = estadoEfectivo(n)
                return (
                  <div key={n.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap"><h3 className="font-semibold text-[#172033]">{n.nombre}</h3><Badge variant={ESTADO_BADGE[estado]||'warning'}>{ESTADO_LABEL[estado]||estado}</Badge></div>
                      <p className="mt-1 text-[13px] text-[#687386]">{plan?.nombre} · S/ {plan?.precioMensual||0}/mes</p>
                      <p className="mt-1 text-[13px] font-medium text-amber-600 flex items-center gap-1.5"><AlertTriangle size={13}/>Vence {n.fechaVencimiento}</p>
                    </div>
                    <Btn variant="primary" onClick={() => openNew(n)} className="shrink-0"><RefreshCw size={14}/>Renovar</Btn>
                  </div>
                )
              })}
            </div>
          )
        )}

        {subTab === 'Historial' && (
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3b2]" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empresa o comprobante…" className="pl-8" />
              </div>
              <Select value={filtroNeg} onChange={e => setFiltroNeg(e.target.value)} style={{ width: 190 }}>
                <option value="todos">Todos los negocios</option>
                {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
              </Select>
              <Select value={filtroEst} onChange={e => setFiltroEst(e.target.value)} style={{ width: 170 }}>
                <option value="todos">Todos los estados</option>
                {['pagado','pendiente','fallido','anulado'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </Select>
              <Btn variant="secondary" onClick={exportar}><Download size={14}/>Exportar</Btn>
            </div>

            {filtered.length > 0 && (
              <div className="text-[12.5px] text-[#687386] mb-3">Mostrando {filtered.length} registros · Total filtrado: <span className="text-[#355fd1] font-bold">${montoTotal.toLocaleString()} USD</span></div>
            )}

            {filtered.length === 0 ? (
              <EmptyState icon={RefreshCw} title="Sin renovaciones" description="Registra el primer pago para comenzar el historial." action={<Btn variant="primary" onClick={() => openNew()}><Plus size={14}/>Registrar pago</Btn>} />
            ) : (
              <TableWrap>
                <thead><tr><Th>Empresa</Th><Th>Plan</Th><Th>Período</Th><Th>Monto</Th><Th>Método</Th><Th>Comprobante</Th><Th>Estado</Th><Th right>Acciones</Th></tr></thead>
                <tbody>
                  {filtered.map(r => {
                    const plan = planes.find(p => p.id === r.plan)
                    return (
                      <tr key={r.id} className="border-t border-[#eef1f6] hover:bg-[#f9fafc]">
                        <Td><div className="font-semibold text-[#172033]">{r.negocioNombre}</div><div className="text-[11.5px] text-[#8893a3]">{r.fechaPago}</div></Td>
                        <Td>{plan && <Badge variant="info">{plan.nombre}</Badge>}</Td>
                        <Td muted><div className="text-[12.5px]">{r.periodoInicio}</div><div className="text-[11.5px] text-[#8893a3]">→ {r.periodoFin}</div></Td>
                        <Td mono><span className="text-[#355fd1] font-bold">${(r.monto||0).toLocaleString()}</span> <span className="text-[11.5px] text-[#8893a3]">{r.moneda}</span></Td>
                        <Td muted>{r.metodoPago}</Td>
                        <Td mono muted>{r.comprobante}</Td>
                        <Td><Badge variant={ESTADO_VARIANT[r.estado]||'neutral'}>{r.estado}</Badge></Td>
                        <Td right><Btn variant="danger" size="icon" onClick={() => setConfirmDel(r)} title="Anular"><Trash2 size={12}/></Btn></Td>
                      </tr>
                    )
                  })}
                </tbody>
              </TableWrap>
            )}
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModal(false)} title="Registrar Renovación / Pago" size="md"
        footer={<><Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn><Btn variant="primary" onClick={save}><Save size={14}/>Registrar pago</Btn></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label="Empresa *"><Select value={form.negocioId||''} onChange={e => f('negocioId',e.target.value)}><option value="">Seleccionar negocio…</option>{negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}</Select></Field></div>
          <Field label="Plan"><Select value={form.plan||'basico'} onChange={e => f('plan',e.target.value)}>{planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Select></Field>
          <Field label="Ciclo"><Select value={form.ciclo||'mensual'} onChange={e => f('ciclo',e.target.value)}><option value="mensual">Mensual</option><option value="anual">Anual</option></Select></Field>
          <Field label="Monto"><Input type="number" min="0" value={form.monto||''} onChange={e => f('monto',parseFloat(e.target.value)||0)} /></Field>
          <Field label="Moneda"><Select value={form.moneda||'USD'} onChange={e => f('moneda',e.target.value)}><option>USD</option><option>PEN</option><option>EUR</option></Select></Field>
          <Field label="Fecha de pago"><Input type="date" value={form.fechaPago||''} onChange={e => f('fechaPago',e.target.value)} /></Field>
          <Field label="Método de pago"><Select value={form.metodoPago||'tarjeta'} onChange={e => f('metodoPago',e.target.value)}>{['tarjeta','transferencia','efectivo','paypal','yape'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}</Select></Field>
          <Field label="Inicio del período"><Input type="date" value={form.periodoInicio||''} onChange={e => f('periodoInicio',e.target.value)} /></Field>
          <Field label="Fin del período"><Input type="date" value={form.periodoFin||''} onChange={e => f('periodoFin',e.target.value)} /></Field>
          <Field label="N° Comprobante"><Input value={form.comprobante||''} onChange={e => f('comprobante',e.target.value)} /></Field>
          <Field label="Estado"><Select value={form.estado||'pagado'} onChange={e => f('estado',e.target.value)}>{['pagado','pendiente','fallido','anulado'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</Select></Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={async () => {
          const res = await anularRenovacion.mutateAsync(confirmDel?.id)
          if (res?.error) { toast(res.error, 'error'); return }
          toast('Renovación anulada', 'success'); setConfirmDel(null)
        }}
        danger title="Anular renovación" message="¿Anular este registro de renovación? No afecta el estado del negocio." />
    </div>
  )
}
