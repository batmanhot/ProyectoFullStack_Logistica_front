import { format, formatDistanceToNow, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Formateo de moneda ─────────────────────
export function formatCurrency(n, simbolo = 'S/') {
  if (n === null || n === undefined || isNaN(n)) return `${simbolo} 0.00`
  return `${simbolo} ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatNumber(n, decimals = 2) {
  if (n === null || n === undefined || isNaN(n)) return '0'
  return Number(n).toLocaleString('es-PE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// ── Formateo de fechas ─────────────────────
export function formatDate(fecha) {
  if (!fecha) return '—'
  try {
    const d = typeof fecha === 'string' ? parseISO(fecha) : fecha
    return format(d, 'dd/MM/yyyy', { locale: es })
  } catch { return '—' }
}

export function formatDateTime(fecha) {
  if (!fecha) return '—'
  try {
    const d = typeof fecha === 'string' ? parseISO(fecha) : fecha
    return format(d, 'dd/MM/yyyy HH:mm', { locale: es })
  } catch { return '—' }
}

export function timeAgo(fecha) {
  if (!fecha) return '—'
  try {
    const d = typeof fecha === 'string' ? parseISO(fecha) : fecha
    return formatDistanceToNow(d, { locale: es, addSuffix: true })
  } catch { return '—' }
}

export function diasParaVencer(fechaVencimiento) {
  if (!fechaVencimiento) return null
  try {
    const d = typeof fechaVencimiento === 'string' ? parseISO(fechaVencimiento) : fechaVencimiento
    return differenceInDays(d, new Date())
  } catch { return null }
}

export function fechaHoy() {
  return format(new Date(), 'yyyy-MM-dd')
}

// ── Semáforo de stock ──────────────────────
export function estadoStock(stockActual, stockMinimo) {
  if (stockActual <= 0)            return { estado: 'agotado',   label: 'Agotado',   color: '#ef4444' }
  if (stockActual <= stockMinimo)  return { estado: 'critico',   label: 'Crítico',   color: '#f59e0b' }
  if (stockActual <= stockMinimo * 1.5) return { estado: 'bajo', label: 'Bajo',      color: '#f59e0b' }
  return                                 { estado: 'ok',         label: 'Normal',    color: '#22c55e' }
}

export function badgeClaseStock(estado) {
  const mapa = { agotado: 'badge-danger', critico: 'badge-warning', bajo: 'badge-warning', ok: 'badge-success' }
  return mapa[estado] || 'badge-neutral'
}

// ── Semáforo de vencimiento ────────────────
export function estadoVencimiento(dias) {
  if (dias === null) return null
  if (dias < 0)   return { label: 'Vencido',     clase: 'badge-danger',  color: '#ef4444' }
  if (dias <= 15) return { label: `${dias}d`,     clase: 'badge-danger',  color: '#ef4444' }
  if (dias <= 30) return { label: `${dias}d`,     clase: 'badge-warning', color: '#f59e0b' }
  if (dias <= 90) return { label: `${dias}d`,     clase: 'badge-info',    color: '#3b82f6' }
  return               { label: `${dias}d`,        clase: 'badge-success', color: '#22c55e' }
}

// ── Generador de IDs ──────────────────────
let _seq = Date.now()
export function newId() {
  return (++_seq).toString(36).toUpperCase()
}

// ── Números de documento ──────────────────
export function generarNumDoc(prefijo = 'DOC', serie = '001') {
  const n = String(Math.floor(Math.random() * 9000) + 1000)
  return `${prefijo}-${serie}-${n}`
}

// ── Análisis ABC ──────────────────────────
export function clasificarABC(productos) {
  if (!productos.length) return []
  const sorted = [...productos].sort((a, b) => b.valorStock - a.valorStock)
  const total  = sorted.reduce((s, p) => s + p.valorStock, 0)
  let acum = 0
  return sorted.map(p => {
    acum += p.valorStock
    const pct = (acum / total) * 100
    const abc  = pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C'
    return { ...p, abc }
  })
}

// ── Clamp / round ─────────────────────────
export function round2(n)   { return Math.round(n * 100) / 100 }
export function clamp(n, min, max) { return Math.min(Math.max(n, min), max) }
