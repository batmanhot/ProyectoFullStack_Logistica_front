/**
 * TrazabilidadPedidos.jsx — Trazabilidad de Pedidos y OC
 *
 * Vista unificada para consultar el estado y recorrido de:
 *   1. Pedidos de Clientes (portal + despachos)
 *   2. Órdenes de Compra (OC a proveedores)
 *
 * Cada registro muestra su línea de tiempo visual con los
 * estados por los que ha pasado y en cuál se encuentra ahora.
 */
import { useState, useMemo } from 'react'
import { Search, Package, Truck, ShoppingCart, CheckCircle,
         Clock, XCircle, ChevronDown, ChevronUp,
         FileText, Building2, Users, X, ClipboardList } from 'lucide-react'
import { formatDate, formatCurrency } from '../utils/helpers'
import { Badge, Input, Select, LineaTiempo } from '../components/ui/index'
import { useApp } from '../store/AppContext'
import { useDespachosList } from '../queries/despachos.queries'
import { useRutasList } from '../queries/rutas.queries'
import { useOrdenesCompraList } from '../queries/ordenes-compra.queries'
import { useClientesList } from '../queries/clientes.queries'
import { useProveedoresList } from '../queries/proveedores.queries'
import { useProductosList } from '../queries/productos.queries'
import { useAlmacenesList } from '../queries/almacenes.queries'
import { useAreasInternasList } from '../queries/areas-internas.queries'
import { usePedidosInternosList } from '../queries/pedidos-internos.queries'

// ── Flujo de estados ──────────────────────────────────
const FLUJO_DESPACHO = [
  { id:'PEDIDO',    label:'Pedido',     desc:'Pedido recibido del cliente',         color:'#3b82f6', icon:'📋' },
  { id:'APROBADO',  label:'Aprobado',   desc:'Aprobado — listo para preparar',      color:'#8b5cf6', icon:'✅' },
  { id:'PICKING',   label:'Picking',    desc:'En preparación en almacén',           color:'#f59e0b', icon:'📦' },
  { id:'LISTO',     label:'Listo',      desc:'Empacado y listo para despachar',     color:'#a78bfa', icon:'🚀' },
  { id:'DESPACHADO',label:'Despachado', desc:'En camino al cliente',                color:'#22c55e', icon:'🚚' },
  { id:'ENTREGADO', label:'Entregado',  desc:'Entregado y confirmado',              color:'#00c896', icon:'✔️' },
]
const FLUJO_CANCELADO = [{ id:'CANCELADO', label:'Anulado', color:'#ef4444', icon:'❌' }]

const FLUJO_OC = [
  { id:'PENDIENTE', label:'Pendiente',  desc:'OC creada — pendiente de aprobación', color:'#f59e0b', icon:'📋' },
  { id:'APROBADA',  label:'Aprobada',   desc:'OC aprobada — enviada al proveedor',  color:'#3b82f6', icon:'✅' },
  { id:'PARCIAL',   label:'Parcial',    desc:'Recepción parcial de mercadería',     color:'#8b5cf6', icon:'📦' },
  { id:'RECIBIDA',  label:'Recibida',   desc:'Mercadería completa recibida',        color:'#22c55e', icon:'✔️' },
]
const FLUJO_OC_CANCEL = [{ id:'CANCELADA', label:'Cancelada', color:'#ef4444', icon:'❌' }]

const FLUJO_PEDIDO_INTERNO = [
  { id:'BORRADOR',  label:'Borrador',  desc:'Solicitud en preparación',        color:'#64748b', icon:'📝' },
  { id:'ENVIADO',   label:'Enviado',   desc:'Enviado — pendiente de revisión', color:'#3b82f6', icon:'📤' },
  { id:'APROBADO',  label:'Aprobado',  desc:'Aprobado — listo para preparar',  color:'#00c896', icon:'✅' },
  { id:'PICKING',   label:'Picking',   desc:'En preparación en almacén',       color:'#f59e0b', icon:'📦' },
  { id:'ENTREGADO', label:'Entregado', desc:'Entregado al área solicitante',   color:'#10b981', icon:'✔️' },
]
const FLUJO_PI_RECHAZADO = [{ id:'RECHAZADO', label:'Rechazado', color:'#ef4444', icon:'❌' }]

// ── Card de Despacho / Pedido Cliente ─────────────────
function CardDespacho({ des, clientes, almacenes=[], productos, simboloMoneda, rutaInfo }) {
  const [open, setOpen] = useState(false)
  // Respaldo al cliente ya embebido en el despacho — necesario para el rol Chofer,
  // que no tiene permiso 'clientes' y por eso no recibe la lista completa (ver
  // TrazabilidadPedidos()). Mismo patrón ya usado en ModalDetalleRuta.jsx.
  const cli = clientes.find(c => c.id === des.clienteId) || des.cliente
  const cancelado = des.estado === 'CANCELADO'
  const entregado = des.estado === 'ENTREGADO'
  const estadoMeta = FLUJO_DESPACHO.find(f=>f.id===des.estado) ||
    (cancelado ? FLUJO_CANCELADO[0] : null)

  return (
    <div className="bg-[#1a2230] border border-white/8 rounded-xl overflow-hidden hover:border-white/14 transition-all">
      {/* Cabecera */}
      <div className="px-5 py-3.5 flex items-center gap-4 cursor-pointer" onClick={()=>setOpen(!open)}>
        {/* Ícono estado */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px] shrink-0"
          style={{ background:`${estadoMeta?.color || '#5f6f80'}18` }}>
          {estadoMeta?.icon || '📋'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[13px] font-bold text-[#00c896]">{des.numero}</span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{background:`${estadoMeta?.color||'#5f6f80'}18`, color:estadoMeta?.color||'#5f6f80'}}>
              {estadoMeta?.label||des.estado}
            </div>
            {des.origenPortal && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 uppercase tracking-wide">Portal</span>
            )}
            {entregado && <span className="text-[10px] text-green-400">✓ Completado</span>}
            {cancelado && <span className="text-[10px] text-red-400">✗ Anulado</span>}
          </div>
          <div className="text-[12px] text-[#9ba8b6] mt-0.5 flex items-center gap-2">
            <Users size={10} className="text-[#5f6f80]"/>
            <span>{cli?.razonSocial || '—'}</span>
            <span className="text-[#5f6f80]">·</span>
            <span>{formatDate(des.fecha || des.createdAt)}</span>
            {des.fechaEntrega && (
              <><span className="text-[#5f6f80]">→</span>
              <span>Entrega: {formatDate(des.fechaEntrega)}</span></>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono font-bold text-[14px] text-[#e8edf2]">{formatCurrency(des.total||0,simboloMoneda)}</div>
          <div className="text-[10px] text-[#5f6f80]">{des.items?.length||0} ítems</div>
        </div>
        {open ? <ChevronUp size={14} className="text-white/30 shrink-0"/> : <ChevronDown size={14} className="text-white/30 shrink-0"/>}
      </div>

      {/* Detalle expandido */}
      {open && (
        <div className="px-5 pb-4 border-t border-white/6">
          {/* Línea de tiempo */}
          <LineaTiempo flujo={FLUJO_DESPACHO} flujoCancelado={FLUJO_CANCELADO} estadoActual={des.estado} cancelado={cancelado}/>

          {/* Datos clave */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 mb-3">
            {[
              { k:'Almacén',         v: almacenes.find(a=>a.id===des.almacenId)?.nombre || des.almacenId||'—' },
              { k:'Transportista',   v: rutaInfo?.ruta?.transportista?.nombre || des.transportista?.nombre || 'Por asignar' },
              { k:'Ruta',            v: rutaInfo ? `${rutaInfo.ruta.numero} — ${rutaInfo.parada.estado}` : 'Sin ruta asignada' },
              { k:'Guía de remisión',v: des.guiaNumero||'—'         },
              { k:'Dirección entrega',v:des.direccionEntrega?.slice(0,30)||'—' },
            ].map(({k,v})=>(
              <div key={k} className="bg-[#161d28] rounded-lg px-3 py-2">
                <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">{k}</div>
                <div className="text-[12px] text-[#e8edf2] truncate">{v}</div>
              </div>
            ))}
          </div>

          {/* Ítems */}
          {(des.items||[]).length > 0 && (
            <div className="rounded-xl border border-white/6 overflow-hidden">
              <div className="bg-[#161d28] px-3.5 py-2 text-[10px] font-bold text-[#5f6f80] uppercase tracking-wide">
                Productos
              </div>
              {des.items.map((it,i)=>{
                const prod = productos.find(p=>p.id===it.productoId) || it.producto
                return (
                  <div key={i} className="flex items-center justify-between px-3.5 py-2 border-t border-white/4">
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-[#e8edf2]">{prod?.nombre||it.descripcion||it.productoId}</div>
                      <div className="text-[10px] text-[#5f6f80] font-mono">{prod?.sku||''}</div>
                    </div>
                    <div className="text-[12px] text-white/50 mx-3">{it.cantidad} {prod?.unidadMedida||'unid.'}</div>
                    <div className="font-mono text-[12px] text-[#00c896]">{formatCurrency(it.subtotal||it.cantidad*(it.precioVenta||0),simboloMoneda)}</div>
                  </div>
                )
              })}
            </div>
          )}
          {des.observaciones && (
            <div className="mt-2 text-[11px] text-[#5f6f80] italic">Obs: {des.observaciones}</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Card de OC ────────────────────────────────────────
function CardOC({ oc, proveedores, productos, simboloMoneda }) {
  const [open, setOpen] = useState(false)
  const prov     = proveedores.find(p=>p.id===oc.proveedorId)
  const cancelado = oc.estado === 'CANCELADA'
  const flujoEst  = FLUJO_OC.find(f=>f.id===oc.estado) || (cancelado ? FLUJO_OC_CANCEL[0] : null)

  return (
    <div className="bg-[#1a2230] border border-white/8 rounded-xl overflow-hidden hover:border-white/14 transition-all">
      <div className="px-5 py-3.5 flex items-center gap-4 cursor-pointer" onClick={()=>setOpen(!open)}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px] shrink-0"
          style={{ background:`${flujoEst?.color||'#5f6f80'}18` }}>
          {flujoEst?.icon||'📋'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[13px] font-bold text-[#3b82f6]">{oc.numero}</span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{background:`${flujoEst?.color||'#5f6f80'}18`, color:flujoEst?.color||'#5f6f80'}}>
              {flujoEst?.label||oc.estado}
            </div>
            {oc.estado==='RECIBIDA' && <span className="text-[10px] text-green-400">✓ Completada</span>}
            {cancelado && <span className="text-[10px] text-red-400">✗ Cancelada</span>}
          </div>
          <div className="text-[12px] text-[#9ba8b6] mt-0.5 flex items-center gap-2">
            <Building2 size={10} className="text-[#5f6f80]"/>
            <span>{prov?.razonSocial||'—'}</span>
            <span className="text-[#5f6f80]">·</span>
            <span>{formatDate(oc.fecha || oc.createdAt)}</span>
            {oc.fechaEntrega && (
              <><span className="text-[#5f6f80]">→</span>
              <span>Esperada: {formatDate(oc.fechaEntrega)}</span></>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono font-bold text-[14px] text-[#e8edf2]">{formatCurrency(oc.total||0,simboloMoneda)}</div>
          <div className="text-[10px] text-[#5f6f80]">{oc.items?.length||0} ítems</div>
        </div>
        {open ? <ChevronUp size={14} className="text-white/30 shrink-0"/> : <ChevronDown size={14} className="text-white/30 shrink-0"/>}
      </div>

      {open && (
        <div className="px-5 pb-4 border-t border-white/6">
          <LineaTiempo flujo={FLUJO_OC} flujoCancelado={FLUJO_OC_CANCEL} estadoActual={oc.estado} cancelado={cancelado}/>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-4 mb-3">
            {[
              { k:'Proveedor',    v: prov?.razonSocial||'—' },
              { k:'RUC',          v: prov?.ruc||'—'         },
              { k:'Notas',        v: oc.notas||'—'          },
            ].map(({k,v})=>(
              <div key={k} className="bg-[#161d28] rounded-lg px-3 py-2">
                <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">{k}</div>
                <div className="text-[12px] text-[#e8edf2] truncate">{v}</div>
              </div>
            ))}
          </div>

          {(oc.items||[]).length > 0 && (
            <div className="rounded-xl border border-white/6 overflow-hidden">
              <div className="bg-[#161d28] px-3.5 py-2 text-[10px] font-bold text-[#5f6f80] uppercase tracking-wide">
                Productos ordenados
              </div>
              {oc.items.map((it,i)=>{
                const prod = productos.find(p=>p.id===it.productoId)
                const recibido = it.cantidadRecibida || 0
                const pct = it.cantidad > 0 ? Math.min(100,(recibido/it.cantidad)*100) : 0
                return (
                  <div key={i} className="px-3.5 py-2.5 border-t border-white/4">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <div className="text-[12px] text-[#e8edf2]">{prod?.nombre||it.productoId}</div>
                        <div className="text-[10px] text-[#5f6f80] font-mono">{prod?.sku||''}</div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <div className="text-[12px] text-white/60">{recibido}/{it.cantidad} {prod?.unidadMedida||'unid.'}</div>
                        <div className="font-mono text-[12px] text-[#3b82f6]">{formatCurrency(it.subtotal||it.cantidad*(it.costoUnitario||0),simboloMoneda)}</div>
                      </div>
                    </div>
                    {/* Barra de recepción */}
                    <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{width:`${pct}%`, background: pct===100?'#22c55e':pct>0?'#f59e0b':'#3d4f60'}}/>
                    </div>
                    <div className="text-[9px] text-white/30 mt-0.5">{pct.toFixed(0)}% recibido</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Card de Pedido Interno ─────────────────────────────
const PRIORIDAD_PI = {
  NORMAL:  { label:'Normal',  color:'#64748b' },
  URGENTE: { label:'Urgente', color:'#f59e0b' },
  CRITICO: { label:'Crítico', color:'#ef4444' },
}

function CardPedidoInterno({ pi, areas, almacenes, productos }) {
  const [open, setOpen] = useState(false)
  const area      = areas.find(a => a.id === pi.areaId)
  const almacen   = almacenes.find(a => a.id === pi.almacenId)
  const cancelado = pi.estado === 'RECHAZADO'
  const entregado = pi.estado === 'ENTREGADO'
  const estadoMeta = FLUJO_PEDIDO_INTERNO.find(f=>f.id===pi.estado) ||
    (cancelado ? FLUJO_PI_RECHAZADO[0] : null)
  const prioridad = PRIORIDAD_PI[pi.prioridad] || PRIORIDAD_PI.NORMAL

  return (
    <div className="bg-[#1a2230] border border-white/8 rounded-xl overflow-hidden hover:border-white/14 transition-all">
      <div className="px-5 py-3.5 flex items-center gap-4 cursor-pointer" onClick={()=>setOpen(!open)}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px] shrink-0"
          style={{ background:`${estadoMeta?.color || '#5f6f80'}18` }}>
          {estadoMeta?.icon || '📋'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[13px] font-bold text-amber-400">{pi.numero}</span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{background:`${estadoMeta?.color||'#5f6f80'}18`, color:estadoMeta?.color||'#5f6f80'}}>
              {estadoMeta?.label||pi.estado}
            </div>
            {pi.prioridad && pi.prioridad !== 'NORMAL' && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{background:`${prioridad.color}18`, color:prioridad.color}}>
                {prioridad.label}
              </div>
            )}
            {entregado && <span className="text-[10px] text-green-400">✓ Completado</span>}
            {cancelado && <span className="text-[10px] text-red-400">✗ Rechazado</span>}
          </div>
          <div className="text-[12px] text-[#9ba8b6] mt-0.5 flex items-center gap-2">
            <Building2 size={10} className="text-[#5f6f80]"/>
            <span>{area?.nombre || '—'}</span>
            <span className="text-[#5f6f80]">·</span>
            <span>{formatDate(pi.fecha || pi.createdAt)}</span>
            {pi.fechaRequerida && (
              <><span className="text-[#5f6f80]">→</span>
              <span>Requerida: {formatDate(pi.fechaRequerida)}</span></>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[12px] text-[#5f6f80]">{pi.items?.length||0} ítems</div>
        </div>
        {open ? <ChevronUp size={14} className="text-white/30 shrink-0"/> : <ChevronDown size={14} className="text-white/30 shrink-0"/>}
      </div>

      {open && (
        <div className="px-5 pb-4 border-t border-white/6">
          <LineaTiempo flujo={FLUJO_PEDIDO_INTERNO} flujoCancelado={FLUJO_PI_RECHAZADO} estadoActual={pi.estado} cancelado={cancelado}/>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 mb-3">
            {[
              { k:'Área solicitante', v: area?.nombre || '—' },
              { k:'Almacén destino',  v: almacen?.nombre || '—' },
              { k:'Fecha requerida',  v: pi.fechaRequerida ? formatDate(pi.fechaRequerida) : '—' },
              { k:'Fecha entrega',    v: pi.fechaEntrega ? formatDate(pi.fechaEntrega) : '—' },
            ].map(({k,v})=>(
              <div key={k} className="bg-[#161d28] rounded-lg px-3 py-2">
                <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">{k}</div>
                <div className="text-[12px] text-[#e8edf2] truncate">{v}</div>
              </div>
            ))}
          </div>

          {(pi.items||[]).length > 0 && (
            <div className="rounded-xl border border-white/6 overflow-hidden">
              <div className="bg-[#161d28] px-3.5 py-2 text-[10px] font-bold text-[#5f6f80] uppercase tracking-wide">
                Productos
              </div>
              {pi.items.map((it,i)=>{
                const prod = productos.find(p=>p.id===it.productoId)
                return (
                  <div key={i} className="flex items-center justify-between px-3.5 py-2 border-t border-white/4">
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-[#e8edf2]">{prod?.nombre||it.productoId}</div>
                      <div className="text-[10px] text-[#5f6f80] font-mono">{prod?.sku||''}</div>
                    </div>
                    <div className="text-[12px] text-white/50 mx-3">{it.cantidad} {it.unidadMedida||prod?.unidadMedida||'unid.'}</div>
                  </div>
                )
              })}
            </div>
          )}
          {pi.motivoRechazo && (
            <div className="mt-2 text-[11px] text-red-400 italic">Motivo de rechazo: {pi.motivoRechazo}</div>
          )}
          {pi.notasAprobacion && (
            <div className="mt-2 text-[11px] text-[#5f6f80] italic">Notas: {pi.notasAprobacion}</div>
          )}
          {pi.notasSolicitud && (
            <div className="mt-2 text-[11px] text-[#5f6f80] italic">Obs: {pi.notasSolicitud}</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────
export default function TrazabilidadPedidos() {
  const { sesion } = useApp()
  // El Chofer no tiene permiso a clientes/proveedores/inventario/OC/pedidos-internos
  // (esas 5 consultas le devuelven 403) — para su rol solo tiene sentido la pestaña
  // "Pedidos de Clientes", con cliente/producto tomados del despacho embebido en vez
  // de estas listas (ver CardDespacho más abajo).
  const esChofer = sesion?.rol?.codigo === 'chofer'

  const { data: despachos  = [] } = useDespachosList()
  const { data: rutas      = [] } = useRutasList()
  const { data: ordenes    = [] } = useOrdenesCompraList({ enabled: !esChofer })
  const { data: clientes   = [] } = useClientesList({ incluirInactivos: true, enabled: !esChofer })
  const { data: proveedores= [] } = useProveedoresList({ incluirInactivos: true, enabled: !esChofer })
  const { data: productos  = [] } = useProductosList({ enabled: !esChofer })
  const { data: almacenes  = [] } = useAlmacenesList()
  const { data: pedidosInternos = [] } = usePedidosInternosList({ enabled: !esChofer })
  const { data: areasInternas   = [] } = useAreasInternasList({ incluirInactivas: true, enabled: !esChofer })
  const simboloMoneda = 'S/'

  // Conecta Despacho→Ruta — RutasService.findAll ya incluye paradas.despacho y
  // transportista.nombre, así que no hace falta tocar el backend.
  const rutaPorDespacho = useMemo(() => {
    const map = new Map()
    rutas.forEach(r => (r.paradas || []).forEach(p => map.set(p.despachoId, { ruta: r, parada: p })))
    return map
  }, [rutas])

  const [tipoUsuario, setTipoUsuario] = useState('clientes') // clientes | oc | internos
  const tipo = esChofer ? 'clientes' : tipoUsuario // Chofer solo tiene la pestaña de clientes
  const setTipo = setTipoUsuario
  const [busqueda, setBusqueda] = useState('')
  const [filtEst,  setFiltEst]  = useState('')

  const ESTADOS_DES = ['PEDIDO','APROBADO','PICKING','LISTO','DESPACHADO','ENTREGADO','CANCELADO']
  const ESTADOS_OC  = ['PENDIENTE','APROBADA','PARCIAL','RECIBIDA','CANCELADA']
  const ESTADOS_PI  = ['BORRADOR','ENVIADO','APROBADO','PICKING','ENTREGADO','RECHAZADO']

  // Pedidos de clientes — despachos
  const pedidosFiltrados = useMemo(() => {
    let d = [...despachos].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))
    if (filtEst)  d = d.filter(x => x.estado === filtEst)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(x => {
        const cli = clientes.find(c=>c.id===x.clienteId)
        return x.numero?.toLowerCase().includes(q) || cli?.razonSocial?.toLowerCase().includes(q)
      })
    }
    return d
  }, [despachos, clientes, filtEst, busqueda])

  // OC a proveedores
  const ocFiltradas = useMemo(() => {
    let d = [...ordenes].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))
    if (filtEst)  d = d.filter(x => x.estado === filtEst)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(x => {
        const prov = proveedores.find(p=>p.id===x.proveedorId)
        return x.numero?.toLowerCase().includes(q) || prov?.razonSocial?.toLowerCase().includes(q)
      })
    }
    return d
  }, [ordenes, proveedores, filtEst, busqueda])

  // Pedidos internos
  const pedidosInternosFiltrados = useMemo(() => {
    let d = [...pedidosInternos].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))
    if (filtEst)  d = d.filter(x => x.estado === filtEst)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(x => {
        const area = areasInternas.find(a=>a.id===x.areaId)
        return x.numero?.toLowerCase().includes(q) || area?.nombre?.toLowerCase().includes(q)
      })
    }
    return d
  }, [pedidosInternos, areasInternas, filtEst, busqueda])

  // KPIs
  const kpisClientes = useMemo(() => ({
    total:     despachos.length,
    activos:   despachos.filter(d=>['PEDIDO','APROBADO','PICKING','LISTO'].includes(d.estado)).length,
    despachados: despachos.filter(d=>d.estado==='DESPACHADO').length,
    entregados:despachos.filter(d=>d.estado==='ENTREGADO').length,
  }), [despachos])

  const kpisOC = useMemo(() => ({
    total:     ordenes.length,
    pendientes:ordenes.filter(o=>o.estado==='PENDIENTE').length,
    aprobadas: ordenes.filter(o=>o.estado==='APROBADA').length,
    recibidas: ordenes.filter(o=>o.estado==='RECIBIDA').length,
  }), [ordenes])

  const kpisInternos = useMemo(() => ({
    total:      pedidosInternos.length,
    pendientes: pedidosInternos.filter(p=>['ENVIADO','APROBADO','PICKING'].includes(p.estado)).length,
    entregados: pedidosInternos.filter(p=>p.estado==='ENTREGADO').length,
    rechazados: pedidosInternos.filter(p=>p.estado==='RECHAZADO').length,
  }), [pedidosInternos])

  const estados = tipo === 'clientes' ? ESTADOS_DES : tipo === 'oc' ? ESTADOS_OC : ESTADOS_PI
  const registros = tipo === 'clientes' ? pedidosFiltrados.length : tipo === 'oc' ? ocFiltradas.length : pedidosInternosFiltrados.length

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* Selector de tipo — el Chofer solo tiene Pedidos de Clientes, no hace falta elegir */}
      {esChofer ? (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-[#00c896]/15 text-[#00c896] border-[#00c896]/30 text-[13px] font-semibold w-fit">
          <Truck size={15}/> Pedidos de Clientes
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-white/10">{kpisClientes.total}</span>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={()=>{setTipo('clientes');setFiltEst('');setBusqueda('')}}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-semibold transition-all ${
              tipo==='clientes'
                ? 'bg-[#00c896]/15 text-[#00c896] border-[#00c896]/30'
                : 'bg-[#1a2230] text-[#9ba8b6] border-white/8 hover:text-[#e8edf2]'}`}>
            <Truck size={15}/> Pedidos de Clientes
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-white/10">{kpisClientes.total}</span>
          </button>
          <button onClick={()=>{setTipo('oc');setFiltEst('');setBusqueda('')}}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-semibold transition-all ${
              tipo==='oc'
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                : 'bg-[#1a2230] text-[#9ba8b6] border-white/8 hover:text-[#e8edf2]'}`}>
            <ShoppingCart size={15}/> Órdenes de Compra
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-white/10">{kpisOC.total}</span>
          </button>
          <button onClick={()=>{setTipo('internos');setFiltEst('');setBusqueda('')}}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-semibold transition-all ${
              tipo==='internos'
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-[#1a2230] text-[#9ba8b6] border-white/8 hover:text-[#e8edf2]'}`}>
            <ClipboardList size={15}/> Pedidos Internos
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-white/10">{kpisInternos.total}</span>
          </button>
        </div>
      )}

      {/* KPIs */}
      {tipo === 'clientes' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { l:'Total pedidos',   v:kpisClientes.total,       c:'#5f6f80' },
            { l:'En proceso',      v:kpisClientes.activos,     c:'#f59e0b' },
            { l:'Despachados',     v:kpisClientes.despachados, c:'#22c55e' },
            { l:'Entregados',      v:kpisClientes.entregados,  c:'#00c896' },
          ].map(({l,v,c})=>(
            <div key={l} className="relative bg-[#161d28] border border-white/8 rounded-xl px-4 py-3 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{background:c}}/>
              <div className="text-[28px] font-semibold" style={{color:c}}>{v}</div>
              <div className="text-[11px] text-[#5f6f80] mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      ) : tipo === 'oc' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { l:'Total OC',        v:kpisOC.total,      c:'#5f6f80' },
            { l:'Pendientes',      v:kpisOC.pendientes, c:'#f59e0b' },
            { l:'Aprobadas',       v:kpisOC.aprobadas,  c:'#3b82f6' },
            { l:'Recibidas',       v:kpisOC.recibidas,  c:'#22c55e' },
          ].map(({l,v,c})=>(
            <div key={l} className="relative bg-[#161d28] border border-white/8 rounded-xl px-4 py-3 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{background:c}}/>
              <div className="text-[28px] font-semibold" style={{color:c}}>{v}</div>
              <div className="text-[11px] text-[#5f6f80] mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { l:'Total pedidos',   v:kpisInternos.total,      c:'#5f6f80' },
            { l:'Pendientes',      v:kpisInternos.pendientes, c:'#f59e0b' },
            { l:'Entregados',      v:kpisInternos.entregados, c:'#10b981' },
            { l:'Rechazados',      v:kpisInternos.rechazados, c:'#ef4444' },
          ].map(({l,v,c})=>(
            <div key={l} className="relative bg-[#161d28] border border-white/8 rounded-xl px-4 py-3 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{background:c}}/>
              <div className="text-[28px] font-semibold" style={{color:c}}>{v}</div>
              <div className="text-[11px] text-[#5f6f80] mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
          <Input className="pl-8"
            placeholder={tipo==='clientes' ? 'Buscar N° despacho o cliente...' : tipo==='oc' ? 'Buscar N° OC o proveedor...' : 'Buscar N° pedido o área...'}
            value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
        </div>
        <Select className="w-auto!" style={{minWidth:155}} value={filtEst} onChange={e=>setFiltEst(e.target.value)}>
          <option value="">Todos los estados</option>
          {estados.map(e=><option key={e} value={e}>{e}</option>)}
        </Select>
        <span className="text-[11px] text-[#5f6f80] whitespace-nowrap">{registros} resultados</span>
        {(busqueda||filtEst) && (
          <button onClick={()=>{setBusqueda('');setFiltEst('')}}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-[#5f6f80] hover:text-red-400 border border-white/8 transition-all">
            <X size={11}/> Limpiar
          </button>
        )}
      </div>

      {/* Lista de registros */}
      <div className="flex flex-col gap-3">
        {tipo === 'clientes' && (
          pedidosFiltrados.length === 0
            ? <div className="text-center py-12 text-[#5f6f80] text-[13px]">
                <Truck size={36} className="mx-auto mb-3 opacity-20"/>
                No hay pedidos que coincidan con los filtros
              </div>
            : pedidosFiltrados.map(des=>(
                <CardDespacho key={des.id} des={des} clientes={clientes}
                  almacenes={almacenes} productos={productos} simboloMoneda={simboloMoneda}
                  rutaInfo={rutaPorDespacho.get(des.id)}/>
              ))
        )}
        {tipo === 'oc' && (
          ocFiltradas.length === 0
            ? <div className="text-center py-12 text-[#5f6f80] text-[13px]">
                <ShoppingCart size={36} className="mx-auto mb-3 opacity-20"/>
                No hay órdenes de compra que coincidan con los filtros
              </div>
            : ocFiltradas.map(oc=>(
                <CardOC key={oc.id} oc={oc} proveedores={proveedores}
                  productos={productos} simboloMoneda={simboloMoneda}/>
              ))
        )}
        {tipo === 'internos' && (
          pedidosInternosFiltrados.length === 0
            ? <div className="text-center py-12 text-[#5f6f80] text-[13px]">
                <ClipboardList size={36} className="mx-auto mb-3 opacity-20"/>
                No hay pedidos internos que coincidan con los filtros
              </div>
            : pedidosInternosFiltrados.map(pi=>(
                <CardPedidoInterno key={pi.id} pi={pi} areas={areasInternas}
                  almacenes={almacenes} productos={productos}/>
              ))
        )}
      </div>

      {/* Guía de uso */}
      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Trazabilidad de Pedidos?
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { t:'Pedidos de Clientes', d:'Sigue el recorrido de un despacho desde Pedido hasta Entregado — 6 estados, incluyendo los que llegan del Portal de Pedidos.' },
            !esChofer && { t:'Órdenes de Compra', d:'Sigue una OC a proveedor desde Pendiente hasta Recibida, con la barra de recepción por producto para ver qué falta llegar.' },
            !esChofer && { t:'Pedidos Internos', d:'Sigue una solicitud entre áreas desde Borrador hasta Entregado al área solicitante, con prioridad y motivo de rechazo si aplica.' },
            { t:'Línea de tiempo', d:'Cada tarjeta expandible muestra el flujo completo de estados: los pasados en verde/color, el actual resaltado, los pendientes en gris.' },
            { t:'Filtros', d: esChofer ? 'Busca por número de despacho o cliente, o filtra por un estado específico.' : 'Busca por número de documento, cliente/proveedor/área, o filtra por un estado específico dentro de cada uno de los 3 flujos.' },
          ].filter(Boolean).map(({t,d}) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[12px] font-semibold text-[#e8edf2] mb-1">{t}</div>
              <div className="text-[11px] text-[#9ba8b6] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
