/**
 * PortalProveedoresB2B.jsx — Portal de Proveedores (B2B)
 *
 * ESTRUCTURA:
 *   Vista ADMIN  → Panel interno para el operador. Muestra la lista
 *                  de proveedores, facturas recibidas y el historial.
 *                  Desde aquí se accede al portal simulado de cada proveedor.
 *
 *   Vista PROVEEDOR → Portal independiente con header propio (sin Sidebar).
 *                     El proveedor ve sus OC, sube facturas y consulta entregas.
 *                     Misma experiencia que el Portal de Pedidos del cliente.
 *
 * Datos: localStorage — sp_ordenes, sp_proveedores, sp_b2b_facturas
 */
import { useState, useMemo } from 'react'
import { Building2, FileText, CheckCircle, Send, Eye, ArrowLeft,
         Search, Truck, Clock, Package, Globe, ChevronDown,
         ChevronUp, Copy, Check, ExternalLink } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatDate, formatCurrency, fechaHoy } from '../utils/helpers'
import { Modal, Btn, Field, Badge, EmptyState } from '../components/ui/index'

// ─────────────────────────────────────────────────────────
// Persistencia
// ─────────────────────────────────────────────────────────
const B2B_KEY = 'sp_b2b_facturas'
const leer  = () => { try { return JSON.parse(localStorage.getItem(B2B_KEY)||'[]') } catch { return [] } }
const guardar = d => localStorage.setItem(B2B_KEY, JSON.stringify(d))

// ─────────────────────────────────────────────────────────
// Metadatos de estados de OC
// ─────────────────────────────────────────────────────────
const ESTADO_OC = {
  PENDIENTE: { label:'Pendiente',  color:'#f59e0b', variant:'warning', icon:'⏳' },
  APROBADA:  { label:'Aprobada',   color:'#3b82f6', variant:'info',    icon:'✅' },
  PARCIAL:   { label:'Parcial',    color:'#f59e0b', variant:'warning', icon:'📦' },
  RECIBIDA:  { label:'Recibida',   color:'#22c55e', variant:'success', icon:'✔️'  },
  CANCELADA: { label:'Cancelada',  color:'#ef4444', variant:'danger',  icon:'❌' },
}

// ─────────────────────────────────────────────────────────
// Modal: subir factura electrónica contra una OC
// ─────────────────────────────────────────────────────────
function ModalFactura({ oc, provNombre, onClose, onSave }) {
  const SI = 'w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[13px] text-white outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 placeholder-white/30 font-[inherit]'
  const [form, setForm] = useState({ numero:'', fecha:fechaHoy(), monto:'', notas:'' })
  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  return (
    <Modal open title={`Subir Factura — ${oc.numero}`} onClose={onClose} size="sm"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={() => {
            if (!form.numero.trim()) return
            onSave({ ocId:oc.id, ocNumero:oc.numero, provNombre,
              ...form, id:Date.now().toString(36),
              estado:'ENVIADA', createdAt:new Date().toISOString() })
            onClose()
          }}>
            <Send size={13}/> Confirmar envío
          </Btn>
        </>
      }>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[12px] text-blue-300">
          <FileText size={15} className="shrink-0 mt-0.5"/>
          <div>
            Estás enviando tu factura contra la OC <strong className="text-white">{oc.numero}</strong>.
            El equipo de compras la recibirá al instante en el sistema, sin necesidad de email.
          </div>
        </div>
        <Field label="N° Factura electrónica *">
          <input className="w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]"
            value={form.numero} onChange={e=>f('numero',e.target.value)} placeholder="F001-00001234"/>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha de factura">
            <input type="date" className="w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] font-[inherit]"
              value={form.fecha} onChange={e=>f('fecha',e.target.value)}/>
          </Field>
          <Field label="Monto total">
            <input type="number" className="w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] font-[inherit]"
              value={form.monto} onChange={e=>f('monto',e.target.value)} placeholder="0.00"/>
          </Field>
        </div>
        <Field label="Notas u observaciones">
          <textarea className="w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] font-[inherit] resize-y min-h-[56px] placeholder-[#5f6f80]"
            value={form.notas} onChange={e=>f('notas',e.target.value)} placeholder="Guía de remisión, N° lote, observaciones..."/>
        </Field>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// VISTA PROVEEDOR — Portal independiente con su propio header
// Misma experiencia visual que el Portal de Pedidos del cliente
// ─────────────────────────────────────────────────────────
function PortalProveedor({ proveedor, ordenes, facturas, productos=[], onVolver, onFactura, simboloMoneda, empresa }) {
  const [tab,       setTab]       = useState('oc')
  const [modalOC,   setModalOC]   = useState(null)
  const [expandId,  setExpandId]  = useState(null)

  const ocVigentes  = ordenes.filter(o => o.proveedorId===proveedor.id && ['PENDIENTE','APROBADA','PARCIAL'].includes(o.estado))
  const ocHistorial = ordenes.filter(o => o.proveedorId===proveedor.id && ['RECIBIDA','CANCELADA'].includes(o.estado))
  const misFac      = facturas.filter(f => f.provNombre===proveedor.razonSocial)

  const TABS = [
    { id:'oc',        label:'Mis OC',       emoji:'📋', count: ocVigentes.length  },
    { id:'facturas',  label:'Mis facturas', emoji:'📄', count: misFac.length      },
    { id:'historial', label:'Historial',    emoji:'📦', count: ocHistorial.length  },
  ]

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* ── Header del portal proveedor — igual que PortalPedidos ── */}
      <div className="bg-[#00c896] px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onVolver}
            className="flex items-center gap-1.5 text-[#082e1e]/70 hover:text-[#082e1e] text-[12px] font-medium transition-colors mr-2">
            <ArrowLeft size={15}/> Volver al panel
          </button>
          <Globe size={20} className="text-[#082e1e]"/>
          <div>
            <div className="font-bold text-[#082e1e] text-[15px]">Portal de Proveedores</div>
            <div className="text-[11px] text-[#082e1e]/70">{empresa}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[13px] font-bold text-[#082e1e]">{proveedor.razonSocial}</div>
          <div className="text-[11px] text-[#082e1e]/60">RUC: {proveedor.ruc||'—'} · Solo lectura</div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-[#161d28] border-b border-white/[0.08] px-6 shrink-0">
        <div className="flex gap-0">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`px-5 py-3.5 text-[13px] font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                tab===t.id ? 'border-[#00c896] text-[#00c896]' : 'border-transparent text-[#5f6f80] hover:text-[#9ba8b6]'
              }`}>
              <span>{t.emoji}</span> {t.label}
              {t.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  tab===t.id ? 'bg-[#00c896]/20 text-[#00c896]' : 'bg-white/10 text-[#5f6f80]'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPIs rápidos ── */}
      <div className="grid grid-cols-3 gap-3 px-6 py-4 bg-[#0e1117] shrink-0">
        {[
          { label:'OC vigentes',       val:ocVigentes.length,                                   color:'#3b82f6' },
          { label:'Facturas enviadas', val:misFac.length,                                        color:'#00c896' },
          { label:'Entregas recibidas',val:ocHistorial.filter(o=>o.estado==='RECIBIDA').length,  color:'#22c55e' },
        ].map(({label,val,color})=>(
          <div key={label} className="bg-[#161d28] border border-white/[0.08] rounded-xl px-4 py-3">
            <div className="text-[22px] font-bold" style={{color}}>{val}</div>
            <div className="text-[11px] text-white/40 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Contenido tabs ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">

        {/* ── TAB: MIS OC ──────────────────────────────── */}
        {tab === 'oc' && (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-white/40 mb-1">
              Aquí aparecen todas las órdenes de compra que te hemos emitido y que aún están pendientes de entrega.
              Cuando hayas despachado, súbenos tu factura con el botón correspondiente.
            </p>
            {ocVigentes.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-[13px]">
                <FileText size={36} className="mx-auto mb-3 opacity-30"/>
                No tienes órdenes de compra vigentes en este momento
              </div>
            ) : ocVigentes.map(oc => {
              const meta        = ESTADO_OC[oc.estado] || ESTADO_OC.PENDIENTE
              const tieneFactura= facturas.some(f=>f.ocId===oc.id)
              const expand      = expandId === oc.id
              return (
                <div key={oc.id} className="bg-[#161d28] border border-white/[0.08] rounded-2xl overflow-hidden">
                  {/* Cabecera de la OC */}
                  <div className="px-5 py-4 flex items-center gap-4 cursor-pointer"
                    onClick={()=>setExpandId(expand?null:oc.id)}>
                    <span className="text-[20px] shrink-0">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[13px] text-[#00c896] font-bold">{oc.numero}</span>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        {tieneFactura && <Badge variant="success"><CheckCircle size={9}/> Factura enviada</Badge>}
                      </div>
                      <div className="text-[11px] text-white/40">
                        Emitida: {formatDate(oc.fecha)} · {(oc.items||[]).length} productos ·{' '}
                        <span className="font-mono text-white/60">{formatCurrency(oc.total||0, simboloMoneda)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {!tieneFactura && oc.estado !== 'CANCELADA' && (
                        <button
                          onClick={e=>{ e.stopPropagation(); setModalOC(oc) }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00c896] text-[#082e1e] text-[12px] font-bold hover:bg-[#00b386] transition-all">
                          <Send size={12}/> Subir factura
                        </button>
                      )}
                      {expand ? <ChevronUp size={15} className="text-white/30"/> : <ChevronDown size={15} className="text-white/30"/>}
                    </div>
                  </div>

                  {/* Detalle expandible */}
                  {expand && (
                    <div className="px-5 pb-4 border-t border-white/[0.06]">
                      <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wide mt-3 mb-2">
                        Productos de esta OC
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {(oc.items||[]).map((item,i)=>(
                          <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-white/[0.04] last:border-0">
                            {(() => {
                              const prod = productos.find(p=>p.id===(item.productoId||item.id))
                              const nombre = prod?.nombre || item.nombre || item.descripcion || item.productoId || 'Producto'
                              const um     = prod?.unidadMedida || item.unidadMedida || 'unid.'
                              const cant   = item.cantidad || item.qty || 0
                              const precioU= item.costoUnitario || item.precioUnitario || 0
                              const subtotal = item.subtotal || item.total || cant * precioU
                              return (<>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[12px] text-white font-medium truncate">{nombre}</div>
                                  {prod?.sku && <div className="text-[10px] text-white/30 font-mono">{prod.sku}</div>}
                                </div>
                                <div className="text-[11px] text-white/40 shrink-0 text-right">
                                  <div>{cant} {um}</div>
                                  {precioU > 0 && <div className="text-[10px] text-white/25">{formatCurrency(precioU,simboloMoneda)} c/u</div>}
                                </div>
                                <div className="font-mono text-[13px] font-bold text-[#00c896] shrink-0 min-w-[72px] text-right">{formatCurrency(subtotal,simboloMoneda)}</div>
                              </>)
                            })()}
                          </div>
                        ))}
                        <div className="flex justify-end text-[13px] font-bold text-[#00c896] pt-2 font-mono">
                          Total: {formatCurrency(oc.total||0, simboloMoneda)}
                        </div>
                      </div>
                      {oc.notas && (
                        <div className="mt-2 text-[11px] text-white/40">Notas: {oc.notas}</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── TAB: MIS FACTURAS ────────────────────────── */}
        {tab === 'facturas' && (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-white/40 mb-1">
              Facturas que has enviado a través del portal. Cada una está vinculada a una OC específica.
            </p>
            {misFac.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-[13px]">
                <Send size={36} className="mx-auto mb-3 opacity-30"/>
                Aún no has enviado facturas. Hazlo desde la pestaña "Mis OC".
              </div>
            ) : misFac.map(fac=>(
              <div key={fac.id} className="bg-[#161d28] border border-white/[0.08] rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                  <CheckCircle size={18} className="text-green-400"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[13px] text-[#00c896] font-bold">{fac.numero}</div>
                  <div className="text-[11px] text-white/40 mt-0.5">
                    Para OC: {fac.ocNumero} · Fecha: {formatDate(fac.fecha)}
                  </div>
                  {fac.notas && <div className="text-[11px] text-white/30 mt-0.5 truncate">{fac.notas}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-[13px] text-white/70">{fac.monto?formatCurrency(+fac.monto,simboloMoneda):'—'}</div>
                  <Badge variant="success" className="mt-1">Recibida</Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB: HISTORIAL ───────────────────────────── */}
        {tab === 'historial' && (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-white/40 mb-1">
              Historial de órdenes de compra ya completadas o canceladas. Solo consulta.
            </p>
            {ocHistorial.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-[13px]">
                <Truck size={36} className="mx-auto mb-3 opacity-30"/>
                Aún no hay entregas completadas en el historial
              </div>
            ) : ocHistorial.map(oc=>{
              const meta = ESTADO_OC[oc.estado]||ESTADO_OC.RECIBIDA
              return (
                <div key={oc.id} className="bg-[#161d28] border border-white/[0.08] rounded-2xl px-5 py-4 flex items-center gap-4">
                  <span className="text-[20px] shrink-0">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] text-[#00c896] font-bold">{oc.numero}</span>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>
                    <div className="text-[11px] text-white/40 mt-0.5">
                      {formatDate(oc.fecha)} · {(oc.items||[]).length} productos
                    </div>
                  </div>
                  <div className="font-mono text-[13px] text-white/60 shrink-0">
                    {formatCurrency(oc.total||0, simboloMoneda)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal factura */}
      {modalOC && (
        <ModalFactura oc={modalOC} provNombre={proveedor.razonSocial}
          onClose={()=>setModalOC(null)} onSave={fac=>{onFactura(fac);setModalOC(null)}}/>
      )}

      {/* Footer */}
      <div className="text-center py-3 text-[10px] text-white/20 border-t border-white/[0.06] shrink-0">
        Portal de Proveedores B2B · {empresa} · Solo lectura
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// VISTA ADMIN — Panel interno del operador
// ─────────────────────────────────────────────────────────
export default function PortalProveedoresB2B() {
  const { ordenes, proveedores, productos, simboloMoneda, config, toast } = useApp()
  const [facturas,   setFacturas]   = useState(leer)
  const [provActivo, setProvActivo] = useState(null)
  const [busqueda,   setBusqueda]   = useState('')
  const [tab,        setTab]        = useState('proveedores') // proveedores | facturas
  const [copied,     setCopied]     = useState('')

  const empresa = config?.empresa || 'Distribuidora Lima Norte S.A.C.'

  // Proveedores que tienen al menos una OC registrada
  const provConOC = useMemo(()=>{
    const ids = new Set(ordenes.map(o=>o.proveedorId).filter(Boolean))
    return proveedores.filter(p=>ids.has(p.id)&&p.activo!==false)
  },[ordenes,proveedores])

  const provFiltrados = useMemo(()=>{
    if (!busqueda) return provConOC
    const q = busqueda.toLowerCase()
    return provConOC.filter(p=>p.razonSocial?.toLowerCase().includes(q)||p.ruc?.includes(q))
  },[provConOC,busqueda])

  function handleFactura(fac) {
    const nueva = [...facturas, fac]
    guardar(nueva)
    setFacturas(nueva)
    toast(`Factura ${fac.numero} recibida de ${fac.provNombre}`, 'success')
  }

  function copiar(text, key) {
    navigator.clipboard?.writeText(text).then(()=>{ setCopied(key); setTimeout(()=>setCopied(''),2000) })
  }

  // ── Si hay proveedor seleccionado → mostrar su portal ──
  if (provActivo) {
    return (
      <PortalProveedor
        proveedor={provActivo}
        ordenes={ordenes}
        facturas={facturas}
        productos={productos}
        onVolver={()=>setProvActivo(null)}
        onFactura={handleFactura}
        simboloMoneda={simboloMoneda}
        empresa={empresa}/>
    )
  }

  // ── KPIs generales ─────────────────────────────────────
  const ocVigentes = ordenes.filter(o=>['PENDIENTE','APROBADA','PARCIAL'].includes(o.estado))
  const ocSinFac   = ocVigentes.filter(o=>!facturas.some(f=>f.ocId===o.id))

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* ── Banner explicativo — idéntico al de PortalPedidos ── */}
      <div className="flex items-center gap-4 px-5 py-4 rounded-xl"
        style={{background:'rgba(0,200,150,0.08)',border:'1px solid rgba(0,200,150,0.20)'}}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{background:'rgba(0,200,150,0.15)'}}>
          <Building2 size={24} className="text-[#00c896]"/>
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-bold text-[#e8edf2] mb-1">Portal de Proveedores (B2B)</div>
          <div className="text-[12px] text-[#9ba8b6] leading-relaxed">
            Cada proveedor puede ver sus órdenes de compra vigentes, subir su factura electrónica y consultar
            el historial de entregas — <strong className="text-[#e8edf2]">sin necesidad de llamadas ni emails.</strong>{' '}
            Selecciona un proveedor para acceder a su vista.
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label:'Proveedores con OC', val:provConOC.length,    color:'#00c896' },
          { label:'OC vigentes',        val:ocVigentes.length,   color:'#3b82f6' },
          { label:'Facturas recibidas', val:facturas.length,     color:'#22c55e' },
          { label:'OC sin factura',     val:ocSinFac.length,     color: ocSinFac.length>0?'#f59e0b':'#5f6f80' },
        ].map(({label,val,color})=>(
          <div key={label} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-4 py-3 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{background:color}}/>
            <div className="text-[26px] font-bold mt-1" style={{color}}>{val}</div>
            <div className="text-[11px] text-[#5f6f80] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-[#1a2230] rounded-xl p-1.5">
        {[
          { id:'proveedores', label:`Proveedores (${provConOC.length})`      },
          { id:'facturas',    label:`Facturas recibidas (${facturas.length})` },
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-[12px] font-medium transition-all ${
              tab===t.id ? 'bg-[#00c896]/15 text-[#00c896]' : 'text-[#5f6f80] hover:text-[#9ba8b6]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: PROVEEDORES ───────────────────────────── */}
      {tab === 'proveedores' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5 flex flex-col gap-4">

          {/* Buscador */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
              <input className="w-full pl-8 pr-3 py-[6px] bg-[#1e2835] border border-white/[0.08] rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896] placeholder-[#5f6f80]"
                placeholder="Buscar proveedor o RUC..."
                value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
            </div>
            <span className="text-[11px] text-[#5f6f80] whitespace-nowrap">{provFiltrados.length} proveedores</span>
          </div>

          {/* Lista */}
          {provFiltrados.length === 0 ? (
            <EmptyState icon={Building2} title="Sin proveedores con OC"
              description="Registra proveedores en el módulo de Compras y crea órdenes de compra para que aparezcan aquí."/>
          ) : (
            <div className="flex flex-col gap-2">
              {provFiltrados.map(prov=>{
                const ocProv  = ordenes.filter(o=>o.proveedorId===prov.id)
                const vigentes= ocProv.filter(o=>['PENDIENTE','APROBADA','PARCIAL'].includes(o.estado))
                const misFac  = facturas.filter(f=>f.provNombre===prov.razonSocial)
                const sinFac  = vigentes.filter(o=>!facturas.some(f=>f.ocId===o.id))
                const initials= (prov.razonSocial||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

                return (
                  <div key={prov.id}
                    className="bg-[#1a2230] border border-white/[0.08] rounded-xl px-4 py-3.5 flex items-center gap-4 hover:border-[#00c896]/30 transition-all group">

                    {/* Avatar inicial */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold text-[#00c896] shrink-0"
                      style={{background:'rgba(0,200,150,0.12)'}}>
                      {initials}
                    </div>

                    {/* Info proveedor */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[#e8edf2] leading-tight truncate">{prov.razonSocial}</div>
                      <div className="text-[11px] text-[#5f6f80] mt-0.5">
                        RUC: {prov.ruc||'—'} ·{' '}
                        <span className="text-[#3b82f6]">{vigentes.length} OC vigentes</span>
                        {sinFac.length > 0 && <span className="text-amber-400 ml-1">· {sinFac.length} sin factura</span>}
                        {misFac.length > 0 && <span className="text-green-400 ml-1">· {misFac.length} facturas</span>}
                      </div>
                    </div>

                    {/* Botón acceder al portal */}
                    <button
                      onClick={()=>setProvActivo(prov)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#00c896]/10 text-[#00c896] text-[12px] font-semibold hover:bg-[#00c896]/20 transition-all shrink-0">
                      <Eye size={13}/> Ver portal
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: FACTURAS RECIBIDAS ─────────────────────── */}
      {tab === 'facturas' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5 flex flex-col gap-4">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide">
            Facturas enviadas por proveedores via portal B2B
          </div>
          {facturas.length === 0 ? (
            <EmptyState icon={FileText} title="Sin facturas recibidas"
              description="Accede al portal de un proveedor y envía una factura de prueba para verla aquí."/>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full border-collapse text-[13px]">
                <thead><tr>
                  {['N° Factura','Proveedor','OC ref.','Fecha','Monto','Estado'].map(h=>(
                    <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/[0.08] whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {facturas.map(fac=>(
                    <tr key={fac.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#00c896] font-semibold">{fac.numero}</td>
                      <td className="px-3.5 py-2.5 text-[12px] text-[#e8edf2]">{fac.provNombre}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{fac.ocNumero}</td>
                      <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6]">{formatDate(fac.fecha)}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-right">{fac.monto?formatCurrency(+fac.monto,simboloMoneda):'—'}</td>
                      <td className="px-3.5 py-2.5"><Badge variant="success"><CheckCircle size={9}/> Recibida</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
