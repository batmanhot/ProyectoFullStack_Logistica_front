/**
 * PortalProveedoresB2B.jsx — Portal de Proveedores (B2B), panel del operador
 *
 * El proveedor usa su propio link externo (/portal-proveedor/:token,
 * ver PortalProveedorPublico.jsx) para ver sus OC, subir facturas y
 * consultar entregas — sin sesión de StockPro. Este panel es donde el
 * operador genera/comparte ese link, y acepta o rechaza las facturas
 * que van llegando.
 *
 * Datos: NestJS /facturas-b2b — useFacturasB2BList + acciones de admin.
 * Link externo: POST /proveedores/:id/portal-link (JWT propio, ver
 * PortalProveedorGuard) — el mismo patrón que /clientes/:id/portal-link.
 */
import { useState, useMemo } from 'react'
import { Building2, FileText, CheckCircle, Search, Clock,
         XCircle, Info, Copy, Check, ExternalLink, Plus } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatDate, formatCurrency } from '../utils/helpers'
import { Modal, Btn, Field, Badge, EmptyState } from '../components/ui/index'
import { useOrdenesCompraList } from '../queries/ordenes-compra.queries'
import { useProveedoresList, useGenerarPortalLinkProveedor } from '../queries/proveedores.queries'
import {
  useFacturasB2BList, useCrearFacturaB2B, useRecibirFacturaB2B, useRechazarFacturaB2B,
} from '../queries/facturas-b2b.queries'

const simboloMoneda = 'S/'

// Estados reales de FacturaB2B (backend): ENVIADA es el default al crear —
// "Recibida" NO es automático, el comprador debe aceptarla o rechazarla.
const ESTADO_FACTURA = {
  ENVIADA:   { label:'Pendiente de revisión', variant:'warning' },
  RECIBIDA:  { label:'Aceptada',              variant:'success' },
  RECHAZADA: { label:'Rechazada',             variant:'danger'  },
}

export default function PortalProveedoresB2B() {
  const { toast } = useApp()
  const { data: ordenes     = [] } = useOrdenesCompraList()
  const { data: proveedores = [] } = useProveedoresList()
  const { data: facturas    = [] } = useFacturasB2BList()
  const crearFactura                = useCrearFacturaB2B()
  const recibirFactura              = useRecibirFacturaB2B()
  const rechazarFactura             = useRechazarFacturaB2B()
  const generarLink                 = useGenerarPortalLinkProveedor()

  const [busqueda,   setBusqueda]   = useState('')
  const [tab,        setTab]        = useState('proveedores')
  const [rechazando, setRechazando] = useState(null)   // factura a rechazar (modal de motivo)
  const [registrando,setRegistrando]= useState(false)  // modal de registro manual de factura
  const [links,      setLinks]      = useState({})     // proveedorId -> link ya generado (cache de esta sesión)
  const [generando,  setGenerando]  = useState('')      // proveedorId en curso
  const [copied,     setCopied]     = useState('')

  const portalBase = window.location.origin + '/portal-proveedor'

  // El link lleva un JWT firmado por el backend (PORTAL_JWT_SECRET) — nunca
  // se arma en el cliente. Se pide una sola vez por proveedor y se cachea.
  async function obtenerLink(proveedorId) {
    if (links[proveedorId]) return links[proveedorId]
    setGenerando(proveedorId)
    const res = await generarLink.mutateAsync(proveedorId)
    setGenerando('')
    if (res?.error || !res?.data?.token) {
      toast(res?.error || 'No se pudo generar el link del portal', 'error')
      return null
    }
    const link = `${portalBase}/${res.data.token}`
    setLinks(prev => ({ ...prev, [proveedorId]: link }))
    return link
  }

  function copiar(text, key) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key); setTimeout(() => setCopied(''), 2000)
    })
  }

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

  async function handleRegistrarFactura(dto) {
    const res = await crearFactura.mutateAsync(dto)
    if (res?.error) return { error: res.error }
    toast(`Factura ${res?.data?.numero ?? dto.numero} registrada`, 'success')
    return { ok: true }
  }

  async function handleRecibir(fac) {
    const res = await recibirFactura.mutateAsync(fac.id)
    if (res?.error) { toast(res.error, 'error'); return }
    toast(`Factura ${fac.numero} aceptada`, 'success')
  }

  async function handleRechazar(fac, motivo) {
    const res = await rechazarFactura.mutateAsync({ id: fac.id, motivo })
    if (res?.error) { toast(res.error, 'error'); return }
    toast(`Factura ${fac.numero} rechazada`, 'success')
  }

  // ── KPIs generales ─────────────────────────────────────
  const ocVigentes    = ordenes.filter(o=>['PENDIENTE','APROBADA','PARCIAL'].includes(o.estado))
  const ocSinFac      = ocVigentes.filter(o => !facturas.some(f => f.ordenCompraId === o.id))
  const facPorRevisar = facturas.filter(f => f.estado === 'ENVIADA')

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* ── Banner explicativo ── */}
      <div className="flex items-start gap-4 px-5 py-4 rounded-xl"
        style={{background:'rgba(0,200,150,0.08)',border:'1px solid rgba(0,200,150,0.20)'}}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{background:'rgba(0,200,150,0.15)'}}>
          <Building2 size={24} className="text-[#00c896]"/>
        </div>
        <div className="flex-1 flex flex-col gap-3">
          <div>
            <div className="text-[14px] font-bold text-[#e8edf2] mb-1">Portal de Proveedores (B2B)</div>
            <div className="text-[12px] text-[#9ba8b6] leading-relaxed">
              <strong className="text-[#e8edf2]">¿Para qué sirve?</strong> Es el canal de autoservicio para que tus
              proveedores facturen contra una orden de compra sin depender de llamadas o correos: cada proveedor
              entra a un link propio, ve sus OC vigentes y envía los datos de su factura directamente, sin crear
              cuenta en StockPro. Tú controlas qué facturas quedan aprobadas y mantienes trazabilidad de qué OC
              todavía no tienen factura registrada.
            </div>
          </div>
          <div className="flex items-start gap-1.5 text-[11px] text-[#5f6f80]">
            <Info size={12} className="shrink-0 mt-0.5"/>
            <span>El link es un JWT firmado de larga duración (365 días) — no requiere contraseña, y cada proveedor
            solo ve sus propias OC y facturas. Por ahora solo se registran los datos de la factura (número, fecha,
            monto, notas): no se adjunta el PDF/XML, y aceptar o rechazar una factura no cambia el estado de la OC
            automáticamente — son procesos independientes.</span>
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label:'Proveedores con OC',    val:provConOC.length,      color:'#00c896' },
          { label:'OC vigentes',           val:ocVigentes.length,     color:'#3b82f6' },
          { label:'Facturas por revisar',  val:facPorRevisar.length,  color: facPorRevisar.length>0?'#f59e0b':'#5f6f80' },
          { label:'OC sin factura',        val:ocSinFac.length,       color: ocSinFac.length>0?'#f59e0b':'#5f6f80' },
        ].map(({label,val,color})=>(
          <div key={label} className="relative bg-[#161d28] border border-white/8 rounded-xl px-4 py-3 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{background:color}}/>
            <div className="text-[28px] font-semibold mt-1" style={{color}}>{val}</div>
            <div className="text-[11px] text-[#5f6f80] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-[#1a2230] rounded-xl p-1.5">
        {[
          { id:'proveedores', label:`Proveedores (${provConOC.length})` },
          { id:'facturas',    label:`Facturas (${facturas.length})${facPorRevisar.length>0 ? ` · ${facPorRevisar.length} por revisar` : ''}` },
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
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5 flex flex-col gap-4">

          {/* Buscador */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
              <input className="w-full pl-8 pr-3 py-1.5 bg-[#1e2835] border border-white/8 rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896] placeholder-[#5f6f80]"
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
                const misFac  = facturas.filter(f=>f.proveedorId===prov.id)
                const sinFac  = vigentes.filter(o=>!facturas.some(f=>f.ordenCompraId===o.id))
                const initials= (prov.razonSocial||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
                const link    = links[prov.id]

                return (
                  <div key={prov.id}
                    className="bg-[#1a2230] border border-white/8 rounded-xl px-4 py-3.5 flex items-center gap-4 hover:border-[#00c896]/30 transition-all group">

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
                      {link && (
                        <a href={link} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-[#00c896]/70 font-mono truncate hover:text-[#00c896] hover:underline block mt-0.5">{link}</a>
                      )}
                    </div>

                    {/* Acciones: generar/copiar/abrir link */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Btn variant="ghost" size="sm" disabled={generando===prov.id}
                        onClick={async () => {
                          const l = await obtenerLink(prov.id)
                          if (l) copiar(l, prov.id)
                        }}>
                        {copied===prov.id ? <Check size={12} className="text-green-400"/> : <Copy size={12}/>}
                        {generando===prov.id ? 'Generando...' : copied===prov.id ? 'Copiado' : 'Copiar link'}
                      </Btn>
                      <Btn variant="ghost" size="sm" disabled={generando===prov.id}
                        onClick={async () => {
                          const l = await obtenerLink(prov.id)
                          if (l) window.open(l, '_blank')
                        }}>
                        <ExternalLink size={12}/> Abrir portal
                      </Btn>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: FACTURAS ────────────────────────────────── */}
      {tab === 'facturas' && (
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide">
              Facturas enviadas por proveedores vía portal B2B — acepta o rechaza las que estén "Pendiente de revisión"
            </div>
            <Btn variant="ghost" size="sm" onClick={()=>setRegistrando(true)}>
              <Plus size={12}/> Registrar factura manual
            </Btn>
          </div>
          {facturas.length === 0 ? (
            <EmptyState icon={FileText} title="Sin facturas recibidas"
              description="Comparte el link del portal con un proveedor para que suba su factura, o regístrala manualmente."/>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full border-collapse text-[13px]">
                <thead><tr>
                  {['N° Factura','Proveedor','OC ref.','Fecha','Monto','Estado',''].map(h=>(
                    <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/8 whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {facturas.map(fac=>{
                    const estMeta   = ESTADO_FACTURA[fac.estado] || ESTADO_FACTURA.ENVIADA
                    const pendiente = fac.estado === 'ENVIADA'
                    return (
                      <tr key={fac.id} className="border-b border-white/6 last:border-0 hover:bg-white/2">
                        <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#00c896] font-semibold">{fac.numero}</td>
                        <td className="px-3.5 py-2.5 text-[12px] text-[#e8edf2]">{fac.proveedor?.razonSocial}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{fac.ordenCompra?.numero}</td>
                        <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6]">{formatDate(fac.fecha)}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[12px] text-right">{fac.monto?formatCurrency(+fac.monto,simboloMoneda):'—'}</td>
                        <td className="px-3.5 py-2.5">
                          <Badge variant={estMeta.variant}>
                            {fac.estado==='RECIBIDA' && <CheckCircle size={9}/>}
                            {fac.estado==='RECHAZADA' && <XCircle size={9}/>}
                            {fac.estado==='ENVIADA' && <Clock size={9}/>}
                            {' '}{estMeta.label}
                          </Badge>
                        </td>
                        <td className="px-3.5 py-2.5">
                          {pendiente && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={()=>handleRecibir(fac)}
                                disabled={recibirFactura.isPending}
                                className="flex items-center gap-1 px-2.5 py-1 bg-[#00c896]/10 border border-[#00c896]/20 text-[#00c896] rounded-lg text-[11px] hover:bg-[#00c896]/20 transition-colors disabled:opacity-40">
                                <CheckCircle size={10}/> Aceptar
                              </button>
                              <button
                                onClick={()=>setRechazando(fac)}
                                disabled={rechazarFactura.isPending}
                                className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-[11px] hover:bg-red-500/20 transition-colors disabled:opacity-40">
                                <XCircle size={10}/> Rechazar
                              </button>
                            </div>
                          )}
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

      {/* Guía de uso */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el flujo completo del Portal de Proveedores?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {[
            ['1. Compartir link',      'Generas y compartes el link de un proveedor desde la pestaña "Proveedores" (botón "Copiar link" o "Abrir portal").'],
            ['2. Proveedor factura',   'El proveedor entra a ese link (sin login), ve sus OC vigentes y registra los datos de su factura (número, fecha, monto) contra la OC correspondiente.'],
            ['3. Aceptas o rechazas',  'Revisas en la pestaña "Facturas" cada factura "Pendiente de revisión" y decides Aceptar o Rechazar (con motivo opcional).'],
            ['4. Proveedor ve el resultado', 'El proveedor ve el resultado la próxima vez que entra a su link. También puedes registrar una factura manualmente si te la hizo llegar fuera del portal.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: motivo de rechazo */}
      {rechazando && (
        <ModalRechazarFactura
          factura={rechazando}
          onClose={()=>setRechazando(null)}
          onConfirm={(motivo)=>{ handleRechazar(rechazando, motivo); setRechazando(null) }}
        />
      )}

      {/* Modal: registro manual de factura (ej. el proveedor llamó por teléfono) */}
      {registrando && (
        <ModalRegistrarFactura
          proveedores={provConOC}
          ordenes={ordenes}
          facturas={facturas}
          saving={crearFactura.isPending}
          onClose={()=>setRegistrando(false)}
          onSave={async (dto) => {
            const res = await handleRegistrarFactura(dto)
            if (!res.error) setRegistrando(false)
            return res
          }}
        />
      )}

    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Modal: motivo de rechazo de una factura
// ─────────────────────────────────────────────────────────
function ModalRechazarFactura({ factura, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState('')
  return (
    <Modal open title={`Rechazar factura — ${factura.numero}`} onClose={onClose} size="sm"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn variant="danger" onClick={()=>onConfirm(motivo.trim() || undefined)}>
            <XCircle size={13}/> Rechazar factura
          </Btn>
        </>
      }>
      <Field label="Motivo del rechazo (opcional, lo verá el proveedor)">
        <textarea className="w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] font-[inherit] resize-y min-h-18 placeholder-[#5f6f80]"
          value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Ej. el monto no coincide con la OC, falta detalle de guía..."/>
      </Field>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Modal: registro manual de una factura (proveedor sin usar el portal)
// ─────────────────────────────────────────────────────────
function ModalRegistrarFactura({ proveedores, ordenes, facturas, saving, onClose, onSave }) {
  const [proveedorId, setProveedorId] = useState('')
  const [ordenCompraId, setOrdenCompraId] = useState('')
  const [numero, setNumero] = useState('')
  const [fecha, setFecha]   = useState(new Date().toISOString().slice(0,10))
  const [monto, setMonto]   = useState('')
  const [notas, setNotas]   = useState('')
  const [error, setError]   = useState('')

  const ocDisponibles = ordenes.filter(o =>
    o.proveedorId === proveedorId &&
    o.estado !== 'CANCELADA' &&
    !facturas.some(f => f.ordenCompraId === o.id),
  )

  async function confirmar() {
    setError('')
    if (!proveedorId)   return setError('Selecciona un proveedor.')
    if (!ordenCompraId) return setError('Selecciona la OC que factura.')
    if (!numero.trim()) return setError('Indica el número de factura.')
    const res = await onSave({
      ordenCompraId, numero,
      fecha: fecha || undefined,
      monto: monto ? +monto : undefined,
      notas: notas || undefined,
    })
    if (res?.error) setError(res.error)
  }

  return (
    <Modal open title="Registrar factura manualmente" onClose={onClose} size="sm"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" disabled={saving} onClick={confirmar}>
            {saving ? 'Guardando...' : 'Registrar factura'}
          </Btn>
        </>
      }>
      <div className="flex flex-col gap-4">
        <div className="text-[12px] text-[#9ba8b6]">
          Úsalo cuando el proveedor te haga llegar su factura fuera del portal (por teléfono, en persona, etc.).
        </div>
        <Field label="Proveedor *">
          <select className="w-full px-3 py-2.5 bg-[#1e2835] border border-white/8 rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896]"
            value={proveedorId} onChange={e=>{ setProveedorId(e.target.value); setOrdenCompraId('') }}>
            <option value="">Seleccionar...</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
          </select>
        </Field>
        <Field label="Orden de compra *">
          {proveedorId && ocDisponibles.length === 0 ? (
            <div className="px-3 py-2.5 bg-[#1e2835] border border-white/8 rounded-lg text-[12px] text-[#5f6f80]">
              Este proveedor no tiene OC vigentes sin factura
            </div>
          ) : (
            <select className="w-full px-3 py-2.5 bg-[#1e2835] border border-white/8 rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896]"
              value={ordenCompraId} onChange={e=>setOrdenCompraId(e.target.value)} disabled={!proveedorId}>
              <option value="">Seleccionar...</option>
              {ocDisponibles.map(o => <option key={o.id} value={o.id}>{o.numero} — {formatCurrency(Number(o.total)||0, simboloMoneda)}</option>)}
            </select>
          )}
        </Field>
        <Field label="N° Factura electrónica *">
          <input className="w-full px-3 py-2.5 bg-[#1e2835] border border-white/8 rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896] placeholder-[#5f6f80]"
            value={numero} onChange={e=>setNumero(e.target.value)} placeholder="F001-00001234"/>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha de factura">
            <input type="date" className="w-full px-3 py-2.5 bg-[#1e2835] border border-white/8 rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896]"
              value={fecha} onChange={e=>setFecha(e.target.value)}/>
          </Field>
          <Field label="Monto total">
            <input type="number" className="w-full px-3 py-2.5 bg-[#1e2835] border border-white/8 rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896] placeholder-[#5f6f80]"
              value={monto} onChange={e=>setMonto(e.target.value)} placeholder="0.00"/>
          </Field>
        </div>
        <Field label="Notas u observaciones">
          <textarea className="w-full px-3 py-2.5 bg-[#1e2835] border border-white/8 rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896] resize-y min-h-14 placeholder-[#5f6f80]"
            value={notas} onChange={e=>setNotas(e.target.value)}/>
        </Field>
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
            <span className="text-[11px] text-red-300">{error}</span>
          </div>
        )}
      </div>
    </Modal>
  )
}
