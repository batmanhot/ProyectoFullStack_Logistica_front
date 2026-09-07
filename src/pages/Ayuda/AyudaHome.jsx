import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, Rocket, ArrowDownToLine, Truck, ArrowRightLeft, ClipboardList,
  BookOpen, GitBranch, AlertTriangle, ChevronRight, LogIn,
  LayoutDashboard, ShieldCheck,
} from 'lucide-react'
import { Card, EmptyState } from '../../components/ui/index'
import { buscarEnAyuda } from '../../data/help'

const ACCESOS_RAPIDOS = [
  { label: 'Primeros pasos',       to: '/ayuda#primeros-pasos', icon: Rocket,        color: '#3b82f6' },
  { label: 'Entradas',             to: '/ayuda/modulos/entradas', icon: ArrowDownToLine, color: '#10b981' },
  { label: 'Despachos',            to: '/ayuda/modulos/despachos', icon: Truck,      color: '#f43f5e' },
  { label: 'Transferencias',       to: '/ayuda/modulos/transferencias', icon: ArrowRightLeft, color: '#a855f7' },
  { label: 'Inventarios',          to: '/ayuda/modulos/inv-fisico', icon: ClipboardList, color: '#06b6d4' },
  { label: 'Kardex',               to: '/ayuda/modulos/kardex', icon: BookOpen, color: '#8b5cf6' },
  { label: 'Trazabilidad',         to: '/ayuda/modulos/trazabilidad', icon: GitBranch, color: '#eab308' },
  { label: 'Problemas frecuentes', to: '/ayuda/problemas', icon: AlertTriangle, color: '#ef4444' },
]

const COMO_AYUDARTE = [
  { pregunta: '¿Cómo registro una recepción?', to: '/ayuda/como-hago/registrar-recepcion' },
  { pregunta: '¿Cómo consulto stock?',          to: '/ayuda/como-hago/consultar-stock' },
  { pregunta: '¿Cómo hago una transferencia?',  to: '/ayuda/como-hago/realizar-transferencia' },
  { pregunta: '¿Cómo realizo un inventario?',   to: '/ayuda/como-hago/hacer-inventario-fisico' },
  { pregunta: '¿Cómo consulto el kardex?',      to: '/ayuda/como-hago/consultar-kardex' },
  { pregunta: '¿Cómo encuentro un lote?',       to: '/ayuda/como-hago/consultar-lote' },
  { pregunta: '¿Cómo corrijo un error?',        to: '/ayuda/como-hago/corregir-diferencia' },
]

const GRUPOS_RESULTADOS = [
  { key: 'conceptos',      label: 'Conceptos' },
  { key: 'modulos',        label: 'Módulos' },
  { key: 'procedimientos', label: 'Procedimientos' },
  { key: 'faq',            label: 'Preguntas frecuentes' },
  { key: 'problemas',      label: 'Problemas frecuentes' },
]

function ResultadosBusqueda({ resultados }) {
  if (resultados.total === 0) {
    return <EmptyState icon={Search} title="Sin resultados" description="Prueba con otro término, por ejemplo: lote, kardex, transferencia, recepción." />
  }
  return (
    <div className="flex flex-col gap-5">
      {GRUPOS_RESULTADOS.map(g => {
        const items = resultados[g.key]
        if (!items.length) return null
        return (
          <div key={g.key}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: 'var(--text-muted)' }}>{g.label}</div>
            <div className="flex flex-col gap-1.5">
              {items.map(r => (
                <Link key={r.to} to={r.to}
                  className="flex items-start justify-between gap-3 px-4 py-3 rounded-lg border transition-colors hover:bg-white/5"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>{r.titulo}</div>
                    <div className="text-[12px] line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{r.extracto}</div>
                  </div>
                  <ChevronRight size={15} className="shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function AyudaHome() {
  const [query, setQuery] = useState('')
  const resultados = useMemo(() => buscarEnAyuda(query), [query])
  const buscando = query.trim().length >= 2

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-8">

      {/* ── Encabezado (spec sección 6) ─────────────────────────── */}
      <div className="text-center flex flex-col items-center gap-2">
        <h1 className="text-[24px] font-bold" style={{ color: 'var(--text-primary)' }}>Centro de Ayuda Logístico</h1>
        <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          Aprende, consulta y opera correctamente el sistema de gestión logística.
        </p>
      </div>

      {/* ── Buscador principal ──────────────────────────────────── */}
      <div>
        <div className="relative">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='Buscar "recepción", "lote", "kardex", "transferencia"...'
            className="w-full pl-11 pr-4 py-3.5 rounded-xl text-[14px] outline-none transition-all"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {buscando ? (
        <ResultadosBusqueda resultados={resultados} />
      ) : (
        <>
          {/* ── Accesos rápidos ──────────────────────────────────── */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-3" style={{ color: 'var(--text-muted)' }}>Accesos rápidos</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ACCESOS_RAPIDOS.map(a => {
                const Icon = a.icon
                return (
                  <Link key={a.label} to={a.to}
                    className="flex flex-col items-start gap-2.5 p-4 rounded-xl border transition-colors hover:border-white/20"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${a.color}1f` }}>
                      <Icon size={17} style={{ color: a.color }} />
                    </div>
                    <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{a.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* ── ¿Cómo puedo ayudarte? ────────────────────────────── */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-3" style={{ color: 'var(--text-muted)' }}>¿Cómo puedo ayudarte?</div>
            <div className="flex flex-col gap-1.5">
              {COMO_AYUDARTE.map(c => (
                <Link key={c.to} to={c.to}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border transition-colors hover:bg-white/5"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                  <span className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{c.pregunta}</span>
                  <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} />
                </Link>
              ))}
            </div>
          </div>

          {/* ── Primeros pasos (spec sección 7, versión compacta) ──── */}
          <div id="primeros-pasos">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-3" style={{ color: 'var(--text-muted)' }}>Primeros pasos</div>
            <Card className="flex flex-col gap-5">
              <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                StockPro es el sistema donde tu empresa registra y controla todo el ciclo de inventario: qué
                productos tienes, en qué almacenes, cuánto stock hay de cada uno, y cada movimiento que ese
                stock sufre en el tiempo. Ingresas con tu correo y contraseña asignados por tu administrador;
                si los olvidaste, pídele que te genere unos nuevos desde Usuarios y Roles. Las opciones que ves
                en el menú lateral dependen de tu rol — un almacenero no ve, por ejemplo, Reportes Contables.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg" style={{ background: 'var(--bg-muted)' }}>
                  <LogIn size={15} style={{ color: 'var(--accent)' }} />
                  <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>Inicia sesión con tu correo y contraseña</span>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg" style={{ background: 'var(--bg-muted)' }}>
                  <LayoutDashboard size={15} style={{ color: 'var(--accent)' }} />
                  <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>El Dashboard resume lo más urgente del día</span>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg" style={{ background: 'var(--bg-muted)' }}>
                  <ShieldCheck size={15} style={{ color: 'var(--accent)' }} />
                  <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>Tu rol define qué módulos puedes usar</span>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.05em] mb-2.5" style={{ color: 'var(--text-muted)' }}>Flujo logístico general</div>
                <div className="flex items-center flex-wrap gap-1.5 text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {['Abastecimiento', 'Recepción', 'Almacenamiento', 'Inventario', 'Preparación', 'Despacho', 'Entrega'].map((paso, i, arr) => (
                    <span key={paso} className="flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-md" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>{paso}</span>
                      {i < arr.length - 1 && <ChevronRight size={13} style={{ color: 'var(--text-faint)' }} />}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
