import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { Badge, Card, EmptyState } from '../../components/ui/index'
import { getModuloPorSlug, getConceptoPorSlug, PROCEDIMIENTOS, FAQ } from '../../data/help'

function Seccion({ titulo, children }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2.5" style={{ color: 'var(--text-muted)' }}>{titulo}</div>
      {children}
    </div>
  )
}

function ListaSimple({ items }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  )
}

export default function AyudaModuloDetalle() {
  const { slug } = useParams()
  const m = getModuloPorSlug(slug)

  if (!m) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <EmptyState title="Módulo no encontrado" description="Este módulo todavía no tiene documentación disponible." />
        <div className="text-center">
          <Link to="/ayuda/modulos" className="text-[13px] font-medium" style={{ color: 'var(--accent)' }}>← Volver a Módulos</Link>
        </div>
      </div>
    )
  }

  const procedimientos = (m.procedimientosRelacionados || []).map(s => PROCEDIMIENTOS.find(p => p.slug === s)).filter(Boolean)
  const faqs = (m.preguntasFrecuentes || []).map(s => FAQ.find(f => f.slug === s)).filter(Boolean)

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
      <div>
        <Link to="/ayuda/modulos" className="inline-flex items-center gap-1 text-[12.5px] font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
          <ChevronLeft size={14} /> Módulos
        </Link>
        <h1 className="text-[20px] font-bold" style={{ color: 'var(--text-primary)' }}>{m.nombre}</h1>
        {m.rutaSistema && (
          <Link to={m.rutaSistema} className="inline-flex items-center gap-1.5 mt-1.5 text-[12px] font-medium" style={{ color: 'var(--accent)' }}>
            Ir a la pantalla del sistema <ExternalLink size={11} />
          </Link>
        )}
      </div>

      <Seccion titulo="¿Qué es?"><p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{m.queEs}</p></Seccion>
      <Seccion titulo="¿Para qué sirve?"><p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{m.paraQueSirve}</p></Seccion>

      <Seccion titulo="¿Quién puede utilizarlo?">
        <div className="flex flex-wrap gap-1.5">
          {m.quienPuedeUsarlo.map(r => <Badge key={r} variant="neutral">{r}</Badge>)}
        </div>
      </Seccion>

      {m.conceptosRelacionados?.length > 0 && (
        <Seccion titulo="Conceptos relacionados">
          <div className="flex flex-wrap gap-1.5">
            {m.conceptosRelacionados.map(cs => {
              const c = getConceptoPorSlug(cs)
              if (!c) return null
              return (
                <Link key={cs} to={`/ayuda/conceptos#${cs}`}>
                  <Badge variant="teal">{c.nombre}</Badge>
                </Link>
              )
            })}
          </div>
        </Seccion>
      )}

      <Seccion titulo="Operaciones disponibles"><ListaSimple items={m.operaciones} /></Seccion>

      {procedimientos.length > 0 && (
        <Seccion titulo="Procedimientos">
          <div className="flex flex-col gap-1.5">
            {procedimientos.map(p => (
              <Link key={p.slug} to={`/ayuda/como-hago/${p.slug}`}
                className="px-3.5 py-2.5 rounded-lg border text-[13px] font-medium transition-colors hover:bg-white/5"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                {p.pregunta}
              </Link>
            ))}
          </div>
        </Seccion>
      )}

      <Seccion titulo="Reglas de negocio"><ListaSimple items={m.reglasNegocio} /></Seccion>
      <Seccion titulo="Validaciones"><ListaSimple items={m.validaciones} /></Seccion>

      <Seccion titulo="Errores frecuentes">
        <div className="flex flex-col gap-2">
          {m.erroresFrecuentes.map((e, i) => (
            <Card key={i} className="p-3.5">
              <div className="text-[13px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{e.error}</div>
              <div className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{e.causa}</div>
            </Card>
          ))}
        </div>
      </Seccion>

      {faqs.length > 0 && (
        <Seccion titulo="Preguntas frecuentes">
          <div className="flex flex-col gap-3">
            {faqs.map(f => (
              <div key={f.slug}>
                <div className="text-[13px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{f.pregunta}</div>
                <div className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.respuesta}</div>
              </div>
            ))}
          </div>
        </Seccion>
      )}

      <Seccion titulo="Consejos">
        <div className="flex flex-col gap-2">
          {m.consejos.map((c, i) => (
            <div key={i} className="px-3.5 py-2.5 rounded-lg text-[12.5px] leading-relaxed" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              {c}
            </div>
          ))}
        </div>
      </Seccion>
    </div>
  )
}
