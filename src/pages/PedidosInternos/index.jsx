import { useState, useMemo } from 'react'
import {
  ClipboardList, Plus, Search,
  Eye, CheckCircle,
  Bell, Check, X, Info,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { fechaHoy } from '../../utils/helpers'
import { Btn } from '../../components/ui'
import { useAreasInternasList } from '../../queries/areas-internas.queries'
import { useProductosList } from '../../queries/productos.queries'
import { useAlmacenesList } from '../../queries/almacenes.queries'
import {
  usePedidosInternosList,
  useCrearPedidoInterno,
  useActualizarPedidoInterno,
  useEnviarPedidoInterno,
  useAprobarPedidoInterno,
  useRechazarPedidoInterno,
  useMarcarPickingPI,
  useEntregarPI,
  useConfirmarReciboPI,
} from '../../queries/pedidos-internos.queries'
import { ESTADOS, ESTADOS_LISTA, DS } from './constants'
import { Badge } from './Badge'
import { Stat } from './Stat'
import { ModalPedido } from './ModalPedido'
import { ModalAprobacion } from './ModalAprobacion'
import { ModalDetalle } from './ModalDetalle'

// ══════════════════════════════════════════════════════════════
// Página principal
// ══════════════════════════════════════════════════════════════
export default function PedidosInternos() {
  const { sesion, toast } = useApp()

  const esSolicitante  = sesion?.rol?.codigo === 'solicitante'
  const esAdmin        = !esSolicitante
  const areaDelUsuario = sesion?.areaId || ''

  const { data: pedidosInternos = [], isLoading } = usePedidosInternosList()
  const { data: areasRaw        = [] }            = useAreasInternasList({ incluirInactivas: true })
  const { data: productosRaw    = [] }            = useProductosList()
  const { data: almacenes       = [] }            = useAlmacenesList()

  const areas    = useMemo(() => areasRaw.map(a => ({ ...a, activo: a.activo !== false })), [areasRaw])
  const productos= useMemo(() => productosRaw.map(p => ({ ...p, activo: p.estado === 'Activo' || p.activo !== false })), [productosRaw])

  const crearPI    = useCrearPedidoInterno()
  const actualizarPI = useActualizarPedidoInterno()
  const enviarPI   = useEnviarPedidoInterno()
  const aprobarPI  = useAprobarPedidoInterno()
  const rechazarPI = useRechazarPedidoInterno()
  const pickingPI  = useMarcarPickingPI()
  const entregarPI = useEntregarPI()
  const reciboPI   = useConfirmarReciboPI()

  const [busqueda,   setBusqueda]   = useState('')
  const [filtEstado, setFiltEstado] = useState('')
  const [filtArea,   setFiltArea]   = useState('')
  const [modalNuevo, setModalNuevo] = useState(false)
  const [modalEditar,setModalEditar]= useState(null)
  const [modalAprob, setModalAprob] = useState(null)
  const [modalDet,   setModalDet]   = useState(null)

  const stats = useMemo(() => {
    let base = pedidosInternos
    if (esSolicitante) base = base.filter(p => p.areaId === areaDelUsuario)
    return {
      total:     base.length,
      pendientes:base.filter(p => ['ENVIADO','APROBADO','PICKING'].includes(p.estado)).length,
      hoy:       base.filter(p => (p.fecha || p.createdAt || '').startsWith(fechaHoy())).length,
      criticos:  base.filter(p => p.prioridad === 'CRITICO' && !['ENTREGADO','RECHAZADO'].includes(p.estado)).length,
    }
  }, [pedidosInternos, esSolicitante, areaDelUsuario])

  const lista = useMemo(() => {
    let data = pedidosInternos
    if (esSolicitante) data = data.filter(p => p.areaId === areaDelUsuario)
    if (filtEstado) data = data.filter(p => p.estado === filtEstado)
    if (!esSolicitante && filtArea) data = data.filter(p => p.areaId === filtArea)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      data = data.filter(p =>
        p.numero?.toLowerCase().includes(q) ||
        areas.find(a => a.id === p.areaId)?.nombre?.toLowerCase().includes(q)
      )
    }
    return data
  }, [pedidosInternos, filtEstado, filtArea, busqueda, areas, esSolicitante, areaDelUsuario])

  const pedidosListos = useMemo(() =>
    esSolicitante
      ? pedidosInternos.filter(p => p.areaId === areaDelUsuario && p.estado === 'ENTREGADO' && !p.reciboConfirmado)
      : []
  , [pedidosInternos, esSolicitante, areaDelUsuario])

  async function handleModalSave(action) {
    let res
    if (action.type === 'create') {
      res = await crearPI.mutateAsync(action.dto)
      if (res?.error) return res
      if (action.enviar) {
        const r2 = await enviarPI.mutateAsync(res.data?.id)
        if (r2?.error) { toast(r2.error, 'error') }
      }
      setModalNuevo(false)
      toast(action.enviar ? 'Pedido enviado' : 'Borrador guardado', 'success')
    } else if (action.type === 'update') {
      res = await actualizarPI.mutateAsync({ id: action.id, ...action.dto })
      if (res?.error) return res
      if (action.enviar) {
        const r2 = await enviarPI.mutateAsync(action.id)
        if (r2?.error) { toast(r2.error, 'error') }
      }
      setModalEditar(null)
      toast(action.enviar ? 'Pedido enviado' : 'Cambios guardados', 'success')
    } else if (action.type === 'picking') {
      res = await pickingPI.mutateAsync(action.id)
      if (res?.error) return res
      setModalDet(null)
      toast('Pedido en preparación (Picking)', 'success')
    } else if (action.type === 'entregar') {
      res = await entregarPI.mutateAsync(action.id)
      if (res?.error) return res
      // showAviso handles its own close
    }
    return res
  }

  async function handleAprobar(args) {
    const res = await aprobarPI.mutateAsync(args)
    if (res?.error) return res
    setModalAprob(null)
    toast('Pedido aprobado', 'success')
    return res
  }

  async function handleRechazar(args) {
    const res = await rechazarPI.mutateAsync(args)
    if (res?.error) return res
    setModalAprob(null)
    toast('Pedido rechazado', 'warning')
    return res
  }

  async function confirmarRecibo(id) {
    const res = await reciboPI.mutateAsync(id)
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Recibo confirmado', 'success')
  }

  const saving = crearPI.isPending || actualizarPI.isPending || enviarPI.isPending

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* ── Banner explicativo ── */}
      <div className="flex items-start gap-4 px-5 py-4 rounded-xl"
        style={{background:'rgba(0,200,150,0.08)',border:'1px solid rgba(0,200,150,0.20)'}}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{background:'rgba(0,200,150,0.15)'}}>
          <ClipboardList size={24} className="text-[#00c896]"/>
        </div>
        <div className="flex-1 flex flex-col gap-3">
          <div>
            <div className="text-[14px] font-bold text-[#e8edf2] mb-1">Pedidos Internos</div>
            <div className="text-[12px] text-[#9ba8b6] leading-relaxed">
              <strong className="text-[#e8edf2]">¿Para qué sirve?</strong> Es el canal formal para que cualquier
              área de la empresa (Operaciones, Sistemas, Administración, etc.) solicite materiales o insumos al
              almacén sin recurrir a pedidos verbales o por chat: cada solicitud queda registrada, pasa por
              aprobación y descuenta stock real solo cuando efectivamente se despacha — con trazabilidad completa
              de quién pidió qué, quién aprobó y cuándo se entregó.
            </div>
          </div>
          <div className="flex items-start gap-1.5 text-[11px] text-[#5f6f80]">
            <Info size={12} className="shrink-0 mt-0.5"/>
            <span>Un usuario con rol "Solicitante" solo ve y crea pedidos de su propia área (asignada en
            Usuarios); Admin y Supervisor ven y gestionan los pedidos de todas las áreas.</span>
          </div>
        </div>
      </div>

      {pedidosListos.length > 0 && (
        <div className="bg-[#00c896]/10 border border-[#00c896]/30 rounded-xl px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00c896]/20 flex items-center justify-center shrink-0">
              <Bell size={18} className="text-[#00c896]"/>
            </div>
            <div>
              <div className="text-[14px] font-semibold text-white">
                {pedidosListos.length === 1 ? 'Tu pedido está listo para recojo' : `${pedidosListos.length} pedidos están listos para recojo`}
              </div>
              <div className="text-[11px] text-white/40 mt-0.5">Acércate al almacén en horario de oficina</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {pedidosListos.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-[#00c896]/5 rounded-lg px-4 py-2.5">
                <div>
                  <span className="text-[13px] font-mono font-medium text-white/80">{p.numero}</span>
                  <span className="text-[11px] text-white/35 ml-2">{p.items?.length} producto(s)</span>
                </div>
                <button onClick={() => confirmarRecibo(p.id)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-[#00c896] hover:text-[#009e76] transition-colors">
                  <Check size={12}/> Confirmar recibo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-white">Pedidos Internos</h1>
          <p className="text-[13px] text-white/40 mt-0.5">
            {esSolicitante
              ? `Mis solicitudes — ${areas.find(a => a.id === areaDelUsuario)?.nombre || 'Mi área'}`
              : 'Requisiciones de materiales por área'}
          </p>
        </div>
        <button onClick={() => setModalNuevo(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#00c896] hover:bg-[#009e76] text-[#082e1e] text-[13px] font-semibold rounded-xl transition-colors">
          <Plus size={16}/> Nuevo pedido
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total pedidos"    value={stats.total}     color="#00c896"/>
        <Stat label="En proceso"       value={stats.pendientes} color="#3b82f6"/>
        <Stat label="Creados hoy"      value={stats.hoy}        color="#f59e0b"/>
        <Stat label="Críticos activos" value={stats.criticos}   color="#ef4444"/>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-50">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"/>
          <input className="w-full pl-8 pr-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20"
            placeholder="Buscar por número o área..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
        </div>
        <select style={DS}
          className="px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] font-[inherit]"
          value={filtEstado} onChange={e => setFiltEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS_LISTA.map(s => <option key={s} value={s}>{ESTADOS[s]?.label || s}</option>)}
        </select>
        {!esSolicitante && (
          <select style={DS}
            className="px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] font-[inherit]"
            value={filtArea} onChange={e => setFiltArea(e.target.value)}>
            <option value="">Todas las áreas</option>
            {areas.filter(a => a.activo !== false).map(a => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
        )}
        {(filtEstado || filtArea || busqueda) && (
          <button onClick={() => { setFiltEstado(''); setFiltArea(''); setBusqueda('') }}
            className="text-[12px] text-white/30 hover:text-white/60 transition-colors flex items-center gap-1">
            <X size={12}/> Limpiar
          </button>
        )}
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-[#5f6f80] text-[13px]">Cargando pedidos...</div>
        ) : lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardList size={36} className="text-white/15"/>
            <div className="text-[13px] text-white/30">
              {busqueda || filtEstado || filtArea ? 'Sin resultados para los filtros aplicados' : 'No hay pedidos internos aún'}
            </div>
            {!busqueda && !filtEstado && !filtArea && (
              <button onClick={() => setModalNuevo(true)}
                className="flex items-center gap-1.5 text-[12px] text-[#00c896] hover:text-[#009e76] transition-colors">
                <Plus size={13}/> Crear primer pedido
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-white/8">
                  {['Nro. Pedido','Área','Almacén','Fecha','Requerido','Estado','Prioridad','Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-white/35 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map(pi => {
                  const area    = areas.find(a => a.id === pi.areaId)
                  const almacen = almacenes.find(a => a.id === pi.almacenId)
                  const esCritico = pi.prioridad === 'CRITICO'
                  return (
                    <tr key={pi.id}
                      className={`border-b border-white/5 hover:bg-white/2 transition-colors ${esCritico && !['ENTREGADO','RECHAZADO'].includes(pi.estado) ? 'bg-red-500/3' : ''}`}>
                      <td className="px-4 py-3 font-mono text-[12px] text-white/70 whitespace-nowrap">{pi.numero}</td>
                      <td className="px-4 py-3 text-white/80 whitespace-nowrap">
                        <div>{area?.nombre || pi.areaId}</div>
                        <div className="text-[10px] text-white/30 font-mono">{area?.codigo}</div>
                      </td>
                      <td className="px-4 py-3 text-white/50 whitespace-nowrap text-[12px]">{almacen?.nombre || pi.almacenId}</td>
                      <td className="px-4 py-3 text-white/50 whitespace-nowrap">{(pi.fecha || pi.createdAt || '').split('T')[0]}</td>
                      <td className="px-4 py-3 text-white/50 whitespace-nowrap">{pi.fechaRequerida || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><Badge estado={pi.estado}/></td>
                      <td className="px-4 py-3 whitespace-nowrap"><Badge prioridad={pi.prioridad}/></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Btn variant="ghost" size="icon" title="Ver detalle" onClick={() => setModalDet(pi)}>
                            <Eye size={13}/>
                          </Btn>
                          {pi.estado === 'BORRADOR' && (
                            <Btn variant="ghost" size="icon" title="Editar" onClick={() => setModalEditar(pi)}>
                              <ClipboardList size={13}/>
                            </Btn>
                          )}
                          {pi.estado === 'ENVIADO' && esAdmin && (
                            <Btn variant="ghost" size="icon" title="Aprobar / Rechazar" onClick={() => setModalAprob(pi)}>
                              <CheckCircle size={13}/>
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
        )}
      </div>

      {/* Guía de uso */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el flujo completo de Pedidos Internos?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {[
            ['1. Solicitar',   'El área crea el pedido con el almacén de despacho y los productos que necesita. Puede guardarlo como Borrador o enviarlo directo.'],
            ['2. Aprobar',     'Un pedido "Enviado" llega a Admin/Supervisor, que lo Aprueba o Rechaza (con motivo) desde el detalle.'],
            ['3. Picking',     'Con la OC Aprobada, el almacén usa "Iniciar Picking" para marcar que está preparando los productos solicitados.'],
            ['4. Entregar',    'Al completar la preparación, se usa "Marcar Entregado" — el área solicitante recibe aviso de que su pedido está listo para recojo.'],
            ['5. Confirmar recibo', 'El solicitante confirma que recogió su pedido desde el aviso en esta misma pantalla, cerrando el ciclo de la solicitud.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      {modalNuevo && (
        <ModalPedido
          pedido={null} onClose={() => setModalNuevo(false)} onSave={handleModalSave}
          areas={areas} productos={productos} almacenes={almacenes}
          sesion={sesion} areaFija={esSolicitante ? areaDelUsuario : undefined}
          saving={saving}
        />
      )}
      {modalEditar && (
        <ModalPedido
          pedido={modalEditar} onClose={() => setModalEditar(null)} onSave={handleModalSave}
          areas={areas} productos={productos} almacenes={almacenes}
          sesion={sesion} areaFija={esSolicitante ? areaDelUsuario : undefined}
          saving={saving}
        />
      )}
      {modalAprob && (
        <ModalAprobacion
          pedido={modalAprob} onClose={() => setModalAprob(null)}
          onAprobar={handleAprobar} onRechazar={handleRechazar}
          saving={aprobarPI.isPending || rechazarPI.isPending}
        />
      )}
      {modalDet && (
        <ModalDetalle
          pedido={modalDet} onClose={() => setModalDet(null)} onSave={handleModalSave}
          areas={areas} productos={productos} almacenes={almacenes}
          esAdmin={esAdmin}
          picking={pickingPI.isPending}
          entregando={entregarPI.isPending}
        />
      )}
    </div>
  )
}
