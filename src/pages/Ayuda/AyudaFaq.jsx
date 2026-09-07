import { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { Badge } from '../../components/ui/index'
import { FAQ, getConceptoPorSlug } from '../../data/help'

function FaqCard({ f, abierto, onToggle }) {
  return (
    <div id={f.slug} className="rounded-xl border overflow-hidden scroll-mt-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left">
        <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{f.pregunta}</span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
      </button>
      {abierto && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.respuesta}</p>
          {f.relacionados?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {f.relacionados.map(slug => {
                const c = getConceptoPorSlug(slug)
                if (!c) return null
                return (
                  <Link key={slug} to={`/ayuda/conceptos#${slug}`}>
                    <Badge variant="teal">{c.nombre}</Badge>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AyudaFaq() {
  const location = useLocation()
  const [abierto, setAbierto] = useState(null)

  useEffect(() => {
    const hash = location.hash?.replace('#', '')
    if (hash) setAbierto(hash)
  }, [location.hash])

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-5">
      <div>
        <h1 className="text-[19px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Preguntas frecuentes</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Dudas conceptuales comunes sobre el manejo del inventario.</p>
      </div>

      <div className="flex flex-col gap-2">
        {FAQ.map(f => (
          <FaqCard key={f.slug} f={f} abierto={abierto === f.slug} onToggle={() => setAbierto(prev => prev === f.slug ? null : f.slug)} />
        ))}
      </div>
    </div>
  )
}
