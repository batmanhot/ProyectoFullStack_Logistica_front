import { useMemo } from 'react'
import { Building2, DollarSign, AlertTriangle, TrendingUp, Clock, Activity, Send } from 'lucide-react'
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { PageHeader, Card, KpiCard, Badge } from './ui'
import { useAuditoriaPlataforma, useHistorialAlertasEnvios } from '../../queries/admin.queries'
import { estadoEfectivo } from '../AdminSaaS/constants'

const ESTADOS_EN_PIE = ['activo', 'trial', 'por_vencer', 'gracia']
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function tiempoRelativo(fecha) {
  if (!fecha) return '—'
  const ms = Date.now() - new Date(fecha).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `hace ${horas}h`
  return `hace ${Math.floor(horas / 24)}d`
}

/**
 * Vista general — mismo cálculo real de MRR/riesgo/atención del panel
 * clásico (TabDashboard.jsx), con el layout de KPIs + gráfico + paneles del
 * mockup de referencia. El gráfico de ingresos es real (suma de
 * renovaciones pagadas por mes), no una serie inventada como en el mockup.
 */
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
    const ingresosMes = (renovaciones || []).filter(r => r.estado === 'pagado' && new Date(r.fechaPago) >= inicioMes).reduce((s, r) => s + (r.monto || 0), 0)
    return { total: negocioList.length, enPie: conteo.activo + conteo.trial + conteo.por_vencer + conteo.gracia, mrr, valorEnRiesgo, ingresosMes, atencion: conteo.gracia + conteo.por_vencer }
  }, [negocioList, planes, renovaciones])

  const chartData = useMemo(() => {
    const hoy = new Date()
    const meses = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      meses.push({ year: d.getFullYear(), month: d.getMonth(), label: MESES[d.getMonth()], monto: 0 })
    }
    for (const r of renovaciones || []) {
      if (r.estado !== 'pagado' || !r.fechaPago) continue
      const d = new Date(r.fechaPago)
      const bucket = meses.find(m => m.year === d.getFullYear() && m.month === d.getMonth())
      if (bucket) bucket.monto += (r.monto || 0)
    }
    return meses
  }, [renovaciones])

  const vencimientosUrgentes = useMemo(() => (vencimientos || []).filter(v => v.dias <= 7).slice(0, 6), [vencimientos])
  const negociosEnGracia = useMemo(() => negocioList.filter(n => estadoEfectivo(n) === 'gracia').slice(0, 6), [negocioList])

  return (
    <div>
      <PageHeader breadcrumb="SuperAdmin" title="Vista general" description="Estado comercial y operativo de la plataforma." />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Negocios activos" value={`${kpis.enPie} / ${kpis.total}`} tone="blue" icon={Building2} />
        <KpiCard label="MRR estimado" value={`S/ ${kpis.mrr.toLocaleString()}`} tone="green" icon={DollarSign} />
        <KpiCard label="Ingresos del mes" value={`S/ ${kpis.ingresosMes.toLocaleString()}`} tone="indigo" icon={TrendingUp} />
        <KpiCard label="Valor en riesgo" value={`S/ ${kpis.valorEnRiesgo.toLocaleString()}`} sub="Por vencer + en gracia" subTone={kpis.valorEnRiesgo > 0 ? 'danger' : undefined} tone="amber" icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-5 mb-5">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div><h2 className="text-[15px] font-bold text-[#172033]">Ingresos recurrentes</h2><p className="text-[12.5px] text-[#8893a3] mt-0.5">Renovaciones pagadas por mes (últimos 6 meses)</p></div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8 }}>
              <defs><linearGradient id="fillMrrV2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#355fd1" stopOpacity={0.28} /><stop offset="95%" stopColor="#355fd1" stopOpacity={0.02} /></linearGradient></defs>
              <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#eef1f6" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#8893a3', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} width={48} tick={{ fill: '#8893a3', fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
              <Tooltip formatter={v => [`S/ ${Number(v).toLocaleString()}`, 'Ingresos']} contentStyle={{ borderRadius: 12, border: '1px solid #dfe4ec', fontSize: 12.5 }} />
              <Area type="monotone" dataKey="monto" stroke="#355fd1" strokeWidth={2.5} fill="url(#fillMrrV2)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <div><h2 className="text-[15px] font-bold text-[#172033]">Requiere atención</h2><p className="text-[12.5px] text-[#8893a3] mt-0.5">Vencen en ≤7 días</p></div>
            <Badge variant={vencimientosUrgentes.length > 0 ? 'warning' : 'success'}>{vencimientosUrgentes.length}</Badge>
          </div>
          {vencimientosUrgentes.length === 0 ? (
            <div className="text-[12.5px] text-[#8893a3] text-center py-8">Nada urgente por ahora. 🎉</div>
          ) : (
            <div className="divide-y divide-[#eef1f6]">
              {vencimientosUrgentes.map(v => (
                <div key={v.empresaId} className="flex items-center justify-between py-3">
                  <div className="min-w-0"><div className="text-[13px] font-semibold text-[#172033] truncate">{v.nombre}</div><div className="text-[11.5px] text-[#8893a3] font-mono">{v.codigo}</div></div>
                  <span className={`font-bold text-[13px] shrink-0 ${v.dias <= 0 ? 'text-red-500' : 'text-amber-600'}`}>{v.dias <= 0 ? 'VENCIDO' : `${v.dias}d`}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card>
          <div className="flex items-center gap-2 mb-3"><Clock size={14} className="text-amber-500" /><h3 className="text-[13.5px] font-bold text-[#172033]">En período de gracia</h3></div>
          {negociosEnGracia.length === 0 ? <div className="text-[12.5px] text-[#8893a3] text-center py-6">Ningún negocio en gracia ahora mismo.</div> : (
            <div className="divide-y divide-[#eef1f6]">
              {negociosEnGracia.map(n => (
                <div key={n.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0"><div className="text-[13px] font-semibold text-[#172033] truncate">{n.nombre}</div><div className="text-[11.5px] text-[#8893a3] font-mono">Venció: {n.fechaVencimiento}</div></div>
                  <Badge variant="warning">Gracia</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3"><Activity size={14} className="text-[#355fd1]" /><h3 className="text-[13.5px] font-bold text-[#172033]">Actividad del PlatformAdmin</h3></div>
          {actividad.length === 0 ? <div className="text-[12.5px] text-[#8893a3] text-center py-6">Sin actividad registrada todavía.</div> : (
            <div className="divide-y divide-[#eef1f6]">
              {actividad.map(a => (
                <div key={a.id} className="py-2.5">
                  <div className="text-[12.5px] text-[#172033]"><span className="text-[#355fd1] font-semibold">{a.admin?.nombre || a.adminEmail}</span> {a.accion} <span className="text-[#687386]">{a.recurso}</span></div>
                  <div className="text-[11px] text-[#8893a3]">{tiempoRelativo(a.timestamp)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3"><Send size={14} className="text-blue-500" /><h3 className="text-[13.5px] font-bold text-[#172033]">Alertas enviadas</h3></div>
          {enviosAlertas.length === 0 ? <div className="text-[12.5px] text-[#8893a3] text-center py-6">Todavía no se envió ninguna.</div> : (
            <div className="divide-y divide-[#eef1f6]">
              {enviosAlertas.slice(0, 6).map(e => (
                <div key={e.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0"><div className="text-[12.5px] text-[#172033] truncate">{e.empresa?.nombre} — {e.regla?.asunto}</div><div className="text-[11px] text-[#8893a3]">{tiempoRelativo(e.enviadoAt)}</div></div>
                  <Badge variant={e.estado === 'enviado' ? 'success' : 'danger'}>{e.estado}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
