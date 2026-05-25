import { useState, useMemo } from 'react'
import {
  ClipboardList, Plus, Search,
  Eye, CheckCircle, Package, Send, Printer,
  Layers, Bell, Check, X, PackageCheck,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import * as storage from '../services/storage'
import { fechaHoy } from '../utils/helpers'
import { Btn } from '../components/ui'

// ── Constantes de estado ────────────────────────────────────
const ESTADOS = {
  BORRADOR:  { label:'Borrador',   color:'#64748b', bg:'#64748b15' },
  ENVIADO:   { label:'Enviado',    color:'#3b82f6', bg:'#3b82f615' },
  APROBADO:  { label:'Aprobado',   color:'#00c896', bg:'#00c89615' },
  PICKING:   { label:'Picking',    color:'#f59e0b', bg:'#f59e0b15' },
  ENTREGADO: { label:'Entregado',  color:'#10b981', bg:'#10b98115' },
  RECHAZADO: { label:'Rechazado',  color:'#ef4444', bg:'#ef444415' },
}
const PRIORIDADES = {
  NORMAL:   { label:'Normal',  color:'#64748b' },
  URGENTE:  { label:'Urgente', color:'#f59e0b' },
  'CRÍTICO':{ label:'Crítico', color:'#ef4444' },
}
const ESTADOS_LISTA = ['', 'BORRADOR','ENVIADO','APROBADO','PICKING','ENTREGADO','RECHAZADO']
const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit]'
const SEL = SI + ' pr-8'
const DS  = { colorScheme: 'dark' }  // fuerza tema oscuro en el popup del select nativo

// ── Helpers ─────────────────────────────────────────────────
function Badge({ estado, prioridad }) {
  if (prioridad) {
    const p = PRIORIDADES[prioridad] || PRIORIDADES.NORMAL
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ color: p.color, background: `${p.color}20` }}>
        {p.label}
      </span>
    )
  }
  const e = ESTADOS[estado] || ESTADOS.BORRADOR
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ color: e.color, background: e.bg }}>
      {e.label}
    </span>
  )
}

function Stat({ label, value, color = '#00c896' }) {
  return (
    <div className="bg-[#161d28] border border-white/6 rounded-xl p-4"
         style={{ borderTop: `2px solid ${color}` }}>
      <div className="text-[26px] font-bold text-[#e8edf2]">{value}</div>
      <div className="text-[11px] text-[#5f6f80] mt-0.5">{label}</div>
    </div>
  )
}

// ── Modal Nuevo / Editar Pedido ─────────────────────────────
function ModalPedido({ pedido, onClose, onSave, areas, productos, almacenes, sesion, areaFija }) {
  const esSolicitante = sesion?.rol === 'solicitante'
  const [form, setForm] = useState({
    areaId:          pedido?.areaId          || areaFija || '',
    almacenId:       pedido?.almacenId       || (almacenes[0]?.id || ''),
    fechaRequerida:  pedido?.fechaRequerida  || '',
    prioridad:       pedido?.prioridad       || 'NORMAL',
    notasSolicitud:  pedido?.notasSolicitud  || '',
    items:           pedido?.items           || [],
  })
  const [error, setError] = useState('')

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { productoId:'', cantidad:1, unidadMedida:'', notas:'' }] }))
  }
  function removeItem(i) {
    setForm(f => ({ ...f, items: f.items.filter((_,idx) => idx !== i) }))
  }
  function updateItem(i, field, val) {
    setForm(f => {
      const items = [...f.items]
      items[i] = { ...items[i], [field]: val }
      if (field === 'productoId') {
        const prod = productos.find(p => p.id === val)
        if (prod) items[i].unidadMedida = prod.unidadMedida
      }
      return { ...f, items }
    })
  }

  function handleSave(estado) {
    setError('')
    const data = {
      ...pedido,
      ...form,
      estado: estado || pedido?.estado || 'BORRADOR',
      usuarioSolicitaId: sesion?.id,
      fecha: pedido?.fecha || fechaHoy(),
    }
    const r = storage.savePedidoInterno(data)
    if (r.error) { setError(r.error); return }
    onSave()
  }

  const esEdicion = !!pedido?.id
  const puedeEnviar = !esEdicion || pedido?.estado === 'BORRADOR'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0e1117] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div>
            <h2 className="text-[15px] font-semibold text-white">
              {esEdicion ? `Editar ${pedido.numero}` : 'Nuevo Pedido Interno'}
            </h2>
            <p className="text-[11px] text-white/40 mt-0.5">Solicitud de materiales al almacén</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={18}/>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {/* Fila 1 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Área solicitante *</label>
              {esSolicitante ? (
                <div className={SEL + ' opacity-60 cursor-not-allowed'}>
                  {areas.find(a => a.id === form.areaId)?.nombre || '—'}
                </div>
              ) : (
                <select className={SEL} style={DS} value={form.areaId} onChange={e => setForm(f => ({...f, areaId: e.target.value}))}>
                  <option value="">Selecciona área...</option>
                  {areas.filter(a => a.activo).map(a => (
                    <option key={a.id} value={a.id}>{a.nombre} ({a.codigo})</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Almacén de despacho *</label>
              <select className={SEL} style={DS} value={form.almacenId} onChange={e => setForm(f => ({...f, almacenId: e.target.value}))}>
                {almacenes.filter(a => a.activo).map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Fila 2 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Fecha requerida *</label>
              <input type="date" className={SI} style={DS} value={form.fechaRequerida}
                onChange={e => setForm(f => ({...f, fechaRequerida: e.target.value}))}/>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Prioridad</label>
              <select className={SEL} style={DS} value={form.prioridad} onChange={e => setForm(f => ({...f, prioridad: e.target.value}))}>
                <option value="NORMAL">Normal</option>
                <option value="URGENTE">Urgente</option>
                <option value="CRÍTICO">Crítico</option>
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Productos solicitados *</label>
              <button onClick={addItem}
                className="flex items-center gap-1 text-[11px] text-[#00c896] hover:text-[#009e76] transition-colors">
                <Plus size={12}/> Agregar item
              </button>
            </div>
            {form.items.length === 0 && (
              <div className="flex items-center justify-center py-6 border border-dashed border-white/10 rounded-lg text-[12px] text-white/25">
                Agrega al menos un producto
              </div>
            )}
            <div className="flex flex-col gap-2">
              {form.items.map((it, i) => {
                const prod = productos.find(p => p.id === it.productoId)
                return (
                  <div key={i} className="grid grid-cols-[1fr_80px_60px_auto] gap-2 items-center">
                    <select className={SEL} style={DS} value={it.productoId}
                      onChange={e => updateItem(i, 'productoId', e.target.value)}>
                      <option value="">Producto...</option>
                      {productos.filter(p => p.activo).map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                    <input type="number" min="1" className={SI} placeholder="Cant."
                      value={it.cantidad}
                      onChange={e => updateItem(i, 'cantidad', Number(e.target.value))}/>
                    <div className="text-[11px] text-white/40 text-center font-mono">
                      {prod?.unidadMedida || '—'}
                    </div>
                    <button onClick={() => removeItem(i)}
                      className="text-white/25 hover:text-red-400 transition-colors">
                      <X size={14}/>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Notas */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Notas de solicitud</label>
            <textarea className={SI + ' resize-none h-16'} placeholder="Observaciones opcionales..."
              value={form.notasSolicitud}
              onChange={e => setForm(f => ({...f, notasSolicitud: e.target.value}))}/>
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-lg text-[13px] text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/8">
          <button onClick={onClose}
            className="px-4 py-2 text-[13px] text-white/50 hover:text-white/80 transition-colors">
            Cancelar
          </button>
          <div className="flex items-center gap-2">
            {puedeEnviar && (
              <button onClick={() => handleSave('BORRADOR')}
                className="px-4 py-2 bg-white/8 hover:bg-white/12 text-white text-[13px] font-medium rounded-lg transition-colors">
                Guardar borrador
              </button>
            )}
            {puedeEnviar && (
              <button onClick={() => handleSave('ENVIADO')}
                className="flex items-center gap-2 px-4 py-2 bg-[#00c896] hover:bg-[#009e76] text-[#082e1e] text-[13px] font-semibold rounded-lg transition-colors">
                <Send size={14}/> Enviar pedido
              </button>
            )}
            {!puedeEnviar && (
              <button onClick={() => handleSave()}
                className="px-4 py-2 bg-[#00c896] hover:bg-[#009e76] text-[#082e1e] text-[13px] font-semibold rounded-lg transition-colors">
                Guardar cambios
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal Aprobar / Rechazar ────────────────────────────────
function ModalAprobacion({ pedido, onClose, onSave, sesion }) {
  const [accion, setAccion] = useState('aprobar')
  const [notas, setNotas]   = useState('')
  const [motivo, setMotivo] = useState('')
  const [error, setError]   = useState('')

  function handleSubmit() {
    setError('')
    let r
    if (accion === 'aprobar') {
      r = storage.aprobarPedidoInterno(pedido.id, sesion?.id, notas)
    } else {
      r = storage.rechazarPedidoInterno(pedido.id, sesion?.id, motivo)
    }
    if (r.error) { setError(r.error); return }
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0e1117] border border-white/10 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-[15px] font-semibold text-white">Revisión — {pedido.numero}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><X size={18}/></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex gap-2">
            <button onClick={() => setAccion('aprobar')}
              className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors ${accion==='aprobar' ? 'bg-[#00c896] text-[#082e1e]' : 'bg-white/5 text-white/50 hover:bg-white/8'}`}>
              <Check size={13} className="inline mr-1"/> Aprobar
            </button>
            <button onClick={() => setAccion('rechazar')}
              className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors ${accion==='rechazar' ? 'bg-red-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/8'}`}>
              <X size={13} className="inline mr-1"/> Rechazar
            </button>
          </div>

          {accion === 'aprobar' ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Notas de aprobación (opcional)</label>
              <textarea className={SI + ' resize-none h-20'} placeholder="Comentarios..."
                value={notas} onChange={e => setNotas(e.target.value)}/>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Motivo del rechazo *</label>
              <textarea className={SI + ' resize-none h-20'} placeholder="Indica el motivo..."
                value={motivo} onChange={e => setMotivo(e.target.value)}/>
            </div>
          )}

          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-lg text-[13px] text-red-400">
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/8">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-white/50 hover:text-white/80 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit}
            className={`px-5 py-2 text-[13px] font-semibold rounded-lg transition-colors ${accion==='aprobar' ? 'bg-[#00c896] hover:bg-[#009e76] text-[#082e1e]' : 'bg-red-500 hover:bg-red-600 text-white'}`}>
            {accion === 'aprobar' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Detalle / Entrega ─────────────────────────────────
function ModalDetalle({ pedido, onClose, onSave, areas, productos, almacenes, sesion, esAdmin }) {
  const [error, setError]         = useState('')
  const [showAviso, setShowAviso] = useState(false)
  const area    = areas.find(a => a.id === pedido.areaId)
  const almacen = almacenes.find(a => a.id === pedido.almacenId)
  const ePI = ESTADOS[pedido.estado] || ESTADOS.BORRADOR

  function handlePicking() {
    const r = storage.marcarPickingPI(pedido.id)
    if (r.error) { setError(r.error); return }
    onSave()
  }
  function handleEntregar() {
    const r = storage.entregarPedidoInterno(pedido.id, sesion?.id)
    if (r.error) { setError(r.error); return }
    setShowAviso(true)  // mostrar panel de notificación
  }

  function handlePrint() {
    const win = window.open('', '_blank', 'width=800,height=600')
    const items = pedido.items.map(it => {
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
          Fecha: ${pedido.fecha}<br/>
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
        {/* Header */}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {/* Meta */}
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

          {/* Items */}
          <div>
            <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wide mb-2">Productos solicitados</div>
            <div className="flex flex-col gap-1.5">
              {pedido.items?.map((it, i) => {
                const prod = productos.find(p => p.id === it.productoId)
                return (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-white/3 rounded-lg">
                    <div className="w-8 h-8 rounded-lg bg-[#00c896]/10 flex items-center justify-center shrink-0">
                      <Package size={14} className="text-[#00c896]"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-white/80 truncate">
                        {prod?.nombre || it.productoId}
                      </div>
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

          {/* Notas */}
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

          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-lg text-[13px] text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-white/8">
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors">
            <Printer size={13}/> Imprimir NDI
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-[13px] text-white/50 hover:text-white/80 transition-colors">
              Cerrar
            </button>
            {pedido.estado === 'APROBADO' && esAdmin && (
              <button onClick={handlePicking}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-[#1a0a00] text-[13px] font-semibold rounded-lg transition-colors">
                <Layers size={14}/> Iniciar Picking
              </button>
            )}
            {pedido.estado === 'PICKING' && (
              <button onClick={handleEntregar}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#00c896] hover:bg-[#009e76] text-[#082e1e] text-[13px] font-semibold rounded-lg transition-colors">
                <CheckCircle size={14}/> Marcar Entregado
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Panel de notificación al área — aparece tras marcar entregado */}
      {showAviso && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
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

              {/* Mensaje copiable — WhatsApp */}
              <div className="bg-[#1a2530] rounded-xl p-4 border border-white/6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-white/35 uppercase tracking-wide">Mensaje WhatsApp</span>
                  <button
                    onClick={() => {
                      const msg = `✅ *Pedido Interno Listo para Recojo*\n\n📦 Pedido: *${pedido.numero}*\n🏢 Área: *${area?.nombre}*\n🗓️ Fecha: ${pedido.fechaEntrega || new Date().toLocaleDateString('es-PE')}\n\nTu solicitud está lista en el *${almacen?.nombre || 'Almacén'}*. Por favor acércate a recogerla en horario de oficina.\n\n_Sistema StockPro_`
                      navigator.clipboard?.writeText(msg).then(() => {})
                    }}
                    className="text-[11px] text-[#00c896] hover:text-[#009e76] transition-colors font-medium">
                    Copiar
                  </button>
                </div>
                <div className="text-[12px] text-white/60 leading-relaxed whitespace-pre-line font-mono text-[11px]">
                  {`✅ Pedido Interno Listo\n📦 ${pedido.numero} · ${area?.nombre}\nRetiro en: ${almacen?.nombre || 'Almacén'}`}
                </div>
              </div>

              {/* Mensaje copiable — Email */}
              <div className="bg-[#1a2530] rounded-xl p-4 border border-white/6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-white/35 uppercase tracking-wide">Asunto Email</span>
                  <button
                    onClick={() => {
                      const msg = `Pedido ${pedido.numero} listo para recojo — ${area?.nombre}`
                      navigator.clipboard?.writeText(msg).then(() => {})
                    }}
                    className="text-[11px] text-[#00c896] hover:text-[#009e76] transition-colors font-medium">
                    Copiar
                  </button>
                </div>
                <div className="text-[12px] text-white/60 font-mono text-[11px]">
                  Pedido {pedido.numero} listo para recojo — {area?.nombre}
                </div>
              </div>

              <div className="text-[11px] text-white/25 text-center">
                El solicitante también verá un aviso al ingresar a la app
              </div>
            </div>
            <div className="px-6 pb-5">
              <button onClick={() => { setShowAviso(false); onSave() }}
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

// ══════════════════════════════════════════════════════════════
// Página principal
// ══════════════════════════════════════════════════════════════
export default function PedidosInternos() {
  const { pedidosInternos, areas, productos, almacenes, sesion, esAdmin,
          recargarPedidosInternos, recargarAreas, toast } = useApp()

  const esSolicitante  = sesion?.rol === 'solicitante'
  const areaDelUsuario = sesion?.areaId || ''

  const [busqueda,   setBusqueda]   = useState('')
  const [filtEstado, setFiltEstado] = useState('')
  const [filtArea,   setFiltArea]   = useState('')
  const [modalNuevo, setModalNuevo] = useState(false)
  const [modalEditar,setModalEditar]= useState(null)   // pedido object
  const [modalAprob, setModalAprob] = useState(null)   // pedido object
  const [modalDet,   setModalDet]   = useState(null)   // pedido object

  // Estadísticas — solicitante ve solo su área
  const stats = useMemo(() => {
    let base = pedidosInternos || []
    if (esSolicitante) base = base.filter(p => p.areaId === areaDelUsuario)
    return {
      total:     base.length,
      pendientes:base.filter(p => ['ENVIADO','APROBADO','PICKING'].includes(p.estado)).length,
      hoy:       base.filter(p => p.fecha === fechaHoy()).length,
      criticos:  base.filter(p => p.prioridad === 'CRÍTICO' && !['ENTREGADO','RECHAZADO'].includes(p.estado)).length,
    }
  }, [pedidosInternos, esSolicitante, areaDelUsuario])

  // Filtrado — solicitante ve solo su área
  const lista = useMemo(() => {
    let data = pedidosInternos || []
    if (esSolicitante) data = data.filter(p => p.areaId === areaDelUsuario)
    if (filtEstado) data = data.filter(p => p.estado === filtEstado)
    if (!esSolicitante && filtArea) data = data.filter(p => p.areaId === filtArea)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      data = data.filter(p =>
        p.numero?.toLowerCase().includes(q) ||
        areas.find(a => a.id === p.areaId)?.nombre?.toLowerCase().includes(q)
      )
    }
    return data
  }, [pedidosInternos, filtEstado, filtArea, busqueda, areas, esSolicitante, areaDelUsuario])

  // Pedidos listos sin confirmar (para banner del solicitante)
  const pedidosListos = useMemo(() =>
    esSolicitante
      ? (pedidosInternos || []).filter(p => p.areaId === areaDelUsuario && p.estado === 'ENTREGADO' && !p.reciboConfirmado)
      : []
  , [pedidosInternos, esSolicitante, areaDelUsuario])

  function onSave() {
    recargarPedidosInternos()
    setModalNuevo(false)
    setModalEditar(null)
    setModalAprob(null)
    setModalDet(null)
    toast('Pedido interno actualizado', 'success')
  }

  function confirmarRecibo(id) {
    storage.confirmarReciboPedido(id)
    recargarPedidosInternos()
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* Banner — pedidos listos para recoger (solo solicitante) */}
      {pedidosListos.length > 0 && (
        <div className="bg-[#00c896]/10 border border-[#00c896]/30 rounded-xl px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00c896]/20 flex items-center justify-center shrink-0">
              <Bell size={18} className="text-[#00c896]"/>
            </div>
            <div>
              <div className="text-[14px] font-semibold text-white">
                {pedidosListos.length === 1 ? 'Tu pedido está listo para recojo' : `${pedidosListos.length} pedidos están listos para recojo`}
              </div>
              <div className="text-[11px] text-white/40 mt-0.5">
                Acércate al almacén en horario de oficina
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {pedidosListos.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-[#00c896]/5 rounded-lg px-4 py-2.5">
                <div>
                  <span className="text-[13px] font-mono font-medium text-white/80">{p.numero}</span>
                  <span className="text-[11px] text-white/35 ml-2">{p.items?.length} producto(s) · Entregado {p.fechaEntrega}</span>
                </div>
                <button onClick={() => confirmarRecibo(p.id)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-[#00c896] hover:text-[#009e76] transition-colors">
                  <Check size={12}/> Confirmar recibo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-white">Pedidos Internos</h1>
          <p className="text-[13px] text-white/40 mt-0.5">
            {esSolicitante
              ? `Mis solicitudes — ${areas.find(a => a.id === areaDelUsuario)?.nombre || 'Mi área'}`
              : 'Requisiciones de materiales por área'}
          </p>
        </div>
        <button onClick={() => setModalNuevo(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#00c896] hover:bg-[#009e76] text-[#082e1e] text-[13px] font-semibold rounded-xl transition-colors">
          <Plus size={16}/> Nuevo pedido
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total pedidos"   value={stats.total}     color="#00c896"/>
        <Stat label="En proceso"      value={stats.pendientes} color="#3b82f6"/>
        <Stat label="Creados hoy"     value={stats.hoy}        color="#f59e0b"/>
        <Stat label="Críticos activos"value={stats.criticos}   color="#ef4444"/>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"/>
          <input className="w-full pl-8 pr-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20"
            placeholder="Buscar por número o área..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
        </div>
        <select style={DS}
          className="px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit]"
          value={filtEstado} onChange={e => setFiltEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS_LISTA.filter(Boolean).map(s => (
            <option key={s} value={s}>{ESTADOS[s]?.label || s}</option>
          ))}
        </select>
        {!esSolicitante && (
          <select style={DS}
            className="px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit]"
            value={filtArea} onChange={e => setFiltArea(e.target.value)}>
            <option value="">Todas las áreas</option>
            {(areas||[]).filter(a => a.activo).map(a => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
        )}
        {(filtEstado || filtArea || busqueda) && (
          <button onClick={() => { setFiltEstado(''); setFiltArea(''); setBusqueda('') }}
            className="text-[12px] text-white/30 hover:text-white/60 transition-colors flex items-center gap-1">
            <X size={12}/> Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl overflow-hidden">
        {lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardList size={36} className="text-white/15"/>
            <div className="text-[13px] text-white/30">
              {busqueda || filtEstado || filtArea ? 'Sin resultados para los filtros aplicados' : 'No hay pedidos internos aún'}
            </div>
            {!busqueda && !filtEstado && !filtArea && (
              <button onClick={() => setModalNuevo(true)}
                className="flex items-center gap-1.5 text-[12px] text-[#00c896] hover:text-[#009e76] transition-colors">
                <Plus size={13}/> Crear primer pedido
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-white/8">
                  {['Nro. Pedido','Área','Almacén','Fecha','Requerido','Estado','Prioridad','Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-white/35 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map(pi => {
                  const area    = areas.find(a => a.id === pi.areaId)
                  const almacen = almacenes.find(a => a.id === pi.almacenId)
                  const eInfo   = ESTADOS[pi.estado] || ESTADOS.BORRADOR
                  const esCritico = pi.prioridad === 'CRÍTICO'
                  return (
                    <tr key={pi.id}
                      className={`border-b border-white/5 hover:bg-white/2 transition-colors ${esCritico && !['ENTREGADO','RECHAZADO'].includes(pi.estado) ? 'bg-red-500/3' : ''}`}>
                      <td className="px-4 py-3 font-mono text-[12px] text-white/70 whitespace-nowrap">
                        {pi.numero}
                      </td>
                      <td className="px-4 py-3 text-white/80 whitespace-nowrap">
                        <div>{area?.nombre || pi.areaId}</div>
                        <div className="text-[10px] text-white/30 font-mono">{area?.codigo}</div>
                      </td>
                      <td className="px-4 py-3 text-white/50 whitespace-nowrap text-[12px]">
                        {almacen?.nombre || pi.almacenId}
                      </td>
                      <td className="px-4 py-3 text-white/50 whitespace-nowrap">{pi.fecha}</td>
                      <td className="px-4 py-3 text-white/50 whitespace-nowrap">{pi.fechaRequerida || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><Badge estado={pi.estado}/></td>
                      <td className="px-4 py-3 whitespace-nowrap"><Badge prioridad={pi.prioridad}/></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Btn variant="ghost" size="icon" title="Ver detalle"
                            onClick={() => setModalDet(pi)}>
                            <Eye size={13}/>
                          </Btn>
                          {pi.estado === 'BORRADOR' && (
                            <Btn variant="ghost" size="icon" title="Editar"
                              onClick={() => setModalEditar(pi)}>
                              <ClipboardList size={13}/>
                            </Btn>
                          )}
                          {pi.estado === 'ENVIADO' && esAdmin && (
                            <Btn variant="ghost" size="icon" title="Aprobar / Rechazar"
                              onClick={() => setModalAprob(pi)}>
                              <CheckCircle size={13}/>
                            </Btn>
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

      {/* Modales */}
      {modalNuevo && (
        <ModalPedido
          pedido={null} onClose={() => setModalNuevo(false)} onSave={onSave}
          areas={areas||[]} productos={productos||[]} almacenes={almacenes||[]}
          sesion={sesion} areaFija={esSolicitante ? areaDelUsuario : undefined}
        />
      )}
      {modalEditar && (
        <ModalPedido
          pedido={modalEditar} onClose={() => setModalEditar(null)} onSave={onSave}
          areas={areas||[]} productos={productos||[]} almacenes={almacenes||[]}
          sesion={sesion} areaFija={esSolicitante ? areaDelUsuario : undefined}
        />
      )}
      {modalAprob && (
        <ModalAprobacion
          pedido={modalAprob} onClose={() => setModalAprob(null)} onSave={onSave} sesion={sesion}
        />
      )}
      {modalDet && (
        <ModalDetalle
          pedido={modalDet} onClose={() => setModalDet(null)} onSave={onSave}
          areas={areas||[]} productos={productos||[]} almacenes={almacenes||[]}
          sesion={sesion} esAdmin={esAdmin}
        />
      )}
    </div>
  )
}
