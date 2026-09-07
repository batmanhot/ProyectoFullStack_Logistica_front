import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import { PROCEDIMIENTOS } from '../../data/help'

export default function AyudaComoHago() {
  const [query, setQuery] = useState('')

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return PROCEDIMIENTOS
    return PROCEDIMIENTOS.filter(p => p.pregunta.toLowerCase().includes(q) || p.objetivo.toLowerCase().includes(q))
  }, [query])

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-5">
      <div>
        <h1 className="text-[19px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>¿Cómo hago...?</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          Biblioteca de procedimientos paso a paso, orientados a tareas concretas.
        </p>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar un procedimiento..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-[13px] outline-none"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </div>

      <div className="flex flex-col gap-2">
        {filtrados.map(p => (
          <Link key={p.slug} to={`/ayuda/como-hago/${p.slug}`}
            className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{p.pregunta}</div>
              <div className="text-[12px] line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{p.objetivo}</div>
            </div>
            <ChevronRight size={16} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
          </Link>
        ))}
        {filtrados.length === 0 && (
          <p className="text-center py-10 text-[13px]" style={{ color: 'var(--text-muted)' }}>Ningún procedimiento coincide con "{query}".</p>
        )}
      </div>
    </div>
  )
}
