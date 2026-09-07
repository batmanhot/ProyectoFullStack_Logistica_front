import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronDown, AlertTriangle } from 'lucide-react'
import { PROBLEMAS } from '../../data/help'

function ProblemaCard({ p, abierto, onToggle }) {
  return (
    <div id={p.slug} className="rounded-xl border overflow-hidden scroll-mt-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left">
        <span className="flex items-center gap-2.5 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          <AlertTriangle size={15} style={{ color: '#ef4444' }} />
          {p.problema}
        </span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
      </button>
      {abierto && (
        <div className="px-4 pb-4 flex flex-col gap-3.5 text-[13px] leading-relaxed">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Causas posibles</div>
            <ul className="flex flex-col gap-1.5">
              {p.causas.map((c, i) => (
                <li key={i} className="flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: '#ef4444' }} />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Solución</div>
            <p style={{ color: 'var(--text-secondary)' }}>{p.solucion}</p>
          </div>
          <div className="px-3.5 py-2.5 rounded-lg" style={{ background: 'var(--accent-dim)' }}>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--accent)' }}>Prevención</div>
            <p style={{ color: 'var(--text-primary)' }}>{p.prevencion}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AyudaProblemas() {
  const location = useLocation()
  const [abierto, setAbierto] = useState(null)

  useEffect(() => {
    const hash = location.hash?.replace('#', '')
    if (hash) setAbierto(hash)
  }, [location.hash])

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-5">
      <div>
        <h1 className="text-[19px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Problemas frecuentes</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Causas comunes y cómo resolverlas.</p>
      </div>

      <div className="flex flex-col gap-2">
        {PROBLEMAS.map(p => (
          <ProblemaCard key={p.slug} p={p} abierto={abierto === p.slug} onToggle={() => setAbierto(prev => prev === p.slug ? null : p.slug)} />
        ))}
      </div>
    </div>
  )
}
