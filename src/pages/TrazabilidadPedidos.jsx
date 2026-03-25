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
         Clock, XCircle, ChevronDown, ChevronUp, ArrowRight,
         FileText, Building2, Users, X } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatDate, formatCurrency } from '../utils/helpers'
import { Badge } from '../components/ui/index'

const SI = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'

// ── Flujo de estados ──────────────────────────────────
const FLUJO_DESPACHO = [
  { id:'PEDIDO',    label:'Pedido',     desc:'Pedido recibido del cliente',         color:'#3b82f6', icon:'📋' },
  { id:'APROBADO',  label:'Aprobado',   desc:'Aprobado — listo para preparar',      color:'#8b5cf6', icon:'✅' },
  { id:'PICKING',   label:'Picking',    desc:'En preparación en almacén',           color:'#f59e0b', icon:'📦' },
  { id:'LISTO',     label:'Listo',      desc:'Empacado y listo para despachar',     color:'#a78bfa', icon:'🚀' },
  { id:'DESPACHADO',label:'Despachado', desc:'En camino al cliente',                color:'#22c55e', icon:'🚚' },
  { id:'ENTREGADO', label:'Entregado',  desc:'Entregado y confirmado',              color:'#00c896', icon:'✔️' },
]
const FLUJO_CANCELADO = [{ id:'ANULADO', label:'Anulado', color:'#ef4444', icon:'❌' }]

const FLUJO_OC = [
  { id:'PENDIENTE', label:'Pendiente',  desc:'OC creada — pendiente de aprobación', color:'#f59e0b', icon:'📋' },
  { id:'APROBADA',  label:'Aprobada',   desc:'OC aprobada — enviada al proveedor',  color:'#3b82f6', icon:'✅' },
  { id:'PARCIAL',   label:'Parcial',    desc:'Recepción parcial de mercadería',     color:'#8b5cf6', icon:'📦' },
  { id:'RECIBIDA',  label:'Recibida',   desc:'Mercadería completa recibida',        color:'#22c55e', icon:'✔️' },
]
const FLUJO_OC_CANCEL = [{ id:'CANCELADA', label:'Cancelada', color:'#ef4444', icon:'❌' }]

// ── Componente: línea de tiempo ───────────────────────
function LineaTiempo({ flujo, estadoActual, cancelado }) {
  const flujoEfectivo = cancelado
    ? [...flujo, ...(flujo === FLUJO_DESPACHO ? FLUJO_CANCELADO : FLUJO_OC_CANCEL)]
    : flujo

  const idxActual = flujoEfectivo.findIndex(s => s.id === estadoActual)

  return (
    <div className="flex items-start gap-0 mt-4 mb-1 overflow-x-auto pb-1">
      {flujoEfectivo.map((paso, i) => {
        const done    = i < idxActual
        const current = i === idxActual
        const esCancelado = paso.id === 'ANULADO' || paso.id === 'CANCELADA'
        const color   = current ? paso.color : done ? paso.color : '#3d4f60'

        return (
          <div key={paso.id} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1 min-w-[64px]">
              {/* Círculo */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] transition-all relative
                ${current ? 'shadow-lg' : ''}`}
                style={{
                  background: current ? `${paso.color}25` : done ? `${paso.color}15` : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${current ? paso.color : done ? `${paso.color}60` : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: current ? `0 0 12px ${paso.color}50` : 'none',
                }}>
                <span className={`${!done && !current ? 'opacity-30' : ''} text-[13px]`}>
                  {done ? '✓' : paso.icon}
                </span>
                {current && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0e1117]"
                    style={{background: paso.color}}/>
                )}
              </div>
              {/* Etiqueta */}
              <div className={`text-[10px] font-semibold mt-1.5 text-center leading-tight ${
                current ? 'text-white' : done ? '' : 'text-white/20'
              }`}
                style={{ color: current || done ? color : undefined }}>
                {paso.label}
              </div>
              {current && paso.desc && (
                <div className="text-[9px] text-white/40 text-center mt-0.5 max-w-[72px] leading-tight">{paso.desc}</div>
              )}
            </div>
            {/* Línea conectora */}
            {i < flujoEfectivo.length - 1 && (
              <div className="h-[2px] flex-1 mx-0.5 rounded transition-all" style={{
                background: done ? `linear-gradient(90deg, ${paso.color}60, ${flujoEfectivo[i+1].color}40)` : 'rgba(255,255,255,0.06)',
                minWidth: 16,
              }}/>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Card de Despacho / Pedido Cliente ─────────────────
function CardDespacho({ des, clientes, almacenes=[], productos, simboloMoneda }) {
  const [open, setOpen] = useState(false)
  const cli     = clientes.find(c => c.id === des.clienteId)
  const cancelado = des.estado === 'ANULADO'
  const entregado = des.estado === 'ENTREGADO'
  const estadoMeta = FLUJO_DESPACHO.find(f=>f.id===des.estado) ||
    (cancelado ? FLUJO_CANCELADO[0] : null)

  return (
    <div className="bg-[#1a2230] border border-white/[0.08] rounded-xl overflow-hidden hover:border-white/[0.14] transition-all">
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
            <span>{formatDate(des.fecha)}</span>
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
        <div className="px-5 pb-4 border-t border-white/[0.06]">
          {/* Línea de tiempo */}
          <LineaTiempo flujo={FLUJO_DESPACHO} estadoActual={des.estado} cancelado={cancelado}/>

          {/* Datos clave */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 mb-3">
            {[
              { k:'Almacén',         v: almacenes.find(a=>a.id===des.almacenId)?.nombre || des.almacenId||'—' },
              { k:'Transportista',   v: des.transportista||'Por asignar' },
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
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              <div className="bg-[#161d28] px-3.5 py-2 text-[10px] font-bold text-[#5f6f80] uppercase tracking-wide">
                Productos
              </div>
              {des.items.map((it,i)=>{
                const prod = productos.find(p=>p.id===it.productoId)
                return (
                  <div key={i} className="flex items-center justify-between px-3.5 py-2 border-t border-white/[0.04]">
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
    <div className="bg-[#1a2230] border border-white/[0.08] rounded-xl overflow-hidden hover:border-white/[0.14] transition-all">
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
            <span>{formatDate(oc.fecha)}</span>
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
        <div className="px-5 pb-4 border-t border-white/[0.06]">
          <LineaTiempo flujo={FLUJO_OC} estadoActual={oc.estado} cancelado={cancelado}/>

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
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              <div className="bg-[#161d28] px-3.5 py-2 text-[10px] font-bold text-[#5f6f80] uppercase tracking-wide">
                Productos ordenados
              </div>
              {oc.items.map((it,i)=>{
                const prod = productos.find(p=>p.id===it.productoId)
                const recibido = it.cantidadRecibida || 0
                const pct = it.cantidad > 0 ? Math.min(100,(recibido/it.cantidad)*100) : 0
                return (
                  <div key={i} className="px-3.5 py-2.5 border-t border-white/[0.04]">
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
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
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

// ── Componente principal ──────────────────────────────
export default function TrazabilidadPedidos() {
  const { despachos, ordenes, clientes, proveedores, productos,
          almacenes, simboloMoneda } = useApp()

  const [tipo,     setTipo]     = useState('clientes') // clientes | oc
  const [busqueda, setBusqueda] = useState('')
  const [filtEst,  setFiltEst]  = useState('')

  const ESTADOS_DES = ['PEDIDO','APROBADO','PICKING','LISTO','DESPACHADO','ENTREGADO','ANULADO']
  const ESTADOS_OC  = ['PENDIENTE','APROBADA','PARCIAL','RECIBIDA','CANCELADA']

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

  const estados = tipo === 'clientes' ? ESTADOS_DES : ESTADOS_OC
  const registros = tipo === 'clientes' ? pedidosFiltrados.length : ocFiltradas.length

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* Header */}
      <div>
        <h2 className="text-[16px] font-bold text-[#e8edf2] flex items-center gap-2">
          <ArrowRight size={18} className="text-[#00c896]"/> Trazabilidad de Pedidos
        </h2>
        <p className="text-[12px] text-[#5f6f80] mt-0.5">
          Consulta el estado y recorrido completo de pedidos de clientes y órdenes de compra
        </p>
      </div>

      {/* Selector de tipo */}
      <div className="flex gap-2">
        <button onClick={()=>{setTipo('clientes');setFiltEst('');setBusqueda('')}}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-semibold transition-all ${
            tipo==='clientes'
              ? 'bg-[#00c896]/15 text-[#00c896] border-[#00c896]/30'
              : 'bg-[#1a2230] text-[#9ba8b6] border-white/[0.08] hover:text-[#e8edf2]'}`}>
          <Truck size={15}/> Pedidos de Clientes
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-white/10">{kpisClientes.total}</span>
        </button>
        <button onClick={()=>{setTipo('oc');setFiltEst('');setBusqueda('')}}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-semibold transition-all ${
            tipo==='oc'
              ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
              : 'bg-[#1a2230] text-[#9ba8b6] border-white/[0.08] hover:text-[#e8edf2]'}`}>
          <ShoppingCart size={15}/> Órdenes de Compra
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-white/10">{kpisOC.total}</span>
        </button>
      </div>

      {/* KPIs */}
      {tipo === 'clientes' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { l:'Total pedidos',   v:kpisClientes.total,       c:'#5f6f80' },
            { l:'En proceso',      v:kpisClientes.activos,     c:'#f59e0b' },
            { l:'Despachados',     v:kpisClientes.despachados, c:'#22c55e' },
            { l:'Entregados',      v:kpisClientes.entregados,  c:'#00c896' },
          ].map(({l,v,c})=>(
            <div key={l} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-4 py-3 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{background:c}}/>
              <div className="text-[24px] font-bold" style={{color:c}}>{v}</div>
              <div className="text-[11px] text-[#5f6f80] mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { l:'Total OC',        v:kpisOC.total,      c:'#5f6f80' },
            { l:'Pendientes',      v:kpisOC.pendientes, c:'#f59e0b' },
            { l:'Aprobadas',       v:kpisOC.aprobadas,  c:'#3b82f6' },
            { l:'Recibidas',       v:kpisOC.recibidas,  c:'#22c55e' },
          ].map(({l,v,c})=>(
            <div key={l} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-4 py-3 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{background:c}}/>
              <div className="text-[24px] font-bold" style={{color:c}}>{v}</div>
              <div className="text-[11px] text-[#5f6f80] mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
          <input className={SI+' pl-8 !py-[5px] text-[12px]'}
            placeholder={tipo==='clientes' ? 'Buscar N° despacho o cliente...' : 'Buscar N° OC o proveedor...'}
            value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
        </div>
        <select className="px-3 py-[5px] bg-[#1e2835] border border-white/[0.08] rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896]"
          style={{minWidth:155}} value={filtEst} onChange={e=>setFiltEst(e.target.value)}>
          <option value="">Todos los estados</option>
          {estados.map(e=><option key={e} value={e}>{e}</option>)}
        </select>
        <span className="text-[11px] text-[#5f6f80] whitespace-nowrap">{registros} resultados</span>
        {(busqueda||filtEst) && (
          <button onClick={()=>{setBusqueda('');setFiltEst('')}}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-[#5f6f80] hover:text-red-400 border border-white/[0.08] transition-all">
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
                  almacenes={almacenes} productos={productos} simboloMoneda={simboloMoneda}/>
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
      </div>
    </div>
  )
}
