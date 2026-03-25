/**
 * PortalPublico.jsx — Portal público del cliente
 *
 * Acceso via /portal/:token  (token = btoa(clienteId:ruc))
 * Sin login de admin. El cliente puede:
 *  1. Ver el catálogo de productos disponibles y hacer pedidos
 *  2. Ver el estado de sus despachos activos
 *  3. Consultar su historial de pedidos del portal
 *
 * Este componente es 100% independiente del layout admin de StockPro.
 * No usa el Sidebar ni el Header del sistema.
 */
import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Globe, Package, Plus, X, CheckCircle, Clock,
         Truck, ChevronDown, ChevronUp, ShoppingCart, Eye } from 'lucide-react'
import { formatCurrency, fechaHoy, generarNumDoc } from '../utils/helpers'
import * as storage from '../services/storage'

const IGV = 0.18
const KEY_PORTAL = 'sp_portal_pedidos'
function leerPortal()     { try { return JSON.parse(localStorage.getItem(KEY_PORTAL)||'[]') } catch { return [] } }
function guardarPortal(d) { localStorage.setItem(KEY_PORTAL, JSON.stringify(d)) }

const ESTADO_DES = {
  PEDIDO:    { label:'Pedido recibido', color:'#3b82f6',  icon:'📋' },
  APROBADO:  { label:'Aprobado',        color:'#00c896',  icon:'✅' },
  PICKING:   { label:'Preparando',      color:'#f59e0b',  icon:'📦' },
  LISTO:     { label:'Listo para enviar',color:'#a78bfa', icon:'🚀' },
  DESPACHADO:{ label:'Despachado',       color:'#22c55e',  icon:'🚚' },
  ENTREGADO: { label:'Entregado',        color:'#22c55e',  icon:'✔️' },
  ANULADO:   { label:'Anulado',          color:'#ef4444',  icon:'❌' },
}

// ── Step indicator ────────────────────────────────────
function StepBar({ estado }) {
  const pasos = ['PEDIDO','APROBADO','PICKING','LISTO','DESPACHADO']
  const idx   = pasos.indexOf(estado)
  return (
    <div className="flex items-center gap-0 mt-3">
      {pasos.map((p, i) => {
        const done    = i < idx
        const current = i === idx
        const meta    = ESTADO_DES[p]
        return (
          <div key={p} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all
                ${current ? 'bg-[#00c896] text-[#082e1e] shadow-lg shadow-[#00c896]/30' :
                  done    ? 'bg-[#00c896]/30 text-[#00c896]' : 'bg-white/10 text-white/30'}`}>
                {done ? '✓' : i + 1}
              </div>
              <div className={`text-[9px] mt-1 text-center leading-tight max-w-[50px] ${current ? 'text-[#00c896] font-semibold' : done ? 'text-[#5f6f80]' : 'text-white/20'}`}>
                {meta?.label?.split(' ')[0]}
              </div>
            </div>
            {i < pasos.length - 1 && (
              <div className={`h-[2px] flex-1 mx-1 rounded transition-all ${done || current ? 'bg-[#00c896]/50' : 'bg-white/10'}`}/>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function PortalPublico() {
  const { token }    = useParams()
  const navigate     = useNavigate()
  const [tab, setTab]= useState('pedido') // pedido | despachos | historial
  const [cliente,    setCliente]    = useState(null)
  const [productos,  setProductos]  = useState([])
  const [despachos,  setDespachos]  = useState([])
  const [config,     setConfig]     = useState({})
  const [items,      setItems]      = useState([])
  const [obs,        setObs]        = useState('')
  const [fechaDes,   setFechaDes]   = useState('')
  const [enviado,    setEnviado]    = useState(false)
  const [numeroPed,  setNumeroPed]  = useState('')
  const [expandedId, setExpandedId] = useState(null)

  // ── Decodificar token y cargar datos ────────────────
  useEffect(() => {
    if (!token) { navigate('/'); return }
    try {
      const decoded  = atob(token)               // "clienteId:ruc"
      const clienteId = decoded.split(':')[0]
      const todos    = storage.getClientes?.()?.data || []
      const cli      = todos.find(c => c.id === clienteId)
      if (!cli) { navigate('/'); return }
      setCliente(cli)

      const prods = storage.getProductos?.()?.data || []
      setProductos(prods.filter(p => p.activo !== false && (p.precioVenta||0) > 0))

      const des = storage.getDespachos?.()?.data || []
      setDespachos(des.filter(d => d.clienteId === clienteId))

      const cfg = storage.getConfig?.()?.data || {}
      setConfig(cfg)
    } catch {
      navigate('/')
    }
  }, [token])

  // ── Cálculos del pedido ─────────────────────────────
  const subtotal = useMemo(() =>
    items.reduce((s,i) => {
      const p = productos.find(x => x.id === i.prodId)
      return s + (i.qty * (p?.precioVenta || 0))
    }, 0)
  , [items, productos])

  const igvMonto = +(subtotal * IGV).toFixed(2)
  const total    = +(subtotal + igvMonto).toFixed(2)

  function addItem()          { setItems(p=>[...p,{prodId:'',qty:1}]) }
  function setItem(i,k,v)     { setItems(p=>p.map((x,j)=>j===i?{...x,[k]:v}:x)) }
  function removeItem(i)      { setItems(p=>p.filter((_,j)=>j!==i)) }

  function enviar() {
    if (!cliente || items.filter(i=>i.prodId&&i.qty>0).length === 0) return
    const portal = leerPortal()
    const numero  = `PPE-${String(portal.length+1).padStart(4,'0')}`
    const pedido  = {
      id:                 Math.random().toString(36).slice(2),
      numero,
      clienteId:          cliente.id,
      clienteNombre:      cliente.razonSocial,
      estado:             'NUEVO',
      items: items.filter(i=>i.prodId&&i.qty>0).map(i => {
        const p = productos.find(x=>x.id===i.prodId)
        return {
          productoId:     i.prodId,
          descripcion:    p?.nombre || '—',
          cantidad:       +i.qty,
          precioUnitario: p?.precioVenta || 0,
          subtotal:       +i.qty * (p?.precioVenta||0),
        }
      }),
      subtotal, igv: igvMonto, total,
      observaciones:      obs,
      fechaEntregaDeseada:fechaDes,
      createdAt:          new Date().toISOString(),
      origen:             'portal-publico',
    }
    guardarPortal([...portal, pedido])
    setNumeroPed(numero)
    setItems([])
    setObs('')
    setFechaDes('')
    setEnviado(true)
  }

  const misDespachos = useMemo(() =>
    despachos.filter(d => !['ANULADO'].includes(d.estado))
      .sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))
  , [despachos])

  const miHistorial = useMemo(() =>
    leerPortal().filter(p => p.clienteId === cliente?.id)
      .sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))
  , [cliente, enviado])

  const empresa = config?.empresa || 'Distribuidora Lima Norte S.A.C.'

  const SI_PUB = 'w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[13px] text-white outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 placeholder-white/30 font-[inherit]'

  if (!cliente) {
    return (
      <div className="min-h-screen bg-[#0e1117] flex items-center justify-center">
        <div className="text-white/40 text-[14px]">Cargando portal...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0e1117] flex flex-col">

      {/* ── Header portal ─────────────────────────────── */}
      <div className="bg-[#00c896] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe size={22} className="text-[#082e1e]"/>
          <div>
            <div className="font-bold text-[#082e1e] text-[15px]">Portal de Pedidos</div>
            <div className="text-[11px] text-[#082e1e]/70">{empresa}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[13px] font-bold text-[#082e1e]">{cliente.razonSocial}</div>
          <div className="text-[11px] text-[#082e1e]/60">RUC: {cliente.ruc || '—'}</div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────── */}
      <div className="bg-[#161d28] border-b border-white/[0.08] px-4">
        <div className="flex gap-0 max-w-2xl mx-auto">
          {[
            { id:'pedido',    label:'Nuevo Pedido',  icon:'🛒' },
            { id:'despachos', label:`Mis Despachos (${misDespachos.length})`, icon:'🚚' },
            { id:'historial', label:`Historial (${miHistorial.length})`,      icon:'📋' },
          ].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-all ${
                tab===t.id ? 'border-[#00c896] text-[#00c896]' : 'border-transparent text-white/40 hover:text-white/70'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido ─────────────────────────────────── */}
      <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">

        {/* ─── TAB: NUEVO PEDIDO ──────────────────────── */}
        {tab === 'pedido' && (
          <div className="bg-[#161d28] border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08]">
              <div className="text-[15px] font-bold text-white flex items-center gap-2">
                <ShoppingCart size={17} className="text-[#00c896]"/> Hacer un pedido
              </div>
              <div className="text-[12px] text-white/40 mt-0.5">
                Tu pedido llega directamente a nuestro sistema. Te confirmamos en breve.
              </div>
            </div>

            <div className="p-6">
              {enviado ? (
                <div className="flex flex-col items-center gap-4 py-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#00c896]/15 flex items-center justify-center">
                    <CheckCircle size={36} className="text-[#00c896]"/>
                  </div>
                  <div className="text-[18px] font-bold text-white">¡Pedido enviado!</div>
                  <div className="text-[13px] text-white/50">Número: <span className="text-[#00c896] font-mono font-bold">{numeroPed}</span></div>
                  <div className="text-[12px] text-white/40 max-w-[280px] leading-relaxed">
                    Tu pedido fue recibido. Nuestro equipo lo revisará y te confirmará en breve.
                    Puedes seguir el estado en la pestaña <strong className="text-white/60">"Mis Despachos"</strong>.
                  </div>
                  <button onClick={()=>{ setEnviado(false); setTab('historial') }}
                    className="mt-2 px-4 py-2 rounded-xl bg-[#00c896]/15 text-[#00c896] text-[13px] font-medium hover:bg-[#00c896]/25 transition-all">
                    Ver historial de pedidos
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {/* Productos */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[12px] font-semibold text-white/60 uppercase tracking-wide">Productos</label>
                      <button onClick={addItem}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00c896]/15 text-[#00c896] text-[12px] font-medium hover:bg-[#00c896]/25 transition-all">
                        <Plus size={12}/> Agregar producto
                      </button>
                    </div>

                    {items.length === 0 && (
                      <div className="border-2 border-dashed border-white/10 rounded-xl py-8 text-center text-[12px] text-white/30">
                        <Package size={28} className="mx-auto mb-2 opacity-30"/>
                        Haz clic en "Agregar producto" para comenzar tu pedido
                      </div>
                    )}

                    <div className="flex flex-col gap-2.5">
                      {items.map((item, i) => {
                        const p = productos.find(x => x.id === item.prodId)
                        return (
                          <div key={i} className="flex gap-2 items-center bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                            <div className="flex-1">
                              <select className={SI_PUB} value={item.prodId} onChange={e=>setItem(i,'prodId',e.target.value)}>
                                <option value="">Seleccionar producto...</option>
                                {productos.map(p=>(
                                  <option key={p.id} value={p.id}>{p.nombre} — {formatCurrency(p.precioVenta||0,'S/')}</option>
                                ))}
                              </select>
                            </div>
                            <div style={{width:70}}>
                              <input type="number" className={SI_PUB+' text-center'} value={item.qty}
                                onChange={e=>setItem(i,'qty',e.target.value)} min="1" step="1" placeholder="1"/>
                            </div>
                            {p && (
                              <div className="text-[12px] font-mono text-[#00c896] shrink-0 min-w-[60px] text-right">
                                {formatCurrency((p.precioVenta||0)*item.qty,'S/')}
                              </div>
                            )}
                            <button onClick={()=>removeItem(i)} className="text-white/20 hover:text-red-400 transition-colors p-1">
                              <X size={14}/>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Totales */}
                  {items.length > 0 && subtotal > 0 && (
                    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                      <div className="flex justify-between text-[12px] text-white/50 mb-1.5">
                        <span>Subtotal</span><span className="font-mono">{formatCurrency(subtotal,'S/')}</span>
                      </div>
                      <div className="flex justify-between text-[12px] text-white/50 mb-2">
                        <span>IGV (18%)</span><span className="font-mono">{formatCurrency(igvMonto,'S/')}</span>
                      </div>
                      <div className="flex justify-between text-[14px] font-bold text-[#00c896] pt-2 border-t border-white/[0.08]">
                        <span>TOTAL</span><span className="font-mono">{formatCurrency(total,'S/')}</span>
                      </div>
                    </div>
                  )}

                  {/* Campos adicionales */}
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1.5">
                        Fecha de entrega deseada
                      </label>
                      <input type="date" className={SI_PUB} value={fechaDes} onChange={e=>setFechaDes(e.target.value)}/>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1.5">
                        Observaciones
                      </label>
                      <textarea className={SI_PUB+' resize-y min-h-[60px]'} value={obs}
                        onChange={e=>setObs(e.target.value)} placeholder="Instrucciones de entrega, contacto, referencias..."/>
                    </div>
                  </div>

                  <button
                    onClick={enviar}
                    disabled={!items.some(i=>i.prodId&&i.qty>0)}
                    className="w-full py-3 rounded-xl bg-[#00c896] text-[#082e1e] font-bold text-[14px] hover:bg-[#00b386] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    <ShoppingCart size={16}/> Enviar pedido
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: MIS DESPACHOS ─────────────────────── */}
        {tab === 'despachos' && (
          <div className="flex flex-col gap-3">
            <div className="text-[12px] font-semibold text-white/40 uppercase tracking-wide mb-1">
              Despachos activos — {misDespachos.length} registros
            </div>
            {misDespachos.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-[13px]">
                <Truck size={36} className="mx-auto mb-3 opacity-30"/>
                Sin despachos activos en este momento
              </div>
            ) : misDespachos.map(des => {
              const meta   = ESTADO_DES[des.estado] || ESTADO_DES.PEDIDO
              const expand = expandedId === des.id
              return (
                <div key={des.id} className="bg-[#161d28] border border-white/[0.08] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 flex items-center gap-3 cursor-pointer"
                    onClick={()=>setExpandedId(expand?null:des.id)}>
                    <span className="text-[18px]">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[12px] text-[#00c896] font-bold">{des.numero}</div>
                      <div className="text-[12px] font-medium text-white" style={{color:meta.color}}>{meta.label}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[12px] font-mono text-white/70">{formatCurrency(des.total||0,'S/')}</div>
                      <div className="text-[10px] text-white/30">{des.fecha}</div>
                    </div>
                    {expand ? <ChevronUp size={14} className="text-white/30"/> : <ChevronDown size={14} className="text-white/30"/>}
                  </div>

                  {expand && (
                    <div className="px-4 pb-4 border-t border-white/[0.06]">
                      <StepBar estado={des.estado}/>
                      {(des.items||[]).length > 0 && (
                        <div className="mt-3 flex flex-col gap-1.5">
                          {des.items.map((it,i)=>(
                            <div key={i} className="flex justify-between text-[12px]">
                              <span className="text-white/50 truncate flex-1">{it.descripcion}</span>
                              <span className="text-white/30 mx-2 shrink-0">× {it.cantidad}</span>
                              <span className="font-mono text-white/60 shrink-0">{formatCurrency(it.subtotal||0,'S/')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {des.fechaEntrega && (
                        <div className="mt-2 text-[11px] text-white/30">
                          Entrega estimada: <span className="text-white/50">{des.fechaEntrega}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ─── TAB: HISTORIAL ─────────────────────────── */}
        {tab === 'historial' && (
          <div className="flex flex-col gap-3">
            <div className="text-[12px] font-semibold text-white/40 uppercase tracking-wide mb-1">
              Mis pedidos via portal — {miHistorial.length} registros
            </div>
            {miHistorial.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-[13px]">
                <Clock size={36} className="mx-auto mb-3 opacity-30"/>
                Aún no has realizado pedidos por el portal
              </div>
            ) : miHistorial.map(ped => {
              const meta = { NUEVO:{label:'Nuevo',c:'#3b82f6'}, REVISANDO:{label:'En revisión',c:'#f59e0b'},
                APROBADO:{label:'Aprobado',c:'#22c55e'}, RECHAZADO:{label:'Rechazado',c:'#ef4444'},
                CONVERTIDO:{label:'En despacho',c:'#00c896'} }[ped.estado] || {label:ped.estado,c:'#5f6f80'}
              return (
                <div key={ped.id} className="bg-[#161d28] border border-white/[0.08] rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[12px] text-[#00c896] font-bold">{ped.numero}</div>
                    <div className="text-[11px] text-white/30 mt-0.5">
                      {new Date(ped.createdAt).toLocaleDateString('es-PE')} · {(ped.items||[]).length} productos
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[12px] font-mono text-white/60">{formatCurrency(ped.total||0,'S/')}</div>
                    <div className="text-[11px] font-semibold mt-0.5" style={{color:meta.c}}>{meta.label}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-[10px] text-white/20 border-t border-white/[0.06]">
        Portal de pedidos · {empresa} · Powered by StockPro
      </div>
    </div>
  )
}
