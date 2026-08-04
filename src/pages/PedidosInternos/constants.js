// ── Constantes de estado ────────────────────────────────────
export const ESTADOS = {
  BORRADOR:  { label:'Borrador',   color:'#64748b', bg:'#64748b15' },
  ENVIADO:   { label:'Enviado',    color:'#3b82f6', bg:'#3b82f615' },
  APROBADO:  { label:'Aprobado',   color:'#00c896', bg:'#00c89615' },
  PICKING:   { label:'Picking',    color:'#f59e0b', bg:'#f59e0b15' },
  ENTREGADO: { label:'Entregado',  color:'#10b981', bg:'#10b98115' },
  RECHAZADO: { label:'Rechazado',  color:'#ef4444', bg:'#ef444415' },
}
export const PRIORIDADES = {
  NORMAL:  { label:'Normal',  color:'#64748b' },
  URGENTE: { label:'Urgente', color:'#f59e0b' },
  CRITICO: { label:'Crítico', color:'#ef4444' },
}
export const ESTADOS_LISTA = ['BORRADOR','ENVIADO','APROBADO','PICKING','ENTREGADO','RECHAZADO']

// ── Trazabilidad ─────────────────────────────────────────────
// Flujo para la línea de tiempo del detalle — a diferencia de ESTADOS_LISTA
// (que refleja el campo `estado` tal cual), acá el paso final "Confirmado"
// es sintético: no existe un estado propio, se deriva del flag
// `reciboConfirmado` (ver `estadoTimeline` más abajo).
export const FLUJO_PEDIDO_INTERNO = [
  { id:'BORRADOR',   label:'Solicitado', desc:'Pedido creado por el área',         color:'#64748b', icon:'📝' },
  { id:'ENVIADO',    label:'Enviado',    desc:'Enviado — pendiente de revisión',   color:'#3b82f6', icon:'📤' },
  { id:'APROBADO',   label:'Aprobado',   desc:'Aprobado — a la espera de picking', color:'#00c896', icon:'✅' },
  { id:'PICKING',    label:'Picking',    desc:'Almacén preparando los productos',  color:'#f59e0b', icon:'📦' },
  { id:'ENTREGADO',  label:'Entregado',  desc:'Listo para recojo en almacén',      color:'#10b981', icon:'✔️' },
  { id:'CONFIRMADO', label:'Confirmado', desc:'El área confirmó la recepción',     color:'#00c896', icon:'🏁' },
]
export const FLUJO_PI_RECHAZADO = [{ id:'RECHAZADO', label:'Rechazado', color:'#ef4444', icon:'❌' }]

/** Estado "efectivo" para la línea de tiempo — CONFIRMADO no es un valor real de `estado`. */
export function estadoTimeline(pedido) {
  return pedido.reciboConfirmado ? 'CONFIRMADO' : pedido.estado
}

/**
 * Props listas para <LineaTiempo/> — un pedido rechazado solo pasó por
 * Solicitado y Enviado (rechazar() únicamente aplica desde ENVIADO), así que
 * el flujo se trunca ahí en vez de mostrar Aprobado/Picking/Entregado/
 * Confirmado como si también hubiesen ocurrido antes del rechazo.
 */
export function flujoTimeline(pedido) {
  const cancelado = pedido.estado === 'RECHAZADO'
  return {
    flujo: cancelado ? FLUJO_PEDIDO_INTERNO.slice(0, 2) : FLUJO_PEDIDO_INTERNO,
    flujoCancelado: FLUJO_PI_RECHAZADO,
    estadoActual: estadoTimeline(pedido),
    cancelado,
  }
}

/**
 * Pasos con fecha/responsable ya alcanzados, en orden cronológico — el
 * detalle del pedido los lista debajo de la línea de tiempo para que el
 * solicitante vea exactamente cuándo (y por quién) avanzó su pedido.
 */
export function pasosTrazabilidad(pedido) {
  const pasos = [
    { id: 'BORRADOR', icon: '📝', label: 'Solicitado', fecha: pedido.fecha || pedido.createdAt, actor: pedido.usuarioSolicita?.nombre },
  ]
  if (pedido.fechaEnvio) {
    pasos.push({ id: 'ENVIADO', icon: '📤', label: 'Enviado', fecha: pedido.fechaEnvio })
  }
  if (pedido.estado === 'RECHAZADO') {
    pasos.push({ id: 'RECHAZADO', icon: '❌', label: 'Rechazado', fecha: pedido.fechaRechazo, actor: pedido.usuarioAprueba?.nombre, nota: pedido.motivoRechazo })
    return pasos
  }
  if (pedido.fechaAprobacion) {
    pasos.push({ id: 'APROBADO', icon: '✅', label: 'Aprobado', fecha: pedido.fechaAprobacion, actor: pedido.usuarioAprueba?.nombre, nota: pedido.notasAprobacion })
  }
  if (pedido.fechaPicking) {
    pasos.push({ id: 'PICKING', icon: '📦', label: 'En preparación', fecha: pedido.fechaPicking })
  }
  if (pedido.fechaEntrega) {
    pasos.push({ id: 'ENTREGADO', icon: '✔️', label: 'Entregado', fecha: pedido.fechaEntrega, actor: pedido.usuarioEntrega?.nombre })
  }
  if (pedido.fechaReciboConfirmado) {
    pasos.push({ id: 'CONFIRMADO', icon: '🏁', label: 'Recibo confirmado', fecha: pedido.fechaReciboConfirmado })
  }
  return pasos
}
