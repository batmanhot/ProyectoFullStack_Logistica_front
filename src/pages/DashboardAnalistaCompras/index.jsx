import { useMemo } from 'react'
import { ShoppingCart, Building2, FileWarning, Clock, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../store/AppContext'
import { formatCurrency, formatDate, diasParaVencer } from '../../utils/helpers'
import { Badge } from '../../components/ui/index'
import { useOrdenesCompraList } from '../../queries/ordenes-compra.queries'
import { useCotizacionesList } from '../../queries/cotizaciones.queries'
import { useProveedoresList } from '../../queries/proveedores.queries'

const ESTADO_OC = {
  PENDIENTE: { label: 'Pendiente', color: 'warning' },
  APROBADA:  { label: 'Aprobada',  color: 'info'    },
  PARCIAL:   { label: 'Parcial',   color: 'neutral' },
  RECIBIDA:  { label: 'Recibida',  color: 'success' },
  CANCELADA: { label: 'Cancelada', color: 'danger'  },
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

export default function DashboardAnalistaCompras() {
  const { sesion } = useApp()
  const nav = useNavigate()
  const simboloMoneda = 'S/'

  const { data: ordenes      = [] } = useOrdenesCompraList()
  const { data: cotizaciones = [] } = useCotizacionesList()
  const { data: proveedores  = [] } = useProveedoresList()

  const kpis = useMemo(() => {
    const pendientes = ordenes.filter(o => o.estado === 'PENDIENTE')
    const aprobadas  = ordenes.filter(o => o.estado === 'APROBADA')
    const rfqSinRespuesta = cotizaciones.filter(c => {
      if (c.estado !== 'ENVIADA' || !c.fechaVencimiento) return false
      const dias = diasParaVencer(c.fechaVencimiento)
      return dias !== null && dias < 0
    })
    return {
      ocPendientesCount: pendientes.length, ocPendientesValor: pendientes.reduce((s, o) => s + Number(o.total || 0), 0),
      ocAprobadasCount: aprobadas.length,
      rfqSinRespuestaCount: rfqSinRespuesta.length,
      proveedoresActivos: proveedores.filter(p => p.activo !== false).length,
    }
  }, [ordenes, cotizaciones, proveedores])

  const ocRecientes = useMemo(() =>
    [...ordenes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 6)
  , [ordenes])

  const rfqRecientes = useMemo(() =>
    [...cotizaciones].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 6)
  , [cotizaciones])

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-[#e8edf2]">Panel de Compras 🛒</h1>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Buenos días, {sesion?.nombre?.split(' ')[0] || ''} — {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="text-[11px] px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-semibold">Rol: Analista de Compras</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="OC pendientes" value={kpis.ocPendientesCount} sub={formatCurrency(kpis.ocPendientesValor, simboloMoneda)} color="#f59e0b" icon={ShoppingCart} onClick={() => nav('/ordenes')}/>
        <KPI label="OC aprobadas" value={kpis.ocAprobadasCount} color="#3b82f6" icon={CheckCircle} onClick={() => nav('/ordenes')}/>
        <KPI label="RFQ sin respuesta" value={kpis.rfqSinRespuestaCount} color={kpis.rfqSinRespuestaCount > 0 ? '#ef4444' : '#22c55e'} icon={FileWarning} onClick={() => nav('/cotizaciones')}/>
        <KPI label="Proveedores activos" value={kpis.proveedoresActivos} color="#00c896" icon={Building2} onClick={() => nav('/proveedores')}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] font-semibold text-[#e8edf2]">Órdenes de Compra recientes</div>
            <button onClick={() => nav('/ordenes')} className="text-[11px] text-[#00c896] hover:underline">Ver todas →</button>
          </div>
          {ocRecientes.length === 0 ? (
            <div className="text-[12px] text-[#5f6f80] text-center py-6">Sin órdenes de compra todavía.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {ocRecientes.map(o => {
                const meta = ESTADO_OC[o.estado] || ESTADO_OC.PENDIENTE
                return (
                  <div key={o.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                    <div className="min-w-0">
                      <div className="font-mono text-[#e8edf2]">{o.numero}</div>
                      <div className="text-[#5f6f80] truncate">{o.proveedor?.razonSocial || '—'}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[#9ba8b6]">{formatCurrency(o.total, simboloMoneda)}</span>
                      <Badge variant={meta.color}>{meta.label}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] font-semibold text-[#e8edf2]">Cotizaciones (RFQ) recientes</div>
            <button onClick={() => nav('/cotizaciones')} className="text-[11px] text-[#00c896] hover:underline">Ver todas →</button>
          </div>
          {rfqRecientes.length === 0 ? (
            <div className="text-[12px] text-[#5f6f80] text-center py-6">Sin cotizaciones a proveedores todavía.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {rfqRecientes.map(c => (
                <div key={c.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                  <div className="min-w-0">
                    <div className="font-mono text-[#e8edf2]">{c.numero}</div>
                    <div className="text-[#5f6f80] truncate flex items-center gap-1"><Clock size={10}/> {formatDate(c.fecha)}</div>
                  </div>
                  <Badge variant="neutral">{c.estado}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
