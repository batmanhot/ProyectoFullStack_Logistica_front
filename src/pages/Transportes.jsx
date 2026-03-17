import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Plus, Search, Edit2, Trash2, Truck, MapPin, Clock,
  CheckCircle, X, Eye, Navigation as NavIcon, Package, AlertTriangle,
  PlayCircle, Flag, RotateCcw, Users
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoy, generarNumDoc } from '../utils/helpers'
import * as storage from '../services/storage'
import { Modal, ConfirmDialog, EmptyState, Badge, Btn, Field, Alert } from '../components/ui/index'
import DireccionInput from '../components/ui/DireccionInput'

const SI = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'

// ── Metadatos de estado de ruta ──────────────────────────
const ESTADO_RUTA = {
  PROGRAMADA: { label: 'Programada', color: 'neutral', icon: Clock },
  EN_RUTA: { label: 'En Ruta', color: 'info', icon: NavIcon },
  COMPLETADA: { label: 'Completada', color: 'success', icon: CheckCircle },
  INCOMPLETA: { label: 'Incompleta', color: 'warning', icon: AlertTriangle },
  CANCELADA: { label: 'Cancelada', color: 'danger', icon: X },
}

const ESTADO_PARADA = {
  PENDIENTE: { label: 'Pendiente', color: 'neutral' },
  EN_CAMINO: { label: 'En camino', color: 'info' },
  ENTREGADO: { label: 'Entregado', color: 'success' },
  FALLIDO: { label: 'No entregado', color: 'danger' },
}

export default function Transportes() {
  const [tab, setTab] = useState('rutas')

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-white/[0.08]">
        {[
          ['rutas', 'Rutas y Salidas', NavIcon],
          ['seguimiento', 'Seguimiento', Truck],
          ['transportistas', 'Transportistas', Users],
        ].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-all
              ${tab === id
                ? 'text-[#00c896] border-[#00c896]'
                : 'text-[#5f6f80] border-transparent hover:text-[#9ba8b6]'
              }`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {tab === 'rutas' && <TabRutas />}
      {tab === 'seguimiento' && <TabSeguimiento />}
      {tab === 'transportistas' && <TabTransportistas />}
    </div>
  )
}

// ════════════════════════════════════════════════════════
// TAB RUTAS Y SALIDAS
// ════════════════════════════════════════════════════════
function TabRutas() {
  const {
    rutas, despachos, transportistas, clientes, productos, almacenes, config,
    recargarRutas, recargarDespachos, sesion, toast, simboloMoneda,
  } = useApp()

  const [modal, setModal] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [filtEst, setFiltEst] = useState('')
  const [busq, setBusq] = useState('')

  const filtered = useMemo(() => {
    let d = [...rutas]
    if (filtEst) d = d.filter(r => r.estado === filtEst)
    if (busq) {
      const q = busq.toLowerCase()
      d = d.filter(r =>
        r.numero?.toLowerCase().includes(q) ||
        transportistas.find(t => t.id === r.transportistaId)?.nombre?.toLowerCase().includes(q)
      )
    }
    return d
  }, [rutas, filtEst, busq, transportistas])

  const kpis = useMemo(() => ({
    programadas: rutas.filter(r => r.estado === 'PROGRAMADA').length,
    enRuta: rutas.filter(r => r.estado === 'EN_RUTA').length,
    completadas: rutas.filter(r => r.estado === 'COMPLETADA').length,
    totalViajes: rutas.length,
  }), [rutas])

  const traNombre = id => transportistas.find(t => t.id === id)?.nombre || '—'
  const trPlaca = id => transportistas.find(t => t.id === id)?.placa || ''

  function iniciarRuta(ruta) {
    const actualizada = {
      ...ruta,
      estado: 'EN_RUTA',
      paradas: ruta.paradas.map(p => ({ ...p, estado: p.orden === 1 ? 'EN_CAMINO' : 'PENDIENTE' })),
    }
    storage.saveRuta(actualizada)
    // Cambiar despachos a DESPACHADO y descontar stock
    ruta.despachoIds.forEach(dId => {
      const des = despachos.find(d => d.id === dId)
      if (des && des.estado === 'LISTO') {
        const guia = des.guiaNumero || generarNumDoc('GR', '001')
        const ahora = fechaHoy()
        // Descontar stock por cada ítem del despacho
        des.items?.forEach(item => {
          const prod = storage.getProductoById(item.productoId).data
          if (!prod || item.cantidad > prod.stockActual) return
          try {
            const { procesarSalida } = require ? {} : { procesarSalida: null }
            // Reducir stock directamente
            const nuevoStock = Math.max(0, prod.stockActual - item.cantidad)
            const factor = prod.stockActual > 0 ? nuevoStock / prod.stockActual : 0
            const batches = (prod.batches || []).map(b => ({ ...b, cantidad: b.cantidad * factor })).filter(b => b.cantidad > 0.001)
            storage._actualizarBatchesProducto(prod.id, batches, nuevoStock)
            storage.registrarMovimiento({
              tipo: 'SALIDA', productoId: item.productoId, almacenId: des.almacenId,
              cantidad: item.cantidad, costoUnitario: item.costoUnitario || 0, costoTotal: item.costoUnitario * item.cantidad || 0,
              lote: '', fecha: ahora,
              motivo: `Ruta ${ruta.numero} — ${guia}`,
              documento: guia, notas: '', usuarioId: sesion?.id || 'usr1',
            })
          } catch (e) { }
        })
        storage.saveDespacho({ ...des, estado: 'DESPACHADO', guiaNumero: guia, fechaDespacho: ahora })
      }
    })
    recargarRutas()
    recargarDespachos()
    toast(`Ruta ${ruta.numero} iniciada — ${ruta.despachoIds.length} despacho(s) en camino`, 'success')
  }

  function completarRuta(ruta) {
    const pendientes = ruta.paradas.filter(p => p.estado === 'PENDIENTE' || p.estado === 'EN_CAMINO').length
    const estado = pendientes === 0 ? 'COMPLETADA' : 'INCOMPLETA'
    storage.saveRuta({ ...ruta, estado, fechaRetorno: fechaHoy() })
    // Confirmar entrega de despachos entregados
    ruta.paradas.forEach(p => {
      const des = despachos.find(d => d.id === p.despachoId)
      if (des && p.estado === 'ENTREGADO' && des.estado !== 'ENTREGADO') {
        storage.saveDespacho({ ...des, estado: 'ENTREGADO', fechaEntregaReal: fechaHoy() })
      }
    })
    recargarRutas()
    recargarDespachos()
    toast(`Ruta ${ruta.numero} ${estado === 'COMPLETADA' ? 'completada' : 'cerrada con incompletos'}`, estado === 'COMPLETADA' ? 'success' : 'warning')
    setDetalle(null)
  }

  function marcarParada(ruta, despachoId, nuevoEstado, obs = '') {
    const paradas = ruta.paradas.map(p => {
      if (p.despachoId !== despachoId) return p
      const ahora = new Date().toTimeString().slice(0, 5)
      return {
        ...p, estado: nuevoEstado,
        horaLlegada: nuevoEstado === 'ENTREGADO' || nuevoEstado === 'FALLIDO' ? (p.horaLlegada || ahora) : p.horaLlegada,
        horaPartida: nuevoEstado === 'ENTREGADO' || nuevoEstado === 'FALLIDO' ? ahora : null,
        observacion: obs || p.observacion,
      }
    })
    // Avanzar siguiente parada a EN_CAMINO
    const sigIdx = paradas.findIndex((p, i) => p.estado === 'PENDIENTE' && i > paradas.findIndex(x => x.despachoId === despachoId))
    const paradasFinal = paradas.map((p, i) => i === sigIdx ? { ...p, estado: 'EN_CAMINO' } : p)

    const actualizada = { ...ruta, paradas: paradasFinal }
    storage.saveRuta(actualizada)
    if (nuevoEstado === 'ENTREGADO') {
      const des = despachos.find(d => d.id === despachoId)
      if (des) storage.saveDespacho({ ...des, estado: 'ENTREGADO', fechaEntregaReal: fechaHoy() })
    }
    recargarRutas()
    recargarDespachos()
    if (detalle?.id === ruta.id) setDetalle({ ...actualizada })
    toast(nuevoEstado === 'ENTREGADO' ? '✓ Entrega confirmada' : 'Parada marcada como no entregada', nuevoEstado === 'ENTREGADO' ? 'success' : 'warning')
  }

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          ['Programadas', kpis.programadas, '#5f6f80', Clock],
          ['En Ruta', kpis.enRuta, '#3b82f6', NavIcon],
          ['Completadas', kpis.completadas, '#22c55e', CheckCircle],
          ['Total viajes', kpis.totalViajes, '#00c896', Truck],
        ].map(([l, v, color, Icon]) => (
          <div key={l} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }} />
            <div className="flex items-center gap-2 mb-2">
              <Icon size={13} style={{ color }} className="opacity-80" />
              <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">{l}</span>
            </div>
            <div className="text-[28px] font-semibold text-[#e8edf2]">{v}</div>
          </div>
        ))}
      </div>

      {/* Tabla rutas */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Rutas de Entrega</span>
          <Btn variant="primary" size="sm" onClick={() => setModal(true)}>
            <Plus size={13} /> Nueva Ruta
          </Btn>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none" />
            <input className={SI + ' pl-8'} placeholder="Buscar número, transportista..."
              value={busq} onChange={e => setBusq(e.target.value)} />
          </div>
          <select className={SEL} style={{ width: 160 }} value={filtEst} onChange={e => setFiltEst(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_RUTA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {(busq || filtEst) && <Btn variant="ghost" size="sm" onClick={() => { setBusq(''); setFiltEst('') }}>Limpiar</Btn>}
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {['N° Ruta', 'Transportista', 'Placa/Vehículo', 'F. Salida', 'Hora', 'Paradas', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/[0.08] whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8}><EmptyState icon={NavIcon} title="Sin rutas" description="Programa la primera ruta de entrega." /></td></tr>
              )}
              {filtered.map(ruta => {
                const meta = ESTADO_RUTA[ruta.estado]
                const Icon = meta.icon
                const entregadas = ruta.paradas.filter(p => p.estado === 'ENTREGADO').length
                const tra = transportistas.find(t => t.id === ruta.transportistaId)
                return (
                  <tr key={ruta.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3.5 py-2.5 font-mono text-[12px] font-semibold text-[#00c896]">{ruta.numero}</td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-medium text-[#e8edf2]">{tra?.nombre || '—'}</div>
                      <div className="text-[11px] text-[#5f6f80]">{tra?.tipo === 'PROPIO' ? 'Propio' : 'Tercero'}</div>
                    </td>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6]">
                      {tra?.placa ? <span className="font-mono">{tra.placa}</span> : '—'}
                      <div className="text-[11px] text-[#5f6f80] truncate max-w-[120px]">{tra?.vehiculo}</div>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(ruta.fechaSalida)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{ruta.horaSalida}</td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[#e8edf2]">{entregadas}/{ruta.paradas.length}</span>
                        <div className="w-16 h-1.5 bg-[#1a2230] rounded-full overflow-hidden">
                          <div className="h-full bg-[#00c896] rounded-full transition-all"
                            style={{ width: ruta.paradas.length ? `${(entregadas / ruta.paradas.length) * 100}%` : '0%' }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Badge variant={meta.color}><Icon size={9} /> {meta.label}</Badge>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex gap-1 items-center">
                        <Btn variant="ghost" size="icon" title="Ver detalle" onClick={() => setDetalle(ruta)}>
                          <Eye size={13} />
                        </Btn>
                        {ruta.estado === 'PROGRAMADA' && (
                          <Btn variant="primary" size="sm" onClick={() => iniciarRuta(ruta)}>
                            <PlayCircle size={12} /> Iniciar
                          </Btn>
                        )}
                        {ruta.estado === 'EN_RUTA' && (
                          <Btn variant="secondary" size="sm" onClick={() => setDetalle(ruta)}>
                            <NavIcon size={12} /> Gestionar
                          </Btn>
                        )}
                        {ruta.estado !== 'EN_RUTA' && (
                          <Btn variant="ghost" size="icon" title="Eliminar ruta"
                               onClick={() => {
                                 if (window.confirm(`¿Estás seguro de eliminar la ruta ${ruta.numero}?`)) {
                                   storage.eliminarRuta(ruta.id);
                                   recargarRutas();
                                   toast(`Ruta ${ruta.numero} eliminada`, 'success');
                                 }
                               }}
                               className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                            <Trash2 size={13} />
                          </Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nueva ruta */}
      {modal && (
        <ModalNuevaRuta
          onClose={() => setModal(false)}
          onSave={data => { storage.saveRuta(data); recargarRutas(); setModal(false); toast(`Ruta ${data.numero} programada`, 'success') }}
          despachos={despachos} transportistas={transportistas} clientes={clientes}
        />
      )}

      {/* Modal detalle / gestión */}
      {detalle && (
        <ModalDetalleRuta
          ruta={detalle} despachos={despachos} clientes={clientes} transportistas={transportistas}
          almacenes={almacenes} config={config}
          onClose={() => setDetalle(null)}
          onIniciar={() => iniciarRuta(detalle)}
          onCompletar={() => completarRuta(detalle)}
          onMarcarParada={(dId, estado, obs) => marcarParada(detalle, dId, estado, obs)}
        />
      )}

      {/* ── Panel explicativo ─────────────────────────────── */}
      <div className="bg-[#161d28] border border-amber-500/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-amber-400 text-[14px] font-bold">?</span>
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-[#e8edf2] mb-2">¿Para qué sirven las Rutas y Salidas?</div>
            <p className="text-[12px] text-[#9ba8b6] leading-relaxed mb-3">
              Las <strong className="text-[#e8edf2]">Rutas y Salidas</strong> organizan los despachos en viajes de reparto:
              agrupas varios pedidos en una sola salida, asignas un transportista y vehículo, y el sistema
              coordina todo el recorrido de entrega. Es el puente entre tener la mercadería lista en el almacén
              y confirmar que llegó al cliente.
            </p>

            {/* Flujo en 4 pasos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              {[
                ['🗓️ 1. Programar', 'Crea la ruta: elige el transportista, la fecha y hora de salida, el costo del viaje y selecciona los despachos en estado "Listo" que van en ese viaje.'],
                ['🚀 2. Iniciar', 'Al pulsar "Iniciar Ruta" el sistema emite automáticamente las Guías de Remisión, descuenta el stock y pone los despachos en tránsito.'],
                ['📍 3. Gestionar', 'Durante el viaje, el operador abre la ruta activa y marca cada parada como "Entregado" o "No Entregado" según el conductor reporta por teléfono o WhatsApp.'],
                ['🏁 4. Cerrar', 'Al cerrar la ruta, el sistema registra la fecha de retorno. Si todas las paradas fueron entregadas queda "Completada"; si quedaron pendientes, "Incompleta".'],
              ].map(([t, d]) => (
                <div key={t} className="bg-[#1a2230] rounded-lg p-3">
                  <div className="text-[11px] font-semibold text-[#e8edf2] mb-1">{t}</div>
                  <div className="text-[11px] text-[#9ba8b6] leading-snug">{d}</div>
                </div>
              ))}
            </div>

            {/* Conceptos clave */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {[
                ['📦 ¿Qué despachos puedo incluir?',
                  'Solo los que están en estado "Listo" — ya preparados en almacén y aprobados. Si un despacho aún está en Picking o Pendiente, no aparecerá en la lista.'],
                ['💰 Costo del viaje',
                  'Registra el costo operativo de cada salida (combustible, viático, carrier). Esto permite calcular el costo logístico real por entrega en los reportes futuros.'],
                ['🔗 Conexión con Seguimiento',
                  'Una vez iniciada la ruta, puedes ver su progreso en tiempo real desde la pestaña "Seguimiento". Cada parada confirmada se refleja allí inmediatamente.'],
              ].map(([t, d]) => (
                <div key={t} className="bg-[#1a2230] rounded-lg p-3 border-l-2 border-amber-500/30">
                  <div className="text-[11px] font-semibold text-[#e8edf2] mb-1">{t}</div>
                  <div className="text-[11px] text-[#9ba8b6] leading-snug">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════════
// TAB SEGUIMIENTO
// ════════════════════════════════════════════════════════
function TabSeguimiento() {
  const { rutas, despachos, transportistas, clientes } = useApp()
  const [filtFecha, setFiltFecha] = useState(fechaHoy())

  const rutasActivas = useMemo(() =>
    rutas.filter(r => r.estado === 'EN_RUTA' || r.estado === 'PROGRAMADA')
    , [rutas])

  const rutasDia = useMemo(() =>
    rutas.filter(r => r.fechaSalida === filtFecha)
    , [rutas, filtFecha])

  const cliNombre = id => clientes.find(c => c.id === id)?.razonSocial?.slice(0, 25) || '—'
  const traNombre = id => transportistas.find(t => t.id === id)?.nombre || '—'

  return (
    <div className="flex flex-col gap-5">

      {/* Rutas en tiempo real */}
      {rutasActivas.length > 0 && (
        <div className="bg-[#161d28] border border-[#00c896]/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-[#00c896] animate-pulse" />
            <span className="text-[11px] font-semibold text-[#00c896] uppercase tracking-[0.06em]">
              En Tiempo Real — {rutasActivas.length} ruta(s) activa(s)
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {rutasActivas.map(ruta => {
              const tra = transportistas.find(t => t.id === ruta.transportistaId)
              const entregadas = ruta.paradas.filter(p => p.estado === 'ENTREGADO').length
              const total = ruta.paradas.length
              const pct = total > 0 ? Math.round((entregadas / total) * 100) : 0
              const meta = ESTADO_RUTA[ruta.estado]
              const Icon = meta.icon
              return (
                <div key={ruta.id} className="bg-[#1a2230] rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ruta.estado === 'EN_RUTA' ? 'bg-blue-500/15' : 'bg-[#5f6f80]/15'}`}>
                          <Icon size={15} className={ruta.estado === 'EN_RUTA' ? 'text-blue-400' : 'text-[#5f6f80]'} />
                        </div>
                        <div>
                          <div className="font-semibold text-[#e8edf2]">{ruta.numero}</div>
                          <div className="text-[11px] text-[#5f6f80]">
                            {tra?.nombre} {tra?.placa ? `· ${tra.placa}` : ''} · Salida: {ruta.horaSalida}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={meta.color}>{meta.label}</Badge>
                      <div className="text-[11px] text-[#5f6f80] mt-1">{entregadas}/{total} entregas</div>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mb-3">
                    <div className="flex justify-between text-[11px] text-[#5f6f80] mb-1">
                      <span>Progreso de entregas</span>
                      <span className="text-[#00c896] font-semibold">{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#0e1117] rounded-full overflow-hidden">
                      <div className="h-full bg-[#00c896] rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {/* Paradas */}
                  <div className="flex flex-col gap-1.5">
                    {ruta.paradas.map((parada, idx) => {
                      const des = despachos.find(d => d.id === parada.despachoId)
                      const pMeta = ESTADO_PARADA[parada.estado]
                      return (
                        <div key={parada.despachoId}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${parada.estado === 'EN_CAMINO' ? 'bg-blue-500/10 border border-blue-500/20' :
                            parada.estado === 'ENTREGADO' ? 'bg-green-500/5 border border-green-500/10 opacity-60' :
                              parada.estado === 'FALLIDO' ? 'bg-red-500/10 border border-red-500/20' :
                                'bg-[#0e1117]/40 border border-white/[0.04]'
                            }`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${parada.estado === 'ENTREGADO' ? 'bg-green-500/20 text-green-400' :
                            parada.estado === 'EN_CAMINO' ? 'bg-blue-500/20 text-blue-400' :
                              parada.estado === 'FALLIDO' ? 'bg-red-500/20 text-red-400' :
                                'bg-white/10 text-[#5f6f80]'
                            }`}>{idx + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-medium text-[#e8edf2] truncate">
                              {cliNombre(des?.clienteId)}
                            </div>
                            <div className="text-[11px] text-[#5f6f80] truncate">{des?.direccionEntrega}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {parada.horaLlegada && <span className="text-[11px] font-mono text-[#9ba8b6]">{parada.horaLlegada}</span>}
                            <Badge variant={pMeta.color}>{pMeta.label}</Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filtro por fecha */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
            Historial de Rutas por Fecha
          </span>
          <input type="date" className={SI} style={{ width: 160 }}
            value={filtFecha} onChange={e => setFiltFecha(e.target.value)} />
        </div>

        {rutasDia.length === 0 ? (
          <EmptyState icon={NavIcon} title="Sin rutas este día"
            description={`No hay rutas programadas para el ${formatDate(filtFecha)}.`} />
        ) : (
          <div className="flex flex-col gap-3">
            {rutasDia.map(ruta => {
              const tra = transportistas.find(t => t.id === ruta.transportistaId)
              const meta = ESTADO_RUTA[ruta.estado]
              const Icon = meta.icon
              const entregadas = ruta.paradas.filter(p => p.estado === 'ENTREGADO').length
              return (
                <div key={ruta.id} className="bg-[#1a2230] border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon size={16} className="text-[#9ba8b6]" />
                      <div>
                        <div className="font-semibold text-[#e8edf2]">{ruta.numero}</div>
                        <div className="text-[11px] text-[#5f6f80]">
                          {tra?.nombre} · {ruta.horaSalida} → {ruta.horaRetorno || '—'}
                          · {entregadas}/{ruta.paradas.length} entregas
                          {ruta.kmRecorrido ? ` · ${ruta.kmRecorrido} km` : ''}
                        </div>
                      </div>
                    </div>
                    <Badge variant={meta.color}><Icon size={9} /> {meta.label}</Badge>
                  </div>
                  {ruta.observaciones && (
                    <p className="mt-2 text-[11px] text-[#9ba8b6] pl-7">{ruta.observaciones}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Panel explicativo ─────────────────────────────── */}
      <div className="bg-[#161d28] border border-blue-500/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-blue-400 text-[14px] font-bold">?</span>
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-[#e8edf2] mb-2">¿Para qué sirve el Seguimiento de Transportes?</div>
            <p className="text-[12px] text-[#9ba8b6] leading-relaxed mb-3">
              El <strong className="text-[#e8edf2]">Seguimiento</strong> es la central de control en tiempo real
              de todos los vehículos que están actualmente en ruta. Te permite saber en qué parada está
              cada conductor, qué entregas ya completó y cuáles están pendientes, sin necesidad de llamar
              por teléfono para preguntar.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
              {[
                ['🟢 Punto verde parpadeante', 'Indica que hay rutas activas EN_RUTA ahora mismo. Si no hay rutas activas, esta sección no aparece.'],
                ['📊 Barra de progreso', 'Muestra visualmente qué porcentaje de las entregas de esa ruta ya fueron confirmadas. Se actualiza en tiempo real al marcar paradas desde el módulo Rutas.'],
                ['🔵 Parada en camino', 'La parada azul es la que está siendo atendida en este momento. Solo puede haber una activa a la vez por ruta.'],
                ['📅 Historial por fecha', 'Filtra cualquier día pasado para ver qué rutas salieron, con qué resultado y cuántos kilómetros recorrieron.'],
              ].map(([t, d]) => (
                <div key={t} className="bg-[#1a2230] rounded-lg p-3">
                  <div className="text-[11px] font-semibold text-[#e8edf2] mb-1">{t}</div>
                  <div className="text-[11px] text-[#9ba8b6] leading-snug">{d}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                ['🔄 ¿Cómo se actualiza?', 'El despachador o supervisor va a la pestaña "Rutas y Salidas", abre la ruta activa y marca cada parada como "Entregado" o "No Entregado" según el conductor le reporta. El seguimiento refleja ese estado inmediatamente.'],
                ['📞 Sin GPS — por ahora', 'En esta versión el seguimiento es manual: el conductor reporta por teléfono/WhatsApp y el operador actualiza el sistema. Cuando se conecte el backend, se puede integrar GPS en tiempo real o una app para el conductor.'],
              ].map(([t, d]) => (
                <div key={t} className="bg-[#1a2230] rounded-lg p-3 border-l-2 border-blue-500/30">
                  <div className="text-[11px] font-semibold text-[#e8edf2] mb-1">{t}</div>
                  <div className="text-[11px] text-[#9ba8b6] leading-snug">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

// ════════════════════════════════════════════════════════
// TAB TRANSPORTISTAS
// ════════════════════════════════════════════════════════
function TabTransportistas() {
  const { transportistas, recargarTransportistas } = useApp()
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [busq, setBusq] = useState('')

  const filtered = useMemo(() =>
    transportistas.filter(t =>
      !busq || t.nombre?.toLowerCase().includes(busq.toLowerCase()) || t.placa?.toLowerCase().includes(busq.toLowerCase())
    )
    , [transportistas, busq])

  function handleSave(data) {
    storage.saveTransportista(data)
    recargarTransportistas()
    setModal(false)
  }

  const kpis = {
    total: transportistas.length,
    propios: transportistas.filter(t => t.tipo === 'PROPIO').length,
    terceros: transportistas.filter(t => t.tipo === 'TERCERO').length,
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3.5">
        {[
          ['Total', kpis.total, '#00c896'],
          ['Propios', kpis.propios, '#3b82f6'],
          ['Terceros', kpis.terceros, '#f59e0b'],
        ].map(([l, v, color]) => (
          <div key={l} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }} />
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] mb-2">{l}</div>
            <div className="text-[28px] font-semibold text-[#e8edf2]">{v}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Transportistas</span>
          <Btn variant="primary" size="sm" onClick={() => { setEditando(null); setModal(true) }}>
            <Plus size={13} /> Nuevo
          </Btn>
        </div>
        <div className="relative mb-3 max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none" />
          <input className={SI + ' pl-8'} placeholder="Buscar nombre, placa..."
            value={busq} onChange={e => setBusq(e.target.value)} />
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {['Nombre', 'Tipo', 'Placa', 'Vehículo', 'Teléfono', 'Licencia', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/[0.08] whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8}><EmptyState icon={Truck} title="Sin transportistas" description="Agrega el primer transportista." /></td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-3.5 py-2.5 font-medium text-[#e8edf2]">{t.nombre}</td>
                  <td className="px-3.5 py-2.5">
                    <Badge variant={t.tipo === 'PROPIO' ? 'teal' : 'neutral'}>{t.tipo}</Badge>
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{t.placa || '—'}</td>
                  <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6]">{t.vehiculo || '—'}</td>
                  <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6]">{t.telefono || '—'}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{t.licencia || '—'}</td>
                  <td className="px-3.5 py-2.5"><Badge variant={t.activo ? 'success' : 'neutral'}>{t.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex gap-1">
                      <Btn variant="ghost" size="icon" onClick={() => { setEditando(t); setModal(true) }}><Edit2 size={13} /></Btn>
                      <Btn variant="ghost" size="icon" className="text-red-400 hover:text-red-300" onClick={() => setConfirmDel(t.id)}><Trash2 size={13} /></Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <ModalTransportista open onClose={() => { setModal(false); setEditando(null) }} editando={editando} onSave={handleSave} />}
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} danger
        title="Eliminar transportista" message="¿Eliminar este transportista?"
        onConfirm={() => { storage.deleteTransportista(confirmDel); recargarTransportistas(); setConfirmDel(null) }} />
    </>
  )
}

// ── Modal Nueva Ruta ─────────────────────────────────────
function ModalNuevaRuta({ onClose, onSave, despachos, transportistas, clientes }) {
  const [form, setForm] = useState({ transportistaId: '', fechaSalida: fechaHoy(), horaSalida: '08:00', costoViaje: '', observaciones: '' })
  const [selDes, setSelDes] = useState([]) // despachoIds seleccionados
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const disponibles = despachos.filter(d => d.estado === 'LISTO')
  const cliNombre = id => clientes.find(c => c.id === id)?.razonSocial?.slice(0, 30) || '—'

  function toggleDes(id) {
    setSelDes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function handleSave() {
    if (!form.transportistaId || selDes.length === 0) return
    const paradas = selDes.map((dId, i) => ({ despachoId: dId, orden: i + 1, estado: 'PENDIENTE', horaLlegada: null, horaPartida: null, observacion: '' }))
    onSave({ numero: generarNumDoc('RT', '001'), estado: 'PROGRAMADA', ...form, costoViaje: +form.costoViaje || 0, despachoIds: selDes, paradas, fechaRetorno: null, horaRetorno: null, usuarioId: 'usr1' })
  }

  return (
    <Modal open onClose={onClose} title="Programar Nueva Ruta de Entrega" size="lg"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" disabled={!form.transportistaId || selDes.length === 0} onClick={handleSave}><NavIcon size={13} /> Programar Ruta</Btn></>}>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Transportista *">
          <select className={SEL} value={form.transportistaId} onChange={e => f('transportistaId', e.target.value)}>
            <option value="">Seleccionar...</option>
            {transportistas.filter(t => t.activo).map(t => <option key={t.id} value={t.id}>{t.nombre} {t.placa ? `· ${t.placa}` : ''}</option>)}
          </select>
        </Field>
        <Field label="Fecha de Salida">
          <input type="date" className={SI} value={form.fechaSalida} onChange={e => f('fechaSalida', e.target.value)} />
        </Field>
        <Field label="Hora de Salida">
          <input type="time" className={SI} value={form.horaSalida} onChange={e => f('horaSalida', e.target.value)} />
        </Field>
        <Field label="Costo del Viaje (S/)">
          <input type="number" className={SI} value={form.costoViaje} onChange={e => f('costoViaje', e.target.value)} min="0" step="0.50" />
        </Field>
      </div>

      <div className="text-[13px] font-semibold text-[#e8edf2]">
        Despachos a incluir
        <span className="ml-2 text-[11px] text-[#5f6f80] font-normal">Solo despachos en estado "Listo"</span>
      </div>

      {disponibles.length === 0 ? (
        <Alert variant="warning">No hay despachos en estado "Listo" para incluir en esta ruta. Avanza el estado de los despachos primero.</Alert>
      ) : (
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
          {disponibles.map(d => (
            <label key={d.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selDes.includes(d.id) ? 'bg-[#00c896]/10 border-[#00c896]/40' : 'bg-[#1a2230] border-white/[0.06] hover:border-white/[0.12]'
              }`}>
              <input type="checkbox" checked={selDes.includes(d.id)} onChange={() => toggleDes(d.id)} className="accent-[#00c896]" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-[#00c896]">{d.numero}</span>
                  <span className="text-[12px] text-[#e8edf2] truncate">{cliNombre(d.clienteId)}</span>
                </div>
                <div className="text-[11px] text-[#5f6f80] truncate">{d.direccionEntrega}</div>
              </div>
              <span className="text-[11px] text-[#9ba8b6] font-mono shrink-0">{d.items?.length} ítem(s)</span>
            </label>
          ))}
        </div>
      )}

      <Field label="Observaciones">
        <textarea className={SI + ' resize-y min-h-[52px]'} value={form.observaciones}
          onChange={e => f('observaciones', e.target.value)} placeholder="Instrucciones para el conductor..." />
      </Field>
    </Modal>
  )
}

// ── Modal Detalle / Gestión de Ruta ──────────────────────
function MapaRuta({ paradas, despachos, clientes, almacenDireccion, horaSalida }) {
  const mapRef = useRef(null)
  const mapObj = useRef(null)
  const [tiempos, setTiempos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [progreso, setProgreso] = useState('')

  // Color por estado — tanto para polilínea como para marcador
  const COLORES = {
    ENTREGADO: { color: '#22c55e', opacity: 1, peso: 5, label: 'Entregado' },
    EN_CAMINO: { color: '#3b82f6', opacity: 1, peso: 5, label: 'En camino' },
    FALLIDO: { color: '#ef4444', opacity: 1, peso: 5, label: 'No entregado' },
    PENDIENTE: { color: '#f59e0b', opacity: 0.85, peso: 4, label: 'Pendiente' },
    ANULADO: { color: '#6b7280', opacity: 0.6, peso: 3, label: 'Anulado' },
  }

  // ── Geocodificar con Photon y Nominatim ────────────────
  async function geocodificar(dir) {
    if (!dir?.trim()) return null

    // Función interna para realizar la petición a la API
    const fetchCoords = async (qText) => {
      try {
        const query = encodeURIComponent(qText + (qText.toLowerCase().includes('peru') ? '' : ', Lima, Peru'))
        // 1. Intento con Photon (más flexible con números y abreviaturas)
        const resP = await fetch(`https://photon.komoot.io/api/?q=${query}&limit=1`)
        const dataP = await resP.json()
        if (dataP?.features?.length > 0) {
          const [lng, lat] = dataP.features[0].geometry.coordinates
          return { lat, lng }
        }
        // 2. Intento con Nominatim (más estricto pero preciso si existe el dato)
        const resN = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}&countrycodes=pe`, {
          headers: { 'Accept-Language': 'es', 'User-Agent': 'LogisticaApp/3.0' }
        })
        const dataN = await resN.json()
        if (dataN?.length > 0) return { lat: parseFloat(dataN[0].lat), lng: parseFloat(dataN[0].lon) }
      } catch (e) { }
      return null
    }

    // ESTRATEGIA DE BÚSQUEDA SECUENCIAL
    // Preparación: Normalizar términos peruanos comunes
    let d = dir.toLowerCase()
      .replace(/\bcuadra\s+(\d+)\b/g, '$100') // 'Cuadra 15' -> '1500'
      .replace(/\bcdra\s+(\d+)\b/g, '$100')
      .replace(/\bnro\b/g, '')
      .replace(/\bnum\b/g, '')

    // 1. Dirección procesada completa
    let res = await fetchCoords(d)
    if (res) return res

    // 2. Limpieza de caracteres especiales
    const suave = d.replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim()
    if (suave !== d) {
      res = await fetchCoords(suave)
      if (res) return res
    }

    // 3. Solo Calle y Número (quitar Urbanizaciones, Etapas, Manzanas, Lotes)
    const basico = d.split(/(?:urb|etapa|sector|lote|mz|piso|dpto|referencia)/i)[0].trim()
    if (basico !== d && basico.length > 5) {
      res = await fetchCoords(basico)
      if (res) return res
    }

    // 4. Intentar sin el tipo de vía
    const sinVia = suave.replace(/\b(av|avenida|jr|jiron|cl|calle|psj|pasaje)\b/gi, '').trim()
    if (sinVia.length > 4) {
      res = await fetchCoords(sinVia)
      if (res) return res
    }

    // 5. Último recurso: Solo el nombre de la calle (sin número)
    const soloCalle = sinVia.replace(/\d+/g, '').trim()
    if (soloCalle.length > 4) {
      res = await fetchCoords(soloCalle)
      if (res) return res
    }

    return null
  }

  // ── OSRM multi-waypoint en UNA SOLA llamada ────────────
  // Devuelve array de rutas por tramo (legs) con su geometría
  async function calcularRutaMulti(puntos) {
    // puntos = [{lat,lng}, {lat,lng}, ...]
    if (puntos.length < 2) return null
    try {
      const coords = puntos.map(p => `${p.lng},${p.lat}`).join(';')
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}` +
        `?overview=false&geometries=geojson&steps=false&annotations=false` +
        `&alternatives=false`
      const r = await fetch(url)
      const d = await r.json()
      if (d.code !== 'Ok' || !d.routes?.length) return null
      // Para cada leg, pedir su geometría individual (overview por tramo)
      return d.routes[0].legs.map(leg => ({
        distancia: (leg.distance / 1000).toFixed(1) + ' km',
        duracion: Math.round(leg.duration / 60) + ' min',
        minutos: Math.round(leg.duration / 60),
      }))
    } catch { return null }
  }

  // OSRM tramo individual con geometría (para dibujar polilínea por tramo)
  async function calcularTramo(desde, hasta) {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/` +
        `${desde.lng},${desde.lat};${hasta.lng},${hasta.lat}` +
        `?overview=full&geometries=geojson`
      const r = await fetch(url)
      const d = await r.json()
      if (d.code !== 'Ok') return null
      const leg = d.routes[0].legs[0]
      return {
        coords: d.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        distancia: (leg.distance / 1000).toFixed(1) + ' km',
        duracion: Math.round(leg.duration / 60) + ' min',
        minutos: Math.round(leg.duration / 60),
      }
    } catch { return null }
  }

  function calcHora(horaSal, mins) {
    if (!horaSal || mins == null) return '—'
    const [h, m] = horaSal.split(':').map(Number)
    const tot = h * 60 + m + mins
    return `${String(Math.floor(tot / 60) % 24).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`
  }

  async function cargarLeaflet() {
    if (window.L) return window.L
    if (!document.getElementById('lf-css')) {
      const l = document.createElement('link')
      l.id = 'lf-css'; l.rel = 'stylesheet'
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(l)
    }
    await new Promise((res, rej) => {
      if (document.getElementById('lf-js')) {
        const t = setInterval(() => { if (window.L) { clearInterval(t); res() } }, 150); return
      }
      const s = document.createElement('script')
      s.id = 'lf-js'; s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.onload = res; s.onerror = rej
      document.head.appendChild(s)
    })
    return window.L
  }

  const claveDeps = JSON.stringify(paradas.map(p => p.estado + p.despachoId))

  useEffect(() => {
    if (!mapRef.current || paradas.length === 0) return
    let cancelado = false

    async function init() {
      try {
        setCargando(true); setError(null); setTiempos([])

        const L = await cargarLeaflet()
        if (cancelado) return

        if (mapObj.current) { mapObj.current.remove(); mapObj.current = null }

        const map = L.map(mapRef.current, { zoomControl: true })
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OSM &copy; CARTO', subdomains: 'abcd', maxZoom: 19,
        }).addTo(map)
        mapObj.current = map

        // ── PASO 1: Geocodificar TODAS las direcciones ──────
        // Se hace secuencial con 1.4s de pausa para respetar Nominatim (1 req/s)
        setProgreso('Ubicando almacén (1/' + (paradas.length + 1) + ')...')
        const origenCoord = await geocodificar(almacenDireccion || 'Av. Universitaria 2650, Los Olivos')
        if (cancelado) return
        if (!origenCoord) { setError('No se pudo ubicar el almacén.'); setCargando(false); return }

        const coordsParadas = []
        for (let i = 0; i < paradas.length; i++) {
          if (cancelado) return
          await new Promise(r => setTimeout(r, 1400)) // pausa obligatoria entre geocodificaciones
          setProgreso(`Ubicando parada ${i + 1} de ${paradas.length}...`)
          const des = despachos.find(d => d.id === paradas[i].despachoId)
          const coord = await geocodificar(des?.direccionEntrega || '')
          coordsParadas.push(coord) // puede ser null si falla
        }
        if (cancelado) return

        // ── PASO 2: Calcular tramo por tramo con geometría ──
        // Para poder colorear cada tramo con el color del estado de esa parada
        const tiemposCalc = []
        let acumMin = 0
        let prevCoord = origenCoord
        const allBounds = [[origenCoord.lat, origenCoord.lng]]

        for (let i = 0; i < paradas.length; i++) {
          if (cancelado) return
          const p = paradas[i]
          const des = despachos.find(d => d.id === p.despachoId)
          const cli = clientes.find(cl => cl.id === des?.clienteId)
          const coord = coordsParadas[i]
          const col = COLORES[p.estado] || COLORES.PENDIENTE

          if (!coord) {
            // Dirección no geocodificada — agregar entrada en tabla pero continuar sin romper la ruta
            tiemposCalc.push({ despachoId: p.despachoId, distancia: '—', duracion: '— (dirección no encontrada)', llegadaEst: '—', minutos: 0 })
            // Poner un marcador de advertencia en Lima centro como fallback visual
            const fallbackCoord = { lat: -12.0553, lng: -77.0311 }
            const warnMark = L.marker([fallbackCoord.lat + (i * 0.002), fallbackCoord.lng], {
              icon: L.divIcon({
                className: '',
                html: `<div style="width:34px;height:34px;background:#6b7280;border:2px dashed #fff;border-radius:50%;
                     display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;
                     color:#fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)" title="Dirección no encontrada">${p.orden}?</div>`,
                iconSize: [34, 34], iconAnchor: [17, 17],
              }), zIndexOffset: 200,
            }).addTo(map)
            warnMark.bindPopup(`<b>Parada ${p.orden} — Dirección no encontrada</b><br><span style="color:#ef4444;font-size:11px">No se pudo ubicar: ${des?.direccionEntrega || 'sin dirección'}</span><br><span style="font-size:10px;color:#888">Verifica la dirección en el módulo de Clientes</span>`)
            continue
          }

          // --- Jittering: Si la coordenada es idéntica o muy cercana a otra anterior (ej. misma avenida), 
          // desplazamos el marcador ligeramente para que no se oculten uno debajo de otro.
          let superposiciones = 0;
          allBounds.forEach(([bLat, bLng]) => {
            if (Math.abs(bLat - coord.lat) < 0.0005 && Math.abs(bLng - coord.lng) < 0.0005) {
              superposiciones++;
            }
          });
          if (superposiciones > 0) {
            coord.lat -= (superposiciones * 0.001); // Desplazamiento mínimo visual 
            coord.lng += (superposiciones * 0.0015); 
          }

          allBounds.push([coord.lat, coord.lng])
          setProgreso(`Calculando tramo ${i + 1} de ${paradas.length}...`)
          const tramo = await calcularTramo(prevCoord, coord)
          if (cancelado) return

          acumMin += tramo?.minutos || 0
          tiemposCalc.push({
            despachoId: p.despachoId,
            distancia: tramo?.distancia || '—',
            duracion: tramo?.duracion || '—',
            llegadaEst: calcHora(horaSalida, acumMin),
            minutos: acumMin,
          })

          // ── Polilínea del tramo con COLOR del estado ──────
          if (tramo?.coords?.length) {
            // Sombra/halo de la línea para mejor visibilidad
            L.polyline(tramo.coords, {
              color: '#fff', weight: col.peso + 3, opacity: 0.25,
              lineJoin: 'round', lineCap: 'round',
            }).addTo(map)
            // Línea principal del color del estado
            L.polyline(tramo.coords, {
              color: col.color,
              weight: col.peso,
              opacity: col.opacity,
              dashArray: p.estado === 'PENDIENTE' ? '10 6' : null,
              lineJoin: 'round', lineCap: 'round',
            }).addTo(map)

            // Flecha de dirección en la mitad del tramo
            const half = Math.floor(tramo.coords.length / 2)
            const mid = tramo.coords[half]
            const prv = tramo.coords[Math.max(0, half - 2)]
            const ang = Math.atan2(mid[0] - prv[0], mid[1] - prv[1]) * 180 / Math.PI
            L.marker(mid, {
              icon: L.divIcon({
                className: '',
                html: `<div style="transform:rotate(${ang}deg);font-size:16px;color:${col.color};line-height:1;
                               filter:drop-shadow(0 1px 3px rgba(0,0,0,0.45))">➤</div>`,
                iconSize: [18, 18], iconAnchor: [9, 9],
              }),
              interactive: false, zIndexOffset: 300,
            }).addTo(map)
          }

          // ── Marcador de la parada ─────────────────────────
          const esActiva = p.estado === 'EN_CAMINO'
          const sz = esActiva ? 38 : 32
          const ico = p.estado === 'ENTREGADO' ? '✓' : p.estado === 'FALLIDO' ? '✕' : `${p.orden}`
          const glow = esActiva
            ? `box-shadow:0 0 0 5px ${col.color}44,0 0 18px ${col.color}88,0 3px 8px rgba(0,0,0,0.3)`
            : `box-shadow:0 3px 8px rgba(0,0,0,0.35),0 0 0 2px ${col.color}55`

          const marker = L.marker([coord.lat, coord.lng], {
            icon: L.divIcon({
              className: '',
              html: `<div style="width:${sz}px;height:${sz}px;background:${col.color};
                     border:3px solid #fff;border-radius:50%;display:flex;align-items:center;
                     justify-content:center;font-size:${esActiva ? 13 : 11}px;font-weight:900;
                     color:#fff;${glow}">${ico}</div>`,
              iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
            }),
            zIndexOffset: esActiva ? 1500 : 500,
          }).addTo(map)

          marker.bindPopup(`
            <div style="min-width:210px;font-family:system-ui,sans-serif;padding:2px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <div style="width:24px;height:24px;background:${col.color};border-radius:50%;
                     display:flex;align-items:center;justify-content:center;
                     font-size:11px;font-weight:900;color:#fff;flex-shrink:0">${ico}</div>
                <div>
                  <div style="font-weight:800;font-size:13px;color:#111">Parada ${p.orden}</div>
                  <div style="font-size:10px;font-weight:700;color:${col.color};text-transform:uppercase;
                       letter-spacing:0.05em">${col.label}</div>
                </div>
              </div>
              <div style="font-size:12px;font-weight:600;color:#222;margin-bottom:2px">${cli?.razonSocial || '—'}</div>
              <div style="font-size:11px;color:#666;margin-bottom:8px;line-height:1.4">${des?.direccionEntrega || '—'}</div>
              <div style="border-top:1px solid #eee;padding-top:6px;display:grid;
                          grid-template-columns:auto 1fr;gap:3px 12px;font-size:11px;align-items:center">
                <span style="color:#999">📏 Distancia</span>
                <span style="font-weight:600;color:#333;text-align:right">${tramo?.distancia || '—'}</span>
                <span style="color:#999">⏱ Duración</span>
                <span style="font-weight:600;color:#333;text-align:right">${tramo?.duracion || '—'}</span>
                <span style="color:#999">🕐 Llegada est.</span>
                <span style="font-weight:800;color:${col.color};font-size:13px;text-align:right">${calcHora(horaSalida, acumMin)}</span>
                ${p.horaLlegada
              ? `<span style="color:#22c55e">✅ Real</span>
                     <span style="font-weight:700;color:#22c55e;text-align:right">${p.horaLlegada}</span>`
              : ''}
              </div>
            </div>
          `)

          if (esActiva) setTimeout(() => marker.openPopup(), 600)
          prevCoord = coord
        }

        // ── Marcador del almacén (siempre encima de todo) ──
        L.marker([origenCoord.lat, origenCoord.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="width:40px;height:40px;background:#00c896;border:3px solid #fff;
                   border-radius:50%;display:flex;align-items:center;justify-content:center;
                   font-size:10px;font-weight:900;color:#fff;
                   box-shadow:0 0 0 3px #00c89644,0 4px 12px rgba(0,200,150,0.5),0 3px 8px rgba(0,0,0,0.3)">ALM</div>`,
            iconSize: [40, 40], iconAnchor: [20, 20],
          }),
          zIndexOffset: 3000,
        }).addTo(map)
          .bindPopup(`<b style="font-size:13px">📦 Almacén — Origen</b><br>
                     <span style="font-size:11px;color:#555">${almacenDireccion}</span>`)

        // Ajustar zoom para ver todos los puntos
        if (allBounds.length > 1) {
          map.fitBounds(L.latLngBounds(allBounds), { padding: [55, 55], maxZoom: 14 })
        } else {
          map.setView([origenCoord.lat, origenCoord.lng], 13)
        }

        setTiempos(tiemposCalc)
        setProgreso('')
        setCargando(false)

      } catch (e) {
        if (!cancelado) { setError('Error al cargar el mapa: ' + e.message); setCargando(false) }
      }
    }

    init()
    return () => {
      cancelado = true
      if (mapObj.current) { mapObj.current.remove(); mapObj.current = null }
    }
  }, [claveDeps, almacenDireccion, horaSalida])

  const coloresLeyenda = Object.entries(COLORES)

  return (
    <div className="mb-4 rounded-xl overflow-hidden border border-white/[0.08] shrink-0">

      {/* ── Cabecera con leyenda ──────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#1a2230] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
            Mapa de Ruta — {paradas.length} parada{paradas.length !== 1 ? 's' : ''}
          </span>
          {cargando && (
            <div className="flex items-center gap-1.5 text-[11px] text-blue-400">
              <div className="w-3 h-3 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
              {progreso || 'Iniciando...'}
            </div>
          )}
        </div>
        {/* Leyenda de colores */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {[['#00c896', 'Almacén (origen)'], ...coloresLeyenda.map(([k, v]) => [v.color, v.label])].map(([col, lbl]) => (
            <span key={lbl} className="flex items-center gap-1.5 text-[10px] text-[#9ba8b6]">
              <span className="w-3 h-3 rounded-full border border-white/25 shrink-0" style={{ background: col }} />
              {lbl}
            </span>
          ))}
        </div>
      </div>

      {/* ── Mapa ─────────────────────────────────────────── */}
      <div className="relative" style={{ height: 420 }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%', borderRadius: 'inherit' }} />
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 gap-3 p-6 z-[999]">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xl font-bold">!</div>
            <div className="text-center">
              <div className="text-[13px] font-semibold text-gray-800 mb-1">Error al cargar el mapa</div>
              <div className="text-[11px] text-gray-500 max-w-[280px]">{error}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Tabla tiempos ─────────────────────────────────── */}
      {tiempos.length > 0 && (
        <div className="bg-[#1a2230] border-t border-white/[0.06]">
          <div className="px-4 py-2.5 flex items-center gap-2 border-b border-white/[0.04]">
            <span className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
              Tiempos Estimados
            </span>
            {horaSalida && (
              <span className="text-[11px] text-[#9ba8b6]">
                — Salida <strong className="text-[#e8edf2]">{horaSalida}</strong>
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="bg-[#161d28]">
                  {['#', 'Cliente', 'Dirección', 'Distancia', 'Duración', 'Llegada Est.', 'Real', 'Estado'].map(h => (
                    <th key={h} className="px-3.5 py-2 text-left text-[10px] font-semibold text-[#5f6f80] uppercase border-b border-white/[0.06] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paradas.map(p => {
                  const des = despachos.find(d => d.id === p.despachoId)
                  const cli = clientes.find(cl => cl.id === des?.clienteId)
                  const info = tiempos.find(t => t.despachoId === p.despachoId)
                  const col = COLORES[p.estado] || COLORES.PENDIENTE
                  return (
                    <tr key={p.despachoId}
                      className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-3.5 py-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px]
                          font-bold text-white border-2 border-white/25" style={{ background: col.color }}>
                          {p.estado === 'ENTREGADO' ? '✓' : p.estado === 'FALLIDO' ? '✕' : p.orden}
                        </div>
                      </td>
                      <td className="px-3.5 py-3 font-semibold text-[#e8edf2] max-w-[130px] truncate">
                        {cli?.razonSocial?.slice(0, 22) || '—'}
                      </td>
                      <td className="px-3.5 py-3 text-[#9ba8b6] text-[11px] max-w-[150px] truncate"
                        title={des?.direccionEntrega}>
                        {des?.direccionEntrega || '—'}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-[11px] text-[#9ba8b6] whitespace-nowrap">
                        {info?.distancia || '—'}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-[11px] text-[#9ba8b6] whitespace-nowrap">
                        {info?.duracion || '—'}
                      </td>
                      <td className="px-3.5 py-3">
                        <span className="font-mono text-[13px] font-bold" style={{ color: col.color }}>
                          {info?.llegadaEst || '—'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3">
                        {p.horaLlegada
                          ? <span className="font-mono text-[12px] font-semibold text-green-400">{p.horaLlegada}</span>
                          : <span className="text-[10px] text-[#5f6f80]">—</span>
                        }
                      </td>
                      <td className="px-3.5 py-3">
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap"
                          style={{ background: `${col.color}22`, color: col.color }}>
                          {col.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="px-4 py-1.5 bg-[#1a2230] border-t border-white/[0.04] text-[10px] text-[#3d4f60]">
        Mapa: OpenStreetMap © CARTO · Rutas: OSRM · Geocodificación: Nominatim · Sin API key
      </div>
    </div>
  )
}


function ModalDetalleRuta({ ruta, despachos, clientes, transportistas, almacenes, config, onClose, onIniciar, onCompletar, onMarcarParada }) {
  const [obsParada, setObsParada] = useState({})
  const tra = transportistas.find(t => t.id === ruta.transportistaId)
  const meta = ESTADO_RUTA[ruta.estado]
  const Icon = meta.icon
  const entregadas = ruta.paradas.filter(p => p.estado === 'ENTREGADO').length
  const cliNombre = id => clientes.find(c => c.id === id)?.razonSocial || '—'
  const almacen = almacenes?.find(a => a.id === ruta.almacenId)
  const almacenDir = config?.direccion || 'Av. Universitaria 2650, Los Olivos, Lima, Perú'

  return (
    <Modal open title={`Ruta ${ruta.numero}`} onClose={onClose} size="lg"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
          {ruta.estado === 'PROGRAMADA' && <Btn variant="primary" onClick={onIniciar}><PlayCircle size={14} /> Iniciar Ruta</Btn>}
          {ruta.estado === 'EN_RUTA' && <Btn variant="success" onClick={onCompletar}><Flag size={14} /> Cerrar Ruta</Btn>}
        </>
      }>

      {/* Dashboard de cabecera compactado */}
      <div className="flex flex-col gap-3 mb-4 shrink-0">
        {/* Fila 1: Origen y Transportista */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#00c896]/10 border border-[#00c896]/25 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-[#00c896] flex items-center justify-center text-[10px] font-black text-[#082e1e] shrink-0">ALM</div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold text-[#00c896] uppercase tracking-wider">Origen</div>
              <div className="text-[13px] font-bold text-[#e8edf2] truncate">{almacen?.nombre || config?.empresa || 'Almacén'}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[14px] font-bold text-[#e8edf2] font-mono">{ruta.horaSalida || '—'}</div>
              <div className="text-[10px] text-[#5f6f80]">{formatDate(ruta.fechaSalida)}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 bg-[#1a2230] border border-white/[0.08] rounded-xl">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#5f6f80] shrink-0">
              <Truck size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-wider">Transportista</div>
              <div className="text-[13px] font-bold text-[#e8edf2] truncate">{tra?.nombre || '—'}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[12px] font-mono text-[#9ba8b6]">{tra?.placa || '—'}</div>
            </div>
          </div>
        </div>

        {/* Fila 2: Stats compactos y Barra */}
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-[#161d28] border border-white/[0.06] rounded-xl">
          <div className="flex items-center gap-5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#5f6f80] uppercase">Estado</span>
              <Badge variant={meta.color} className="scale-90 origin-left"><Icon size={9} /> {meta.label}</Badge>
            </div>
            <div className="flex flex-col gap-0.5 border-l border-white/10 pl-5">
              <span className="text-[10px] text-[#5f6f80] uppercase">Seguimiento</span>
              <div className="text-[13px] font-bold text-[#e8edf2]">{entregadas} de {ruta.paradas.length} entregas</div>
            </div>
          </div>
          <div className="flex-1 max-w-[200px]">
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#00c896] rounded-full transition-all"
                style={{ width: ruta.paradas.length ? `${(entregadas / ruta.paradas.length) * 100}%` : '0%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Mapa de ruta (Apreciación plena, oculto si todo está entregado) */}
      {entregadas < ruta.paradas.length && (
        <MapaRuta paradas={ruta.paradas} despachos={despachos} clientes={clientes}
          almacenDireccion={almacenDir} horaSalida={ruta.horaSalida} />
      )}

      {/* Paradas con acciones */}
      <div className="text-[13px] font-semibold text-[#e8edf2] mb-3 shrink-0">Paradas del viaje</div>
      <div className="flex flex-col gap-2.5">
        {ruta.paradas.map(parada => {
          const des = despachos.find(d => d.id === parada.despachoId)
          const pMeta = ESTADO_PARADA[parada.estado]
          return (
            <div key={parada.despachoId} className={`p-4 rounded-xl border transition-all ${parada.estado === 'EN_CAMINO' ? 'bg-blue-500/10 border-blue-500/25' :
              parada.estado === 'ENTREGADO' ? 'bg-green-500/5 border-green-500/15 opacity-70' :
                parada.estado === 'FALLIDO' ? 'bg-red-500/10 border-red-500/20' :
                  'bg-[#1a2230] border-white/[0.06]'
              }`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${parada.estado === 'ENTREGADO' ? 'bg-green-500/20 text-green-400' :
                    parada.estado === 'EN_CAMINO' ? 'bg-blue-500/20 text-blue-400' :
                      parada.estado === 'FALLIDO' ? 'bg-red-500/20 text-red-400' :
                        'bg-white/10 text-[#5f6f80]'
                    }`}>{parada.orden}</div>
                  <div>
                    <div className="font-medium text-[#e8edf2]">{cliNombre(des?.clienteId)}</div>
                    <div className="text-[11px] text-[#5f6f80]">{des?.direccionEntrega}</div>
                    <div className="text-[11px] text-[#9ba8b6] mt-0.5">
                      {des?.numero} · {des?.items?.length} ítem(s) · {formatCurrency(des?.total || 0, 'S/')}
                    </div>
                    {parada.horaLlegada && (
                      <div className="text-[11px] text-[#5f6f80] mt-0.5">
                        Llegada: {parada.horaLlegada}{parada.horaPartida ? ` · Partida: ${parada.horaPartida}` : ''}
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant={pMeta.color}>{pMeta.label}</Badge>
              </div>

              {/* Acciones para parada activa */}
              {ruta.estado === 'EN_RUTA' && (parada.estado === 'EN_CAMINO' || parada.estado === 'PENDIENTE') && (
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <input className={SI + ' mb-2'} placeholder="Observación (opcional)"
                    value={obsParada[parada.despachoId] || ''}
                    onChange={e => setObsParada(p => ({ ...p, [parada.despachoId]: e.target.value }))} />
                  <div className="flex gap-2">
                    <Btn variant="primary" size="sm"
                      onClick={() => onMarcarParada(parada.despachoId, 'ENTREGADO', obsParada[parada.despachoId] || '')}>
                      <CheckCircle size={12} /> Confirmar Entrega
                    </Btn>
                    <Btn variant="ghost" size="sm" className="text-red-400 hover:text-red-300"
                      onClick={() => onMarcarParada(parada.despachoId, 'FALLIDO', obsParada[parada.despachoId] || 'No se pudo entregar')}>
                      <X size={12} /> No Entregado
                    </Btn>
                  </div>
                </div>
              )}

              {parada.observacion && (
                <div className="mt-2 text-[11px] text-[#9ba8b6] italic">{parada.observacion}</div>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

// ── Modal Transportista ──────────────────────────────────
function ModalTransportista({ open, onClose, editando, onSave }) {
  const init = { nombre: '', tipo: 'PROPIO', placa: '', vehiculo: '', telefono: '', email: '', licencia: '', activo: true }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    setForm(editando ? { ...init, ...editando } : init)
  }, [editando, open])

  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar Transportista' : 'Nuevo Transportista'} size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" disabled={!form.nombre.trim()} onClick={() => form.nombre.trim() && onSave(form)}>Guardar</Btn></>}>
      <div className="grid grid-cols-2 gap-3.5">
        <div className="col-span-2">
          <Field label="Nombre / Razón Social *">
            <input className={SI} value={form.nombre} onChange={e => f('nombre', e.target.value)} placeholder="Juan Pérez o Courier Express SAC" />
          </Field>
        </div>
        <Field label="Tipo">
          <select className={SEL} value={form.tipo} onChange={e => f('tipo', e.target.value)}>
            <option value="PROPIO">Propio (empleado/vehículo propio)</option>
            <option value="TERCERO">Tercero (empresa externa)</option>
          </select>
        </Field>
        <Field label="Placa del vehículo">
          <input className={SI} value={form.placa} onChange={e => f('placa', e.target.value.toUpperCase())} placeholder="ABC-123" />
        </Field>
        <div className="col-span-2">
          <Field label="Descripción del vehículo">
            <input className={SI} value={form.vehiculo} onChange={e => f('vehiculo', e.target.value)} placeholder="Toyota Hilux, Van H-1, Moto..." />
          </Field>
        </div>
        <Field label="Teléfono / Celular">
          <input className={SI} value={form.telefono} onChange={e => f('telefono', e.target.value)} placeholder="987-001-001" />
        </Field>
        <Field label="Licencia de conducir">
          <input className={SI} value={form.licencia} onChange={e => f('licencia', e.target.value)} placeholder="Q84512301" />
        </Field>
        <div className="col-span-2">
          <Field label="Email">
            <input type="email" className={SI} value={form.email} onChange={e => f('email', e.target.value)} placeholder="conductor@empresa.pe" />
          </Field>
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#9ba8b6]">
        <input type="checkbox" checked={form.activo} onChange={e => f('activo', e.target.checked)} className="accent-[#00c896]" />
        Transportista activo
      </label>
    </Modal>
  )
}
