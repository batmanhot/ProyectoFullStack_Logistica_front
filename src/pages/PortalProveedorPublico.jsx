/**
 * PortalProveedorPublico.jsx — Portal público del proveedor (B2B)
 *
 * URL: /portal-proveedor/:token   donde :token es el JWT firmado generado
 *   por POST /api/proveedores/:id/portal-link desde el panel admin
 *   (PortalProveedoresB2B.jsx, pestaña "Proveedores" → "Copiar link").
 *
 * Auth: PortalProveedorGuard (secreto propio PORTAL_JWT_SECRET, scope
 *   'portal_proveedor' — nunca se mezcla con el scope 'portal_cliente').
 *   El token se envía como Authorization: Bearer en todas las llamadas.
 *
 * Endpoints consumidos (sin auth de tenant):
 *   GET  /portal-proveedor/ordenes   → OC del proveedor autenticado
 *   GET  /portal-proveedor/facturas  → facturas ya enviadas
 *   POST /portal-proveedor/facturas  → subir factura contra una OC
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Globe, FileText, CheckCircle, Send, ArrowLeft,
         ChevronDown, ChevronUp, Clock, XCircle, Truck } from 'lucide-react'
import { formatDate, formatCurrency, decodeJwtPayload } from '../utils/helpers'
import { api, tokenManager } from '../services/api'

const ESTADO_OC = {
  PENDIENTE: { label:'Pendiente',  variant:'warning', icon:'⏳' },
  APROBADA:  { label:'Aprobada',   variant:'info',    icon:'✅' },
  PARCIAL:   { label:'Parcial',    variant:'warning', icon:'📦' },
  RECIBIDA:  { label:'Recibida',   variant:'success', icon:'✔️'  },
  CANCELADA: { label:'Cancelada',  variant:'danger',  icon:'❌' },
}

const ESTADO_FACTURA = {
  ENVIADA:   { label:'Pendiente de revisión' },
  RECIBIDA:  { label:'Aceptada' },
  RECHAZADA: { label:'Rechazada' },
}

const simboloMoneda = 'S/'

export default function PortalProveedorPublico() {
  const { token } = useParams()
  const navigate  = useNavigate()

  const [cargando,  setCargando]  = useState(true)
  const [proveedor, setProveedor] = useState(null) // { id, nombre }
  const [ordenes,   setOrdenes]   = useState([])
  const [facturas,  setFacturas]  = useState([])

  const [tab,        setTab]       = useState('oc')
  const [modalOC,     setModalOC]  = useState(null)
  const [expandId,    setExpandId] = useState(null)

  const cargarDatos = useCallback(async () => {
    const [ords, facs] = await Promise.all([
      api.get('/portal-proveedor/ordenes',  { authType: 'portal-proveedor' }),
      api.get('/portal-proveedor/facturas', { authType: 'portal-proveedor' }),
    ])
    setOrdenes(ords.data ?? [])
    setFacturas(facs.data ?? [])
  }, [])

  useEffect(() => {
    if (!token) { navigate('/'); return }

    try {
      const payload = decodeJwtPayload(token)
      if (!payload || payload.scope !== 'portal_proveedor') { navigate('/'); return }

      tokenManager.setPortalProveedor(token)
      setProveedor({ id: payload.sub, nombre: payload.proveedorNombre || 'Proveedor' })

      cargarDatos().finally(() => setCargando(false))
    } catch {
      navigate('/')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleFactura(dto) {
    const res = await api.post('/portal-proveedor/facturas', dto, { authType: 'portal-proveedor' })
    if (res.error) return { error: res.error }
    await cargarDatos()
    return { ok: true }
  }

  const ocVigentes  = ordenes.filter(o => ['PENDIENTE','APROBADA','PARCIAL'].includes(o.estado))
  const ocHistorial = ordenes.filter(o => ['RECIBIDA','CANCELADA'].includes(o.estado))

  const TABS = [
    { id:'oc',        label:'Mis OC',       emoji:'📋', count: ocVigentes.length  },
    { id:'facturas',  label:'Mis facturas', emoji:'📄', count: facturas.length    },
    { id:'historial', label:'Historial',    emoji:'📦', count: ocHistorial.length },
  ]

  if (cargando) {
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
            <div className="font-bold text-[#082e1e] text-[15px]">Portal de Proveedores</div>
            <div className="text-[11px] text-[#082e1e]/70">StockPro</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[13px] font-bold text-[#082e1e]">{proveedor?.nombre}</div>
          <div className="text-[11px] text-[#082e1e]/60">Proveedor</div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-[#161d28] border-b border-white/8 px-4">
        <div className="flex gap-0 max-w-2xl mx-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-all ${
                tab===t.id ? 'border-[#00c896] text-[#00c896]' : 'border-transparent text-white/40 hover:text-white/70'
              }`}>
              {t.emoji} {t.label}
              {t.count > 0 && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-white/10">{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido ─────────────────────────────────── */}
      <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">

        {/* ── TAB: MIS OC ────────────────────────────── */}
        {tab === 'oc' && (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-white/40 mb-1">
              Órdenes de compra vigentes. Cuando hayas despachado, súbenos tu factura con el botón correspondiente.
            </p>
            {ocVigentes.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-[13px]">
                <FileText size={36} className="mx-auto mb-3 opacity-30"/>
                No tienes órdenes de compra vigentes en este momento
              </div>
            ) : ocVigentes.map(oc => {
              const meta         = ESTADO_OC[oc.estado] || ESTADO_OC.PENDIENTE
              const tieneFactura = facturas.some(f => f.ordenCompraId === oc.id)
              const expand       = expandId === oc.id
              return (
                <div key={oc.id} className="bg-[#161d28] border border-white/8 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 flex items-center gap-4 cursor-pointer"
                    onClick={()=>setExpandId(expand?null:oc.id)}>
                    <span className="text-[20px] shrink-0">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[13px] text-[#00c896] font-bold">{oc.numero}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/60">{meta.label}</span>
                        {tieneFactura && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 flex items-center gap-1">
                            <CheckCircle size={9}/> Factura enviada
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/40">
                        Emitida: {formatDate(oc.fecha)} · {(oc.items||[]).length} productos ·{' '}
                        <span className="font-mono text-white/60">{formatCurrency(Number(oc.total)||0, simboloMoneda)}</span>
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

                  {expand && (
                    <div className="px-5 pb-4 border-t border-white/6">
                      <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wide mt-3 mb-2">
                        Productos de esta OC
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {(oc.items||[]).map((item,i) => (
                          <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-white/4 last:border-0">
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] text-white font-medium truncate">{item.producto?.nombre || 'Producto'}</div>
                              {item.producto?.sku && <div className="text-[10px] text-white/30 font-mono">{item.producto.sku}</div>}
                            </div>
                            <div className="text-[11px] text-white/40 shrink-0 text-right">
                              <div>{Number(item.cantidad)} {item.producto?.unidadMedida||''}</div>
                              <div className="text-[10px] text-white/25">{formatCurrency(Number(item.costoUnitario)||0,simboloMoneda)} c/u</div>
                            </div>
                            <div className="font-mono text-[13px] font-bold text-[#00c896] shrink-0 min-w-[72px] text-right">
                              {formatCurrency(Number(item.cantidad)*Number(item.costoUnitario), simboloMoneda)}
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-end text-[13px] font-bold text-[#00c896] pt-2 font-mono">
                          Total: {formatCurrency(Number(oc.total)||0, simboloMoneda)}
                        </div>
                      </div>
                      {oc.notas && <div className="mt-2 text-[11px] text-white/40">Notas: {oc.notas}</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── TAB: MIS FACTURAS ─────────────────────── */}
        {tab === 'facturas' && (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-white/40 mb-1">
              Facturas que has enviado a través del portal. Cada una está vinculada a una OC específica.
            </p>
            {facturas.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-[13px]">
                <Send size={36} className="mx-auto mb-3 opacity-30"/>
                Aún no has enviado facturas. Hazlo desde la pestaña "Mis OC".
              </div>
            ) : facturas.map(fac => {
              const estMeta = ESTADO_FACTURA[fac.estado] || ESTADO_FACTURA.ENVIADA
              const Icon    = fac.estado==='RECHAZADA' ? XCircle : fac.estado==='RECIBIDA' ? CheckCircle : Clock
              const iconBg  = fac.estado==='RECHAZADA' ? 'bg-red-500/15' : fac.estado==='RECIBIDA' ? 'bg-green-500/15' : 'bg-amber-500/15'
              const iconCol = fac.estado==='RECHAZADA' ? 'text-red-400' : fac.estado==='RECIBIDA' ? 'text-green-400' : 'text-amber-400'
              return (
                <div key={fac.id} className="bg-[#161d28] border border-white/8 rounded-2xl px-5 py-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                    <Icon size={18} className={iconCol}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[13px] text-[#00c896] font-bold">{fac.numero}</div>
                    <div className="text-[11px] text-white/40 mt-0.5">
                      Para OC: {fac.ordenCompra?.numero} · Fecha: {formatDate(fac.fecha)}
                    </div>
                    {fac.estado==='RECHAZADA' && fac.notas && (
                      <div className="text-[11px] text-red-300 mt-0.5">Motivo del rechazo: {fac.notas}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-[13px] text-white/70">{fac.monto?formatCurrency(+fac.monto,simboloMoneda):'—'}</div>
                    <div className={`text-[10px] font-semibold mt-1 ${iconCol}`}>{estMeta.label}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── TAB: HISTORIAL ─────────────────────────── */}
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
            ) : ocHistorial.map(oc => {
              const meta = ESTADO_OC[oc.estado] || ESTADO_OC.RECIBIDA
              return (
                <div key={oc.id} className="bg-[#161d28] border border-white/8 rounded-2xl px-5 py-4 flex items-center gap-4">
                  <span className="text-[20px] shrink-0">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] text-[#00c896] font-bold">{oc.numero}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/60">{meta.label}</span>
                    </div>
                    <div className="text-[11px] text-white/40 mt-0.5">
                      {formatDate(oc.fecha)} · {(oc.items||[]).length} productos
                    </div>
                  </div>
                  <div className="font-mono text-[13px] text-white/60 shrink-0">
                    {formatCurrency(Number(oc.total)||0, simboloMoneda)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal factura */}
      {modalOC && (
        <ModalFacturaPublico oc={modalOC}
          onClose={()=>setModalOC(null)}
          onSave={async (dto, cerrar) => {
            const res = await handleFactura(dto)
            if (res.error) return res
            cerrar()
            return res
          }}/>
      )}

      {/* Footer */}
      <div className="text-center py-4 text-[10px] text-white/20 border-t border-white/6">
        Portal de Proveedores B2B · Powered by StockPro
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Modal: subir factura electrónica contra una OC
// ─────────────────────────────────────────────────────────
function ModalFacturaPublico({ oc, onClose, onSave }) {
  const SI = 'w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[13px] text-white outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 placeholder-white/30 font-[inherit]'
  const [form, setForm]   = useState({ numero:'', fecha:new Date().toISOString().slice(0,10), monto:'', notas:'' })
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  async function confirmar() {
    if (!form.numero.trim()) { setError('Indica el número de factura.'); return }
    setEnviando(true)
    setError('')
    const res = await onSave({
      ordenCompraId: oc.id,
      numero: form.numero,
      fecha:  form.fecha || undefined,
      monto:  form.monto ? +form.monto : undefined,
      notas:  form.notas || undefined,
    }, onClose)
    setEnviando(false)
    if (res?.error) setError(res.error)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#161d28] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <span className="text-[15px] font-semibold text-white">Subir Factura — {oc.numero}</span>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 text-[18px] leading-none">×</button>
        </div>
        <div className="px-6 py-6 flex flex-col gap-4">
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[12px] text-blue-300">
            <FileText size={15} className="shrink-0 mt-0.5"/>
            <div>
              Estás enviando tu factura contra la OC <strong className="text-white">{oc.numero}</strong>.
              El equipo de compras la recibirá al instante en el sistema.
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1.5">N° Factura electrónica *</label>
            <input className={SI} value={form.numero} onChange={e=>f('numero',e.target.value)} placeholder="F001-00001234"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1.5">Fecha de factura</label>
              <input type="date" className={SI} value={form.fecha} onChange={e=>f('fecha',e.target.value)}/>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1.5">Monto total</label>
              <input type="number" className={SI} value={form.monto} onChange={e=>f('monto',e.target.value)} placeholder="0.00"/>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1.5">Notas u observaciones</label>
            <textarea className={SI+' resize-y min-h-[56px]'} value={form.notas} onChange={e=>f('notas',e.target.value)}
              placeholder="Guía de remisión, N° lote, observaciones..."/>
          </div>
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">{error}</div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-white/8">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] text-white/50 hover:text-white/80 transition-colors">Cancelar</button>
          <button onClick={confirmar} disabled={enviando}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00c896] text-[#082e1e] text-[13px] font-bold hover:bg-[#00b386] disabled:opacity-40 transition-all">
            <Send size={13}/> {enviando ? 'Enviando...' : 'Confirmar envío'}
          </button>
        </div>
      </div>
    </div>
  )
}
