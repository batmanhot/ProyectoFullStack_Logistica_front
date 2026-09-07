import { useState, useMemo } from 'react'
import {
  Plus, Search, Truck, Clock,
  CheckCircle, Eye, Navigation as NavIcon,
  PlayCircle, Download, FileText, Printer,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { formatDate, formatTime, fechaHoyISO } from '../../utils/helpers'
import { Badge, Btn, Input, Select, DataTable } from '../../components/ui/index'
import { useRutasList, useCrearRuta, useIniciarRuta, useCompletarRuta, useCancelarRuta, useMarcarParada } from '../../queries/rutas.queries'
import { useTransportistasList } from '../../queries/transportistas.queries'
import { useDespachosList } from '../../queries/despachos.queries'
import { useClientesList } from '../../queries/clientes.queries'
import { useAlmacenesList } from '../../queries/almacenes.queries'
import { exportarRutasXLSX } from '../../utils/exportXLSX'
import { exportarRutasPDF } from '../../utils/exportPDF'
import { imprimirHojaReparto } from '../../utils/pdfTemplates'
import { useEmpresaPDFConfig } from '../../queries/configuracion.queries'
import { ESTADO_RUTA } from './constants'
import ModalNuevaRuta from './ModalNuevaRuta'
import ModalDetalleRuta from './ModalDetalleRuta'

// ════════════════════════════════════════════════════════
// TAB RUTAS
// ════════════════════════════════════════════════════════
export default function TabRutas() {
  const { toast, sesion } = useApp()

  const esChofer = sesion?.rol?.codigo === 'chofer'
  const pdfConfig = useEmpresaPDFConfig()

  const { data: rutasRaw       = [], isLoading } = useRutasList()
  const { data: despachos      = [] }            = useDespachosList()
  const { data: transRaw       = [] }            = useTransportistasList({ incluirInactivos: true })
  const { data: clientesRaw    = [] }            = useClientesList({ incluirInactivos: true })
  const { data: almacenes      = [] }            = useAlmacenesList()

  // El Chofer solo gestiona SUS propias rutas asignadas (Usuario.transportistaId) —
  // no el panorama completo de la empresa.
  const rutas = useMemo(() =>
    esChofer ? rutasRaw.filter(r => r.transportistaId === sesion?.transportistaId) : rutasRaw
  , [rutasRaw, esChofer, sesion?.transportistaId])

  const crearRuta    = useCrearRuta()
  const iniciarRuta  = useIniciarRuta()
  const completarRuta= useCompletarRuta()
  const cancelarRuta = useCancelarRuta()
  const marcarParada = useMarcarParada()

  const transportistas = useMemo(() => transRaw.map(t => ({ ...t, activo: t.activo !== false })), [transRaw])
  const clientes       = useMemo(() => clientesRaw.map(c => ({ ...c, activo: c.activo !== false })), [clientesRaw])

  const [modal,      setModal]      = useState(false)
  const [detalle,    setDetalle]    = useState(null)
  const [filtEst,    setFiltEst]    = useState('')
  const [busq,       setBusq]       = useState('')
  const [filtDesde,  setFiltDesde]  = useState('')
  const [filtHasta,  setFiltHasta]  = useState('')
  const [sortConfig, setSortConfig] = useState({ key:'fechaSalida', direction:'desc' })

  const handleSort = key => setSortConfig(s => ({ key, direction: s.key === key && s.direction === 'asc' ? 'desc' : 'asc' }))

  const filtered = useMemo(() => {
    let d = [...rutas]
    if (filtEst) d = d.filter(r => r.estado === filtEst)
    if (filtDesde) d = d.filter(r => (r.fechaSalida || '').slice(0, 10) >= filtDesde)
    if (filtHasta) d = d.filter(r => (r.fechaSalida || '').slice(0, 10) <= filtHasta)
    if (busq) {
      const q = busq.toLowerCase()
      d = d.filter(r => r.numero?.toLowerCase().includes(q) || transportistas.find(t => t.id === r.transportistaId)?.nombre?.toLowerCase().includes(q))
    }
    d.sort((a, b) => {
      let aV = sortConfig.key === 'transportista' ? transportistas.find(x => x.id === a.transportistaId)?.nombre || '' : (a[sortConfig.key] || '')
      let bV = sortConfig.key === 'transportista' ? transportistas.find(x => x.id === b.transportistaId)?.nombre || '' : (b[sortConfig.key] || '')
      if (typeof aV === 'string') { aV = aV.toLowerCase(); bV = bV.toLowerCase() }
      if (aV < bV) return sortConfig.direction === 'asc' ? -1 : 1
      if (aV > bV) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return d
  }, [rutas, filtEst, filtDesde, filtHasta, busq, transportistas, sortConfig])

  const kpis = useMemo(() => ({
    programadas: rutas.filter(r => r.estado === 'PROGRAMADA').length,
    enRuta:      rutas.filter(r => r.estado === 'EN_RUTA').length,
    completadas: rutas.filter(r => r.estado === 'COMPLETADA').length,
    totalViajes: rutas.length,
  }), [rutas])

  async function handleIniciar(ruta) {
    const res = await iniciarRuta.mutateAsync(ruta.id)
    if (res?.error) { toast(res.error, 'error'); return }
    toast(`Ruta ${ruta.numero} iniciada — ${ruta.despachoIds?.length || 0} despacho(s) en camino`, 'success')
    if (detalle?.id === ruta.id) setDetalle(null)
  }

  async function handleCompletar(ruta) {
    const res = await completarRuta.mutateAsync({ id: ruta.id })
    if (res?.error) { toast(res.error, 'error'); return }
    toast(`Ruta ${ruta.numero} cerrada`, 'success')
    setDetalle(null)
  }

  async function handleCancelar(ruta) {
    const res = await cancelarRuta.mutateAsync(ruta.id)
    if (res?.error) { toast(res.error, 'error'); return }
    toast(`Ruta ${ruta.numero} cancelada`, 'warning')
    setDetalle(null)
  }

  async function handleMarcarParada(ruta, despachoId, estado, obs = '', evidencia = null) {
    const res = await marcarParada.mutateAsync({
      id: ruta.id, despachoId, estado, observacion: obs,
      ...(evidencia && {
        receptorNombre: evidencia.receptor,
        evidenciaFoto:  evidencia.foto,
        evidenciaNotas: evidencia.notas,
      }),
    })
    if (res?.error) { toast(res.error, 'error'); return }
    toast(estado === 'ENTREGADO' ? '✓ Entrega confirmada' : 'Parada marcada como no entregada', estado === 'ENTREGADO' ? 'success' : 'warning')
    // Refrescar detalle con datos actualizados del servidor
    if (detalle?.id === ruta.id && res?.data) setDetalle(res.data)
  }

  async function handleCrearRuta(data) {
    const res = await crearRuta.mutateAsync(data)
    if (res?.error) { toast(res.error, 'error'); return }
    setModal(false)
    toast(`Ruta ${res.data?.numero} programada`, 'success')
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          ['Programadas',  kpis.programadas, '#5f6f80', Clock      ],
          ['En Ruta',      kpis.enRuta,      '#3b82f6', NavIcon    ],
          ['Completadas',  kpis.completadas, '#22c55e', CheckCircle],
          ['Total viajes', kpis.totalViajes, '#00c896', Truck      ],
        ].map(([l, v, color, Icon]) => (
          <div key={l} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={13} style={{ color }} className="opacity-80"/>
              <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">{l}</span>
            </div>
            <div className="text-[28px] font-semibold text-[#e8edf2]">{v}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Rutas de Entrega</span>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={() => exportarRutasXLSX(filtered, transportistas)}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => exportarRutasPDF(filtered, transportistas, sesion?.nombre)}>
              <FileText size={13}/> PDF
            </Btn>
            {!esChofer && (
              <Btn variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={13}/> Nueva Ruta</Btn>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-50">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <Input className="pl-8" placeholder="Buscar número, transportista..."
              value={busq} onChange={e => setBusq(e.target.value)}/>
          </div>
          <Select className="w-auto" value={filtEst} onChange={e => setFiltEst(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_RUTA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <Input type="date" aria-label="Fecha de salida desde" style={{ width:150 }} value={filtDesde} onChange={e => setFiltDesde(e.target.value)}/>
          <Input type="date" aria-label="Fecha de salida hasta" style={{ width:150 }} value={filtHasta} onChange={e => setFiltHasta(e.target.value)}/>
          <Btn variant="ghost" size="sm" onClick={() => { const hoy = fechaHoyISO(); setFiltDesde(hoy); setFiltHasta(hoy) }}>Hoy</Btn>
          {(busq || filtEst || filtDesde || filtHasta) && (
            <Btn variant="ghost" size="sm" onClick={() => { setBusq(''); setFiltEst(''); setFiltDesde(''); setFiltHasta('') }}>Limpiar</Btn>
          )}
        </div>

        <DataTable
          loading={isLoading}
          rows={filtered}
          rowKey={ruta => ruta.id}
          onRowClick={ruta => setDetalle(ruta)}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyIcon={NavIcon}
          emptyTitle="Sin rutas"
          emptyDescription="Programa la primera ruta de entrega."
          columns={[
            { key: 'numero', header: 'N° Ruta', sortable: true, render: ruta => <span className="font-mono text-[12px] font-semibold text-[#00c896]">{ruta.numero}</span> },
            { key: 'transportista', header: 'Transportista', sortable: true, render: ruta => {
                const tra = transportistas.find(t => t.id === ruta.transportistaId)
                return (
                  <div>
                    <div className="font-medium text-[#e8edf2]">{tra?.nombre || '—'}</div>
                    <div className="text-[11px] text-[#5f6f80]">{tra?.tipo === 'PROPIO' ? 'Propio' : 'Tercero'}</div>
                  </div>
                )
              } },
            { key: 'placa', header: 'Placa/Vehículo', render: ruta => {
                const tra = transportistas.find(t => t.id === ruta.transportistaId)
                return (
                  <div className="text-[12px] text-[#9ba8b6]">
                    {tra?.placa ? <span className="font-mono">{tra.placa}</span> : '—'}
                    <div className="text-[11px] text-[#5f6f80] truncate max-w-30">{tra?.vehiculo}</div>
                  </div>
                )
              } },
            { key: 'fechaSalida', header: 'F. Salida', sortable: true, render: ruta => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatDate(ruta.fechaSalida)}</span> },
            { key: 'hora', header: 'Hora', render: ruta => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatTime(ruta.fechaSalida) || '—'}</span> },
            { key: 'paradas', header: 'Paradas', render: ruta => {
                const entregadas = (ruta.paradas || []).filter(p => p.estado === 'ENTREGADO').length
                return (
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[#e8edf2]">{entregadas}/{(ruta.paradas||[]).length}</span>
                    <div className="w-16 h-1.5 bg-[#1a2230] rounded-full overflow-hidden">
                      <div className="h-full bg-[#00c896] rounded-full transition-all"
                        style={{ width: ruta.paradas?.length ? `${(entregadas/ruta.paradas.length)*100}%` : '0%' }}/>
                    </div>
                  </div>
                )
              } },
            { key: 'estado', header: 'Estado', sortable: true, render: ruta => {
                const meta = ESTADO_RUTA[ruta.estado] || ESTADO_RUTA.PROGRAMADA
                const Icon = meta.icon
                return <Badge variant={meta.color}><Icon size={9}/> {meta.label}</Badge>
              } },
            { key: 'acciones', header: 'Acciones', stopPropagation: true, render: ruta => (
                <div className="flex gap-1 items-center">
                  <Btn variant="ghost" size="icon" title="Ver detalle" onClick={() => setDetalle(ruta)}><Eye size={13}/></Btn>
                  <Btn variant="ghost" size="icon" title="Imprimir Hoja de Reparto" className="text-[#00c896]"
                    onClick={() => imprimirHojaReparto({ ruta, despachos, clientes, transportista: transportistas.find(t => t.id === ruta.transportistaId), config: pdfConfig })}>
                    <Printer size={13}/>
                  </Btn>
                  {ruta.estado === 'PROGRAMADA' && (
                    <Btn variant="primary" size="sm" onClick={() => handleIniciar(ruta)}><PlayCircle size={12}/> Iniciar</Btn>
                  )}
                  {ruta.estado === 'EN_RUTA' && (
                    <Btn variant="secondary" size="sm" onClick={() => setDetalle(ruta)}><NavIcon size={12}/> Gestionar</Btn>
                  )}
                </div>
              ) },
          ]}
        />
      </div>

      {modal && (
        <ModalNuevaRuta
          onClose={() => setModal(false)}
          onSave={handleCrearRuta}
          despachos={despachos}
          transportistas={transportistas.filter(t => t.activo !== false)}
          clientes={clientes}
          almacenes={almacenes}
          saving={crearRuta.isPending}
        />
      )}

      {detalle && (
        <ModalDetalleRuta
          ruta={detalle} despachos={despachos} clientes={clientes}
          transportistas={transportistas} almacenes={almacenes}
          onClose={() => setDetalle(null)}
          onIniciar={() => handleIniciar(detalle)}
          onCompletar={() => handleCompletar(detalle)}
          onCancelar={() => handleCancelar(detalle)}
          onMarcarParada={(dId, estado, obs, evidencia) => handleMarcarParada(detalle, dId, estado, obs, evidencia)}
          puedeCancelar={!esChofer}
          pdfConfig={pdfConfig}
        />
      )}

      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Rutas y Salidas?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {[
            ['1. Programar', 'Crea la ruta: elige transportista, fecha/hora y selecciona despachos en estado "Listo".'],
            ['2. Iniciar', 'Al iniciar, se despachan todos los pedidos de la ruta a la vez: el stock se descuenta automáticamente. No se emite número de guía de remisión en este paso.'],
            ['3. Gestionar', 'Marca cada parada como "Entregado" o "No Entregado" durante el viaje. Solo se puede cancelar la ruta antes de iniciarla.'],
            ['4. Cerrar', 'Al cerrar, quedan registradas las entregas y el estado final de la ruta.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
