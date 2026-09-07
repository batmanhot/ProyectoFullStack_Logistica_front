import { useMemo } from 'react'
import {
  Building2, DollarSign, AlertTriangle, TrendingUp, Clock, Activity, Send,
} from 'lucide-react'
import { KpiCard, Badge } from '../../components/ui/index'
import { useAuditoriaPlataforma, useHistorialAlertasEnvios } from '../../queries/admin.queries'
import { estadoEfectivo } from './constants'

const ESTADOS_EN_PIE = ['activo', 'trial', 'por_vencer', 'gracia'] // "todavía debería estar pagando/probando"

function tiempoRelativo(fecha) {
  if (!fecha) return '—'
  const ms = Date.now() - new Date(fecha).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `hace ${horas}h`
  const dias = Math.floor(horas / 24)
  return `hace ${dias}d`
}

// ══════════════════════════════════════════════════════════
// TAB: DASHBOARD — panel único de gobierno (Fase 0, 2026-09-04)
// Antes cada tab tenía sus propias KPIs sueltas y no había una vista de
// conjunto — esto junta lo que un dueño de plataforma mira primero: MRR,
// riesgo de vencimiento, y qué pasó últimamente (auditoría + alertas).
// ══════════════════════════════════════════════════════════
export default function TabDashboard({ negocios, planes, renovaciones, vencimientos }) {
  const negocioList = useMemo(() => (Array.isArray(negocios) ? negocios : []), [negocios])
  const { data: actividad = [] } = useAuditoriaPlataforma(10)
  const { data: enviosAlertas = [] } = useHistorialAlertasEnvios()

  const kpis = useMemo(() => {
    const precios = new Map((planes || []).map(p => [p.id, p.precioMensual || 0]))
    let mrr = 0, valorEnRiesgo = 0
    const conteo = { activo: 0, trial: 0, por_vencer: 0, gracia: 0, vencido: 0, suspendido: 0, cancelado: 0, archivado: 0 }
    for (const n of negocioList) {
      const e = estadoEfectivo(n)
      if (e in conteo) conteo[e]++
      if (ESTADOS_EN_PIE.includes(e)) {
        const precio = precios.get(n.plan) || 0
        mrr += precio
        if (e === 'por_vencer' || e === 'gracia') valorEnRiesgo += precio
      }
    }

    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0)
    const ingresosMes = (renovaciones || [])
      .filter(r => r.estado === 'pagado' && new Date(r.fechaPago) >= inicioMes)
      .reduce((s, r) => s + (r.monto || 0), 0)

    return {
      total: negocioList.length,
      enPie: conteo.activo + conteo.trial + conteo.por_vencer + conteo.gracia,
      mrr, valorEnRiesgo, ingresosMes,
      atencion: conteo.gracia + conteo.por_vencer,
      conteo,
    }
  }, [negocioList, planes, renovaciones])

  const vencimientosUrgentes = useMemo(() =>
    (vencimientos || []).filter(v => v.dias <= 7).slice(0, 8)
  , [vencimientos])

  const negociosEnGracia = useMemo(() =>
    negocioList.filter(n => estadoEfectivo(n) === 'gracia').slice(0, 8)
  , [negocioList])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Negocios activos" value={`${kpis.enPie} / ${kpis.total}`} accentColor="#3b82f6" icon={<Building2 size={32}/>} />
        <KpiCard label="MRR estimado" value={`S/ ${kpis.mrr.toLocaleString()}`} accentColor="#10b981" icon={<DollarSign size={32}/>} mono />
        <KpiCard label="Ingresos del mes" value={`S/ ${kpis.ingresosMes.toLocaleString()}`} accentColor="#00c896" icon={<TrendingUp size={32}/>} mono />
        <KpiCard label="Valor en riesgo" value={`S/ ${kpis.valorEnRiesgo.toLocaleString()}`} sub="por vencer + en gracia" accentColor="#f59e0b" icon={<AlertTriangle size={32}/>} mono />
        <KpiCard label="Requieren atención" value={kpis.atencion} accentColor={kpis.atencion > 0 ? '#ef4444' : '#22c55e'} icon={<Clock size={32}/>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-400"/>
            <div className="text-[12px] font-semibold text-[var(--text-primary)]">Vencen en ≤7 días</div>
          </div>
          {vencimientosUrgentes.length === 0 ? (
            <div className="text-[12px] text-[var(--text-muted)] text-center py-6">Nada urgente por ahora. 🎉</div>
          ) : (
            <div className="flex flex-col gap-2">
              {vencimientosUrgentes.map(v => (
                <div key={v.empresaId} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                  <div className="min-w-0">
                    <div className="text-[var(--text-primary)] font-medium truncate">{v.nombre}</div>
                    <div className="text-[var(--text-muted)] font-mono text-[11px]">{v.codigo}</div>
                  </div>
                  <span className={`font-bold text-[13px] shrink-0 ${v.dias <= 0 ? 'text-red-400' : 'text-amber-400'}`}>
                    {v.dias <= 0 ? 'VENCIDO' : `${v.dias}d`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-orange-400"/>
            <div className="text-[12px] font-semibold text-[var(--text-primary)]">En período de gracia</div>
          </div>
          {negociosEnGracia.length === 0 ? (
            <div className="text-[12px] text-[var(--text-muted)] text-center py-6">Ningún negocio en gracia ahora mismo.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {negociosEnGracia.map(n => (
                <div key={n.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                  <div className="min-w-0">
                    <div className="text-[var(--text-primary)] font-medium truncate">{n.nombre}</div>
                    <div className="text-[var(--text-muted)] font-mono text-[11px]">Venció: {n.fechaVencimiento}</div>
                  </div>
                  <Badge variant="warning">Gracia</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} className="text-[var(--accent)]"/>
            <div className="text-[12px] font-semibold text-[var(--text-primary)]">Actividad reciente del PlatformAdmin</div>
          </div>
          {actividad.length === 0 ? (
            <div className="text-[12px] text-[var(--text-muted)] text-center py-6">Sin actividad registrada todavía.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {actividad.map(a => (
                <div key={a.id} className="text-[12px] py-1.5 border-b border-white/5 last:border-0">
                  <div className="text-[var(--text-primary)]">
                    <span className="text-[var(--accent)] font-medium">{a.admin?.nombre || a.adminEmail}</span>
                    {' '}{a.accion}{' '}
                    <span className="text-[var(--text-secondary)]">{a.recurso}</span>
                    {a.empresa?.nombre && <span className="text-[var(--text-muted)]"> · {a.empresa.nombre}</span>}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">{tiempoRelativo(a.timestamp)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Send size={14} className="text-blue-400"/>
            <div className="text-[12px] font-semibold text-[var(--text-primary)]">Últimas alertas de vencimiento enviadas</div>
          </div>
          {enviosAlertas.length === 0 ? (
            <div className="text-[12px] text-[var(--text-muted)] text-center py-6">Todavía no se envió ninguna — corren cada mañana, o dispáralas a mano desde "Alertas de Vencimiento".</div>
          ) : (
            <div className="flex flex-col gap-2">
              {enviosAlertas.slice(0, 8).map(e => (
                <div key={e.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                  <div className="min-w-0">
                    <div className="text-[var(--text-primary)] truncate">{e.empresa?.nombre} — {e.regla?.asunto}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{tiempoRelativo(e.enviadoAt)}</div>
                  </div>
                  <Badge variant={e.estado === 'enviado' ? 'success' : 'danger'}>{e.estado}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
