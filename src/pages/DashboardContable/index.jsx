import { useMemo } from 'react'
import { DollarSign, AlertTriangle, FileText, Clock, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../store/AppContext'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { Badge } from '../../components/ui/index'
import { useCxCList } from '../../queries/cuentas-por-cobrar.queries'
import { useSunatDocumentos } from '../../queries/sunat.queries'

const ESTADO_GRE = {
  PENDIENTE: { label: 'Sin enviar', color: 'neutral' },
  ENVIADO:   { label: 'Enviado',    color: 'info'    },
  ACEPTADO:  { label: 'Aceptado',   color: 'success' },
  RECHAZADO: { label: 'Rechazado',  color: 'danger'  },
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

export default function DashboardContable() {
  const { sesion } = useApp()
  const nav = useNavigate()
  const simboloMoneda = 'S/'

  const { data: cxc   = [] } = useCxCList()
  const { data: guias = [] } = useSunatDocumentos()

  const kpis = useMemo(() => {
    const pendiente = cxc.filter(c => ['PENDIENTE', 'PARCIAL'].includes(c.estado))
    const vencida = cxc.filter(c => c.estado === 'VENCIDA')
    const cobradaMes = cxc.filter(c => c.estado === 'COBRADA')
    return {
      saldoPendiente: pendiente.reduce((s, c) => s + Number(c.saldo || 0), 0),
      countVencida: vencida.length,
      saldoVencido: vencida.reduce((s, c) => s + Number(c.saldo || 0), 0),
      countCobrada: cobradaMes.length,
      greAceptadas: guias.filter(g => g.estado === 'ACEPTADO').length,
      greRechazadas: guias.filter(g => g.estado === 'RECHAZADO').length,
      grePendientes: guias.filter(g => g.estado === 'PENDIENTE').length,
    }
  }, [cxc, guias])

  const cxcVencidas = useMemo(() =>
    cxc.filter(c => c.estado === 'VENCIDA').sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento)).slice(0, 6)
  , [cxc])

  const greRecientes = useMemo(() =>
    [...guias].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6)
  , [guias])

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-[#e8edf2]">Panel Contable 📊</h1>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Buenos días, {sesion?.nombre?.split(' ')[0] || ''} — {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="text-[11px] px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-semibold">Rol: Contable / Finanzas</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="CxC por cobrar" value={formatCurrency(kpis.saldoPendiente, simboloMoneda)} color="#f59e0b" icon={DollarSign} onClick={() => nav('/cuentas-por-cobrar')}/>
        <KPI label="CxC vencida" value={kpis.countVencida} sub={formatCurrency(kpis.saldoVencido, simboloMoneda)} color="#ef4444" icon={AlertTriangle} onClick={() => nav('/cuentas-por-cobrar')}/>
        <KPI label="CxC cobradas" value={kpis.countCobrada} color="#22c55e" icon={CheckCircle} onClick={() => nav('/cuentas-por-cobrar')}/>
        <KPI label="GRE sin enviar" value={kpis.grePendientes} sub={`${kpis.greRechazadas} rechazadas · ${kpis.greAceptadas} aceptadas`} color="#3b82f6" icon={FileText} onClick={() => nav('/sunat')}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] font-semibold text-[#e8edf2]">Cuentas por cobrar vencidas</div>
            <button onClick={() => nav('/cuentas-por-cobrar')} className="text-[11px] text-[#00c896] hover:underline">Ver todas →</button>
          </div>
          {cxcVencidas.length === 0 ? (
            <div className="text-[12px] text-[#5f6f80] text-center py-6">No hay cuentas vencidas. 🎉</div>
          ) : (
            <div className="flex flex-col gap-2">
              {cxcVencidas.map(c => (
                <div key={c.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                  <div className="min-w-0">
                    <div className="font-mono text-[#e8edf2]">{c.numero}</div>
                    <div className="text-[#5f6f80] truncate">{c.cliente?.razonSocial || '—'} · vence {formatDate(c.fechaVencimiento)}</div>
                  </div>
                  <span className="text-red-400 font-semibold shrink-0">{formatCurrency(c.saldo, simboloMoneda)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] font-semibold text-[#e8edf2]">Guías de Remisión recientes</div>
            <button onClick={() => nav('/sunat')} className="text-[11px] text-[#00c896] hover:underline">Ver todas →</button>
          </div>
          {greRecientes.length === 0 ? (
            <div className="text-[12px] text-[#5f6f80] text-center py-6">Sin guías generadas todavía.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {greRecientes.map(g => {
                const meta = ESTADO_GRE[g.estado] || ESTADO_GRE.PENDIENTE
                return (
                  <div key={g.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                    <div className="min-w-0">
                      <div className="font-mono text-[#e8edf2]">{g.despacho?.numero || '—'}</div>
                      <div className="text-[#5f6f80] truncate flex items-center gap-1"><Clock size={10}/> {formatDate(g.createdAt)}</div>
                    </div>
                    <Badge variant={meta.color}>{meta.label}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
