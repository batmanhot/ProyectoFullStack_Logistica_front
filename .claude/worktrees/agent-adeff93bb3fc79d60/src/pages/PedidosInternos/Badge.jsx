import { ESTADOS, PRIORIDADES } from './constants'

export function Badge({ estado, prioridad }) {
  if (prioridad) {
    const p = PRIORIDADES[prioridad] || PRIORIDADES.NORMAL
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ color: p.color, background: `${p.color}20` }}>
        {p.label}
      </span>
    )
  }
  const e = ESTADOS[estado] || ESTADOS.BORRADOR
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ color: e.color, background: e.bg }}>
      {e.label}
    </span>
  )
}
