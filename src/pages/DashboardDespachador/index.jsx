import { useMemo } from 'react'
import { Layers, PackageCheck, ClipboardList, Navigation as NavIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../store/AppContext'
import { formatCurrency, formatTime } from '../../utils/helpers'
import { Badge } from '../../components/ui/index'
import { Badge as BadgePedidoInterno } from '../PedidosInternos/Badge'
import { useDespachosList } from '../../queries/despachos.queries'
import { usePedidosInternosList } from '../../queries/pedidos-internos.queries'
import { useRutasList } from '../../queries/rutas.queries'

const simboloMoneda = 'S/'

// Mismos estados que Despachos.jsx/Transportes — se repiten a mano acá
// porque no están exportados desde un archivo de constantes compartido
// (mismo criterio que ya usa DashboardCoordinadorTransporte con ESTADO_RUTA).
const ESTADO_DESPACHO = {
  PEDIDO:     { label: 'Pedido',     color: 'neutral' },
  APROBADO:   { label: 'Aprobado',   color: 'info'    },
  PICKING:    { label: 'Picking',    color: 'warning' },
  LISTO:      { label: 'Listo',      color: 'teal'    },
  DESPACHADO: { label: 'Despachado', color: 'info'    },
  ENTREGADO:  { label: 'Entregado',  color: 'success' },
  CANCELADO:  { label: 'Anulado',    color: 'danger'  },
}
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

/**
 * Panel del rol "Despachador" (2026-09-04) — a diferencia del Dashboard
 * genérico (pensado para Admin, con KPIs de inventario/compras/clientes que
 * este rol no tiene permiso de ver y por eso mostraban todo en cero), acá
 * solo se consulta lo que Despachador SÍ puede ver: Despachos, Pedidos
 * Internos y Transportes — los 3 módulos de su `permisos` (ver seed.ts).
 */
export default function DashboardDespachador() {
  const { sesion } = useApp()
  const nav = useNavigate()

  const { data: despachos       = [] } = useDespachosList()
  const { data: pedidosInternos = [] } = usePedidosInternosList()
  const { data: rutas           = [] } = useRutasList()

  const kpis = useMemo(() => {
    const enPicking = despachos.filter(d => d.estado === 'PICKING')
    const listos     = despachos.filter(d => d.estado === 'LISTO')
    const valorListos = listos.reduce((s, d) => s + Number(d.total || 0), 0)
    const piPendientes = pedidosInternos.filter(p => ['APROBADO', 'PICKING'].includes(p.estado))
    const enRuta = rutas.filter(r => r.estado === 'EN_RUTA')
    return {
      enPickingCount: enPicking.length,
      listosCount: listos.length, valorListos,
      piPendientesCount: piPendientes.length,
      enRutaCount: enRuta.length,
    }
  }, [despachos, pedidosInternos, rutas])

  const despachosPendientes = useMemo(() =>
    despachos
      .filter(d => ['PICKING', 'LISTO'].includes(d.estado))
      .sort((a, b) => (a.estado === b.estado ? 0 : a.estado === 'LISTO' ? -1 : 1))
      .slice(0, 6)
  , [despachos])

  const pedidosPendientes = useMemo(() =>
    pedidosInternos
      .filter(p => ['APROBADO', 'PICKING'].includes(p.estado))
      .sort((a, b) => new Date(a.fecha || a.createdAt) - new Date(b.fecha || b.createdAt))
      .slice(0, 6)
  , [pedidosInternos])

  const rutasHoy = useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0]
    return rutas
      .filter(r => ['PROGRAMADA', 'EN_RUTA'].includes(r.estado) && (r.fechaSalida || '').startsWith(hoy))
      .sort((a, b) => new Date(a.fechaSalida) - new Date(b.fechaSalida))
  }, [rutas])

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-[#e8edf2]">Panel de Despacho 🚚</h1>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Buenos días, {sesion?.nombre?.split(' ')[0] || ''} — {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="text-[11px] px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-semibold">Rol: Despachador</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Despachos en Picking" value={kpis.enPickingCount} color="#f59e0b" icon={Layers} onClick={() => nav('/despachos')}/>
        <KPI label="Listos para despachar" value={kpis.listosCount} sub={formatCurrency(kpis.valorListos, simboloMoneda)} color="#00c896" icon={PackageCheck} onClick={() => nav('/despachos')}/>
        <KPI label="Pedidos Internos por preparar" value={kpis.piPendientesCount} color="#f97316" icon={ClipboardList} onClick={() => nav('/pedidos-internos')}/>
        <KPI label="Rutas en curso" value={kpis.enRutaCount} color="#0ea5e9" icon={NavIcon} onClick={() => nav('/transportes')}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] font-semibold text-[#e8edf2]">Despachos pendientes de acción</div>
            <button onClick={() => nav('/despachos')} className="text-[11px] text-[#00c896] hover:underline">Ver todos →</button>
          </div>
          {despachosPendientes.length === 0 ? (
            <div className="text-[12px] text-[#5f6f80] text-center py-6">No hay despachos en Picking ni Listos ahora mismo.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {despachosPendientes.map(d => {
                const meta = ESTADO_DESPACHO[d.estado] || ESTADO_DESPACHO.PEDIDO
                return (
                  <div key={d.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                    <div className="min-w-0">
                      <div className="font-mono text-[#e8edf2]">{d.numero}</div>
                      <div className="text-[#5f6f80] truncate">{d.cliente?.razonSocial || '—'}</div>
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
            <div className="text-[12px] font-semibold text-[#e8edf2]">Pedidos Internos por preparar</div>
            <button onClick={() => nav('/pedidos-internos')} className="text-[11px] text-[#00c896] hover:underline">Ver todos →</button>
          </div>
          {pedidosPendientes.length === 0 ? (
            <div className="text-[12px] text-[#5f6f80] text-center py-6">Sin pedidos internos pendientes. 🎉</div>
          ) : (
            <div className="flex flex-col gap-2">
              {pedidosPendientes.map(p => (
                <div key={p.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                  <div className="min-w-0">
                    <div className="font-mono text-[#e8edf2]">{p.numero}</div>
                    <div className="text-[#5f6f80] truncate">{p.area?.nombre || '—'}</div>
                  </div>
                  <BadgePedidoInterno estado={p.estado}/>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12px] font-semibold text-[#e8edf2]">Rutas de hoy</div>
          <button onClick={() => nav('/transportes')} className="text-[11px] text-[#00c896] hover:underline">Ver Transportes →</button>
        </div>
        {rutasHoy.length === 0 ? (
          <div className="text-[12px] text-[#5f6f80] text-center py-6">No hay rutas programadas para hoy.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {rutasHoy.map(r => {
              const meta = ESTADO_RUTA[r.estado] || ESTADO_RUTA.PROGRAMADA
              const entregadas = (r.paradas || []).filter(p => p.estado === 'ENTREGADO').length
              return (
                <div key={r.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                  <div className="min-w-0">
                    <div className="font-mono text-[#e8edf2]">{r.numero}</div>
                    <div className="text-[#5f6f80] truncate">{formatTime(r.fechaSalida) || '—'} · {entregadas}/{(r.paradas || []).length} entregas</div>
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
