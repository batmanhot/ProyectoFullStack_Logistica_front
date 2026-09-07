/**
 * PortalPublico.jsx — Portal público del cliente
 *
 * URL: /portal/:token   donde :token es el JWT firmado generado por
 *   POST /api/portal/generarLink desde el panel admin.
 *
 * Auth: PortalClienteGuard (secreto propio PORTAL_JWT_SECRET).
 *   El token se envía como Authorization: Bearer en todas las llamadas.
 *
 * Endpoints consumidos (sin auth de tenant):
 *   GET  /portal/catalogo   → productos con precio de venta publicado
 *   GET  /portal/despachos  → despachos del cliente autenticado
 *   GET  /portal/pedidos    → historial de pedidos del portal
 *   POST /portal/pedidos    → crear nuevo pedido
 */
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Globe, Package, Plus, X, CheckCircle, Clock, Search, Download,
         Truck, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react'
import { formatCurrency, decodeJwtPayload } from '../utils/helpers'
import { imprimirPedidoPortal } from '../utils/pdfTemplates'
import { api, tokenManager } from '../services/api'

const IGV = 0.18

/**
 * Dropdown propio en vez de <select> nativo — el popup de opciones de un
 * <select> lo dibuja el navegador (color-scheme del SO), no nuestro CSS, y
 * esta página no puede forzar tema oscuro sobre ese popup (a diferencia de
 * [data-landing], ver index.css). En Chrome/Windows salía ilegible.
 */
function ProductoSelect({ productos, value, onChange, inputClass }) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onEscape(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  const seleccionado = productos.find(p => p.id === value)
  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return productos
    return productos.filter(p => p.nombre?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
  }, [productos, query])

  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(o => !o)}
        className={`${inputClass} flex items-center justify-between gap-2 text-left ${seleccionado ? '' : 'text-white/30'}`}>
        <span className="truncate">
          {seleccionado ? `${seleccionado.nombre} — ${formatCurrency(seleccionado.precioVenta || 0, 'S/')}` : 'Seleccionar producto...'}
        </span>
        <ChevronDown size={14} className="text-white/30 shrink-0"/>
      </button>
      {open && (
        <div className="absolute z-20 mt-1.5 w-full bg-[#1a2230] border border-white/10 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-white/8 relative">
            <Search size={12} className="absolute left-4.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"/>
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Buscar producto..." aria-label="Buscar producto"
              className="w-full pl-7 pr-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[12px] text-white outline-none focus:border-[#00c896] placeholder-white/30"/>
          </div>
          <div role="listbox" aria-label="Productos" className="max-h-48 overflow-y-auto py-1">
            {filtrados.length === 0 && (
              <div className="px-3 py-2.5 text-[12px] text-white/30">Sin resultados</div>
            )}
            {filtrados.map(p => (
              <button key={p.id} type="button" role="option" aria-selected={p.id === value}
                onClick={() => { onChange(p.id); setOpen(false); setQuery('') }}
                className={`w-full text-left px-3 py-2 text-[12px] hover:bg-white/8 transition-colors flex items-center justify-between gap-2 ${
                  p.id === value ? 'text-[#00c896] bg-[#00c896]/10' : 'text-white/80'}`}>
                <span className="truncate">{p.nombre}</span>
                <span className="font-mono text-white/40 shrink-0">{formatCurrency(p.precioVenta || 0, 'S/')}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const ESTADO_DES = {
  PEDIDO:    { label:'Pedido recibido',   color:'#3b82f6', icon:'📋' },
  APROBADO:  { label:'Aprobado',          color:'#00c896', icon:'✅' },
  PICKING:   { label:'Preparando',        color:'#f59e0b', icon:'📦' },
  LISTO:     { label:'Listo para enviar', color:'#a78bfa', icon:'🚀' },
  DESPACHADO:{ label:'Despachado',        color:'#22c55e', icon:'🚚' },
  ENTREGADO: { label:'Entregado',         color:'#22c55e', icon:'✔️' },
  CANCELADO: { label:'Anulado',           color:'#ef4444', icon:'❌' },
}

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

  const [cargando,  setCargando]  = useState(true)
  const [cliente,   setCliente]   = useState(null) // { id, nombre }
  const [productos, setProductos] = useState([])
  const [despachos, setDespachos] = useState([])
  const [historial, setHistorial] = useState([])

  const [tab,        setTab]       = useState('pedido')
  const [items,      setItems]     = useState([])
  const [obs,        setObs]       = useState('')
  const [fechaDes,   setFechaDes]  = useState('')
  const [enviando,   setEnviando]  = useState(false)
  const [enviado,    setEnviado]   = useState(false)
  const [numeroPed,  setNumeroPed] = useState('')
  const [pedidoEnviado, setPedidoEnviado] = useState(null)
  const [errorMsg,   setErrorMsg]  = useState('')
  const [expandedId, setExpandedId]= useState(null)

  // ── Cargar datos del portal desde la API ─────────
  const cargarDatos = useCallback(async () => {
    const [cat, des, ped] = await Promise.all([
      api.get('/portal/catalogo',  { authType: 'portal' }),
      api.get('/portal/despachos', { authType: 'portal' }),
      api.get('/portal/pedidos',   { authType: 'portal' }),
    ])
    setProductos(cat.data ?? [])
    setDespachos(des.data ?? [])
    setHistorial(ped.data ?? [])
  }, [])

  // ── Decodificar token JWT y bootstrapear la sesión de portal
  useEffect(() => {
    if (!token) { navigate('/'); return }

    try {
      const payload = decodeJwtPayload(token)
      // payload===null cubre tanto el token antiguo (btoa, sin 3 partes) como cualquier JWT inválido.
      if (!payload || payload.scope !== 'portal_cliente') { navigate('/'); return }

      tokenManager.setPortal(token)
      setCliente({
        id: payload.sub,
        nombre: payload.clienteNombre || 'Cliente',
        empresaNombre: payload.empresaNombre || '',
      })

      cargarDatos().finally(() => setCargando(false))
    } catch {
      navigate('/')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // ── Cálculos del pedido ──────────────────────────
  const subtotal = useMemo(() =>
    items.reduce((s, i) => {
      const p = productos.find(x => x.id === i.prodId)
      return s + (i.qty * (p?.precioVenta || 0))
    }, 0)
  , [items, productos])

  const igvMonto = +(subtotal * IGV).toFixed(2)
  const total    = +(subtotal + igvMonto).toFixed(2)

  function descargarPedidoPDF(pedido) {
    imprimirPedidoPortal({
      pedido,
      productos,
      cliente: { razonSocial: cliente?.nombre },
      config:  { empresa: cliente?.empresaNombre, simboloMoneda: 'S/' },
    })
  }

  function addItem()      { setItems(p=>[...p, { prodId:'', qty:1 }]) }
  function setItem(i,k,v) { setItems(p=>p.map((x,j)=>j===i ? { ...x, [k]:v } : x)) }
  function removeItem(i)  { setItems(p=>p.filter((_,j)=>j!==i)) }

  async function enviar() {
    const lineas = items.filter(i=>i.prodId && i.qty > 0)
    if (lineas.length === 0) return
    setEnviando(true)
    setErrorMsg('')
    const res = await api.post('/portal/pedidos', {
      items: lineas.map(i => ({ productoId: i.prodId, cantidad: +i.qty })),
      observaciones:       obs || undefined,
      fechaEntregaDeseada: fechaDes || undefined,
    }, { authType: 'portal' })

    if (res.error) {
      setErrorMsg(res.error)
      setEnviando(false)
      return
    }
    setNumeroPed(res.data?.numero || '—')
    setPedidoEnviado(res.data || null)
    setItems([])
    setObs('')
    setFechaDes('')
    setEnviado(true)
    setEnviando(false)
    // recargar historial tras envío exitoso
    api.get('/portal/pedidos', { authType: 'portal' }).then(r => setHistorial(r.data ?? []))
  }

  const misDespachos = useMemo(() =>
    [...despachos].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''))
  , [despachos])

  const SI_PUB = 'w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[13px] text-white outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 placeholder-white/30 font-[inherit]'

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#0e1117] flex items-center justify-center">
        <div className="text-white/40 text-[14px]">Cargando portal...</div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#0e1117] flex flex-col overflow-hidden">

      {/* ── Header portal ─────────────────────────────── */}
      <div className="shrink-0 bg-[#00c896] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe size={22} className="text-[#082e1e]"/>
          <div>
            <div className="font-bold text-[#082e1e] text-[15px]">Portal de Pedidos</div>
            {cliente?.empresaNombre && <div className="text-[11px] text-[#082e1e]/70">{cliente.empresaNombre}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[13px] font-bold text-[#082e1e]">{cliente?.nombre}</div>
          <div className="text-[11px] text-[#082e1e]/60">Cliente</div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────── */}
      <div className="shrink-0 bg-[#161d28] border-b border-white/8 px-4">
        <div className="flex gap-0 max-w-2xl mx-auto">
          {[
            { id:'pedido',    label:'Nuevo Pedido',                                      icon:'🛒' },
            { id:'despachos', label:`Mis Despachos (${misDespachos.length})`,            icon:'🚚' },
            { id:'historial', label:`Historial (${historial.length})`,                   icon:'📋' },
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
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">

        {/* ─── TAB: NUEVO PEDIDO ──────────────────────── */}
        {tab === 'pedido' && (
          <div className="bg-[#161d28] border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/8">
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
                  <div className="flex items-center gap-2 mt-2">
                    {pedidoEnviado && (
                      <button onClick={()=>descargarPedidoPDF(pedidoEnviado)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-[13px] font-medium hover:bg-white/10 hover:text-white transition-all">
                        <Download size={14}/> Descargar PDF
                      </button>
                    )}
                    <button onClick={()=>{ setEnviado(false); setTab('historial') }}
                      className="px-4 py-2 rounded-xl bg-[#00c896]/15 text-[#00c896] text-[13px] font-medium hover:bg-[#00c896]/25 transition-all">
                      Ver historial de pedidos
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {errorMsg && (
                    <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">
                      {errorMsg}
                    </div>
                  )}

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
                          <div key={i} className="flex gap-2 items-center bg-white/3 rounded-xl p-3 border border-white/6">
                            <div className="flex-1 min-w-0">
                              <ProductoSelect productos={productos} value={item.prodId} inputClass={SI_PUB}
                                onChange={v=>setItem(i,'prodId',v)}/>
                            </div>
                            <div className="shrink-0" style={{width:70}}>
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
                    <div className="bg-white/3 rounded-xl p-4 border border-white/6">
                      <div className="flex justify-between text-[12px] text-white/50 mb-1.5">
                        <span>Subtotal</span><span className="font-mono">{formatCurrency(subtotal,'S/')}</span>
                      </div>
                      <div className="flex justify-between text-[12px] text-white/50 mb-2">
                        <span>IGV (18%)</span><span className="font-mono">{formatCurrency(igvMonto,'S/')}</span>
                      </div>
                      <div className="flex justify-between text-[14px] font-bold text-[#00c896] pt-2 border-t border-white/8">
                        <span>TOTAL</span><span className="font-mono">{formatCurrency(total,'S/')}</span>
                      </div>
                    </div>
                  )}

                  {/* Campos adicionales */}
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label htmlFor="portal-fecha-entrega" className="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1.5">
                        Fecha de entrega deseada
                      </label>
                      <input id="portal-fecha-entrega" type="date" className={SI_PUB} value={fechaDes} onChange={e=>setFechaDes(e.target.value)}/>
                    </div>
                    <div>
                      <label htmlFor="portal-observaciones" className="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1.5">
                        Observaciones
                      </label>
                      <textarea id="portal-observaciones" className={SI_PUB+' resize-y min-h-[60px]'} value={obs}
                        onChange={e=>setObs(e.target.value)} placeholder="Instrucciones de entrega, contacto, referencias..."/>
                    </div>
                  </div>

                  <button
                    onClick={enviar}
                    disabled={enviando || !items.some(i=>i.prodId&&i.qty>0)}
                    className="w-full py-3 rounded-xl bg-[#00c896] text-[#082e1e] font-bold text-[14px] hover:bg-[#00b386] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    <ShoppingCart size={16}/> {enviando ? 'Enviando...' : 'Enviar pedido'}
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
                <div key={des.id} className="bg-[#161d28] border border-white/8 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 flex items-center gap-3 cursor-pointer"
                    onClick={()=>setExpandedId(expand?null:des.id)}>
                    <span className="text-[18px]">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[12px] text-[#00c896] font-bold">{des.numero}</div>
                      <div className="text-[12px] font-medium" style={{color:meta.color}}>{meta.label}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[12px] font-mono text-white/70">{formatCurrency(des.total||0,'S/')}</div>
                      <div className="text-[10px] text-white/30">{des.fecha}</div>
                    </div>
                    {expand ? <ChevronUp size={14} className="text-white/30"/> : <ChevronDown size={14} className="text-white/30"/>}
                  </div>

                  {expand && (
                    <div className="px-4 pb-4 border-t border-white/6">
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
              Mis pedidos via portal — {historial.length} registros
            </div>
            {historial.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-[13px]">
                <Clock size={36} className="mx-auto mb-3 opacity-30"/>
                Aún no has realizado pedidos por el portal
              </div>
            ) : historial.map(ped => {
              const meta = {
                NUEVO:      { label:'Nuevo',      c:'#3b82f6' },
                REVISANDO:  { label:'En revisión', c:'#f59e0b' },
                APROBADO:   { label:'Aprobado',    c:'#22c55e' },
                RECHAZADO:  { label:'Rechazado',   c:'#ef4444' },
                CONVERTIDO: { label:'En despacho', c:'#00c896' },
              }[ped.estado] || { label:ped.estado, c:'#5f6f80' }
              return (
                <div key={ped.id} className="bg-[#161d28] border border-white/8 rounded-xl px-4 py-3 flex items-center gap-3">
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
                  <button onClick={()=>descargarPedidoPDF(ped)} title="Descargar PDF"
                    className="shrink-0 p-2 rounded-lg text-white/30 hover:text-[#00c896] hover:bg-white/5 transition-all">
                    <Download size={14}/>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-[10px] text-white/20 border-t border-white/6">
        Portal de pedidos{cliente?.empresaNombre ? ` · ${cliente.empresaNombre}` : ''} · Powered by StockPro
      </div>
    </div>
  )
}
