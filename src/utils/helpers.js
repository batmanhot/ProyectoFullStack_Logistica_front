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
function safeParseDate(fecha) {
  if (!fecha) return null
  if (fecha instanceof Date) return fecha
  if (typeof fecha !== 'string') return new Date(fecha)

  // Manejar dd/mm/yyyy
  if (fecha.includes('/')) {
    const parts = fecha.split('/')
    if (parts.length === 3) {
      const [d, m, y] = parts.map(Number)
      if (d > 31) return new Date(d, m - 1, y) // yyyy/mm/dd case
      return new Date(y, m - 1, d)
    }
  }
  
  // Manejar ISO o otros formatos
  const d = parseISO(fecha)
  return isNaN(d.getTime()) ? new Date(fecha) : d
}

export function formatDate(fecha) {
  const d = safeParseDate(fecha)
  if (!d || isNaN(d.getTime())) return '—'
  return format(d, 'dd/MM/yyyy', { locale: es })
}

export function formatDateTime(fecha) {
  const d = safeParseDate(fecha)
  if (!d || isNaN(d.getTime())) return '—'
  return format(d, 'dd/MM/yyyy HH:mm', { locale: es })
}

export function timeAgo(fecha) {
  const d = safeParseDate(fecha)
  if (!d || isNaN(d.getTime())) return '—'
  return formatDistanceToNow(d, { locale: es, addSuffix: true })
}

export function diasParaVencer(fechaVencimiento) {
  const d = safeParseDate(fechaVencimiento)
  if (!d || isNaN(d.getTime())) return null
  return differenceInDays(d, new Date())
}

export function fechaHoy() {
  return format(new Date(), 'dd/MM/yyyy')
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
