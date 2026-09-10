import { useMemo, useState } from 'react'
import {
  Building2, DollarSign, AlertTriangle, Activity, HeartPulse, Download, ChevronRight,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { KpiCard, Badge, Btn, Select } from '../../components/ui/index'
import { useSaludAlertas } from '../../queries/admin.queries'
import { estadoEfectivo, ESTADO_LABEL } from './constants'
import { descargarCsv } from './_shared'

const ESTADOS_EN_PIE = ['activo', 'trial', 'por_vencer', 'gracia']
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Orden y color de cada estado efectivo en la barra "Cartera por estado".
const ESTADO_ORDEN = [
  { key: 'activo',     color: '#22c55e' },
  { key: 'trial',      color: '#3b82f6' },
  { key: 'por_vencer', color: '#f59e0b' },
  { key: 'gracia',     color: '#fb923c' },
  { key: 'vencido',    color: '#ef4444' },
  { key: 'suspendido', color: '#a1a1aa' },
  { key: 'cancelado',  color: '#71717a' },
  { key: 'archivado',  color: '#52525b' },
]

const SEVERIDAD_DOT = { critica: '#ef4444', alta: '#f97316', media: '#3b82f6', info: '#8893a3' }

const CHART = {
  grid:    'rgba(255,255,255,0.06)',
  tick:    '#8893a3',
  accent:  '#3b82f6',
  tooltip: { background: '#1e2533', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, fontSize: 12, color: '#fff' },
}

function tiempoRelativo(fecha) {
  if (!fecha) return '—'
  const ms = Date.now() - new Date(fecha).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `hace ${horas} h`
  return `hace ${Math.floor(horas / 24)} d`
}

// ══════════════════════════════════════════════════════════
// TAB: DASHBOARD — Vista general (comercial · operativo · salud)
// Todo el contenido sale de datos reales: negocios, planes, renovaciones y el
// Centro de Alertas. No hay métricas de infraestructura (uptime/latencia)
// porque no existe esa telemetría — en su lugar, "Cartera por estado".
// ══════════════════════════════════════════════════════════
export default function TabDashboard({ negocios, planes, renovaciones, onNavigate }) {
  const negocioList = useMemo(() => (Array.isArray(negocios) ? negocios : []), [negocios])
  const [meses, setMeses] = useState(6)

  const { data: salud = [] } = useSaludAlertas()

  const hoyLabel = useMemo(() => {
    const t = format(new Date(), "EEEE, d 'de' MMMM", { locale: es })
    return t.charAt(0).toUpperCase() + t.slice(1)
  }, [])

  // ── KPIs ────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const precios = new Map((planes || []).map(p => [p.id, p.precioMensual || 0]))
    const conteo = Object.fromEntries(ESTADO_ORDEN.map(e => [e.key, 0]))
    let mrr = 0, facturables = 0
    for (const n of negocioList) {
      const e = estadoEfectivo(n)
      if (e in conteo) conteo[e]++
      if (ESTADOS_EN_PIE.includes(e)) {
        const precio = precios.get(n.plan) || 0
        mrr += precio
        if (precio > 0) facturables++
      }
    }

    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0)
    const altasMes = negocioList.filter(n => n.createdAt && new Date(n.createdAt) >= inicioMes).length

    const activos = conteo.activo + conteo.trial + conteo.por_vencer + conteo.gracia
    const total = negocioList.length

    const activas = salud.filter(a => a.estado === 'nueva')
    const criticas = activas.filter(a => a.severidad === 'critica').length
    const empresasGraves = new Set(
      activas.filter(a => (a.severidad === 'critica' || a.severidad === 'alta') && a.empresaId).map(a => a.empresaId),
    ).size
    const saludPct = total ? Math.round(100 * (1 - empresasGraves / total)) : 100

    return { mrr, facturables, activos, total, altasMes, atencion: activas.length, criticas, saludPct, conteo }
  }, [negocioList, planes, salud])

  const saludTono = kpis.saludPct >= 90 ? { txt: 'Estable', color: '#22c55e' } : kpis.saludPct >= 75 ? { txt: 'Vigilar', color: '#f59e0b' } : { txt: 'Atención', color: '#ef4444' }

  // ── Serie mensual: ingresos (renovaciones pagadas) + altas de tenants ──
  const serie = useMemo(() => {
    const hoy = new Date()
    const buckets = []
    for (let i = meses - 1; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      buckets.push({ year: d.getFullYear(), month: d.getMonth(), label: MESES[d.getMonth()], ingresos: 0, altas: 0 })
    }
    const find = d => buckets.find(b => b.year === d.getFullYear() && b.month === d.getMonth())
    for (const r of renovaciones || []) {
      if (r.estado !== 'pagado' || !r.fechaPago) continue
      const b = find(new Date(r.fechaPago))
      if (b) b.ingresos += (r.monto || 0)
    }
    for (const n of negocioList) {
      if (!n.createdAt) continue
      const b = find(new Date(n.createdAt))
      if (b) b.altas += 1
    }
    return buckets
  }, [renovaciones, negocioList, meses])

  const crecimientoAltas = useMemo(() => {
    const first = serie.find(b => b.altas > 0)?.altas ?? 0
    const last = serie[serie.length - 1]?.altas ?? 0
    if (!first) return null
    return Math.round(100 * (last - first) / first)
  }, [serie])

  // ── Bandeja de prioridad operativa (top del Centro de Alertas) ──
  const prioridad = useMemo(
    () => salud.filter(a => a.estado === 'nueva').slice(0, 5),
    [salud],
  )

  const cartera = useMemo(
    () => ESTADO_ORDEN.map(e => ({ ...e, label: ESTADO_LABEL[e.key] || e.key, n: kpis.conteo[e.key] || 0 })).filter(e => e.n > 0),
    [kpis.conteo],
  )
  const carteraMax = Math.max(1, ...cartera.map(c => c.n))

  function exportar() {
    const filas = [
      ['StockPro — Vista general', hoyLabel],
      [],
      ['Indicador', 'Valor'],
      ['MRR estimado (S/)', kpis.mrr],
      ['Planes facturables', kpis.facturables],
      ['Tenants activos', kpis.activos],
      ['Tenants totales', kpis.total],
      ['Altas este mes', kpis.altasMes],
      ['Salud promedio (%)', kpis.saludPct],
      ['Alertas que requieren atención', kpis.atencion],
      ['Alertas críticas', kpis.criticas],
      [],
      ['Mes', 'Ingresos (S/)', 'Altas de tenants'],
      ...serie.map(b => [b.label, b.ingresos, b.altas]),
      [],
      ['Cartera por estado', 'Negocios'],
      ...cartera.map(c => [c.label, c.n]),
    ]
    descargarCsv(`vista-general-${format(new Date(), 'yyyy-MM-dd')}`, filas)
  }

  return (
    <div className="space-y-5">
      {/* Sub-cabecera: fecha + controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[12px] text-[var(--text-muted)]">{hoyLabel}</span>
        <div className="flex items-center gap-2">
          <Select value={meses} onChange={e => setMeses(Number(e.target.value))} style={{ width: 168 }}>
            <option value={3}>Últimos 3 meses</option>
            <option value={6}>Últimos 6 meses</option>
            <option value={12}>Últimos 12 meses</option>
          </Select>
          <Btn variant="primary" onClick={exportar}><Download size={14}/>Exportar reporte</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="MRR estimado" value={`S/ ${kpis.mrr.toLocaleString()}`} sub={`${kpis.facturables} planes facturables`} accentColor="#3b82f6" icon={<DollarSign size={30}/>} />
        <KpiCard label="Tenants activos" value={kpis.activos} sub={`+${kpis.altasMes} este mes · ${kpis.total} en total`} accentColor="#6366f1" icon={<Building2 size={30}/>} />
        <KpiCard label="Salud promedio" value={`${kpis.saludPct}%`} sub={saludTono.txt} accentColor={saludTono.color} icon={<HeartPulse size={30}/>} />
        <KpiCard label="Requieren atención" value={kpis.atencion} sub={`${kpis.criticas} crítica(s)`} accentColor={kpis.atencion > 0 ? '#f59e0b' : '#22c55e'} icon={<AlertTriangle size={30}/>} />
      </div>

      {/* Ingresos + Prioridad operativa */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">Ingresos recurrentes</h2>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Renovaciones pagadas por mes</p>
            </div>
            {onNavigate && (
              <button onClick={() => onNavigate('suscripciones')} className="text-[12px] font-semibold text-[var(--accent)] hover:brightness-110 flex items-center gap-0.5">
                Ver detalle <ChevronRight size={13}/>
              </button>
            )}
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={serie} margin={{ left: 0, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="fillIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART.accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART.accent} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 4" stroke={CHART.grid} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: CHART.tick, fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} width={46} tick={{ fill: CHART.tick, fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : v} />
              <Tooltip formatter={v => [`S/ ${Number(v).toLocaleString()}`, 'Ingresos']} contentStyle={CHART.tooltip} labelStyle={{ color: '#fff' }} cursor={{ stroke: CHART.grid }} />
              <Area type="monotone" dataKey="ingresos" stroke={CHART.accent} strokeWidth={2.5} fill="url(#fillIngresos)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">Requiere atención</h2>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Prioridad operativa</p>
            </div>
            <Badge variant={kpis.atencion > 0 ? 'warning' : 'success'}>{kpis.atencion} alerta(s)</Badge>
          </div>
          {prioridad.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[12px] text-[var(--text-muted)] py-8">Sin alertas activas. 🎉</div>
          ) : (
            <div className="flex-1 divide-y divide-white/5">
              {prioridad.map(a => (
                <div key={a.clave} className="flex items-start gap-3 py-3">
                  <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: SEVERIDAD_DOT[a.severidad] || SEVERIDAD_DOT.info }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-[var(--text-primary)] truncate">{a.titulo}</div>
                    <div className="text-[11.5px] text-[var(--text-muted)] truncate">{a.empresaNombre || 'Plataforma'}</div>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] shrink-0">{tiempoRelativo(a.desde)}</span>
                </div>
              ))}
            </div>
          )}
          {onNavigate && (
            <button onClick={() => onNavigate('alertas')} className="mt-3 w-full py-2 rounded-lg border border-[var(--border)] text-[12px] font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)]/40 hover:text-[var(--text-primary)] transition-colors">
              Ver centro de alertas
            </button>
          )}
        </div>
      </div>

      {/* Actividad de tenants + Cartera por estado */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">Actividad de tenants</h2>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Altas por mes</p>
            </div>
            {crecimientoAltas !== null && (
              <Badge variant={crecimientoAltas >= 0 ? 'success' : 'danger'}>{crecimientoAltas >= 0 ? '+' : ''}{crecimientoAltas}%</Badge>
            )}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={serie} margin={{ left: 0, right: 8, top: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" stroke={CHART.grid} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: CHART.tick, fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} width={32} allowDecimals={false} tick={{ fill: CHART.tick, fontSize: 11 }} />
              <Tooltip formatter={v => [v, 'Altas']} contentStyle={CHART.tooltip} labelStyle={{ color: '#fff' }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="altas" fill={CHART.accent} radius={[6, 6, 0, 0]} maxBarSize={46} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">Cartera por estado</h2>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Distribución de los {kpis.total} negocios</p>
            </div>
            <Badge variant="neutral">{kpis.activos}/{kpis.total} operativos</Badge>
          </div>
          {cartera.length === 0 ? (
            <div className="text-[12px] text-[var(--text-muted)] text-center py-10">Todavía no hay negocios registrados.</div>
          ) : (
            <div className="space-y-3">
              {cartera.map(c => (
                <div key={c.key}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="text-[var(--text-secondary)]">{c.label}</span>
                    <span className="font-semibold text-[var(--text-primary)]">{c.n}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(c.n / carteraMax) * 100}%`, background: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
