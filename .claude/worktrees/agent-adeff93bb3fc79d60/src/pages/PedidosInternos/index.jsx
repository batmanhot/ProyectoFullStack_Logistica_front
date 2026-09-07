import { useState, useMemo } from 'react'
import {
  ClipboardList, Plus, Search,
  Eye, CheckCircle,
  Bell, Check, X, Download, FileText,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { fechaHoyISO } from '../../utils/helpers'
import { Btn, Input, Select, DataTable } from '../../components/ui'
import { useAreasInternasList } from '../../queries/areas-internas.queries'
import { useAlmacenesList } from '../../queries/almacenes.queries'
import {
  usePedidosInternosList,
  usePedidosInternosProductos,
  useCrearPedidoInterno,
  useActualizarPedidoInterno,
  useEnviarPedidoInterno,
  useAprobarPedidoInterno,
  useRechazarPedidoInterno,
  useMarcarPickingPI,
  useEntregarPI,
  useConfirmarReciboPI,
} from '../../queries/pedidos-internos.queries'
import { exportarPedidosInternosXLSX } from '../../utils/exportXLSX'
import { exportarPedidosInternosPDF } from '../../utils/exportPDF'
import { ESTADOS, ESTADOS_LISTA } from './constants'
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
  const { data: productos       = [] }            = usePedidosInternosProductos()
  const { data: almacenes       = [] }            = useAlmacenesList()

  const areas = useMemo(() => areasRaw.map(a => ({ ...a, activo: a.activo !== false })), [areasRaw])

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
      hoy:       base.filter(p => (p.fecha || p.createdAt || '').startsWith(fechaHoyISO())).length,
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total pedidos"    value={stats.total}     color="#00c896"/>
        <Stat label="En proceso"       value={stats.pendientes} color="#3b82f6"/>
        <Stat label="Creados hoy"      value={stats.hoy}        color="#f59e0b"/>
        <Stat label="Críticos activos" value={stats.criticos}   color="#ef4444"/>
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] whitespace-nowrap">Pedidos Internos</span>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={() => exportarPedidosInternosXLSX(lista, areas, almacenes)}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => exportarPedidosInternosPDF(lista, areas, almacenes, sesion?.nombre)}>
              <FileText size={13}/> PDF
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => setModalNuevo(true)}>
              <Plus size={13}/> Nuevo pedido
            </Btn>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center mb-3">
          <div className="relative flex-1 min-w-50">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"/>
            <Input className="pl-8"
              placeholder="Buscar por número o área..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <Select className="w-auto" value={filtEstado} onChange={e => setFiltEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS_LISTA.map(s => <option key={s} value={s}>{ESTADOS[s]?.label || s}</option>)}
          </Select>
          {!esSolicitante && (
            <Select className="w-auto" value={filtArea} onChange={e => setFiltArea(e.target.value)}>
              <option value="">Todas las áreas</option>
              {areas.filter(a => a.activo !== false).map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </Select>
          )}
          {(filtEstado || filtArea || busqueda) && (
            <button onClick={() => { setFiltEstado(''); setFiltArea(''); setBusqueda('') }}
              className="text-[12px] text-white/30 hover:text-white/60 transition-colors flex items-center gap-1">
              <X size={12}/> Limpiar
            </button>
          )}
        </div>

        <DataTable
          loading={isLoading}
          rows={lista}
          rowKey={pi => pi.id}
          onRowClick={pi => setModalDet(pi)}
          rowClassName={pi => (pi.prioridad === 'CRITICO' && !['ENTREGADO','RECHAZADO'].includes(pi.estado)) ? 'bg-red-500/3' : ''}
          emptyIcon={ClipboardList}
          emptyTitle={busqueda || filtEstado || filtArea ? 'Sin resultados para los filtros aplicados' : 'No hay pedidos internos aún'}
          columns={[
          { key: 'numero',    header: 'Nro. Pedido', render: pi => <span className="font-mono text-[12px] text-white/70 whitespace-nowrap">{pi.numero}</span> },
          { key: 'area',      header: 'Área', render: pi => {
              const area = areas.find(a => a.id === pi.areaId)
              return (
                <div className="whitespace-nowrap">
                  <div className="text-white/80">{area?.nombre || pi.areaId}</div>
                  <div className="text-[10px] text-white/30 font-mono">{area?.codigo}</div>
                </div>
              )
            } },
          { key: 'almacen',   header: 'Almacén', render: pi => <span className="text-white/50 whitespace-nowrap text-[12px]">{almacenes.find(a => a.id === pi.almacenId)?.nombre || pi.almacenId}</span> },
          { key: 'fecha',     header: 'Fecha', render: pi => <span className="text-white/50 whitespace-nowrap">{(pi.fecha || pi.createdAt || '').split('T')[0]}</span> },
          { key: 'requerido', header: 'Requerido', render: pi => <span className="text-white/50 whitespace-nowrap">{pi.fechaRequerida?.split('T')[0] || '—'}</span> },
          { key: 'estado',    header: 'Estado', render: pi => <Badge estado={pi.estado}/> },
          { key: 'prioridad', header: 'Prioridad', render: pi => <Badge prioridad={pi.prioridad}/> },
          { key: 'acciones',  header: 'Acciones', stopPropagation: true, render: pi => (
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
            ) },
        ]}
        />
      </div>

      {/* Guía de uso */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Pedidos Internos?
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
