import { useEffect, useRef } from 'react'
import { X, AlertTriangle, Search, Bell, ChevronRight } from 'lucide-react'

/**
 * Sistema de UI propio de AdminSaaSV2 — deliberadamente aislado de
 * components/ui/index.jsx y de las variables de tema del resto de la app.
 * Colores fijos (no siguen los 7 temas del tenant): esta es la identidad
 * visual del panel de control de la plataforma, igual que un dashboard de
 * Stripe/Vercel no cambia de skin cuando el usuario final cambia el suyo.
 * Paleta tomada 1:1 de la referencia en
 * "Proyectos Full Stacks Diseños/front/stockpro-superadmin-v2/app/globals.css".
 */

const TOKENS = {
  bg: '#f5f7fb',
  card: '#ffffff',
  text: '#172033',
  textMuted: '#687386',
  border: '#dfe4ec',
  input: '#d5dbe5',
  primary: '#355fd1',
  primaryDark: '#294fb6',
  primarySoft: '#eef2ff',
  primarySoftText: '#294da8',
  muted: '#eef1f6',
  sidebar: '#f9fafc',
  sidebarBorder: '#e1e5ec',
  sidebarHover: '#edf1f8',
}

function useDialogA11y(open, onClose) {
  const ref = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    if (!open) return
    function onKeyDown(e) { if (e.key === 'Escape') onCloseRef.current?.() }
    document.addEventListener('keydown', onKeyDown)
    ref.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  return ref
}

/* ── Botón ───────────────────────────────────────────── */
// Nota: clases Tailwind con valor arbitrario (bg-[#hex]) deben ser strings
// literales completos en el código fuente — Tailwind las detecta escaneando
// el archivo, no puede resolver interpolación de variables JS en runtime.
const BTN_VARIANTS = {
  primary:   'bg-[#355fd1] text-white hover:bg-[#294fb6]',
  secondary: 'bg-white text-[#172033] border border-[#dfe4ec] hover:bg-[#eef1f6]',
  ghost:     'bg-transparent text-[#687386] hover:bg-[#eef1f6] hover:text-[#172033]',
  danger:    'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
}
export function Btn({ variant = 'secondary', size = 'md', onClick, disabled, children, className = '', type = 'button', title }) {
  const sizes = { sm: 'h-8 px-3 text-[12px]', md: 'h-10 px-4 text-[13.5px]', icon: 'h-9 w-9 justify-center' }
  return (
    <button
      type={type} onClick={onClick} disabled={disabled} title={title} aria-label={title}
      className={`inline-flex items-center gap-1.5 rounded-xl font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap ${BTN_VARIANTS[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
}

/* ── Badge ───────────────────────────────────────────── */
const BADGE_STYLES = {
  neutral: 'border-[#dce1e9] bg-[#f3f5f8] text-[#5f697a]',
  success: 'border-[#ccebd8] bg-[#eaf8ef] text-[#28794a]',
  warning: 'border-[#f2d8aa] bg-[#fff4e2] text-[#995b13]',
  danger:  'border-[#f0caca] bg-[#fff0f0] text-[#ad3f3f]',
  info:    'border-[#cbdcff] bg-[#edf3ff] text-[#365daf]',
}
export function Badge({ variant = 'neutral', children, className = '' }) {
  return (
    <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap ${BADGE_STYLES[variant]} ${className}`}>
      {children}
    </span>
  )
}

/* ── Card / Panel ────────────────────────────────────── */
export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-[#dfe4ec] bg-white p-5 shadow-[0_1px_2px_rgba(18,27,43,.05)] ${className}`}>
      {children}
    </div>
  )
}

/* ── KPI Card ────────────────────────────────────────── */
const KPI_TONES = { blue: '#5b8def', green: '#32a66a', amber: '#e19a36', red: '#e0524f', indigo: TOKENS.primary }
export function KpiCard({ label, value, sub, subTone = 'muted', tone = 'indigo', icon: Icon }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#dfe4ec] bg-white p-5 shadow-[0_1px_2px_rgba(18,27,43,.05)]">
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: KPI_TONES[tone] || KPI_TONES.indigo }} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-semibold text-[#687386]">{label}</p>
        {Icon && (
          <div className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: TOKENS.primarySoft, color: TOKENS.primary }}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className="mt-2 text-[26px] font-bold tracking-tight text-[#172033]">{value}</div>
      {sub && (
        <div className={`mt-1 text-[12.5px] font-medium ${subTone === 'danger' ? 'text-red-500' : subTone === 'success' ? 'text-emerald-600' : 'text-[#687386]'}`}>
          {sub}
        </div>
      )}
    </div>
  )
}

/* ── Page header: breadcrumb + título + descripción + acciones ── */
export function PageHeader({ breadcrumb, title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {breadcrumb && <div className="text-[13px] font-semibold text-[#355fd1]">{breadcrumb}</div>}
        <h1 className="mt-0.5 text-[26px] font-bold tracking-tight text-[#172033]">{title}</h1>
        {description && <p className="mt-1 text-[13.5px] text-[#687386]">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

/* ── Sidebar de navegación agrupada (identidad propia, pill activo) ── */
export function SidebarNav({ groups, activeId, onSelect }) {
  return (
    <nav className="flex w-64 shrink-0 flex-col border-r px-3 py-4" style={{ background: TOKENS.sidebar, borderColor: TOKENS.sidebarBorder }}>
      <div className="mb-4 flex items-center gap-2.5 px-2">
        <div className="grid size-9 place-items-center rounded-xl text-white font-bold text-[15px]" style={{ background: TOKENS.primary }}>S</div>
        <div>
          <div className="text-[14px] font-bold text-[#172033] leading-tight">StockPro</div>
          <div className="text-[11px] text-[#687386] leading-tight">Control de plataforma</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-5">
        {groups.map(group => (
          <div key={group.label}>
            <div className="px-3 mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#8893a3]">{group.label}</div>
            <div className="flex flex-col gap-0.5">
              {group.items.map(item => {
                const Icon = item.icon
                const active = item.id === activeId
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    className={`flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition ${
                      active ? 'text-white shadow-sm' : 'text-[#3d4759]/85 hover:text-[#172033]'
                    }`}
                    style={active ? { background: TOKENS.primary } : {}}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = TOKENS.sidebarHover }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="flex-1 truncate text-left">{item.label}</span>
                    {item.count != null && (
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-[12px] ${active ? 'bg-white/15 text-white' : 'text-[#172033]'}`} style={!active ? { background: TOKENS.muted } : {}}>
                        {item.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  )
}

/* ── Top bar: buscador decorativo + estado + notificaciones ── */
export function TopBar({ userName = 'Super Admin', userRole = 'SuperAdmin' }) {
  return (
    <div className="flex h-[72px] shrink-0 items-center gap-4 border-b bg-white px-6" style={{ borderColor: TOKENS.border }}>
      <div className="relative w-full max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3b2]" />
        <input
          disabled
          placeholder="Buscar negocios, usuarios o eventos…"
          className="h-10 w-full rounded-xl border pl-9 pr-3 text-[13.5px] text-[#172033] placeholder:text-[#9aa3b2] outline-none disabled:cursor-default"
          style={{ borderColor: TOKENS.border, background: TOKENS.bg }}
        />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#ccebd8] bg-[#eaf8ef] px-3 py-1.5 text-[12px] font-semibold text-[#28794a]">
          <span className="size-1.5 rounded-full bg-[#28794a]" /> Plataforma operativa
        </span>
        <button className="grid size-9 place-items-center rounded-full border text-[#687386] hover:bg-[#f3f5f8]" style={{ borderColor: TOKENS.border }} title="Notificaciones">
          <Bell size={15} />
        </button>
        <div className="flex items-center gap-2.5 pl-2 border-l" style={{ borderColor: TOKENS.border }}>
          <div className="grid size-8 place-items-center rounded-full text-white text-[12px] font-bold" style={{ background: TOKENS.primary }}>
            {userName.slice(0, 1)}
          </div>
          <div className="hidden md:block leading-tight">
            <div className="text-[13px] font-semibold text-[#172033]">{userName}</div>
            <div className="text-[11px] text-[#687386]">{userRole}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Filtros como píldoras ───────────────────────────── */
export function FilterChips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`h-9 shrink-0 rounded-lg border px-3 text-[13px] font-semibold transition-colors ${
              active ? 'text-[#294da8]' : 'bg-white text-[#687386] hover:bg-[#f3f5f8]'
            }`}
            style={active ? { borderColor: TOKENS.primary, background: TOKENS.primarySoft } : { borderColor: TOKENS.border }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/* ── Form fields ─────────────────────────────────────── */
export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-[12px] font-semibold text-[#3d4759]">{label}</label>}
      {children}
      {hint && <span className="text-[11.5px] text-[#8893a3] leading-snug">{hint}</span>}
    </div>
  )
}

const FIELD_BASE = 'w-full h-10 px-3 rounded-lg border text-[13.5px] text-[#172033] placeholder:text-[#9aa3b2] outline-none transition-colors focus:border-[#355fd1] focus:ring-2 focus:ring-[#355fd1]/15'
export function Input(props) {
  return <input {...props} className={`${FIELD_BASE} ${props.className || ''}`} style={{ borderColor: TOKENS.input, background: '#fff', ...props.style }} />
}
export function Select({ children, ...props }) {
  return (
    <select {...props} className={`${FIELD_BASE} pr-8 ${props.className || ''}`} style={{ borderColor: TOKENS.input, background: '#fff', ...props.style }}>
      {children}
    </select>
  )
}
export function Textarea({ rows = 3, ...props }) {
  return <textarea rows={rows} {...props} className={`${FIELD_BASE} h-auto py-2 resize-y min-h-[70px] ${props.className || ''}`} style={{ borderColor: TOKENS.input, background: '#fff', ...props.style }} />
}

/* ── Toggle ──────────────────────────────────────────── */
export function Toggle({ value, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <span className="relative inline-flex w-9 h-5 shrink-0">
        <input type="checkbox" role="switch" aria-checked={!!value} checked={!!value} onChange={() => onChange(!value)} className="peer absolute inset-0 z-10 opacity-0 cursor-pointer" />
        <span className={`pointer-events-none absolute inset-0 rounded-full border transition-colors ${value ? '' : 'bg-[#e7ebf1]'}`} style={value ? { background: TOKENS.primary, borderColor: TOKENS.primary } : { borderColor: TOKENS.input }}>
          <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`} />
        </span>
      </span>
      {label && <span className="text-[13px] text-[#3d4759]">{label}</span>}
    </label>
  )
}

/* ── Tabla ───────────────────────────────────────────── */
export function TableWrap({ children }) {
  return (
    <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: TOKENS.border }}>
      <table className="w-full border-collapse text-[13.5px]">{children}</table>
    </div>
  )
}
export function Th({ children, right }) {
  return (
    <th className={`bg-[#f9fafc] px-4 py-3 text-[11.5px] font-bold text-[#687386] uppercase tracking-[0.04em] whitespace-nowrap border-b ${right ? 'text-right' : 'text-left'}`} style={{ borderColor: TOKENS.border }}>
      {children}
    </th>
  )
}
export function Td({ children, muted, right, mono, className = '' }) {
  return (
    <td className={`px-4 py-3 align-middle text-[#172033] ${muted ? 'text-[#687386]' : ''} ${right ? 'text-right' : ''} ${mono ? 'font-mono text-[12.5px]' : ''} ${className}`}>
      {children}
    </td>
  )
}

/* ── Empty state ─────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-16 px-5 text-center" style={{ borderColor: TOKENS.border }}>
      {Icon && <Icon size={40} className="text-[#c3cad6]" />}
      <div>
        <p className="text-[14px] font-semibold text-[#3d4759]">{title}</p>
        {description && <p className="mt-1 text-[13px] text-[#8893a3] max-w-[280px]">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/* ── Alert ───────────────────────────────────────────── */
const ALERT_STYLES = {
  info:    'bg-[#edf3ff] border-[#cbdcff] text-[#365daf]',
  warning: 'bg-[#fff4e2] border-[#f2d8aa] text-[#995b13]',
  danger:  'bg-[#fff0f0] border-[#f0caca] text-[#ad3f3f]',
  success: 'bg-[#eaf8ef] border-[#ccebd8] text-[#28794a]',
}
export function Alert({ variant = 'info', children, className = '' }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] leading-snug ${ALERT_STYLES[variant]} ${className}`}>
      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

/* ── Modal ───────────────────────────────────────────── */
export function Modal({ open, onClose, title, size = 'md', children, footer }) {
  const dialogRef = useDialogA11y(open, onClose)
  if (!open) return null
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-[#0e1420]/50 backdrop-blur-sm">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
        className={`w-full ${widths[size]} max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl outline-none`}>
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: TOKENS.border }}>
          <span className="text-[16px] font-bold text-[#172033]">{title}</span>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg text-[#687386] hover:bg-[#f3f5f8]"><X size={16} /></button>
        </div>
        <div className="px-6 py-6 overflow-y-auto flex-1 flex flex-col gap-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t" style={{ borderColor: TOKENS.border }}>{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, danger = false }) {
  const dialogRef = useDialogA11y(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-[#0e1420]/50 backdrop-blur-sm">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title || 'Confirmar'} tabIndex={-1}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl outline-none flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: TOKENS.border }}>
          <span className="text-[16px] font-bold text-[#172033]">{title || 'Confirmar'}</span>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg text-[#687386] hover:bg-[#f3f5f8]"><X size={16} /></button>
        </div>
        <div className="px-6 py-6"><p className="text-[13.5px] text-[#3d4759] leading-relaxed">{message}</p></div>
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t" style={{ borderColor: TOKENS.border }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose() }}>{danger ? 'Eliminar' : 'Confirmar'}</Btn>
        </div>
      </div>
    </div>
  )
}

export { ChevronRight }
