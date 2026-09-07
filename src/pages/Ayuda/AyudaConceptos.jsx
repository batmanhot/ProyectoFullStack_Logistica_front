import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, ChevronDown } from 'lucide-react'
import { Badge } from '../../components/ui/index'
import { CONCEPTOS } from '../../data/help'

function ConceptoCard({ c, abierto, onToggle, onIrA }) {
  return (
    <div id={c.slug} className="rounded-xl border overflow-hidden scroll-mt-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left">
        <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{c.nombre}</span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
      </button>
      {abierto && (
        <div className="px-4 pb-4 flex flex-col gap-3 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <p>{c.descripcion}</p>
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Para qué sirve</div>
            <p>{c.paraQueSirve}</p>
          </div>
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Ejemplo</div>
            <p className="italic">{c.ejemplo}</p>
          </div>
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Impacto operativo</div>
            <p>{c.impacto}</p>
          </div>
          {c.relacionados?.length > 0 && (
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Relacionado con</div>
              <div className="flex flex-wrap gap-1.5">
                {c.relacionados.map(slug => {
                  const rel = CONCEPTOS.find(x => x.slug === slug)
                  if (!rel) return null
                  return (
                    <button key={slug} onClick={() => onIrA(slug)}>
                      <Badge variant="teal">{rel.nombre}</Badge>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Une la vista "Conceptos logísticos" (educativa, spec sección 8) con el
// "Glosario" (diccionario rápido, spec sección 25) — misma data, una sola
// lista expandible en A-Z, para no mantener dos vistas separadas del mismo
// contenido.
export default function AyudaConceptos() {
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [abiertoSlug, setAbiertoSlug] = useState(null)

  useEffect(() => {
    const hash = location.hash?.replace('#', '')
    if (hash) {
      setAbiertoSlug(hash)
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ block: 'start' }), 50)
    }
  }, [location.hash])

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    const lista = !q
      ? CONCEPTOS
      : CONCEPTOS.filter(c => c.nombre.toLowerCase().includes(q) || c.descripcion.toLowerCase().includes(q))
    return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [query])

  function irA(slug) {
    setAbiertoSlug(slug)
    setTimeout(() => document.getElementById(slug)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 30)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-5">
      <div>
        <h1 className="text-[19px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Conceptos y Glosario</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          Los {CONCEPTOS.length} términos logísticos fundamentales del sistema, de la A a la Z. Haz clic en un término para ver su definición completa.
        </p>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar un término..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-[13px] outline-none"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </div>

      <div className="flex flex-col gap-2">
        {filtrados.map(c => (
          <ConceptoCard
            key={c.slug}
            c={c}
            abierto={abiertoSlug === c.slug}
            onToggle={() => setAbiertoSlug(prev => prev === c.slug ? null : c.slug)}
            onIrA={irA}
          />
        ))}
        {filtrados.length === 0 && (
          <p className="text-center py-10 text-[13px]" style={{ color: 'var(--text-muted)' }}>Ningún término coincide con "{query}".</p>
        )}
      </div>
    </div>
  )
}
