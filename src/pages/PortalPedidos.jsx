import { useState, useMemo } from 'react'
import { Globe, Copy, Check, Eye, CheckCircle, X, Plus,
         Package, ExternalLink, Info } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate } from '../utils/helpers'
import { Modal, Badge, Btn, Field, EmptyState } from '../components/ui/index'
import { useClientesList, useGenerarPortalLinkCliente } from '../queries/clientes.queries'
import { useProductosList } from '../queries/productos.queries'
import { useAlmacenesList } from '../queries/almacenes.queries'
import { useConfiguracion } from '../queries/configuracion.queries'
import { usePedidosPortalList, useAprobarPedidoPortal, useRechazarPedidoPortal } from '../queries/pedidos-portal.queries'

const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const TH  = ({c}) => <th className="bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/8 text-left">{c}</th>

const ESTADO_META = {
  NUEVO:      { label:'Nuevo',        color:'info'    },
  REVISANDO:  { label:'Revisando',    color:'warning' },
  APROBADO:   { label:'Aprobado',     color:'success' },
  RECHAZADO:  { label:'Rechazado',    color:'danger'  },
  CONVERTIDO: { label:'En despacho',  color:'teal'    },
}

export default function PortalPedidos() {
  const { toast } = useApp()
  const { data: pedidos   = [] } = usePedidosPortalList()
  const { data: clientes  = [] } = useClientesList({ incluirInactivos: true })
  const { data: productos = [] } = useProductosList()
  const { data: almacenes = [] } = useAlmacenesList()
  const { data: config    = {} } = useConfiguracion()

  const aprobarPedido  = useAprobarPedidoPortal()
  const rechazarPedido = useRechazarPedidoPortal()
  const generarLink    = useGenerarPortalLinkCliente()
  const almacenesActivos = useMemo(() => almacenes.filter(a => a.activo !== false), [almacenes])

  const simboloMoneda = 'S/'
  const [detalle,  setDetalle]  = useState(null)
  const [detalleModo, setDetalleModo] = useState('ver') // 'ver' | 'rechazar' — con qué acción abrir el modal de detalle
  const [tab,      setTab]      = useState('pedidos')
  const [copied,   setCopied]   = useState('')
  const [links,    setLinks]    = useState({}) // clienteId -> link ya generado (cache en memoria de esta sesión)
  const [generando,setGenerando]= useState('') // clienteId en curso, para deshabilitar el botón mientras pide el token

  const portalBase = window.location.origin + '/portal'

  // El link lleva un JWT firmado por el backend (PORTAL_JWT_SECRET) — no se
  // arma en el cliente. Se pide una sola vez por cliente y se cachea en memoria.
  async function obtenerLink(clienteId) {
    if (links[clienteId]) return links[clienteId]
    setGenerando(clienteId)
    const res = await generarLink.mutateAsync(clienteId)
    setGenerando('')
    if (res?.error || !res?.data?.token) {
      toast(res?.error || 'No se pudo generar el link del portal', 'error')
      return null
    }
    const link = `${portalBase}/${res.data.token}`
    setLinks(prev => ({ ...prev, [clienteId]: link }))
    return link
  }

  function copiar(text, key) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key); setTimeout(() => setCopied(''), 2000)
    })
  }

  const kpis = useMemo(() => ({
    total:      pedidos.length,
    nuevos:     pedidos.filter(p=>p.estado==='NUEVO').length,
    // 'APROBADO' nunca se asigna — aprobarYConvertir() pasa directo NUEVO→CONVERTIDO.
    aprobados:  pedidos.filter(p=>p.estado==='CONVERTIDO').length,
    convertidos:pedidos.filter(p=>p.estado==='CONVERTIDO').length,
  }), [pedidos])

  // Aprobar exige elegir almacén de despacho — si el tenant solo tiene uno
  // activo se usa directo (atajo), si tiene varios se pide en el modal de
  // detalle en vez de asumir "el primero de la lista" (bug del flujo viejo).
  function iniciarAprobacion(pedido) {
    if (almacenesActivos.length === 1) { handleAprobar(pedido, almacenesActivos[0].id); return }
    if (almacenesActivos.length === 0) { toast('No hay almacenes disponibles', 'error'); return }
    setDetalle(pedido)
  }

  async function handleAprobar(pedido, almacenId) {
    if (!almacenId) { toast('Selecciona el almacén desde el que se despacha', 'error'); return }
    const res = await aprobarPedido.mutateAsync({ id: pedido.id, almacenId })
    if (res?.error) { toast(res.error, 'error'); return }
    const numero = res?.data?.despacho?.numero || res?.data?.numero || '—'
    toast(`Pedido ${pedido.numero} convertido a Despacho ${numero}`, 'success')
    setDetalle(null)
  }

  async function handleRechazar(pedido, motivo) {
    const res = await rechazarPedido.mutateAsync({ id: pedido.id, motivo: motivo || 'Sin especificar' })
    if (res?.error) { toast(res.error, 'error'); return }
    toast(`Pedido ${pedido.numero} rechazado`, 'warning')
    setDetalle(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* Banner */}
      <div className="flex items-start gap-4 px-5 py-4 rounded-xl"
        style={{background:'rgba(0,200,150,0.08)',border:'1px solid rgba(0,200,150,0.20)'}}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{background:'rgba(0,200,150,0.15)'}}>
          <Globe size={24} className="text-[#00c896]"/>
        </div>
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[14px] font-bold text-[#e8edf2]">Portal de Pedidos para Clientes</div>
            <Btn variant="primary" size="sm" className="shrink-0" onClick={async () => {
              const primerCli = clientes.find(c=>c.activo)
              if (!primerCli) { toast('No hay clientes activos', 'error'); return }
              const link = await obtenerLink(primerCli.id)
              if (link) window.open(link, '_blank')
            }}>
              <ExternalLink size={13}/> Ver portal del cliente
            </Btn>
          </div>

          <div className="text-[12px] text-[#9ba8b6] leading-relaxed">
            <strong className="text-[#e8edf2]">¿Para qué sirve?</strong> Le da a cada cliente un canal de
            autoservicio para hacer pedidos online, ver en qué va su despacho y revisar su historial —sin llamadas
            ni correos idas y vueltas—, mientras tú mantienes el control: nada se despacha ni descuenta stock hasta
            que tú lo apruebes.
          </div>

          <div className="flex items-start gap-1.5 text-[11px] text-[#5f6f80]">
            <Info size={12} className="shrink-0 mt-0.5"/>
            <span>El link es un JWT firmado de larga duración (365 días) — no requiere contraseña, y cada cliente
            solo ve sus propios pedidos y despachos. La pestaña "Vista previa (demo)" solo simula cómo se ve el
            portal del cliente: no crea pedidos reales ni descuenta stock.</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label:'Total pedidos portal',    val:kpis.total,       color:'#3b82f6' },
          { label:'Nuevos por revisar',      val:kpis.nuevos,      color:'#f59e0b' },
          { label:'Aprobados',               val:kpis.aprobados,   color:'#00c896' },
          { label:'Convertidos a despacho',  val:kpis.convertidos, color:'#22c55e' },
        ].map(({ label, val, color }) => (
          <div key={label} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.75 rounded-t-xl" style={{ background: color }}/>
            <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em] mb-2">{label}</div>
            <div className="text-[28px] font-semibold" style={{ color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-white/8">
        {[['pedidos','Pedidos recibidos'],['clientes','Links por cliente'],['simular','Vista previa (demo)']].map(([t,l]) => (
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
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">
            Pedidos recibidos vía portal ({pedidos.length})
          </div>
          {pedidos.length === 0 ? (
            <EmptyState icon={Package} title="Sin pedidos aún"
              description="Cuando un cliente haga un pedido desde su portal, aparecerá aquí para que lo apruebes y conviertas en despacho."/>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full border-collapse text-[12px]">
                <thead><tr><TH c="N° Pedido"/><TH c="Cliente"/><TH c="Fecha"/><TH c="Ítems"/><TH c="Total"/><TH c="Estado"/><TH c="Acciones"/></tr></thead>
                <tbody>
                  {pedidos.map(p => {
                    const cli  = clientes.find(c=>c.id===p.clienteId)
                    const meta = ESTADO_META[p.estado] || ESTADO_META.NUEVO
                    const despNumero = p.despachoNumero || p.despacho?.numero
                    return (
                      <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#00c896] font-bold">{p.numero}</td>
                        <td className="px-3.5 py-2.5 font-medium text-[#e8edf2]">
                          {cli?.razonSocial?.slice(0,22) || p.clienteNombre || '—'}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">
                          {formatDate(p.createdAt?.split('T')[0] || p.fecha || '')}
                        </td>
                        <td className="px-3.5 py-2.5 text-[#9ba8b6]">{p.items?.length || 0}</td>
                        <td className="px-3.5 py-2.5 font-mono font-semibold text-[#e8edf2]">{formatCurrency(p.total||0, simboloMoneda)}</td>
                        <td className="px-3.5 py-2.5"><Badge variant={meta.color}>{meta.label}</Badge></td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex gap-1 items-center">
                            <Btn variant="ghost" size="icon" onClick={() => { setDetalleModo('ver'); setDetalle(p) }}><Eye size={12}/></Btn>
                            {p.estado === 'NUEVO' && (
                              <>
                                <Btn variant="primary" size="sm"
                                  disabled={aprobarPedido.isPending}
                                  onClick={() => iniciarAprobacion(p)}>
                                  <CheckCircle size={11}/> Aprobar
                                </Btn>
                                <Btn variant="ghost" size="sm" className="text-red-400"
                                  onClick={() => { setDetalleModo('rechazar'); setDetalle(p) }}>
                                  <X size={11}/> Rechazar
                                </Btn>
                              </>
                            )}
                            {despNumero && (
                              <span className="text-[10px] text-[#00c896] font-mono px-2 py-1 bg-[#00c896]/10 rounded-lg">{despNumero}</span>
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
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-1">
            Links de portal por cliente
          </div>
          <div className="text-[12px] text-[#5f6f80] mb-5">
            Cada cliente tiene un link único. Cópialo y envíalo por WhatsApp o correo. El cliente puede hacer pedidos y ver sus despachos sin contraseña.
          </div>
          <div className="flex flex-col gap-2">
            {clientes.filter(c=>c.activo).map(c => {
              const link    = links[c.id]
              const pedsCli = pedidos.filter(p=>p.clienteId===c.id).length
              return (
                <div key={c.id} className="flex items-center gap-4 px-4 py-3.5 bg-[#1a2230] rounded-xl border border-white/7">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-[14px] shrink-0"
                    style={{ background: '#00c896' }}>
                    {c.razonSocial.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#e8edf2]">{c.razonSocial}</div>
                    {link
                      ? <a href={link} target="_blank" rel="noopener noreferrer"
                          className="text-[11px] text-[#00c896]/70 font-mono truncate hover:text-[#00c896] hover:underline">{link}</a>
                      : <span className="text-[11px] text-[#5f6f80]">Genera el link para compartirlo</span>}
                  </div>
                  <div className="text-[11px] text-[#5f6f80] shrink-0">{pedsCli} pedido{pedsCli!==1?'s':''}</div>
                  <div className="flex gap-2 shrink-0">
                    {link ? (
                      <>
                        <Btn variant="ghost" size="sm" onClick={() => copiar(link, c.id)}>
                          {copied === c.id ? <Check size={12} className="text-green-400"/> : <Copy size={12}/>}
                          {copied === c.id ? 'Copiado' : 'Copiar link'}
                        </Btn>
                        <a href={`https://wa.me/${c.telefono?.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(`Hola ${c.contacto||c.razonSocial}, aquí puede ver y hacer pedidos en nuestro portal: ${link}`)}`}
                          target="_blank" rel="noopener noreferrer">
                          <Btn variant="ghost" size="sm" className="text-green-400">WhatsApp</Btn>
                        </a>
                      </>
                    ) : (
                      <Btn variant="secondary" size="sm" disabled={generando===c.id} onClick={() => obtenerLink(c.id)}>
                        {generando===c.id ? 'Generando...' : 'Generar link'}
                      </Btn>
                    )}
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
          nombreEmpresa={config?.nombre}
          onEnviar={() => {
            setTab('pedidos')
            toast('Simulación completada. Los pedidos reales llegan desde el portal del cliente.', 'info')
          }}
        />
      )}

      {/* Guía de uso */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el flujo completo del Portal de Pedidos?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {[
            ['1. Compartir link',   'El flujo inicia en la pestaña "Links por cliente": generas y compartes (copiar o WhatsApp) el link único de un cliente.'],
            ['2. Cliente pide',     'El cliente entra a ese link (sin login), arma su pedido desde el catálogo y lo envía.'],
            ['3. Apruebas o rechazas', 'El pedido llega a "Pedidos recibidos" como "Nuevo". Eliges el almacén de despacho y lo Apruebas (se crea un Despacho real y se reserva stock) o lo Rechazas con motivo.'],
            ['4. Cliente hace seguimiento', 'El cliente ve el resultado en su portal, en "Mis Despachos" o "Historial", y sigue el avance del despacho paso a paso.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal detalle pedido */}
      {detalle && (
        <ModalDetallePedido
          pedido={detalle}
          clientes={clientes}
          productos={productos}
          almacenes={almacenesActivos}
          modoInicial={detalleModo}
          simboloMoneda={simboloMoneda}
          aprobando={aprobarPedido.isPending}
          onClose={() => { setDetalle(null); setDetalleModo('ver') }}
          onAprobar={(almacenId) => handleAprobar(detalle, almacenId)}
          onRechazar={(m) => handleRechazar(detalle, m)}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════
// SIMULADOR DEL PORTAL DEL CLIENTE
// ════════════════════════════════════════════════════════
function SimuladorPortal({ clientes, productos, simboloMoneda, nombreEmpresa, onEnviar }) {
  const IGV = 0.18
  const [clienteId, setClienteId] = useState('')
  const [items,     setItems]     = useState([])
  const [obs,       setObs]       = useState('')
  const [fechaDes,  setFechaDes]  = useState('')
  const [enviado,   setEnviado]   = useState(false)
  const SI2 = 'w-full px-3 py-2 bg-[#1e2b3a] border border-white/10 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] font-[inherit] placeholder-[#5f6f80]'

  const subtotal = items.reduce((s,i)=>s+(i.qty*(productos.find(p=>p.id===i.prodId)?.precioVenta||0)),0)
  const igv      = +(subtotal * IGV).toFixed(2)
  const total    = +(subtotal + igv).toFixed(2)

  function addItem()           { setItems(p=>[...p,{prodId:'',qty:1}]) }
  function setItem(i,k,v)      { setItems(p=>p.map((x,j)=>j===i?{...x,[k]:v}:x)) }
  function removeItem(i)       { setItems(p=>p.filter((_,j)=>j!==i)) }

  function enviar() {
    setEnviado(true)
    setTimeout(() => {
      setEnviado(false)
      setItems([]); setObs(''); setFechaDes('')
      onEnviar()
    }, 1500)
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-3">
      <div className="flex items-start gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
        <Info size={13} className="shrink-0 mt-0.5"/>
        <span>Esto es solo una vista previa de lo que ve tu cliente — no crea un pedido real ni se guarda en el sistema. Para pedidos reales, comparte el link del cliente desde la pestaña "Links por cliente".</span>
      </div>
      <div className="bg-[#0f1823] border border-[#00c896]/20 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-[#00c896] px-6 py-4">
          <div className="flex items-center gap-3">
            <Globe size={20} className="text-[#082e1e]"/>
            <div>
              <div className="font-bold text-[#082e1e] text-[15px]">Portal de Pedidos</div>
              <div className="text-[11px] text-[#082e1e]/70">{nombreEmpresa || 'Tu empresa'}</div>
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
                            <input type="number" className={SI2} value={item.qty} onChange={e=>setItem(i,'qty',e.target.value)} min="1"/>
                          </div>
                          {p && <div className="text-[12px] font-mono text-[#00c896] pb-2 shrink-0">{formatCurrency((p.precioVenta||0)*item.qty,simboloMoneda)}</div>}
                          <button onClick={()=>removeItem(i)} className="text-[#5f6f80] hover:text-red-400 pb-2"><X size={14}/></button>
                        </div>
                      )
                    })}
                  </div>

                  {items.length > 0 && (
                    <div className="flex flex-col items-end gap-1 text-[12px] border-t border-white/6 pt-3">
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
    </div>
  )
}

// ════════════════════════════════════════════════════════
// MODAL DETALLE PEDIDO
// ════════════════════════════════════════════════════════
function ModalDetallePedido({ pedido, clientes, productos, almacenes, modoInicial, aprobando, simboloMoneda, onClose, onAprobar, onRechazar }) {
  const cli  = clientes.find(c=>c.id===pedido.clienteId)
  const meta = ESTADO_META[pedido.estado] || ESTADO_META.NUEVO
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [rechazando,    setRechazando]    = useState(modoInicial === 'rechazar')
  const [almacenId,     setAlmacenId]     = useState(almacenes[0]?.id || '')
  const SI2 = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896] font-[inherit] placeholder-[#5f6f80]'

  return (
    <Modal open title={`Pedido portal — ${pedido.numero}`} onClose={onClose} size="lg"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
        {pedido.estado==='NUEVO' && !rechazando && (
          <>
            <Btn variant="ghost" className="text-red-400" onClick={()=>setRechazando(true)}>
              <X size={13}/> Rechazar
            </Btn>
            <Btn variant="primary" disabled={aprobando || !almacenId} onClick={()=>onAprobar(almacenId)}>
              <CheckCircle size={13}/> Aprobar y crear despacho
            </Btn>
          </>
        )}
        {rechazando && (
          <>
            <input className={SI2} style={{flex:1}} placeholder="Motivo del rechazo..."
              value={motivoRechazo} onChange={e=>setMotivoRechazo(e.target.value)} autoFocus/>
            <Btn variant="ghost" onClick={()=>setRechazando(false)}>Cancelar</Btn>
            <Btn variant="ghost" className="text-red-400" onClick={()=>onRechazar(motivoRechazo||'Sin especificar')}>
              Confirmar rechazo
            </Btn>
          </>
        )}
      </>}>

      {pedido.estado==='NUEVO' && !rechazando && (
        <Field label="Almacén desde el que se despacha *"
          hint={almacenes.length>1 ? 'Este pedido se convertirá en un Despacho reservando stock en el almacén elegido.' : undefined}>
          <select className={SI2} value={almacenId} onChange={e=>setAlmacenId(e.target.value)}>
            {almacenes.length===0 && <option value="">Sin almacenes disponibles</option>}
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        {[
          ['Cliente',         cli?.razonSocial || pedido.clienteNombre || '—'],
          ['Fecha pedido',    formatDate(pedido.createdAt?.split('T')[0] || pedido.fecha || '')],
          ['Entrega deseada', pedido.fechaEntregaDeseada ? formatDate(pedido.fechaEntregaDeseada) : 'Sin especificar'],
          ['Estado',          <Badge variant={meta.color}>{meta.label}</Badge>],
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

      <div className="overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full border-collapse text-[12px]">
          <thead><tr>
            {['Producto','Cant.','P. Unit.','Subtotal'].map(h=>(
              <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[10px] font-semibold text-[#5f6f80] uppercase border-b border-white/8">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {(pedido.items||[]).map((item,i)=>{
              const p = productos.find(x=>x.id===item.productoId)
              return (
                <tr key={i} className="border-b border-white/5 last:border-0">
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
