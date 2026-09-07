import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { MODULOS_AYUDA } from '../../data/help'

export default function AyudaModulos() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-5">
      <div>
        <h1 className="text-[19px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Documentación por módulo</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          Qué es cada módulo, para qué sirve, quién puede usarlo, y sus reglas de negocio, validaciones y errores frecuentes.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {MODULOS_AYUDA.map(m => (
          <Link key={m.slug} to={`/ayuda/modulos/${m.slug}`}
            className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{m.nombre}</div>
              <div className="text-[12px] line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{m.queEs}</div>
            </div>
            <ChevronRight size={16} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
          </Link>
        ))}
      </div>
    </div>
  )
}
