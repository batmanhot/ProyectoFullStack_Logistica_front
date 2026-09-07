import { useMemo } from 'react'
import { ClipboardList, Clock, CheckCircle, XCircle, PackageCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../store/AppContext'
import { formatDate } from '../../utils/helpers'
import { Badge } from '../../components/ui/index'
import { usePedidosInternosList } from '../../queries/pedidos-internos.queries'

const ESTADO_PI = {
  BORRADOR:  { label: 'Borrador',  color: 'neutral' },
  ENVIADO:   { label: 'Enviado',   color: 'info'    },
  APROBADO:  { label: 'Aprobado',  color: 'success' },
  PICKING:   { label: 'Preparando', color: 'warning' },
  ENTREGADO: { label: 'Entregado', color: 'success' },
  RECHAZADO: { label: 'Rechazado', color: 'danger'  },
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

export default function DashboardSolicitante() {
  const { sesion } = useApp()
  const nav = useNavigate()

  const { data: todosPedidos = [] } = usePedidosInternosList()
  // "Mis pedidos" — /pedidos-internos hoy devuelve los de toda la empresa
  // (cualquier rol con el permiso los ve, para aprobación/logística); el
  // Dashboard personal del Solicitante se acota a los que él mismo generó.
  const misPedidos = useMemo(() =>
    todosPedidos.filter(p => p.usuarioSolicitaId === sesion?.id)
  , [todosPedidos, sesion?.id])

  const kpis = useMemo(() => {
    const enProceso = misPedidos.filter(p => ['ENVIADO', 'APROBADO', 'PICKING'].includes(p.estado))
    const entregados = misPedidos.filter(p => p.estado === 'ENTREGADO')
    const rechazados = misPedidos.filter(p => p.estado === 'RECHAZADO')
    const sinConfirmar = misPedidos.filter(p => p.estado === 'ENTREGADO' && !p.reciboConfirmado)
    return {
      enProcesoCount: enProceso.length, entregadosCount: entregados.length,
      rechazadosCount: rechazados.length, sinConfirmarCount: sinConfirmar.length,
    }
  }, [misPedidos])

  const recientes = useMemo(() =>
    [...misPedidos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 8)
  , [misPedidos])

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-[#e8edf2]">Mis Pedidos Internos 📋</h1>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Buenos días, {sesion?.nombre?.split(' ')[0] || ''} — {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="text-[11px] px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-semibold">Rol: Solicitante</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="En proceso" value={kpis.enProcesoCount} color="#3b82f6" icon={Clock} onClick={() => nav('/pedidos-internos')}/>
        <KPI label="Entregados" value={kpis.entregadosCount} color="#00c896" icon={CheckCircle} onClick={() => nav('/pedidos-internos')}/>
        <KPI label="Rechazados" value={kpis.rechazadosCount} color={kpis.rechazadosCount > 0 ? '#ef4444' : '#5f6f80'} icon={XCircle} onClick={() => nav('/pedidos-internos')}/>
        <KPI label="Por confirmar recibo" value={kpis.sinConfirmarCount} color={kpis.sinConfirmarCount > 0 ? '#f59e0b' : '#22c55e'} icon={PackageCheck} onClick={() => nav('/pedidos-internos')}/>
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12px] font-semibold text-[#e8edf2] flex items-center gap-1.5"><ClipboardList size={13} className="text-[#00c896]"/> Mis pedidos recientes</div>
          <button onClick={() => nav('/pedidos-internos')} className="text-[11px] text-[#00c896] hover:underline">Ver todos →</button>
        </div>
        {recientes.length === 0 ? (
          <div className="text-[12px] text-[#5f6f80] text-center py-8">Todavía no registraste ningún pedido interno.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {recientes.map(p => {
              const meta = ESTADO_PI[p.estado] || ESTADO_PI.BORRADOR
              return (
                <div key={p.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                  <div className="min-w-0">
                    <div className="font-mono text-[#e8edf2]">{p.numero}</div>
                    <div className="text-[#5f6f80] truncate">{p.area?.nombre || '—'} · {formatDate(p.fecha)}</div>
                  </div>
                  <Badge variant={meta.color}>{meta.label}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
