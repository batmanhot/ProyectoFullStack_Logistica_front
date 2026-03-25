/**
 * PortalPedidos.jsx — Portal de Pedidos para Clientes (vista interna)
 *
 * Esta es la vista de ADMINISTRACIÓN del portal.
 * Permite:
 * 1. Ver todos los pedidos recibidos por el portal (desde sp_portal_pedidos)
 * 2. Aprobar / rechazar pedidos del portal → los convierte en Despachos
 * 3. Ver el link de portal público para compartir con clientes
 * 4. Ver una simulación del portal del cliente
 *
 * El "Portal Público" es la vista que el cliente ve en /portal/:token
 * implementada en PortalPublico.jsx — sin autenticación de admin,
 * solo con token del cliente.
 */
import { useState, useMemo, useEffect } from 'react'
import { Globe, Copy, Check, Eye, CheckCircle, X, Plus, Package,
         Link, QrCode, Smartphone, ExternalLink, Clock, Truck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoy, generarNumDoc } from '../utils/helpers'
import { Modal, Badge, Btn, Field, Alert, EmptyState } from '../components/ui/index'
import * as storage from '../services/storage'

const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'
const TH  = ({c}) => <th className="bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/[0.08] text-left">{c}</th>

const KEY_PORTAL = 'sp_portal_pedidos'
function leerPortal()    { try { return JSON.parse(localStorage.getItem(KEY_PORTAL)||'[]') } catch { return [] } }
function guardarPortal(d){ localStorage.setItem(KEY_PORTAL, JSON.stringify(d)) }
function nid()           { return Math.random().toString(36).slice(2,10) }

const ESTADO_META = {
  NUEVO:     { label:'Nuevo',    color:'info'    },
  REVISANDO: { label:'Revisando',color:'warning' },
  APROBADO:  { label:'Aprobado', color:'success' },
  RECHAZADO: { label:'Rechazado',color:'danger'  },
  CONVERTIDO:{ label:'En despacho',color:'teal'  },
}

export default function PortalPedidos() {
  const { clientes, productos, despachos, almacenes, simboloMoneda, sesion, config, toast, recargarDespachos } = useApp()
  const navigate = useNavigate()
  const [pedidos,  setPedidos]  = useState(leerPortal)
  const [detalle,  setDetalle]  = useState(null)
  const [simModal, setSimModal] = useState(false)
  const [tab,      setTab]      = useState('pedidos') // pedidos | clientes | config
  const [copied,   setCopied]   = useState('')

  function reload() { setPedidos(leerPortal()) }

  // Link del portal (en producción sería el dominio real)
  const portalBase = window.location.origin + '/portal'

  function copiar(text, key) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key); setTimeout(() => setCopied(''), 2000)
    })
  }

  const kpis = useMemo(() => ({
    total:     pedidos.length,
    nuevos:    pedidos.filter(p=>p.estado==='NUEVO').length,
    aprobados: pedidos.filter(p=>p.estado==='APROBADO').length,
    convertidos:pedidos.filter(p=>p.estado==='CONVERTIDO').length,
  }), [pedidos])

  // Aprobar pedido del portal → convertir a Despacho
  function aprobarYConvertir(pedido) {
    const almacen = almacenes[0]
    // Generar número único — buscar el siguiente disponible
    const numerosExistentes = new Set(despachos.map(d=>d.numero||''))
    let _n = despachos.length + 1
    let numero
    do { numero = `DES-001-${String(_n).padStart(4,'0')}`; _n++ } while (numerosExistentes.has(numero))
    const des = {
      numero,
      clienteId:         pedido.clienteId,
      almacenId:         almacen?.id || '',
      fecha:             fechaHoy(),
      fechaEntrega:      pedido.fechaEntregaDeseada || '',
      estado:            'PEDIDO',
      items:             pedido.items,
      subtotal:          pedido.subtotal,
      igv:               pedido.igv,
      total:             pedido.total,
      observaciones:     pedido.observaciones || '',
      direccionEntrega:  clientes.find(c=>c.id===pedido.clienteId)?.direccion || '',
      transportista:     '',
      guiaNumero:        null,
      origenPortal:      true,
      portalPedidoId:    pedido.id,
    }
    storage.saveDespacho(des)

    // Marcar pedido del portal como convertido
    const lista = leerPortal()
    const idx   = lista.findIndex(p => p.id === pedido.id)
    if (idx >= 0) { lista[idx].estado = 'CONVERTIDO'; lista[idx].despachoNumero = numero }
    guardarPortal(lista)
    reload()
    recargarDespachos()
    toast(`Pedido ${pedido.numero} convertido a Despacho ${numero}`, 'success')
    setDetalle(null)
  }

  function rechazarPedido(pedido, motivo) {
    const lista = leerPortal()
    const idx   = lista.findIndex(p => p.id === pedido.id)
    if (idx >= 0) { lista[idx].estado = 'RECHAZADO'; lista[idx].motivoRechazo = motivo }
    guardarPortal(lista)
    reload()
    toast(`Pedido ${pedido.numero} rechazado`, 'warning')
    setDetalle(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* Banner explicativo */}
      <div className="bg-gradient-to-r from-[#00c896]/10 to-[#3b82f6]/10 border border-[#00c896]/20 rounded-xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#00c896]/15 flex items-center justify-center shrink-0">
          <Globe size={20} className="text-[#00c896]"/>
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-bold text-[#e8edf2] mb-1">Portal de Pedidos para Clientes</div>
          <div className="text-[12px] text-[#9ba8b6] leading-relaxed">
            Cada cliente tiene un link único para hacer pedidos online, ver el estado de sus despachos y consultar su historial — sin llamar ni enviar correos. Tú recibes el pedido aquí y lo conviertes en despacho con un clic.
          </div>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={() => setSimModal(true)}>
            <Eye size={13}/> Simulador
          </Btn>
          <Btn variant="primary" size="sm" onClick={() => {
            const primerCli = clientes.find(c=>c.activo)
            if (primerCli) {
              const token = btoa(`${primerCli.id}:${primerCli.ruc||''}`) 
              window.open(`/portal/${token}`, '_blank')
            }
          }}>
            <ExternalLink size={13}/> Ver portal del cliente
          </Btn>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label:'Total pedidos portal', val:kpis.total,       color:'#3b82f6' },
          { label:'Nuevos por revisar',   val:kpis.nuevos,      color:'#f59e0b' },
          { label:'Aprobados',            val:kpis.aprobados,   color:'#00c896' },
          { label:'Convertidos a despacho',val:kpis.convertidos,color:'#22c55e' },
        ].map(({ label, val, color }) => (
          <div key={label} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em] mb-2">{label}</div>
            <div className="text-[26px] font-bold" style={{ color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-white/[0.08]">
        {[['pedidos','Pedidos recibidos'],['clientes','Links por cliente'],['simular','Simulador de pedido']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-all ${
              tab===t?'text-[#00c896] border-[#00c896]':'text-[#5f6f80] border-transparent hover:text-[#9ba8b6]'}`}>
            {l}
            {t==='pedidos' && kpis.nuevos>0 && (
              <span className="ml-1.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">{kpis.nuevos}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── PEDIDOS RECIBIDOS ─────────────────────────── */}
      {tab === 'pedidos' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">
            Pedidos recibidos vía portal ({pedidos.length})
          </div>
          {pedidos.length === 0 ? (
            <EmptyState icon={Package} title="Sin pedidos aún"
              description="Cuando un cliente haga un pedido desde su portal, aparecerá aquí para que lo apruebes y conviertas en despacho."/>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full border-collapse text-[12px]">
                <thead><tr><TH c="N° Pedido"/><TH c="Cliente"/><TH c="Fecha"/><TH c="Ítems"/><TH c="Total"/><TH c="Estado"/><TH c="Acciones"/></tr></thead>
                <tbody>
                  {pedidos.map(p => {
                    const cli  = clientes.find(c=>c.id===p.clienteId)
                    const meta = ESTADO_META[p.estado]||ESTADO_META.NUEVO
                    return (
                      <tr key={p.id} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]">
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#00c896] font-bold">{p.numero}</td>
                        <td className="px-3.5 py-2.5 font-medium text-[#e8edf2]">{cli?.razonSocial?.slice(0,22)||p.clienteNombre||'—'}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">{formatDate(p.createdAt?.split('T')[0]||p.fecha||'—')}</td>
                        <td className="px-3.5 py-2.5 text-[#9ba8b6]">{p.items?.length||0}</td>
                        <td className="px-3.5 py-2.5 font-mono font-semibold text-[#e8edf2]">{formatCurrency(p.total||0,simboloMoneda)}</td>
                        <td className="px-3.5 py-2.5"><Badge variant={meta.color}>{meta.label}</Badge></td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex gap-1">
                            <Btn variant="ghost" size="icon" onClick={() => setDetalle(p)}><Eye size={12}/></Btn>
                            {p.estado === 'NUEVO' && (
                              <>
                                <Btn variant="primary" size="sm" onClick={() => aprobarYConvertir(p)}>
                                  <CheckCircle size={11}/> Aprobar
                                </Btn>
                                <Btn variant="ghost" size="sm" className="text-red-400"
                                  onClick={() => rechazarPedido(p, 'Sin stock')}>
                                  <X size={11}/> Rechazar
                                </Btn>
                              </>
                            )}
                            {p.despachoNumero && (
                              <span className="text-[10px] text-[#00c896] font-mono px-2 py-1 bg-[#00c896]/10 rounded-lg">{p.despachoNumero}</span>
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
      )}

      {/* ── LINKS POR CLIENTE ────────────────────────── */}
      {tab === 'clientes' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-1">
            Links de portal por cliente
          </div>
          <div className="text-[12px] text-[#5f6f80] mb-5">
            Cada cliente tiene un link único. Cópialo y envíalo por WhatsApp o correo. El cliente puede hacer pedidos y ver sus despachos sin contraseña.
          </div>
          <div className="flex flex-col gap-2">
            {clientes.filter(c=>c.activo).map(c => {
              const token = btoa(c.id + ':' + (c.ruc||'0'))
              const link  = `${portalBase}/${token}`
              const pedsCli = pedidos.filter(p=>p.clienteId===c.id).length
              return (
                <div key={c.id} className="flex items-center gap-4 px-4 py-3.5 bg-[#1a2230] rounded-xl border border-white/[0.07]">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-[14px] shrink-0"
                    style={{ background: '#00c896' }}>
                    {c.razonSocial.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#e8edf2]">{c.razonSocial}</div>
                    <a href={link} target="_blank" rel="noopener noreferrer"
                className="text-[11px] text-[#00c896]/70 font-mono truncate hover:text-[#00c896] hover:underline">{link}</a>
                  </div>
                  <div className="text-[11px] text-[#5f6f80] shrink-0">{pedsCli} pedido{pedsCli!==1?'s':''}</div>
                  <div className="flex gap-2 shrink-0">
                    <Btn variant="ghost" size="sm" onClick={() => copiar(link, c.id)}>
                      {copied === c.id ? <Check size={12} className="text-green-400"/> : <Copy size={12}/>}
                      {copied === c.id ? 'Copiado' : 'Copiar link'}
                    </Btn>
                    <a href={`https://wa.me/${c.telefono?.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(`Hola ${c.contacto||c.razonSocial}, aquí puede ver y hacer pedidos en nuestro portal: ${link}`)}`}
                      target="_blank" rel="noopener noreferrer">
                      <Btn variant="ghost" size="sm" className="text-green-400">
                        WhatsApp
                      </Btn>
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── SIMULADOR ────────────────────────────────── */}
      {tab === 'simular' && (
        <SimuladorPortal
          clientes={clientes}
          productos={productos}
          simboloMoneda={simboloMoneda}
          onEnviar={(pedido) => {
            const lista = leerPortal()
            lista.unshift({ ...pedido, id:nid(), numero:`POR-${String(lista.length+1).padStart(4,'0')}`, fecha:fechaHoy(), estado:'NUEVO', createdAt:new Date().toISOString() })
            guardarPortal(lista)
            reload()
            setTab('pedidos')
            toast(`Pedido ${pedido.numero||'simulado'} recibido en el portal`, 'success')
          }}
        />
      )}

      {/* Modal detalle pedido */}
      {detalle && (
        <ModalDetallePedido
          pedido={detalle}
          clientes={clientes}
          productos={productos}
          simboloMoneda={simboloMoneda}
          onClose={() => setDetalle(null)}
          onAprobar={() => aprobarYConvertir(detalle)}
          onRechazar={(m) => rechazarPedido(detalle, m)}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════
// SIMULADOR DEL PORTAL DEL CLIENTE
// ════════════════════════════════════════════════════════
function SimuladorPortal({ clientes, productos, simboloMoneda, onEnviar }) {
  const IGV = 0.18
  const [clienteId, setClienteId] = useState('')
  const [items,     setItems]     = useState([])
  const [obs,       setObs]       = useState('')
  const [fechaDes,  setFechaDes]  = useState('')
  const [enviado,   setEnviado]   = useState(false)
  const SI2 = 'w-full px-3 py-2 bg-[#1e2b3a] border border-white/[0.1] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] font-[inherit] placeholder-[#5f6f80]'

  const cli = clientes.find(c=>c.id===clienteId)
  const subtotal = items.reduce((s,i)=>s+(i.qty*(productos.find(p=>p.id===i.prodId)?.precioVenta||0)),0)
  const igv      = +(subtotal * IGV).toFixed(2)
  const total    = +(subtotal + igv).toFixed(2)

  function addItem() { setItems(p=>[...p,{prodId:'',qty:1}]) }
  function setItem(i,k,v){ setItems(p=>p.map((x,j)=>j===i?{...x,[k]:v}:x)) }
  function removeItem(i){ setItems(p=>p.filter((_,j)=>j!==i)) }

  function enviar() {
    const ped = {
      clienteId, clienteNombre: cli?.razonSocial,
      items: items.filter(i=>i.prodId&&i.qty>0).map(i=>{
        const p=productos.find(x=>x.id===i.prodId)
        return { productoId:i.prodId, descripcion:p?.nombre||'—', cantidad:+i.qty, precioUnitario:p?.precioVenta||0, subtotal:+i.qty*(p?.precioVenta||0) }
      }),
      subtotal, igv, total, observaciones:obs,
      fechaEntregaDeseada: fechaDes,
    }
    onEnviar(ped)
    setItems([]); setObs(''); setFechaDes(''); setEnviado(true)
    setTimeout(()=>setEnviado(false), 3000)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-[#0f1823] border border-[#00c896]/20 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header portal */}
        <div className="bg-[#00c896] px-6 py-4">
          <div className="flex items-center gap-3">
            <Globe size={20} className="text-[#082e1e]"/>
            <div>
              <div className="font-bold text-[#082e1e] text-[15px]">Portal de Pedidos</div>
              <div className="text-[11px] text-[#082e1e]/70">Distribuidora Lima Norte S.A.C.</div>
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {enviado ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle size={48} className="text-[#00c896]"/>
              <div className="text-[16px] font-bold text-[#e8edf2]">¡Pedido enviado!</div>
              <div className="text-[12px] text-[#5f6f80] text-center">Tu pedido fue recibido. El equipo lo revisará y te confirmará en breve.</div>
            </div>
          ) : (
            <>
              <div>
                <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-2">Tu empresa</label>
                <select className={SI2} value={clienteId} onChange={e=>setClienteId(e.target.value)}>
                  <option value="">Seleccionar empresa...</option>
                  {clientes.filter(c=>c.activo).map(c=><option key={c.id} value={c.id}>{c.razonSocial}</option>)}
                </select>
              </div>

              {clienteId && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide">Productos</label>
                      <button onClick={addItem} className="flex items-center gap-1 text-[11px] text-[#00c896] hover:text-[#009e76]">
                        <Plus size={12}/> Agregar producto
                      </button>
                    </div>
                    {items.length === 0 && (
                      <div className="text-center py-4 text-[12px] text-[#5f6f80]">Agrega los productos que deseas pedir</div>
                    )}
                    {items.map((item,i) => {
                      const p = productos.find(x=>x.id===item.prodId)
                      return (
                        <div key={i} className="flex gap-2 mb-2 items-end">
                          <div className="flex-1">
                            {i===0&&<div className="text-[10px] text-[#5f6f80] mb-1">Producto</div>}
                            <select className={SI2} value={item.prodId} onChange={e=>setItem(i,'prodId',e.target.value)}>
                              <option value="">Seleccionar...</option>
                              {productos.filter(p=>p.activo!==false).map(p=><option key={p.id} value={p.id}>{p.nombre} — {formatCurrency(p.precioVenta||0,simboloMoneda)}</option>)}
                            </select>
                          </div>
                          <div style={{width:80}}>
                            {i===0&&<div className="text-[10px] text-[#5f6f80] mb-1">Cant.</div>}
                            <input type="number" className={SI2} value={item.qty} onChange={e=>setItem(i,'qty',e.target.value)} min="1" step="1"/>
                          </div>
                          {p && <div className="text-[12px] font-mono text-[#00c896] pb-2 shrink-0">{formatCurrency((p.precioVenta||0)*item.qty,simboloMoneda)}</div>}
                          <button onClick={()=>removeItem(i)} className="text-[#5f6f80] hover:text-red-400 pb-2"><X size={14}/></button>
                        </div>
                      )
                    })}
                  </div>

                  {items.length > 0 && (
                    <div className="flex flex-col items-end gap-1 text-[12px] border-t border-white/[0.06] pt-3">
                      <div className="flex gap-6"><span className="text-[#5f6f80]">Subtotal</span><span className="font-mono">{formatCurrency(subtotal,simboloMoneda)}</span></div>
                      <div className="flex gap-6"><span className="text-[#5f6f80]">IGV (18%)</span><span className="font-mono">{formatCurrency(igv,simboloMoneda)}</span></div>
                      <div className="flex gap-6 text-[14px] font-bold text-[#00c896]"><span>TOTAL</span><span className="font-mono">{formatCurrency(total,simboloMoneda)}</span></div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Fecha deseada de entrega</label>
                      <input type="date" className={SI2} value={fechaDes} onChange={e=>setFechaDes(e.target.value)}/>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Observaciones</label>
                      <input className={SI2} value={obs} onChange={e=>setObs(e.target.value)} placeholder="Instrucciones especiales..."/>
                    </div>
                  </div>

                  <button
                    disabled={!clienteId || items.filter(i=>i.prodId&&i.qty>0).length===0}
                    onClick={enviar}
                    className="w-full py-3 bg-[#00c896] text-[#082e1e] font-bold text-[14px] rounded-xl hover:bg-[#00e0aa] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Enviar pedido
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      <div className="text-center text-[11px] text-[#3d4f60] mt-3">
        Esta es una simulación del portal que ven tus clientes. El pedido aparecerá en la pestaña "Pedidos recibidos".
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// MODAL DETALLE PEDIDO
// ════════════════════════════════════════════════════════
function ModalDetallePedido({ pedido, clientes, productos, simboloMoneda, onClose, onAprobar, onRechazar }) {
  const cli  = clientes.find(c=>c.id===pedido.clienteId)
  const meta = ESTADO_META[pedido.estado]||ESTADO_META.NUEVO
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [rechazando, setRechazando]       = useState(false)
  const SI2 = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896] font-[inherit] placeholder-[#5f6f80]'

  return (
    <Modal open title={`Pedido portal — ${pedido.numero}`} onClose={onClose} size="lg"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
        {pedido.estado==='NUEVO' && !rechazando && (
          <>
            <Btn variant="ghost" className="text-red-400" onClick={()=>setRechazando(true)}>
              <X size={13}/> Rechazar
            </Btn>
            <Btn variant="primary" onClick={onAprobar}>
              <CheckCircle size={13}/> Aprobar y crear despacho
            </Btn>
          </>
        )}
        {rechazando && (
          <>
            <input className={SI2} style={{flex:1}} placeholder="Motivo del rechazo..." value={motivoRechazo} onChange={e=>setMotivoRechazo(e.target.value)}/>
            <Btn variant="ghost" onClick={()=>setRechazando(false)}>Cancelar</Btn>
            <Btn variant="ghost" className="text-red-400" onClick={()=>onRechazar(motivoRechazo||'Sin especificar')}>
              Confirmar rechazo
            </Btn>
          </>
        )}
      </>}>
      <div className="grid grid-cols-2 gap-3">
        {[
          ['Cliente',        cli?.razonSocial||pedido.clienteNombre||'—'],
          ['Fecha pedido',   formatDate(pedido.fecha)],
          ['Entrega deseada',pedido.fechaEntregaDeseada?formatDate(pedido.fechaEntregaDeseada):'Sin especificar'],
          ['Estado',         <Badge variant={meta.color}>{meta.label}</Badge>],
        ].map(([k,v])=>(
          <div key={k} className="bg-[#1a2230] rounded-lg px-3.5 py-2.5">
            <div className="text-[10px] text-[#5f6f80] mb-0.5">{k}</div>
            <div className="text-[12px] font-medium text-[#e8edf2]">{v}</div>
          </div>
        ))}
      </div>
      {pedido.observaciones && (
        <div className="px-3.5 py-2.5 bg-[#1a2230] rounded-lg border-l-2 border-[#00c896]/40 text-[12px] text-[#9ba8b6]">
          <span className="text-[10px] font-bold text-[#5f6f80] block mb-1 uppercase tracking-wide">Observaciones</span>
          {pedido.observaciones}
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full border-collapse text-[12px]">
          <thead><tr>
            {['Producto','Cant.','P. Unit.','Subtotal'].map(h=>(
              <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[10px] font-semibold text-[#5f6f80] uppercase border-b border-white/[0.08]">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {(pedido.items||[]).map((item,i)=>{
              const p=productos.find(x=>x.id===item.productoId)
              return (
                <tr key={i} className="border-b border-white/[0.05] last:border-0">
                  <td className="px-3.5 py-2.5 text-[#e8edf2]">{item.descripcion||p?.nombre||'—'}</td>
                  <td className="px-3.5 py-2.5 text-[#9ba8b6]">{item.cantidad}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[#9ba8b6]">{formatCurrency(item.precioUnitario||0,simboloMoneda)}</td>
                  <td className="px-3.5 py-2.5 font-mono font-semibold text-[#e8edf2]">{formatCurrency(item.subtotal||0,simboloMoneda)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col items-end gap-1 text-[12px]">
        <div className="flex gap-8"><span className="text-[#5f6f80]">Subtotal</span><span className="font-mono">{formatCurrency(pedido.subtotal||0,simboloMoneda)}</span></div>
        <div className="flex gap-8"><span className="text-[#5f6f80]">IGV</span><span className="font-mono">{formatCurrency(pedido.igv||0,simboloMoneda)}</span></div>
        <div className="flex gap-8 font-bold text-[14px] text-[#00c896]"><span>TOTAL</span><span className="font-mono">{formatCurrency(pedido.total||0,simboloMoneda)}</span></div>
      </div>
    </Modal>
  )
}
