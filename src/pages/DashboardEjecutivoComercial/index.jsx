import { useMemo, useState } from 'react'
import { Users, FileText, DollarSign, Target, AlertTriangle, TrendingUp, Trophy, Filter } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../store/AppContext'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { Badge } from '../../components/ui/index'
import { useClientesList } from '../../queries/clientes.queries'
import { useProformasList } from '../../queries/proformas.queries'
import { useCxCList } from '../../queries/cuentas-por-cobrar.queries'
import { useOportunidadesList, useResponsablesOportunidad } from '../../queries/oportunidades.queries'

const TT = { background: '#1a2230', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12, color: '#e8edf2' }

const ESTADO_PROFORMA = {
  BORRADOR:  { label: 'Borrador',  color: 'neutral' },
  ENVIADA:   { label: 'Enviada',   color: 'info'    },
  ACEPTADA:  { label: 'Aceptada',  color: 'success' },
  RECHAZADA: { label: 'Rechazada', color: 'danger'  },
  VENCIDA:   { label: 'Vencida',   color: 'warning' },
  CONVERTIDA:{ label: 'Convertida',color: 'success' },
}

const ESTADO_OPORTUNIDAD = {
  NUEVA:          { label: 'Nueva',          color: 'neutral' },
  CALIFICADA:     { label: 'Calificada',     color: 'info'    },
  COTIZADA:       { label: 'Cotizada',       color: 'info'    },
  EN_NEGOCIACION: { label: 'En negociación', color: 'warning' },
  GANADA:         { label: 'Ganada',         color: 'success' },
  PERDIDA:        { label: 'Perdida',        color: 'danger'  },
  CANCELADA:      { label: 'Cancelada',      color: 'neutral' },
}

const PIPELINE_ABIERTO = ['NUEVA', 'CALIFICADA', 'COTIZADA', 'EN_NEGOCIACION']

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

export default function DashboardEjecutivoComercial() {
  const { sesion } = useApp()
  const nav = useNavigate()
  const simboloMoneda = 'S/'

  const { data: clientes   = [] } = useClientesList()
  const { data: proformas  = [] } = useProformasList()
  const { data: cxc        = [] } = useCxCList()
  // Alcance personal: cada vendedor ve el cierre y el pipeline de SUS propias
  // oportunidades (Oportunidad.responsableId) — la comparación entre
  // vendedores ya vive en Oportunidades > "Rendimiento por vendedor".
  const { data: oport      = [] } = useOportunidadesList({ responsableId: sesion?.id })
  // Solo para leer la meta mensual propia (Usuario.metaVentasMensual) — este
  // endpoint no exige el permiso 'usuarios' (ver oportunidades.service.ts).
  const { data: responsables = [] } = useResponsablesOportunidad()
  const metaPropia = useMemo(() => {
    const yo = responsables.find(u => u.id === sesion?.id)
    return yo?.metaVentasMensual != null ? Number(yo.metaVentasMensual) : null
  }, [responsables, sesion?.id])

  const [periodoCierres, setPeriodoCierres] = useState('semana') // 'semana' | 'mes'

  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const inicioSemana = useMemo(() => {
    const d = new Date(hoy)
    const dia = d.getDay() // 0=domingo
    const offset = dia === 0 ? -6 : 1 - dia // retrocede hasta el lunes
    d.setDate(d.getDate() + offset)
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const kpis = useMemo(() => {
    const clientesActivos = clientes.filter(c => c.activo !== false).length
    const proformasMes = proformas.filter(p => new Date(p.fecha) >= inicioMes)
    const valorProformasMes = proformasMes.reduce((s, p) => s + Number(p.total || 0), 0)
    const cxcPendiente = cxc.filter(c => ['PENDIENTE', 'PARCIAL'].includes(c.estado))
    const cxcVencida = cxc.filter(c => c.estado === 'VENCIDA')
    const saldoPendiente = cxcPendiente.reduce((s, c) => s + Number(c.saldo || 0), 0)
    const saldoVencido = cxcVencida.reduce((s, c) => s + Number(c.saldo || 0), 0)
    const oportAbiertas = oport.filter(o => PIPELINE_ABIERTO.includes(o.estado))
    const valorPipeline = oportAbiertas.reduce((s, o) => s + Number(o.valorEstimado || 0), 0)

    const ganadas = oport.filter(o => o.estado === 'GANADA' && o.fechaCierre)
    const ganadasSemana = ganadas.filter(o => new Date(o.fechaCierre) >= inicioSemana)
    const ganadasMes = ganadas.filter(o => new Date(o.fechaCierre) >= inicioMes)
    const cerradas = oport.filter(o => ['GANADA', 'PERDIDA', 'CANCELADA'].includes(o.estado))
    const tasaConversion = cerradas.length > 0 ? Math.round((ganadas.length / cerradas.length) * 100) : null

    return {
      clientesActivos, proformasMesCount: proformasMes.length, valorProformasMes,
      saldoPendiente, saldoVencido, cxcVencidaCount: cxcVencida.length,
      oportAbiertasCount: oportAbiertas.length, valorPipeline,
      ganadasSemanaCount: ganadasSemana.length, valorGanadoSemana: ganadasSemana.reduce((s, o) => s + Number(o.valorEstimado || 0), 0),
      ganadasMesCount: ganadasMes.length, valorGanadoMes: ganadasMes.reduce((s, o) => s + Number(o.valorEstimado || 0), 0),
      tasaConversion,
    }
  }, [clientes, proformas, cxc, oport, inicioMes, inicioSemana])

  const funnel = useMemo(() =>
    PIPELINE_ABIERTO.map(estado => {
      const enEtapa = oport.filter(o => o.estado === estado)
      return {
        estado, label: ESTADO_OPORTUNIDAD[estado].label,
        count: enEtapa.length,
        valor: enEtapa.reduce((s, o) => s + Number(o.valorEstimado || 0), 0),
      }
    })
  , [oport])
  const maxFunnel = Math.max(1, ...funnel.map(f => f.count))

  const cierresChart = useMemo(() => {
    const ganadas = oport.filter(o => o.estado === 'GANADA' && o.fechaCierre)
    if (periodoCierres === 'semana') {
      const puntos = []
      for (let i = 7; i >= 0; i--) {
        const inicio = new Date(inicioSemana); inicio.setDate(inicio.getDate() - i * 7)
        const fin = new Date(inicio); fin.setDate(fin.getDate() + 7)
        const delPeriodo = ganadas.filter(o => { const f = new Date(o.fechaCierre); return f >= inicio && f < fin })
        puntos.push({
          periodo: `${inicio.getDate()}/${inicio.getMonth() + 1}`,
          valor: delPeriodo.reduce((s, o) => s + Number(o.valorEstimado || 0), 0),
          cantidad: delPeriodo.length,
        })
      }
      return puntos
    }
    const puntos = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      const inicio = new Date(d.getFullYear(), d.getMonth(), 1)
      const fin = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const delPeriodo = ganadas.filter(o => { const f = new Date(o.fechaCierre); return f >= inicio && f < fin })
      puntos.push({
        periodo: d.toLocaleDateString('es-PE', { month: 'short' }),
        valor: delPeriodo.reduce((s, o) => s + Number(o.valorEstimado || 0), 0),
        cantidad: delPeriodo.length,
      })
    }
    return puntos
  }, [oport, periodoCierres, inicioSemana])

  const proformasRecientes = useMemo(() =>
    [...proformas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5)
  , [proformas])

  const cxcVencidas = useMemo(() =>
    cxc.filter(c => c.estado === 'VENCIDA').sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento)).slice(0, 5)
  , [cxc])

  const clienteNombre = (id) => clientes.find(c => c.id === id)?.razonSocial || clientes.find(c => c.id === id)?.nombre || '—'

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-[#e8edf2]">Panel Comercial 💼</h1>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Buenos días, {sesion?.nombre?.split(' ')[0] || ''} — {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="text-[11px] px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-semibold">Rol: Ejecutivo Comercial</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Clientes activos" value={kpis.clientesActivos} color="#3b82f6" icon={Users} onClick={() => nav('/clientes')}/>
        <KPI label="Proformas del mes" value={kpis.proformasMesCount} sub={formatCurrency(kpis.valorProformasMes, simboloMoneda)} color="#00c896" icon={FileText} onClick={() => nav('/proformas')}/>
        <KPI label="CxC por cobrar" value={formatCurrency(kpis.saldoPendiente, simboloMoneda)} color="#f59e0b" icon={DollarSign} onClick={() => nav('/cuentas-por-cobrar')}/>
        <KPI label="CxC vencida" value={kpis.cxcVencidaCount} sub={formatCurrency(kpis.saldoVencido, simboloMoneda)} color="#ef4444" icon={AlertTriangle} onClick={() => nav('/cuentas-por-cobrar')}/>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Mi pipeline abierto" value={kpis.oportAbiertasCount} sub={formatCurrency(kpis.valorPipeline, simboloMoneda)} color="#8b5cf6" icon={Target} onClick={() => nav('/oportunidades')}/>
        <KPI label="Ganado esta semana" value={kpis.ganadasSemanaCount} sub={formatCurrency(kpis.valorGanadoSemana, simboloMoneda)} color="#10b981" icon={Trophy} onClick={() => nav('/oportunidades')}/>
        <div onClick={() => nav('/oportunidades')}
          className="relative bg-[#161d28] border border-white/8 rounded-xl px-4 sm:px-5 py-4 overflow-hidden cursor-pointer hover:border-white/16 transition-all">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: '#22c55e' }}/>
          <div className="absolute top-3 right-4 opacity-[0.06]"><Trophy size={44}/></div>
          <div className="text-[9px] sm:text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.08em] mb-2 flex items-center gap-1.5">
            <Trophy size={11} style={{ color: '#22c55e', opacity: 0.8 }}/>Ganado este mes
          </div>
          <div className="text-[28px] font-semibold text-[#e8edf2] leading-none">{kpis.ganadasMesCount}</div>
          <div className="text-[10px] text-[#5f6f80] mt-1.5 leading-snug">
            {formatCurrency(kpis.valorGanadoMes, simboloMoneda)}{metaPropia != null && ` / ${formatCurrency(metaPropia, simboloMoneda)} meta`}
          </div>
          {metaPropia != null && metaPropia > 0 && (
            <div className="h-1.5 bg-white/8 rounded-full overflow-hidden mt-2">
              <div className={`h-full rounded-full ${kpis.valorGanadoMes >= metaPropia ? 'bg-[#22c55e]' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, (kpis.valorGanadoMes / metaPropia) * 100)}%` }}/>
            </div>
          )}
        </div>
        <KPI label="Tasa de conversión" value={kpis.tasaConversion === null ? '—' : `${kpis.tasaConversion}%`} sub="Oportunidades ganadas / cerradas" color="#06b6d4" icon={TrendingUp}/>
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12px] font-semibold text-[#e8edf2] flex items-center gap-1.5"><Filter size={13} className="text-[#8b5cf6]"/> Mi pipeline por etapa</div>
          <button onClick={() => nav('/oportunidades')} className="text-[11px] text-[#00c896] hover:underline">Ver todas →</button>
        </div>
        {funnel.every(f => f.count === 0) ? (
          <div className="text-[12px] text-[#5f6f80] text-center py-6">Sin oportunidades abiertas todavía.</div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {funnel.map(f => (
              <div key={f.estado} className="flex items-center gap-3">
                <div className="w-28 shrink-0 text-[11.5px] text-[#9ba8b6]">{f.label}</div>
                <div className="flex-1 h-6 bg-white/5 rounded-md overflow-hidden">
                  <div className="h-full rounded-md bg-[#8b5cf6]/60 transition-all" style={{ width: `${(f.count / maxFunnel) * 100}%` }}/>
                </div>
                <div className="w-10 shrink-0 text-right text-[12px] font-semibold text-[#e8edf2]">{f.count}</div>
                <div className="w-24 shrink-0 text-right text-[11px] font-mono text-[#5f6f80]">{formatCurrency(f.valor, simboloMoneda)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12px] font-semibold text-[#e8edf2] flex items-center gap-1.5"><Trophy size={13} className="text-[#22c55e]"/> Cierres ganados</div>
          <div className="flex gap-1 bg-[#1a2230] rounded-lg p-1">
            {[['semana', 'Semanal'], ['mes', 'Mensual']].map(([id, label]) => (
              <button key={id} onClick={() => setPeriodoCierres(id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${periodoCierres === id ? 'bg-[#00c896]/15 text-[#00c896]' : 'text-[#5f6f80] hover:text-[#9ba8b6]'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cierresChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
              <XAxis dataKey="periodo" stroke="#5f6f80" fontSize={11}/>
              <YAxis stroke="#5f6f80" fontSize={11} width={40}/>
              <Tooltip contentStyle={TT} formatter={(v, n) => n === 'valor' ? [formatCurrency(v, simboloMoneda), 'Ganado'] : [v, 'Oportunidades']}/>
              <Bar dataKey="valor" fill="#22c55e" radius={[4, 4, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] font-semibold text-[#e8edf2]">Proformas recientes</div>
            <button onClick={() => nav('/proformas')} className="text-[11px] text-[#00c896] hover:underline">Ver todas →</button>
          </div>
          {proformasRecientes.length === 0 ? (
            <div className="text-[12px] text-[#5f6f80] text-center py-6">Sin proformas registradas todavía.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {proformasRecientes.map(p => {
                const meta = ESTADO_PROFORMA[p.estado] || ESTADO_PROFORMA.BORRADOR
                return (
                  <div key={p.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                    <div className="min-w-0">
                      <div className="font-mono text-[#e8edf2]">{p.numero}</div>
                      <div className="text-[#5f6f80] truncate">{clienteNombre(p.clienteId)}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[#9ba8b6]">{formatCurrency(p.total, simboloMoneda)}</span>
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
                    <div className="text-[#5f6f80] truncate">{clienteNombre(c.clienteId)} · vence {formatDate(c.fechaVencimiento)}</div>
                  </div>
                  <span className="text-red-400 font-semibold shrink-0">{formatCurrency(c.saldo, simboloMoneda)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
