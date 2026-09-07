import { useMemo } from 'react'
import { ShieldCheck, AlertTriangle, DollarSign, Activity } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../store/AppContext'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/helpers'
import { useBitacoraAuditoria, useDiscrepanciasAuditoria, useCxcAuditoria } from '../../queries/panel-auditoria.queries'

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

export default function DashboardAuditor() {
  const { sesion } = useApp()
  const nav = useNavigate()
  const simboloMoneda = 'S/'

  const { data: bitacora      = [] } = useBitacoraAuditoria()
  const { data: discrepancias = [] } = useDiscrepanciasAuditoria()
  const { data: cxc           = [] } = useCxcAuditoria()

  const kpis = useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0]
    const eventosHoy = bitacora.filter(e => (e.createdAt || '').startsWith(hoy))
    const discrepanciasAbiertas = discrepancias.filter(d => !d.ajustado)
    const cxcVencida = cxc.filter(c => c.estado === 'VENCIDA')
    return {
      eventosHoyCount: eventosHoy.length,
      discrepanciasAbiertasCount: discrepanciasAbiertas.length,
      cxcVencidaCount: cxcVencida.length,
      cxcVencidaValor: cxcVencida.reduce((s, c) => s + Number(c.saldo || 0), 0),
      usuariosActivos: new Set(bitacora.map(e => e.usuarioId).filter(Boolean)).size,
    }
  }, [bitacora, discrepancias, cxc])

  const eventosRecientes = useMemo(() =>
    [...bitacora].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8)
  , [bitacora])

  const discrepanciasRecientes = useMemo(() =>
    discrepancias.filter(d => !d.ajustado).sort((a, b) => new Date(b.inventario?.fecha) - new Date(a.inventario?.fecha)).slice(0, 6)
  , [discrepancias])

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-[#e8edf2]">Panel de Auditoría 🛡️</h1>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Buenos días, {sesion?.nombre?.split(' ')[0] || ''} — {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="text-[11px] px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-semibold">Rol: Auditor</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Eventos hoy" value={kpis.eventosHoyCount} color="#3b82f6" icon={Activity} onClick={() => nav('/panel-auditoria')}/>
        <KPI label="Usuarios con actividad" value={kpis.usuariosActivos} color="#8b5cf6" icon={ShieldCheck} onClick={() => nav('/panel-auditoria')}/>
        <KPI label="Discrepancias sin ajustar" value={kpis.discrepanciasAbiertasCount} color={kpis.discrepanciasAbiertasCount > 0 ? '#ef4444' : '#22c55e'} icon={AlertTriangle} onClick={() => nav('/panel-auditoria')}/>
        <KPI label="CxC vencida" value={kpis.cxcVencidaCount} sub={formatCurrency(kpis.cxcVencidaValor, simboloMoneda)} color="#f59e0b" icon={DollarSign} onClick={() => nav('/panel-auditoria')}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] font-semibold text-[#e8edf2]">Últimos eventos de bitácora</div>
            <button onClick={() => nav('/panel-auditoria')} className="text-[11px] text-[#00c896] hover:underline">Ver todos →</button>
          </div>
          {eventosRecientes.length === 0 ? (
            <div className="text-[12px] text-[#5f6f80] text-center py-6">Sin eventos registrados todavía.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {eventosRecientes.map(e => (
                <div key={e.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                  <div className="min-w-0">
                    <div className="text-[#e8edf2]">{e.usuarioNombre || 'Sistema'} <span className="text-[#5f6f80]">— {e.accion}</span></div>
                    <div className="text-[#5f6f80] truncate">{e.modulo} · {formatDateTime(e.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] font-semibold text-[#e8edf2]">Discrepancias de Inventario Físico</div>
            <button onClick={() => nav('/panel-auditoria')} className="text-[11px] text-[#00c896] hover:underline">Ver todas →</button>
          </div>
          {discrepanciasRecientes.length === 0 ? (
            <div className="text-[12px] text-[#5f6f80] text-center py-6">Sin discrepancias pendientes de ajustar. 🎉</div>
          ) : (
            <div className="flex flex-col gap-2">
              {discrepanciasRecientes.map(d => (
                <div key={d.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                  <div className="min-w-0">
                    <div className="text-[#e8edf2]">{d.producto?.nombre || '—'}</div>
                    <div className="text-[#5f6f80] truncate">{d.inventario?.numero} · {d.inventario?.almacen?.nombre} · {formatDate(d.inventario?.fecha)}</div>
                  </div>
                  <span className={`font-mono font-semibold shrink-0 ${Number(d.diferencia) < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                    {Number(d.diferencia) > 0 ? '+' : ''}{d.diferencia}
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
