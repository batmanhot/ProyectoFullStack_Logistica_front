import { useEffect, useRef } from 'react'
import { X, CheckCircle2, AlertTriangle, Info, XCircle, Package } from 'lucide-react'
import { useApp } from '../../store/AppContext'

/** Cierra con Escape y enfoca el diálogo al abrir — compartido por Modal/ConfirmDialog. */
function useDialogA11y(open, onClose) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    function onKeyDown(e) { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKeyDown)
    ref.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])
  return ref
}

/* ── Modal ─────────────────────────────────────────── */
export function Modal({ open, onClose, title, size = 'md', children, footer, zIndex }) {
  const dialogRef = useDialogA11y(open, onClose)
  if (!open) return null
  const widths = { sm:'max-w-md', md:'max-w-xl', lg:'max-w-3xl', xl:'max-w-5xl' }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-content-center p-5 bg-black/70 backdrop-blur-sm"
      style={{ alignItems: 'center', justifyContent: 'center', ...(zIndex ? { zIndex } : {}) }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`animate-modal-in bg-[#161d28] border border-white/10 rounded-2xl w-full ${widths[size]} max-h-[92vh] flex flex-col shadow-2xl outline-none`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 shrink-0">
          <span className="text-[15px] font-semibold text-[#e8edf2]">{title}</span>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg text-[#5f6f80] hover:text-[#e8edf2] hover:bg-white/5 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-6 overflow-y-auto flex-1 flex flex-col gap-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-white/8 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Confirm Dialog ─────────────────────────────────── */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, danger = false }) {
  const dialogRef = useDialogA11y(open, onClose)
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Confirmar'}
        tabIndex={-1}
        className="animate-modal-in bg-[#161d28] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col outline-none"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <span className="text-[15px] font-semibold text-[#e8edf2]">{title || 'Confirmar'}</span>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg text-[#5f6f80] hover:text-[#e8edf2] hover:bg-white/5 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-6">
          <p className="text-sm text-[#9ba8b6] leading-relaxed">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-white/8">
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose() }}>
            {danger ? 'Eliminar' : 'Confirmar'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

/* ── Toast Container ─────────────────────────────────── */
const TOAST_CONFIGS = {
  success: { icon: <CheckCircle2  size={15} style={{ color:'#10b981', flexShrink:0 }} />, border:'rgba(16,185,129,0.45)',  strip:'#10b981' },
  error:   { icon: <XCircle       size={15} style={{ color:'#ef4444', flexShrink:0 }} />, border:'rgba(239,68,68,0.45)',   strip:'#ef4444' },
  warning: { icon: <AlertTriangle size={15} style={{ color:'#f59e0b', flexShrink:0 }} />, border:'rgba(245,158,11,0.45)',  strip:'#f59e0b' },
  info:    { icon: <Info          size={15} style={{ color:'#3b82f6', flexShrink:0 }} />, border:'rgba(59,130,246,0.45)',  strip:'#3b82f6' },
}

export function ToastContainer() {
  const { toasts } = useApp()
  return (
    <div role="status" aria-live="polite" className="fixed bottom-6 right-6 flex flex-col gap-2 z-[2000] pointer-events-none">
      {toasts.map(t => {
        const cfg = TOAST_CONFIGS[t.tipo] || TOAST_CONFIGS.info
        return (
          <div
            key={t.id}
            className="animate-toast-in flex items-center gap-2.5 rounded-xl text-[13px] font-medium min-w-[260px] max-w-sm overflow-hidden"
            style={{
              background:  'var(--bg-surface)',
              border:      `1px solid ${cfg.border}`,
              color:       'var(--text-primary)',
              boxShadow:   '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            {/* Barra lateral de color */}
            <div style={{ width: 4, alignSelf:'stretch', background: cfg.strip, flexShrink:0 }} />
            <div className="flex items-center gap-2.5 px-3 py-3 flex-1 min-w-0">
              {cfg.icon}
              <span className="flex-1 leading-snug">{t.mensaje}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Empty State ─────────────────────────────────────── */
export function EmptyState({ icon, title, description, action }) {
  const Icon = icon || Package
  return (
    <div className="flex flex-col items-center justify-center py-16 px-5 gap-3 text-center">
      <Icon size={48} className="text-[#5f6f80] opacity-30" />
      <div>
        <p className="text-sm font-medium text-[#9ba8b6] mb-1.5">{title}</p>
        {description && <p className="text-xs text-[#5f6f80] max-w-[240px] leading-relaxed">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/* ── Button ──────────────────────────────────────────── */
const BTN_VARIANTS = {
  primary:   'bg-[#00c896] text-[#082e1e] border border-[#00c896] hover:bg-[#009e76] hover:border-[#009e76]',
  secondary: 'bg-[#1a2230] text-[#e8edf2] border border-white/14 hover:bg-white/5',
  ghost:     'bg-transparent text-[#9ba8b6] border border-transparent hover:bg-white/5 hover:text-[#e8edf2]',
  danger:    'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20',
}

export function Btn({ variant = 'secondary', size = 'md', onClick, disabled, children, className = '', type = 'button', title }) {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-[13px]', lg: 'px-5 py-2.5 text-sm', icon: 'p-1.5' }
  const btn = (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap ${BTN_VARIANTS[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
  if (!title) return btn
  return (
    <div className="relative inline-flex group/tip">
      {btn}
      <span
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                   opacity-0 -translate-y-1 group-hover/tip:opacity-100 group-hover/tip:translate-y-0
                   transition-all duration-150 z-[200]"
        style={{
          background:    '#1e2533',
          color:         '#ffffff',
          border:        '1px solid rgba(255,255,255,0.22)',
          boxShadow:     '0 4px 20px rgba(0,0,0,0.65)',
          padding:       '5px 10px',
          borderRadius:  '8px',
          fontSize:      '11px',
          fontWeight:    500,
          whiteSpace:    'nowrap',
          lineHeight:    '1.4',
        }}
      >
        {title}
        <span className="absolute top-full left-1/2 -translate-x-1/2"
              style={{ borderWidth:'4px', borderStyle:'solid', borderColor:'transparent', borderTopColor:'#1e2533' }} />
      </span>
    </div>
  )
}

/* ── Badge ───────────────────────────────────────────── */
const BADGE_STYLES = {
  success: 'bg-green-500/10  text-green-400',
  warning: 'bg-amber-500/10  text-amber-400',
  danger:  'bg-red-500/10    text-red-400',
  info:    'bg-blue-500/10   text-blue-400',
  neutral: 'bg-white/7       text-[#9ba8b6]',
  teal:    'bg-[#00c896]/10  text-[#00c896]',
}

export function Badge({ variant = 'neutral', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${BADGE_STYLES[variant]} ${className}`}>
      {children}
    </span>
  )
}

/* ── Stock Badge ─────────────────────────────────────── */
export function StockBadge({ stockActual, stockMinimo }) {
  if (stockActual <= 0)          return <Badge variant="danger">Agotado</Badge>
  if (stockActual <= stockMinimo) return <Badge variant="danger">Crítico</Badge>
  if (stockActual <= stockMinimo * 1.5) return <Badge variant="warning">Bajo</Badge>
  return <Badge variant="success">Normal</Badge>
}

/* ── Estado OC Badge ─────────────────────────────────── */
export function EstadoOCBadge({ estado }) {
  const map = { PENDIENTE:'warning', APROBADA:'info', RECIBIDA:'success', CANCELADA:'danger', PARCIAL:'neutral' }
  return <Badge variant={map[estado] || 'neutral'}>{estado}</Badge>
}

/* ── Spinner ─────────────────────────────────────────── */
export function Spinner({ size = 20 }) {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="animate-spin-slow rounded-full border-2 border-white/10 border-t-[#00c896]"
        style={{ width: size, height: size }} />
    </div>
  )
}

/* ── Toggle ──────────────────────────────────────────── */
export function Toggle({ value, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <span className="relative inline-flex w-9 h-5 shrink-0">
        <input
          type="checkbox"
          role="switch"
          aria-checked={!!value}
          checked={!!value}
          onChange={() => onChange(!value)}
          className="peer absolute inset-0 z-10 opacity-0 cursor-pointer"
        />
        <span className={`pointer-events-none absolute inset-0 rounded-full border transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-[#00c896]/40 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-[#0f141c] ${value ? 'bg-[#00c896] border-[#00c896]' : 'bg-[#1a2230] border-white/14'}`}>
          <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform duration-200 ${value ? 'translate-x-4' : 'translate-x-0'}`} />
        </span>
      </span>
      {label && <span className="text-[13px] text-[#9ba8b6]">{label}</span>}
    </label>
  )
}

/* ── Form Field ─────────────────────────────────────── */
export function Field({ label, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide">{label}</label>}
      {children}
      {hint  && <span className="text-[11px] text-[#5f6f80] leading-snug">{hint}</span>}
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  )
}

/* ── Input / Select / Textarea ───────────────────────── */
const INPUT_BASE = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none transition-all duration-150 focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit]'

export function Input(props) {
  return <input {...props} className={`${INPUT_BASE} ${props.className || ''}`} />
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={`${INPUT_BASE} pr-8 ${props.className || ''}`}>
      {children}
    </select>
  )
}

export function Textarea(props) {
  return <textarea {...props} className={`${INPUT_BASE} resize-y min-h-[70px] ${props.className || ''}`} />
}

/* ── Card ────────────────────────────────────────────── */
export function Card({ children, className = '' }) {
  return (
    <div className={`bg-[#161d28] border border-white/8 rounded-xl p-5 ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ title, children }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">{title}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

/* ── Table wrapper ───────────────────────────────────── */
export function TableWrap({ children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/8">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  )
}

export function Th({ children, right, onClick }) {
  return (
    <th onClick={onClick} className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/8 sticky top-0 z-10 ${right ? 'text-right' : 'text-left'} ${onClick ? 'cursor-pointer hover:bg-white/2' : ''}`}>
      {children}
    </th>
  )
}

export function Td({ children, mono, muted, right, className = '', onClick }) {
  return (
    <td onClick={onClick} className={`px-3.5 py-2.5 text-[#e8edf2] align-middle ${mono ? "font-mono text-[12px]" : ''} ${muted ? 'text-[#9ba8b6]' : ''} ${right ? 'text-right' : ''} ${className}`}>
      {children}
    </td>
  )
}

/* ── Alert ───────────────────────────────────────────── */
const ALERT_STYLES = {
  warning: 'bg-amber-500/10 border-amber-500/25 text-amber-300',
  danger:  'bg-red-500/10   border-red-500/25   text-red-300',
  info:    'bg-blue-500/10  border-blue-500/25  text-blue-300',
  success: 'bg-green-500/10 border-green-500/25 text-green-300',
}

export function Alert({ variant = 'info', children, className = '', onClick }) {
  return (
    <div onClick={onClick} className={`flex items-start gap-2.5 px-4 py-3 rounded-lg border text-[13px] leading-snug ${ALERT_STYLES[variant]} ${onClick ? 'cursor-pointer' : ''} ${className}`}>
      <AlertTriangle size={13} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

/* ── KPI Card ────────────────────────────────────────── */
export function KpiCard({ label, value, sub, accentColor, icon, mono, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden ${onClick ? 'cursor-pointer hover:border-white/14 transition-colors' : ''}`}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: accentColor }} />
      <div className="absolute top-4 right-4 opacity-[0.10] pointer-events-none">{icon}</div>
      <div className="text-[11px] text-[#5f6f80] uppercase tracking-[0.05em] mb-2">{label}</div>
      <div className={`font-semibold text-[#e8edf2] leading-tight ${mono ? 'font-mono text-[17px]' : 'text-[28px]'}`}>{value}</div>
      {sub && <div className="text-[11px] text-[#5f6f80] mt-1.5">{sub}</div>}
    </div>
  )
}

export { DataTable, Pager } from './DataTable'
export { LineaTiempo } from './LineaTiempo'

export { default as DireccionInput } from './DireccionInput'

export { default as DateInput } from './DateInput'
