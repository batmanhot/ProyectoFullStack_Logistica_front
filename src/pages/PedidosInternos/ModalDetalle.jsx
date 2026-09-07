import { useState } from 'react'
import { Package, Printer, Layers, CheckCircle, PackageCheck, FileOutput, X } from 'lucide-react'
import { formatDateTime } from '../../utils/helpers'
import { LineaTiempo, ModalVistaPreviaDocumento } from '../../components/ui/index'
import { armarHtmlValeSalida, armarHtmlNotaDespachoInterno } from '../../utils/pdfTemplates'
import { ESTADOS, flujoTimeline, pasosTrazabilidad } from './constants'
import { Badge } from './Badge'

// ── Modal Detalle / Entrega ─────────────────────────────────
export function ModalDetalle({ pedido, onClose, onSave, areas, productos, almacenes, proyectos = [], pdfConfig, esAdmin, picking, entregando, puedeConfirmarRecibo, confirmando }) {
  const [error,      setError]      = useState('')
  const [showAviso,  setShowAviso]  = useState(false)
  const [preview,    setPreview]    = useState(null) // { titulo, html, numeroDocumento } | null
  const area    = areas.find(a => a.id === pedido.areaId)
  const almacen = almacenes.find(a => a.id === pedido.almacenId)
  // El pedido trae `proyecto` con solo id/codigo/nombre (ver findAll/findOne del
  // backend) — para el Vale de Salida necesitamos CDR/cliente también, así que
  // buscamos la versión completa en la lista de proyectos ya cargada.
  const proyectoCompleto = pedido.proyectoId ? proyectos.find(p => p.id === pedido.proyectoId) : null
  const ePI     = ESTADOS[pedido.estado] || ESTADOS.BORRADOR

  async function handlePicking() {
    const res = await onSave({ type: 'picking', id: pedido.id })
    if (res?.error) { setError(res.error); return }
  }
  async function handleEntregar() {
    const res = await onSave({ type: 'entregar', id: pedido.id })
    if (res?.error) { setError(res.error); return }
    setShowAviso(true)
  }
  async function handleConfirmarRecibo() {
    const res = await onSave({ type: 'confirmar', id: pedido.id })
    if (res?.error) { setError(res.error); return }
  }

  function handleValeSalida() {
    const html = armarHtmlValeSalida({ pedido, area, proyecto: proyectoCompleto, productos, config: pdfConfig })
    setPreview({ titulo: `Vale de Salida — ${pedido.numero}`, html, numeroDocumento: `Vale-${pedido.numero}` })
  }

  function handlePrint() {
    const html = armarHtmlNotaDespachoInterno({ pedido, area, almacen, productos, estadoLabel: ePI.label, config: pdfConfig })
    setPreview({ titulo: `Nota de Despacho Interno — ${pedido.numero}`, html, numeroDocumento: `NDI-${pedido.numero}` })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0e1117] border border-white/10 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold text-white">{pedido.numero}</span>
                <Badge estado={pedido.estado}/>
                <Badge prioridad={pedido.prioridad}/>
              </div>
              <div className="text-[11px] text-white/40 mt-0.5">{area?.nombre || pedido.areaId}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div className="bg-white/3 rounded-lg p-3">
              <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">Almacén</div>
              <div className="text-white/80 font-medium">{almacen?.nombre || pedido.almacenId}</div>
            </div>
            <div className="bg-white/3 rounded-lg p-3">
              <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">Proyecto</div>
              <div className="text-white/80 font-medium">{pedido.proyecto ? `${pedido.proyecto.codigo} — ${pedido.proyecto.nombre}` : 'Sin proyecto asignado'}</div>
            </div>
            <div className="bg-white/3 rounded-lg p-3">
              <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">Fecha requerida</div>
              <div className="text-white/80 font-medium">{pedido.fechaRequerida?.split('T')[0] || '—'}</div>
            </div>
            <div className="bg-white/3 rounded-lg p-3">
              <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">Solicitado por</div>
              <div className="text-white/80 font-medium">{pedido.usuarioSolicita?.nombre || '—'}</div>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wide mb-1">Trazabilidad</div>
            <LineaTiempo {...flujoTimeline(pedido)}/>
            <div className="flex flex-col gap-2 mt-3">
              {pasosTrazabilidad(pedido).map(p => (
                <div key={p.id} className="flex items-start gap-2.5 text-[12px]">
                  <span className="text-[13px] leading-none mt-0.5 shrink-0">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white/80 font-medium">{p.label}</span>
                      <span className="text-white/30 text-[11px] font-mono">{formatDateTime(p.fecha)}</span>
                      {p.actor && <span className="text-white/40 text-[11px]">· {p.actor}</span>}
                    </div>
                    {p.nota && <div className="text-white/40 text-[11px] mt-0.5">{p.nota}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wide mb-2">Productos solicitados</div>
            <div className="flex flex-col gap-1.5">
              {(pedido.items || []).map((it, i) => {
                const prod = productos.find(p => p.id === it.productoId)
                return (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-white/3 rounded-lg">
                    <div className="w-8 h-8 rounded-lg bg-[#00c896]/10 flex items-center justify-center shrink-0">
                      <Package size={14} className="text-[#00c896]"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-white/80 truncate">{prod?.nombre || it.productoId}</div>
                      {it.notas && <div className="text-[11px] text-white/30 truncate">{it.notas}</div>}
                    </div>
                    <div className="text-[13px] font-semibold text-white/70 shrink-0">
                      {it.cantidad} <span className="text-[11px] text-white/35 font-normal">{it.unidadMedida || prod?.unidadMedida}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {pedido.notasSolicitud && (
            <div className="bg-white/3 rounded-lg p-3">
              <div className="text-[10px] text-white/35 uppercase tracking-wide mb-1">Notas de solicitud</div>
              <div className="text-[12px] text-white/60">{pedido.notasSolicitud}</div>
            </div>
          )}
          {error && <div className="px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-lg text-[13px] text-red-400 whitespace-pre-line">{error}</div>}
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-white/8">
          <div className="flex items-center gap-3">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors">
              <Printer size={13}/> Imprimir NDI
            </button>
            {pedido.estado === 'ENTREGADO' && (
              <button onClick={handleValeSalida}
                className="flex items-center gap-1.5 text-[12px] text-[#00c896]/70 hover:text-[#00c896] transition-colors">
                <FileOutput size={13}/> Vale de Salida
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-[13px] text-white/50 hover:text-white/80 transition-colors">Cerrar</button>
            {pedido.estado === 'APROBADO' && esAdmin && (
              <button disabled={picking} onClick={handlePicking}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-[#1a0a00] text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50">
                <Layers size={14}/> {picking ? 'Procesando...' : 'Iniciar Picking'}
              </button>
            )}
            {pedido.estado === 'PICKING' && (
              <button disabled={entregando} onClick={handleEntregar}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#00c896] hover:bg-[#009e76] text-[#082e1e] text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50">
                <CheckCircle size={14}/> {entregando ? 'Procesando...' : 'Marcar Entregado'}
              </button>
            )}
            {pedido.estado === 'ENTREGADO' && !pedido.reciboConfirmado && puedeConfirmarRecibo && (
              <button disabled={confirmando} onClick={handleConfirmarRecibo}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#00c896] hover:bg-[#009e76] text-[#082e1e] text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50">
                <PackageCheck size={14}/> {confirmando ? 'Procesando...' : 'Confirmar recibo'}
              </button>
            )}
          </div>
        </div>
      </div>

      {showAviso && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0e1117] border border-[#00c896]/30 rounded-2xl w-full max-w-md">
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00c896]/15 flex items-center justify-center shrink-0">
                  <PackageCheck size={20} className="text-[#00c896]"/>
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-white">¡Pedido entregado!</div>
                  <div className="text-[11px] text-white/40">{pedido.numero} · {area?.nombre}</div>
                </div>
              </div>
              <p className="text-[12px] text-white/50 leading-relaxed">
                Notifica al área que su pedido está listo. Copia el mensaje y envíalo por WhatsApp o correo:
              </p>
              <div className="bg-[#1a2530] rounded-xl p-4 border border-white/6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-white/35 uppercase tracking-wide">Mensaje WhatsApp</span>
                  <button
                    onClick={() => {
                      const msg = `✅ *Pedido Interno Listo para Recojo*\n\n📦 Pedido: *${pedido.numero}*\n🏢 Área: *${area?.nombre}*\n\nTu solicitud está lista en el *${almacen?.nombre || 'Almacén'}*. Por favor acércate a recogerla en horario de oficina.\n\n_Sistema StockPro_`
                      navigator.clipboard?.writeText(msg).then(() => {})
                    }}
                    className="text-[11px] text-[#00c896] hover:text-[#009e76] transition-colors font-medium">
                    Copiar
                  </button>
                </div>
                <div className="text-[11px] text-white/60 leading-relaxed whitespace-pre-line font-mono">
                  {`✅ Pedido Interno Listo\n📦 ${pedido.numero} · ${area?.nombre}\nRetiro en: ${almacen?.nombre || 'Almacén'}`}
                </div>
              </div>
              <div className="text-[11px] text-white/25 text-center">
                El solicitante también verá un aviso al ingresar a la app
              </div>
            </div>
            <div className="px-6 pb-5">
              <button onClick={() => { setShowAviso(false); onClose() }}
                className="w-full py-2.5 bg-[#00c896] hover:bg-[#009e76] text-[#082e1e] text-[13px] font-semibold rounded-lg transition-colors">
                Listo, cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalVistaPreviaDocumento
        open={!!preview}
        onClose={() => setPreview(null)}
        titulo={preview?.titulo}
        html={preview?.html}
        numeroDocumento={preview?.numeroDocumento}
      />
    </div>
  )
}
