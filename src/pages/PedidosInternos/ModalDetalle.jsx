import { useState } from 'react'
import { Package, Printer, Layers, CheckCircle, PackageCheck, X } from 'lucide-react'
import { ESTADOS } from './constants'
import { Badge } from './Badge'

// ── Modal Detalle / Entrega ─────────────────────────────────
export function ModalDetalle({ pedido, onClose, onSave, areas, productos, almacenes, esAdmin, picking, entregando }) {
  const [error,      setError]      = useState('')
  const [showAviso,  setShowAviso]  = useState(false)
  const area    = areas.find(a => a.id === pedido.areaId)
  const almacen = almacenes.find(a => a.id === pedido.almacenId)
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

  function handlePrint() {
    const win = window.open('', '_blank', 'width=800,height=600')
    const items = (pedido.items || []).map(it => {
      const prod = productos.find(p => p.id === it.productoId)
      return `<tr>
        <td style="padding:8px;border:1px solid #ddd">${prod?.sku||'—'}</td>
        <td style="padding:8px;border:1px solid #ddd">${prod?.nombre||it.productoId}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${it.cantidad}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${it.unidadMedida||prod?.unidadMedida||'—'}</td>
        <td style="padding:8px;border:1px solid #ddd">${it.notas||''}</td>
      </tr>`
    }).join('')

    win.document.write(`<!DOCTYPE html><html><head>
      <title>Nota de Despacho Interno — ${pedido.numero}</title>
      <style>body{font-family:Arial,sans-serif;margin:30px;color:#222}
      h1{font-size:18px;margin:0}h2{font-size:14px;color:#555}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th{background:#f0f0f0;padding:8px;border:1px solid #ddd;font-size:12px;text-align:left}
      td{font-size:12px}
      .info{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0;font-size:12px}
      .info div{background:#f8f8f8;padding:10px;border-radius:4px}
      .label{font-size:10px;color:#888;text-transform:uppercase;margin-bottom:2px}
      .footer{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
      .firma{border-top:1px solid #999;padding-top:8px;text-align:center;font-size:11px;color:#555}
      </style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:start;border-bottom:2px solid #333;padding-bottom:12px">
        <div><h1>NOTA DE DESPACHO INTERNO</h1><h2>${pedido.numero}</h2></div>
        <div style="text-align:right;font-size:11px;color:#555">
          Estado: <b>${ePI.label}</b><br/>
          Fecha: ${pedido.fecha||pedido.createdAt||''}<br/>
          Prioridad: ${pedido.prioridad}
        </div>
      </div>
      <div class="info">
        <div><div class="label">Área Solicitante</div><b>${area?.nombre||pedido.areaId}</b><br/>${area?.codigo||''}</div>
        <div><div class="label">Almacén de Despacho</div><b>${almacen?.nombre||pedido.almacenId}</b></div>
        <div><div class="label">Fecha Requerida</div><b>${pedido.fechaRequerida||'—'}</b></div>
        <div><div class="label">Fecha de Entrega</div><b>${pedido.fechaEntrega||'Pendiente'}</b></div>
      </div>
      ${pedido.notasSolicitud ? `<div style="font-size:12px;margin-bottom:8px"><b>Notas:</b> ${pedido.notasSolicitud}</div>` : ''}
      <table>
        <thead><tr>
          <th>SKU</th><th>Producto</th><th style="text-align:center">Cantidad</th>
          <th style="text-align:center">Unidad</th><th>Observaciones</th>
        </tr></thead>
        <tbody>${items}</tbody>
      </table>
      <div class="footer">
        <div class="firma">Solicitante<br/><br/>_________________________</div>
        <div class="firma">Almacenero / Entrega<br/><br/>_________________________</div>
      </div>
      </body></html>`)
    win.document.close()
    win.print()
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
              <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">Fecha requerida</div>
              <div className="text-white/80 font-medium">{pedido.fechaRequerida || '—'}</div>
            </div>
            {pedido.fechaAprobacion && (
              <div className="bg-white/3 rounded-lg p-3">
                <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">Aprobado</div>
                <div className="text-white/80 font-medium">{pedido.fechaAprobacion}</div>
              </div>
            )}
            {pedido.fechaEntrega && (
              <div className="bg-white/3 rounded-lg p-3">
                <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">Entregado</div>
                <div className="text-white/80 font-medium">{pedido.fechaEntrega}</div>
              </div>
            )}
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
          {pedido.notasAprobacion && (
            <div className="bg-[#00c896]/5 border border-[#00c896]/15 rounded-lg p-3">
              <div className="text-[10px] text-[#00c896]/60 uppercase tracking-wide mb-1">Notas de aprobación</div>
              <div className="text-[12px] text-white/60">{pedido.notasAprobacion}</div>
            </div>
          )}
          {pedido.motivoRechazo && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
              <div className="text-[10px] text-red-400/60 uppercase tracking-wide mb-1">Motivo de rechazo</div>
              <div className="text-[12px] text-white/60">{pedido.motivoRechazo}</div>
            </div>
          )}
          {error && <div className="px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-lg text-[13px] text-red-400">{error}</div>}
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-white/8">
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors">
            <Printer size={13}/> Imprimir NDI
          </button>
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
    </div>
  )
}
