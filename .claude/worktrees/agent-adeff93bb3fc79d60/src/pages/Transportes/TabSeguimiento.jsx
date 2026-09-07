import { useState, useMemo } from 'react'
import { Truck, Clock, Navigation as NavIcon } from 'lucide-react'
import { formatDate, formatTime, fechaHoy } from '../../utils/helpers'
import { Badge, Btn, DataTable } from '../../components/ui/index'
import DateInput from '../../components/ui/DateInput'
import { useRutasList } from '../../queries/rutas.queries'
import { useTransportistasList } from '../../queries/transportistas.queries'
import { useDespachosList } from '../../queries/despachos.queries'
import { useClientesList } from '../../queries/clientes.queries'
import { ESTADO_RUTA } from './constants'

// ════════════════════════════════════════════════════════
// TAB SEGUIMIENTO
// ════════════════════════════════════════════════════════
export default function TabSeguimiento() {
  const { data: rutas         = [] } = useRutasList()
  const { data: despachos     = [] } = useDespachosList()
  const { data: transRaw      = [] } = useTransportistasList({ incluirInactivos: true })
  const { data: clientesRaw   = [] } = useClientesList({ incluirInactivos: true })

  const transportistas = useMemo(() => transRaw,      [transRaw])
  const clientes       = useMemo(() => clientesRaw,   [clientesRaw])

  const hoy    = fechaHoy()
  const hace7  = new Date(); hace7.setDate(hace7.getDate() - 7)
  const hace7s = hace7.toISOString().split('T')[0]

  const [filtDesde, setFiltDesde] = useState(hace7s)
  const [filtHasta, setFiltHasta] = useState('')

  const rutasActivas     = useMemo(() => rutas.filter(r => r.estado === 'EN_RUTA'),    [rutas])
  const rutasProgramadas = useMemo(() => rutas.filter(r => r.estado === 'PROGRAMADA'), [rutas])

  const rutasHistorial = useMemo(() =>
    rutas.filter(r => {
      const f   = r.fechaSalida || ''
      return (!filtDesde || f >= filtDesde) && (!filtHasta || f <= filtHasta)
    }).sort((a, b) => (b.fechaSalida || '').localeCompare(a.fechaSalida || ''))
  , [rutas, filtDesde, filtHasta])

  const cliNombre = id => clientes.find(c => c.id === id)?.razonSocial?.slice(0, 28) || '—'
  const SI_loc = 'px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] font-[inherit]'

  return (
    <div className="flex flex-col gap-5">
      {rutasActivas.length > 0 ? (
        <div className="bg-[#161d28] border border-[#00c896]/25 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-[#00c896]/8 border-b border-[#00c896]/15">
            <div className="w-2 h-2 rounded-full bg-[#00c896] animate-pulse"/>
            <span className="text-[12px] font-semibold text-[#00c896] uppercase tracking-[0.06em]">
              En Ruta Ahora — {rutasActivas.length} salida{rutasActivas.length > 1 ? 's' : ''} activa{rutasActivas.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-col divide-y divide-white/5">
            {rutasActivas.map(ruta => {
              const tra        = transportistas.find(t => t.id === ruta.transportistaId)
              const paradas    = ruta.paradas || []
              const entregadas = paradas.filter(p => p.estado === 'ENTREGADO').length
              const fallidas   = paradas.filter(p => p.estado === 'FALLIDO').length
              const enCamino   = paradas.filter(p => p.estado === 'EN_CAMINO').length
              const pendientes = paradas.filter(p => p.estado === 'PENDIENTE').length
              const total      = paradas.length
              const pct        = total > 0 ? Math.round((entregadas / total) * 100) : 0
              return (
                <div key={ruta.id} className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className="font-mono text-[14px] font-bold text-[#00c896]">{ruta.numero}</span>
                        <Badge variant="info">En Ruta</Badge>
                      </div>
                      <div className="text-[12px] text-[#9ba8b6]">
                        🚚 {tra?.nombre}{tra?.placa && <span className="font-mono ml-1.5 text-[#5f6f80]">{tra.placa}</span>}
                      </div>
                      <div className="text-[11px] text-[#5f6f80] mt-0.5">
                        Salida: <strong className="text-[#9ba8b6]">{formatTime(ruta.fechaSalida) || '—'}</strong>
                        {' · '}Fecha: <strong className="text-[#9ba8b6]">{formatDate(ruta.fechaSalida)}</strong>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[28px] font-bold text-[#e8edf2] leading-none">{pct}%</div>
                      <div className="text-[11px] text-[#5f6f80]">{entregadas}/{total} entregadas</div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="w-full h-3 bg-[#0e1117] rounded-full overflow-hidden flex">
                      {entregadas > 0 && <div className="h-full bg-green-500 transition-all" style={{ width:`${(entregadas/total)*100}%` }}/>}
                      {enCamino   > 0 && <div className="h-full bg-blue-500 transition-all"  style={{ width:`${(enCamino/total)*100}%`   }}/>}
                      {fallidas   > 0 && <div className="h-full bg-red-500 transition-all"   style={{ width:`${(fallidas/total)*100}%`   }}/>}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-[10px] text-[#5f6f80]">
                      {entregadas > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block"/>Entregadas: {entregadas}</span>}
                      {enCamino   > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500 inline-block"/>En camino: {enCamino}</span>}
                      {fallidas   > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block"/>No entregadas: {fallidas}</span>}
                      {pendientes > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#374151] inline-block"/>Pendientes: {pendientes}</span>}
                    </div>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-white/6">
                    <table className="w-full border-collapse text-[12px]">
                      <thead><tr className="bg-[#1a2230]">
                        {['#','Cliente','Dirección','Hora','Estado'].map(h => (
                          <th key={h} className={`px-3 py-2 text-left text-[10px] font-semibold text-[#5f6f80] uppercase border-b border-white/6 ${h === 'Dirección' ? 'hidden md:table-cell' : ''}`}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {paradas.map((p, idx) => {
                          const des    = despachos.find(d => d.id === p.despachoId)
                          const dotCol = p.estado === 'EN_CAMINO' ? '#3b82f6' : p.estado === 'ENTREGADO' ? '#22c55e' : p.estado === 'FALLIDO' ? '#ef4444' : '#374151'
                          const bgRow  = p.estado === 'EN_CAMINO' ? 'bg-blue-500/5' : p.estado === 'ENTREGADO' ? 'bg-green-500/5 opacity-70' : p.estado === 'FALLIDO' ? 'bg-red-500/5' : ''
                          return (
                            <tr key={p.despachoId} className={`border-b border-white/4 last:border-0 ${bgRow}`}>
                              <td className="px-3 py-2.5">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: dotCol }}>
                                  {p.estado === 'ENTREGADO' ? '✓' : p.estado === 'FALLIDO' ? '✕' : idx+1}
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="font-medium text-[#e8edf2] truncate max-w-[160px]">{cliNombre(des?.clienteId)}</div>
                                <div className="text-[11px] text-[#5f6f80]">{des?.numero}</div>
                              </td>
                              <td className="px-3 py-2.5 text-[#5f6f80] truncate max-w-[180px] hidden md:table-cell">{des?.direccionEntrega || '—'}</td>
                              <td className="px-3 py-2.5 font-mono text-[11px] text-[#9ba8b6]">
                                {p.horaLlegada ? <span className="text-green-400">{formatTime(p.horaLlegada) || p.horaLlegada}</span> : p.estado === 'EN_CAMINO' ? <span className="text-blue-400 animate-pulse">En camino...</span> : '—'}
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background:`${dotCol}22`, color:dotCol }}>
                                  {p.estado === 'EN_CAMINO' ? 'En camino' : p.estado === 'ENTREGADO' ? 'Entregado' : p.estado === 'FALLIDO' ? 'No entregado' : 'Pendiente'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-[#161d28] border border-white/8 rounded-xl px-5 py-8 flex items-center justify-center gap-3 text-[#5f6f80]">
          <Truck size={20} className="opacity-40"/>
          <span className="text-[13px]">No hay rutas en tránsito en este momento</span>
        </div>
      )}

      {rutasProgramadas.length > 0 && (
        <div className="bg-[#161d28] border border-white/8 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/6 flex items-center gap-2">
            <Clock size={13} className="text-[#5f6f80]"/>
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
              Próximas Salidas — {rutasProgramadas.length} programada{rutasProgramadas.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-white/5">
            {rutasProgramadas.slice(0,5).map(ruta => {
              const tra = transportistas.find(t => t.id === ruta.transportistaId)
              return (
                <div key={ruta.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/2">
                  <div className="w-8 h-8 rounded-lg bg-[#5f6f80]/15 flex items-center justify-center shrink-0"><Clock size={14} className="text-[#5f6f80]"/></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] font-semibold text-[#9ba8b6]">{ruta.numero}</span>
                      <span className="text-[11px] text-[#5f6f80]">·</span>
                      <span className="text-[12px] text-[#9ba8b6] truncate">{tra?.nombre}</span>
                    </div>
                    <div className="text-[11px] text-[#5f6f80]">
                      {formatDate(ruta.fechaSalida)} a las {formatTime(ruta.fechaSalida) || '—'} · {(ruta.paradas||[]).length} parada{(ruta.paradas||[]).length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <Badge variant="neutral">Programada</Badge>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-[#161d28] border border-white/8 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/6 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
            Historial de Rutas
            {rutasHistorial.length > 0 && <span className="ml-2 text-[#9ba8b6] normal-case font-normal tracking-normal">({rutasHistorial.length} registros)</span>}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#5f6f80]">Desde</span>
              <DateInput value={filtDesde} onChange={v => setFiltDesde(v)} className={SI_loc} placeholder="dd/mm/aaaa" style={{ width:148 }}/>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#5f6f80]">Hasta</span>
              <DateInput value={filtHasta} onChange={v => setFiltHasta(v)} className={SI_loc} placeholder="dd/mm/aaaa" style={{ width:148 }}/>
            </div>
            {(filtDesde !== hace7s || filtHasta) && <Btn variant="ghost" size="sm" onClick={() => { setFiltDesde(hace7s); setFiltHasta('') }}>Limpiar</Btn>}
          </div>
        </div>

        <DataTable
          rows={rutasHistorial}
          rowKey={ruta => ruta.id}
          emptyIcon={NavIcon}
          emptyTitle="Sin rutas en este período"
          emptyDescription="Ajusta el rango de fechas"
          columns={[
            { key: 'numero', header: 'N° Ruta', render: ruta => <span className="font-mono text-[12px] font-semibold text-[#00c896]">{ruta.numero}</span> },
            { key: 'fechaSalida', header: 'Fecha Salida', render: ruta => <span className="text-[#9ba8b6]">{formatDate(ruta.fechaSalida)} <span className="text-[#5f6f80] text-[11px]">{formatTime(ruta.fechaSalida) || ''}</span></span> },
            { key: 'transportista', header: 'Transportista', render: ruta => {
                const tra = transportistas.find(t => t.id === ruta.transportistaId)
                return (
                  <div>
                    <div className="text-[#e8edf2] font-medium">{tra?.nombre || '—'}</div>
                    {tra?.placa && <div className="text-[11px] text-[#5f6f80] font-mono">{tra.placa}</div>}
                  </div>
                )
              } },
            { key: 'paradas', header: 'Paradas', render: ruta => <span className="text-[#9ba8b6]">{(ruta.paradas||[]).length}</span> },
            { key: 'entregas', header: 'Entregas', render: ruta => {
                const paradas    = ruta.paradas || []
                const entregadas = paradas.filter(p => p.estado === 'ENTREGADO').length
                const total      = paradas.length
                return (
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 bg-[#0e1117] rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: total ? `${(entregadas/total)*100}%` : '0%' }}/>
                    </div>
                    <span className="text-[11px] text-[#9ba8b6]">{entregadas}/{total}</span>
                  </div>
                )
              } },
            { key: 'retorno', header: 'Retorno', render: ruta => <span className="font-mono text-[11px] text-[#9ba8b6]">{formatTime(ruta.fechaRetorno) || <span className="text-[#374151]">—</span>}</span> },
            { key: 'estado', header: 'Estado', render: ruta => {
                const meta = ESTADO_RUTA[ruta.estado] || ESTADO_RUTA.COMPLETADA
                const Icon = meta?.icon || Truck
                return <Badge variant={meta?.color || 'neutral'}><Icon size={9}/> {meta?.label || ruta.estado}</Badge>
              } },
          ]}
        />
      </div>

      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Seguimiento?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[
            ['1. En ruta ahora', 'Muestra en vivo cada ruta actualmente en tránsito, con el % de avance y el estado de cada parada (entregada, en camino o no entregada).'],
            ['2. Próximas salidas', 'Lista las rutas ya programadas que todavía no inician, para anticipar la carga de trabajo del día.'],
            ['3. Historial de rutas', 'Registro completo de rutas pasadas — filtra por rango de fechas para revisar entregas, retornos y resultado final de cada viaje.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
