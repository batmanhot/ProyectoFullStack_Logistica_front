import { format, formatDistanceToNow, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { STOCK } from '../config/constants'

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

export function formatTime(fecha) {
  const d = safeParseDate(fecha)
  if (!d || isNaN(d.getTime())) return null
  return format(d, 'HH:mm', { locale: es })
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

// El vencimiento vive en LoteProducto (no en Producto — ver schema.prisma,
// Fase 1: "Corrige el patrón de anidar batches[] dentro del producto"),
// así que Vencimientos.jsx/Alertas.jsx necesitan cruzar productos con lotes.
// Un producto con varios lotes usa la fecha más próxima (la más urgente).
export function vencimientoMasUrgentePorProducto(lotes) {
  const m = {}
  lotes.forEach(l => {
    if (!l.fechaVencimiento) return
    if (!m[l.productoId] || new Date(l.fechaVencimiento) < new Date(m[l.productoId])) {
      m[l.productoId] = l.fechaVencimiento
    }
  })
  return m
}

export function fechaHoy() {
  return format(new Date(), 'dd/MM/yyyy')
}

// fechaHoy() usa 'dd/MM/yyyy' (formato de UI, para texto) — no sirve como
// valor de un <input type="date"> nativo (exige 'yyyy-MM-dd') ni para
// comparar contra fechas ISO del backend (timestamp.slice(0,10) === hoy).
// Encontrado en la sesión de QA: ModalNuevaRuta enviaba "30/07/2026T08:00"
// al backend y el POST /rutas fallaba con 400 si el usuario no tocaba la
// fecha por defecto — mismo patrón roto en varios formularios y en KPIs de
// "hoy" que por eso siempre daban 0.
export function fechaHoyISO() {
  return format(new Date(), 'yyyy-MM-dd')
}

// ── Semáforo de stock ──────────────────────
// Decimal de Prisma llega como string — coercionar acá (no en cada call site)
// para que ningún consumidor pueda comparar "9.00" <= "10.00" lexicográficamente.
export function estadoStock(stockActualRaw, stockMinimoRaw) {
  const stockActual  = Number(stockActualRaw)  || 0
  const stockMinimo  = Number(stockMinimoRaw)  || 0
  if (stockActual <= 0)            return { estado: 'agotado', label: 'Agotado', color: '#ef4444' }
  if (stockActual <= stockMinimo)  return { estado: 'critico', label: 'Crítico', color: '#f59e0b' }
  if (stockActual <= stockMinimo * STOCK.UMBRAL_BAJO_MULTIPLICADOR)
                                   return { estado: 'bajo',    label: 'Bajo',    color: '#f59e0b' }
  return                                  { estado: 'ok',      label: 'Normal',  color: '#22c55e' }
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

// ── JWT (portales públicos: cliente y proveedor) ───────────
// Decodifica el payload de un JWT (sin verificar firma — solo para leer
// datos de display antes de que el backend valide el token real).
// atob() decodifica a "binary string" (1 byte = 1 char code) — un JSON.parse
// directo sobre eso corrompe cualquier UTF-8 multibyte (tildes, ñ). Hay que
// re-interpretar esos bytes como UTF-8 con TextDecoder antes de parsear.
export function decodeJwtPayload(token) {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes  = Uint8Array.from(binary, c => c.charCodeAt(0))
  return JSON.parse(new TextDecoder('utf-8').decode(bytes))
}
