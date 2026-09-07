import { useState, useMemo } from 'react'
import { RefreshCw, DollarSign, Calendar, Clock, Search, Plus, Trash2, Save } from 'lucide-react'
import {
  Modal, ConfirmDialog, EmptyState, Badge, Btn,
  Field, TableWrap, Th, Td, KpiCard,
} from '../../components/ui/index'
import { today } from './constants'

// ══════════════════════════════════════════════════════════
// TAB: HISTORIAL DE RENOVACIONES
// ══════════════════════════════════════════════════════════
export default function TabRenovaciones({ renovaciones, crearRenovacion, anularRenovacion, negocios, planes, toast }) {
  const [modalOpen, setModal]     = useState(false)
  const [form, setForm]           = useState({})
  const [filtroNeg, setFiltroNeg] = useState('todos')
  const [filtroEst, setFiltroEst] = useState('todos')
  const [search, setSearch]       = useState('')
  const [confirmDel, setConfirmDel] = useState(null)

  const stats = useMemo(() => {
    const hoy = new Date()
    const mesActual = renovaciones.filter(r => {
      const d = new Date(r.fechaPago)
      return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth()
    })
    return {
      total: renovaciones.length,
      montoTotal: renovaciones.reduce((s,r) => s + (r.monto||0), 0),
      montoMes: mesActual.reduce((s,r) => s + (r.monto||0), 0),
      pendientes: renovaciones.filter(r => r.estado === 'pendiente').length,
    }
  }, [renovaciones])

  const filtered = useMemo(() => {
    let r = [...renovaciones].sort((a,b) => b.fechaPago?.localeCompare(a.fechaPago))
    if (filtroNeg !== 'todos') r = r.filter(x => x.negocioId === filtroNeg)
    if (filtroEst !== 'todos') r = r.filter(x => x.estado   === filtroEst)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(x => x.negocioNombre?.toLowerCase().includes(q) || x.comprobante?.toLowerCase().includes(q))
    }
    return r
  }, [renovaciones, filtroNeg, filtroEst, search])

  function openNew() {
    setForm({ negocioId:'', plan:'basico', monto:0, moneda:'PEN', ciclo:'anual', fechaPago:today(), metodoPago:'tarjeta', periodoInicio:today(), periodoFin:'', estado:'pagado', comprobante:`REC-${new Date().getFullYear()}-${String(renovaciones.length+1).padStart(3,'0')}` })
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

  const inp = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20'
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const montoTotal = filtered.reduce((s,r) => s + (r.monto||0), 0)

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total renovaciones" value={stats.total} accentColor="#3b82f6" icon={<RefreshCw size={32}/>} />
        <KpiCard label="Monto total" value={`$${stats.montoTotal.toLocaleString()}`} accentColor="#10b981" icon={<DollarSign size={32}/>} mono />
        <KpiCard label="Monto este mes" value={`$${stats.montoMes.toLocaleString()}`} accentColor="#00c896" icon={<Calendar size={32}/>} mono />
        <KpiCard label="Pendientes de pago" value={stats.pendientes} accentColor="#f59e0b" icon={<Clock size={32}/>} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6f80]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empresa o comprobante…" className={`${inp} pl-8`} />
        </div>
        <select value={filtroNeg} onChange={e => setFiltroNeg(e.target.value)} className={`${inp} w-auto`}>
          <option value="todos">Todos los negocios</option>
          {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
        </select>
        <select value={filtroEst} onChange={e => setFiltroEst(e.target.value)} className={`${inp} w-auto`}>
          <option value="todos">Todos los estados</option>
          {['pagado','pendiente','fallido','anulado'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <Btn variant="primary" onClick={openNew}><Plus size={14}/>Registrar pago</Btn>
      </div>

      {filtered.length > 0 && (
        <div className="text-[12px] text-[#5f6f80]">
          Mostrando {filtered.length} registros · Total filtrado: <span className="text-[#00c896] font-semibold">${montoTotal.toLocaleString()} USD</span>
        </div>
      )}

      {filtered.length === 0
        ? <EmptyState icon={RefreshCw} title="Sin renovaciones" description="Registra el primer pago para comenzar el historial." action={<Btn variant="primary" onClick={openNew}><Plus size={14}/>Registrar pago</Btn>} />
        : (
          <TableWrap>
            <thead>
              <tr><Th>Empresa</Th><Th>Plan</Th><Th>Período</Th><Th>Monto</Th><Th>Método</Th><Th>Comprobante</Th><Th>Estado</Th><Th></Th></tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const plan = planes.find(p => p.id === r.plan)
                const estadoVariant = { pagado:'success', pendiente:'warning', fallido:'danger', anulado:'neutral' }
                return (
                  <tr key={r.id} className="border-t border-white/5 hover:bg-white/2">
                    <Td>
                      <div className="font-medium text-[#e8edf2]">{r.negocioNombre}</div>
                      <div className="text-[11px] text-[#5f6f80]">{r.fechaPago}</div>
                    </Td>
                    <Td>
                      {plan && <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full" style={{ background:`${plan.color}20`, color:plan.color }}>{plan.nombre}</span>}
                    </Td>
                    <Td muted>
                      <div className="text-[12px]">{r.periodoInicio}</div>
                      <div className="text-[11px] text-[#5f6f80]">→ {r.periodoFin}</div>
                    </Td>
                    <Td mono><span className="text-[#00c896] font-bold">${(r.monto||0).toLocaleString()}</span> <span className="text-[11px] text-[#5f6f80]">{r.moneda}</span></Td>
                    <Td muted>{r.metodoPago}</Td>
                    <Td mono muted>{r.comprobante}</Td>
                    <Td><Badge variant={estadoVariant[r.estado]||'neutral'}>{r.estado}</Badge></Td>
                    <Td>
                      <Btn variant="danger" size="icon" onClick={() => setConfirmDel(r)} title="Eliminar"><Trash2 size={12}/></Btn>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </TableWrap>
        )
      }

      <Modal open={modalOpen} onClose={() => setModal(false)} title="Registrar Renovación / Pago" size="md"
        footer={<>
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn variant="primary" onClick={save}><Save size={14}/>Registrar pago</Btn>
        </>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Empresa *">
              <select className={inp} value={form.negocioId||''} onChange={e => f('negocioId',e.target.value)}>
                <option value="">Seleccionar negocio…</option>
                {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Plan">
            <select className={inp} value={form.plan||'pro'} onChange={e => f('plan',e.target.value)}>
              {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          <Field label="Ciclo">
            <select className={inp} value={form.ciclo||'mensual'} onChange={e => f('ciclo',e.target.value)}>
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </select>
          </Field>
          <Field label="Monto">
            <input type="number" min="0" className={inp} value={form.monto||''} onChange={e => f('monto',parseFloat(e.target.value)||0)} />
          </Field>
          <Field label="Moneda">
            <select className={inp} value={form.moneda||'USD'} onChange={e => f('moneda',e.target.value)}>
              <option>USD</option><option>PEN</option><option>EUR</option>
            </select>
          </Field>
          <Field label="Fecha de pago">
            <input type="date" className={inp} value={form.fechaPago||''} onChange={e => f('fechaPago',e.target.value)} />
          </Field>
          <Field label="Método de pago">
            <select className={inp} value={form.metodoPago||'tarjeta'} onChange={e => f('metodoPago',e.target.value)}>
              {['tarjeta','transferencia','efectivo','paypal','yape'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Inicio del período">
            <input type="date" className={inp} value={form.periodoInicio||''} onChange={e => f('periodoInicio',e.target.value)} />
          </Field>
          <Field label="Fin del período">
            <input type="date" className={inp} value={form.periodoFin||''} onChange={e => f('periodoFin',e.target.value)} />
          </Field>
          <Field label="N° Comprobante">
            <input className={inp} value={form.comprobante||''} onChange={e => f('comprobante',e.target.value)} />
          </Field>
          <Field label="Estado">
            <select className={inp} value={form.estado||'pagado'} onChange={e => f('estado',e.target.value)}>
              {['pagado','pendiente','fallido','anulado'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </Field>
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
