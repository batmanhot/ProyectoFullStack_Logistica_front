import { useEffect, useMemo, useState } from 'react'
import {
  Radio, Pause, Play, Download, Activity, Database, Server,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { KpiCard, Badge, Btn, Select } from '../../components/ui/index'
import { useMonitorResumen, useMonitorIncidentes } from '../../queries/admin.queries'
import { descargarCsv } from './_shared'

// ══════════════════════════════════════════════════════════
// TAB: MONITOR EN VIVO — telemetría real de peticiones de la plataforma
// El backend mantiene un ring buffer en memoria (últimos ~10 min) alimentado
// por un interceptor global. Se reinicia con cada deploy — es un monitor "en
// vivo", no un histórico.
// ══════════════════════════════════════════════════════════

const CHART = {
  grid: 'rgba(255,255,255,0.06)', tick: '#8893a3', accent: '#3b82f6',
  tooltip: { background: '#1e2533', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, fontSize: 12, color: '#fff' },
}

const ESTADO_SERVICIO = {
  operativo:   { label: 'Operativo',   badge: 'success', dot: '#22c55e', bar: '#22c55e' },
  degradado:   { label: 'Degradado',   badge: 'warning', dot: '#f59e0b', bar: '#f59e0b' },
  caido:       { label: 'Caído',       badge: 'danger',  dot: '#ef4444', bar: '#ef4444' },
  sin_trafico: { label: 'Sin tráfico', badge: 'neutral', dot: '#64748b', bar: '#64748b' },
}

const TENDENCIA_LABEL = { estable: 'Estable', subiendo: 'Subiendo', bajando: 'Bajando' }

function reloj(seg) {
  const s = Math.max(0, Math.floor(seg))
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const p = n => String(n).padStart(2, '0')
  return hh > 0 ? `${p(hh)}:${p(mm)}:${p(ss)}` : `${p(mm)}:${p(ss)}`
}

function horaCorta(ts) {
  try { return new Date(ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) }
  catch { return '—' }
}

function duracionEntre(a, b) {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m} min ${s % 60}s`
}

export default function TabMonitor() {
  const [activo, setActivo] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('Todas')
  const [transcurrido, setTranscurrido] = useState(0)

  const { data: resumen, isLoading } = useMonitorResumen(activo)
  const { data: incidentes = [] } = useMonitorIncidentes()

  useEffect(() => {
    if (!activo) return
    const id = setInterval(() => setTranscurrido(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [activo])

  const kpis = resumen?.kpis
  const serie = resumen?.serie || []
  const servicios = useMemo(() => resumen?.servicios || [], [resumen])
  const actividad = resumen?.actividad || []
  const tendencia = resumen?.tendencia || 'estable'

  const tipos = useMemo(() => ['Todas', ...new Set(servicios.map(s => s.tipo))], [servicios])
  const serviciosFiltrados = useMemo(
    () => filtroTipo === 'Todas' ? servicios : servicios.filter(s => s.tipo === filtroTipo),
    [servicios, filtroTipo],
  )
  const conIncidencia = resumen?.serviciosConIncidencia ?? 0
  const incidentesActivos = incidentes.filter(i => !i.resueltoAt).length

  function exportar() {
    const ts = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const filas = [
      ['StockPro — Monitor en Vivo', ts],
      [],
      ['Indicador', 'Valor'],
      ['Peticiones / min', kpis?.peticionesPorMin ?? 0],
      ['Latencia promedio (ms)', kpis?.latenciaPromedioMs ?? 0],
      ['Latencia p95 (ms)', kpis?.latenciaP95Ms ?? 0],
      ['Tasa de error (%)', kpis?.tasaErrorPct ?? 0],
      ['Usuarios activos (5 min)', kpis?.sesionesActivas ?? 0],
      [],
      ['Servicio', 'Tipo', 'Latencia ms', 'p95 ms', 'req/min', '% éxito', 'Estado'],
      ...servicios.map(s => [s.nombre, s.tipo, s.latenciaMs, s.p95Ms, s.reqPorMin, s.exitoPct, s.estado]),
    ]
    descargarCsv(`monitor-${new Date().toISOString().slice(0, 10)}`, filas)
  }

  return (
    <div className="space-y-5">
      {/* Sub-cabecera: estado en vivo + controles */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className={`flex items-center gap-2 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg border ${activo ? 'border-[var(--accent)]/30 text-[var(--accent)] bg-[var(--accent-dim)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}>
          <span className={`w-2 h-2 rounded-full ${activo ? 'bg-emerald-400 animate-pulse' : 'bg-[var(--text-muted)]'}`} />
          {activo ? `En vivo · ${reloj(transcurrido)}` : 'En pausa'}
        </span>
        <Btn variant="secondary" onClick={() => setActivo(a => !a)}>
          {activo ? <Pause size={14}/> : <Play size={14}/>}{activo ? 'Pausar' : 'Reanudar'}
        </Btn>
        <Btn variant="primary" onClick={exportar}><Download size={14}/>Exportar</Btn>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Peticiones / min" value={(kpis?.peticionesPorMin ?? 0).toLocaleString()} sub="Todas las APIs" accentColor="#3b82f6" icon={<Radio size={30}/>} />
        <KpiCard label="Latencia promedio" value={`${kpis?.latenciaPromedioMs ?? 0} ms`} sub={`p95 ${kpis?.latenciaP95Ms ?? 0} ms`} accentColor="#6366f1" icon={<Activity size={30}/>} />
        <KpiCard label="Tasa de error" value={`${kpis?.tasaErrorPct ?? 0}%`} sub={(kpis?.tasaErrorPct ?? 0) < 1 ? 'Dentro del umbral' : 'Sobre el umbral'} accentColor={(kpis?.tasaErrorPct ?? 0) < 1 ? '#22c55e' : '#ef4444'} icon={<Server size={30}/>} />
        <KpiCard label="Usuarios activos" value={(kpis?.sesionesActivas ?? 0).toLocaleString()} sub="Con actividad en 5 min" accentColor="#00c896" icon={<Activity size={30}/>} />
      </div>

      {/* Serie + Actividad reciente */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">Peticiones en tiempo real</h2>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Ventana móvil de los últimos 60 s</p>
            </div>
            <Badge variant={tendencia === 'estable' ? 'success' : tendencia === 'subiendo' ? 'info' : 'warning'}>{TENDENCIA_LABEL[tendencia]}</Badge>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={serie} margin={{ left: 0, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="fillPet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART.accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART.accent} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 4" stroke={CHART.grid} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: CHART.tick, fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis axisLine={false} tickLine={false} width={34} allowDecimals={false} tick={{ fill: CHART.tick, fontSize: 11 }} />
              <Tooltip formatter={(v, n) => [v, n === 'peticiones' ? 'Peticiones' : 'Latencia ms']} contentStyle={CHART.tooltip} labelStyle={{ color: '#fff' }} cursor={{ stroke: CHART.grid }} />
              <Area type="monotone" dataKey="peticiones" stroke={CHART.accent} strokeWidth={2.5} fill="url(#fillPet)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex flex-col">
          <div className="mb-3">
            <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">Actividad reciente</h2>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Últimas peticiones registradas</p>
          </div>
          {actividad.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[12px] text-[var(--text-muted)] py-8">{isLoading ? 'Cargando…' : 'Sin tráfico observado todavía.'}</div>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-[230px] divide-y divide-white/5 -mr-1 pr-1">
              {actividad.map((a, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${a.status >= 500 ? 'bg-red-500/15 text-red-400' : a.status >= 400 ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>{a.status}</span>
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] w-10 shrink-0">{a.metodo}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-[var(--text-primary)] font-mono truncate">{a.ruta}</div>
                    <div className="text-[10.5px] text-[var(--text-muted)] truncate">{a.empresa || a.origen} · {horaCorta(a.ts)}</div>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] shrink-0">{a.ms} ms</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Salud de servicios */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">Salud de servicios</h2>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Grupos de APIs y base de datos · ventana de 5 min</p>
          </div>
          <Badge variant={conIncidencia > 0 ? 'warning' : 'success'}>{conIncidencia > 0 ? `${conIncidencia} con incidencias` : 'Todo operativo'}</Badge>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tipos.map(t => (
            <button key={t} type="button" onClick={() => setFiltroTipo(t)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${filtroTipo === t ? 'bg-[var(--accent-dim)] border-[var(--accent)]/40 text-[var(--accent)]' : 'bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
              {t}
            </button>
          ))}
        </div>
        {serviciosFiltrados.length === 0 ? (
          <div className="text-[12px] text-[var(--text-muted)] text-center py-8">{isLoading ? 'Cargando…' : 'Sin datos de servicios en la ventana.'}</div>
        ) : (
          <div className="divide-y divide-white/5">
            {serviciosFiltrados.map(s => {
              const cfg = ESTADO_SERVICIO[s.estado] || ESTADO_SERVICIO.sin_trafico
              return (
                <div key={s.nombre} className="flex items-center gap-3 py-3">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.dot }} />
                  <div className="min-w-0 w-[160px] sm:w-[220px] shrink-0">
                    <div className="text-[12.5px] font-semibold text-[var(--text-primary)] truncate">{s.nombre}</div>
                    <div className="text-[10.5px] text-[var(--text-muted)]">{s.tipo}</div>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] w-14 text-right shrink-0 hidden sm:block">{s.latenciaMs} ms</span>
                  <span className="text-[11px] text-[var(--text-muted)] w-20 text-right shrink-0 hidden md:block">{s.reqPorMin} req/min</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden min-w-[40px]">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(4, s.exitoPct)}%`, background: cfg.bar }} />
                  </div>
                  <span className="text-[11px] text-[var(--text-secondary)] w-14 text-right shrink-0">{s.exitoPct}%</span>
                  <Badge variant={cfg.badge}>{cfg.label}</Badge>
                </div>
              )
            })}
          </div>
        )}
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 pt-3 border-t border-[var(--border)] text-[10.5px] text-[var(--text-muted)]">
          <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5 align-middle"/>Operativo — dentro de los parámetros esperados</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5 align-middle"/>Degradado — responde, pero con latencia alta o errores parciales</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5 align-middle"/>Caído — errores en la mayoría de las peticiones</span>
        </div>
        <p className="mt-2 text-[10.5px] text-[var(--text-muted)]">El % corresponde a peticiones exitosas dentro de la ventana de 5 min, no a un uptime histórico.</p>
      </div>

      {/* Historial de incidentes */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">Historial de incidentes</h2>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Cambios de estado detectados automáticamente por el monitor</p>
          </div>
          {incidentesActivos > 0 && <Badge variant="danger">{incidentesActivos} activo(s)</Badge>}
        </div>
        {incidentes.length === 0 ? (
          <div className="text-[12px] text-[var(--text-muted)] text-center py-8">Sin incidentes registrados. 🎉</div>
        ) : (
          <div className="divide-y divide-white/5">
            {incidentes.map(inc => (
              <div key={inc.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${inc.severidad === 'caido' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-[var(--text-primary)]">{inc.servicio}</div>
                  <div className="text-[10.5px] text-[var(--text-muted)]">
                    Inicio: {horaCorta(inc.inicioAt)}{inc.resueltoAt && ` · Resuelto: ${horaCorta(inc.resueltoAt)}`}
                  </div>
                </div>
                <Badge variant="neutral">{inc.tipo}</Badge>
                <Badge variant={inc.severidad === 'caido' ? 'danger' : 'warning'}>{inc.severidad === 'caido' ? 'Caído' : 'Degradado'}</Badge>
                <span className="text-[11px] text-[var(--text-muted)] w-20 text-right shrink-0">
                  {inc.resueltoAt ? duracionEntre(inc.inicioAt, inc.resueltoAt) : 'En curso'}
                </span>
                <Badge variant={inc.resueltoAt ? 'success' : 'danger'}>{inc.resueltoAt ? 'Resuelto' : 'Activo'}</Badge>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 pt-3 border-t border-[var(--border)] text-[10.5px] text-[var(--text-muted)]">
          Cada incidente genera también una alerta en el Centro de alertas y queda registrado en la Auditoría de la plataforma.
        </p>
      </div>
    </div>
  )
}
