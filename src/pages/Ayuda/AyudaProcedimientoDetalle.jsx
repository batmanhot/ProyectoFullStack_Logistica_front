import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, CheckCircle2, TrendingUp, AlertTriangle, Lightbulb, ExternalLink } from 'lucide-react'
import { EmptyState } from '../../components/ui/index'
import { getProcedimientoPorSlug, getModuloPorSlug } from '../../data/help'

function Bloque({ icon: Icon, titulo, color, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <Icon size={14} style={{ color }} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>{titulo}</span>
      </div>
      {children}
    </div>
  )
}

export default function AyudaProcedimientoDetalle() {
  const { slug } = useParams()
  const p = getProcedimientoPorSlug(slug)

  if (!p) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <EmptyState title="Procedimiento no encontrado" />
        <div className="text-center"><Link to="/ayuda/como-hago" style={{ color: 'var(--accent)' }} className="text-[13px] font-medium">← Volver</Link></div>
      </div>
    )
  }

  const modulo = p.moduloRelacionado ? getModuloPorSlug(p.moduloRelacionado) : null

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
      <div>
        <Link to="/ayuda/como-hago" className="inline-flex items-center gap-1 text-[12.5px] font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
          <ChevronLeft size={14} /> ¿Cómo hago...?
        </Link>
        <h1 className="text-[20px] font-bold" style={{ color: 'var(--text-primary)' }}>{p.pregunta}</h1>
        {modulo && (
          <Link to={`/ayuda/modulos/${modulo.slug}`} className="inline-flex items-center gap-1.5 mt-1.5 text-[12px] font-medium" style={{ color: 'var(--accent)' }}>
            Ver documentación de {modulo.nombre} <ExternalLink size={11} />
          </Link>
        )}
      </div>

      <div className="rounded-xl p-4" style={{ background: 'var(--accent-dim)' }}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5" style={{ color: 'var(--accent)' }}>Objetivo</div>
        <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>{p.objetivo}</p>
      </div>

      {p.antes?.length > 0 && (
        <Bloque icon={CheckCircle2} titulo="Antes de comenzar" color="#3b82f6">
          <ul className="flex flex-col gap-1.5">
            {p.antes.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: '#3b82f6' }} />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-3" style={{ color: 'var(--text-muted)' }}>Pasos</div>
        <div className="flex flex-col gap-2.5">
          {p.pasos.map((paso, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}>
                {i + 1}
              </div>
              <p className="text-[13.5px] leading-relaxed pt-0.5" style={{ color: 'var(--text-primary)' }}>{paso}</p>
            </div>
          ))}
        </div>
      </div>

      <Bloque icon={CheckCircle2} titulo="Resultado" color="#10b981">
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p.resultado}</p>
      </Bloque>

      <Bloque icon={TrendingUp} titulo="Impacto en inventario" color="#8b5cf6">
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p.impacto}</p>
      </Bloque>

      {p.errores?.length > 0 && (
        <Bloque icon={AlertTriangle} titulo="Errores frecuentes" color="#ef4444">
          <ul className="flex flex-col gap-1.5">
            {p.errores.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: '#ef4444' }} />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      {p.recomendaciones?.length > 0 && (
        <Bloque icon={Lightbulb} titulo="Recomendaciones" color="#eab308">
          <div className="flex flex-col gap-2">
            {p.recomendaciones.map((r, i) => (
              <div key={i} className="px-3.5 py-2.5 rounded-lg text-[12.5px] leading-relaxed" style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                {r}
              </div>
            ))}
          </div>
        </Bloque>
      )}
    </div>
  )
}
