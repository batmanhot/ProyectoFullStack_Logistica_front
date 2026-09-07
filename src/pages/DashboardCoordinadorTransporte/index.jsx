import { useMemo } from 'react'
import { Truck, Navigation as NavIcon, Wrench, PackageCheck, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../store/AppContext'
import { formatCurrency, formatDate, formatTime } from '../../utils/helpers'
import { Badge } from '../../components/ui/index'
import { useDespachosList } from '../../queries/despachos.queries'
import { useRutasList } from '../../queries/rutas.queries'
import { useFlotaAlertas } from '../../queries/flota.queries'

const ESTADO_RUTA = {
  PROGRAMADA: { label: 'Programada', color: 'neutral' },
  EN_RUTA:    { label: 'En ruta',    color: 'info'    },
  COMPLETADA: { label: 'Completada', color: 'success' },
  CANCELADA:  { label: 'Cancelada',  color: 'danger'  },
}

function KPI({ label, value, sub, color, icon: Icon, onClick }) {
  return (
    <div onClick={onClick}
      className={`relative bg-[#161d28] border border-white/8 rounded-xl px-4 sm:px-5 py-4 overflow-hidden
        ${onClick ? 'cursor-pointer hover:border-white/16 transition-all' : ''}`}>
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
      <div className="absolute top-3 right-4 opacity-[0.06]">{Icon && <Icon size={44}/>}</div>
      <div className="text-[9px] sm:text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.08em] mb-2 flex items-center gap-1.5">
        {Icon && <Icon size={11} style={{ color, opacity: 0.8 }}/>}{label}
      </div>
      <div className="text-[28px] font-semibold text-[#e8edf2] leading-none">{value}</div>
      {sub && <div className="text-[10px] text-[#5f6f80] mt-1.5 leading-snug">{sub}</div>}
    </div>
  )
}

export default function DashboardCoordinadorTransporte() {
  const { sesion } = useApp()
  const nav = useNavigate()
  const simboloMoneda = 'S/'

  const { data: despachos    = [] } = useDespachosList()
  const { data: rutas        = [] } = useRutasList()
  const { data: flotaAlertas = [] } = useFlotaAlertas()

  const kpis = useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0]
    const rutasHoy = rutas.filter(r => (r.fechaSalida || '').startsWith(hoy))
    const enRuta = rutas.filter(r => r.estado === 'EN_RUTA')
    const listos = despachos.filter(d => d.estado === 'LISTO')
    const valorEnTransito = despachos.filter(d => d.estado === 'DESPACHADO').reduce((s, d) => s + Number(d.total || 0), 0)
    return {
      rutasHoyCount: rutasHoy.length, enRutaCount: enRuta.length,
      listosCount: listos.length, valorEnTransito,
      vehiculosAlertaCount: flotaAlertas.length,
    }
  }, [rutas, despachos, flotaAlertas])

  const rutasVigentes = useMemo(() =>
    rutas.filter(r => ['PROGRAMADA', 'EN_RUTA'].includes(r.estado))
      .sort((a, b) => new Date(a.fechaSalida) - new Date(b.fechaSalida)).slice(0, 6)
  , [rutas])

  const vehiculosUrgentes = useMemo(() =>
    [...flotaAlertas].sort((a, b) => a.dias - b.dias).slice(0, 6)
  , [flotaAlertas])

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-[#e8edf2]">Panel de Transporte 🚚</h1>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Buenos días, {sesion?.nombre?.split(' ')[0] || ''} — {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="text-[11px] px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-semibold">Rol: Coordinador de Transporte</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Rutas de hoy" value={kpis.rutasHoyCount} color="#3b82f6" icon={NavIcon} onClick={() => nav('/transportes')}/>
        <KPI label="En ruta ahora" value={kpis.enRutaCount} color="#0ea5e9" icon={Truck} onClick={() => nav('/transportes')}/>
        <KPI label="Listos para despachar" value={kpis.listosCount} sub={formatCurrency(kpis.valorEnTransito, simboloMoneda) + ' en tránsito'} color="#00c896" icon={PackageCheck} onClick={() => nav('/despachos')}/>
        <KPI label="Vehículos con alerta" value={kpis.vehiculosAlertaCount} color={kpis.vehiculosAlertaCount > 0 ? '#ef4444' : '#22c55e'} icon={Wrench} onClick={() => nav('/flota')}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] font-semibold text-[#e8edf2]">Rutas programadas / en curso</div>
            <button onClick={() => nav('/transportes')} className="text-[11px] text-[#00c896] hover:underline">Ver todas →</button>
          </div>
          {rutasVigentes.length === 0 ? (
            <div className="text-[12px] text-[#5f6f80] text-center py-6">Sin rutas programadas por ahora.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {rutasVigentes.map(r => {
                const meta = ESTADO_RUTA[r.estado] || ESTADO_RUTA.PROGRAMADA
                const entregadas = (r.paradas || []).filter(p => p.estado === 'ENTREGADO').length
                return (
                  <div key={r.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                    <div className="min-w-0">
                      <div className="font-mono text-[#e8edf2]">{r.numero}</div>
                      <div className="text-[#5f6f80] truncate flex items-center gap-1"><Clock size={10}/> {formatDate(r.fechaSalida)} · {formatTime(r.fechaSalida) || '—'} · {entregadas}/{(r.paradas || []).length} entregas</div>
                    </div>
                    <Badge variant={meta.color}>{meta.label}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] font-semibold text-[#e8edf2]">Vehículos — documentos por vencer</div>
            <button onClick={() => nav('/flota')} className="text-[11px] text-[#00c896] hover:underline">Ver Flota →</button>
          </div>
          {vehiculosUrgentes.length === 0 ? (
            <div className="text-[12px] text-[#5f6f80] text-center py-6">Toda la flota está al día. 🎉</div>
          ) : (
            <div className="flex flex-col gap-2">
              {vehiculosUrgentes.map((v, i) => (
                <div key={i} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                  <div className="min-w-0">
                    <div className="text-[#e8edf2]">{v.unidad} <span className="font-mono text-[#5f6f80]">({v.placa})</span></div>
                    <div className="text-[#5f6f80] truncate">{v.tipo}</div>
                  </div>
                  <span className={`font-semibold shrink-0 ${v.dias < 0 ? 'text-red-400' : v.dias <= 7 ? 'text-amber-400' : 'text-[#9ba8b6]'}`}>
                    {v.dias < 0 ? `Vencido ${Math.abs(v.dias)}d` : `${v.dias}d`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
