import { Badge } from '../../../components/ui/index'

/* ── Sidebar de navegación agrupada, exclusiva de AdminSaaS ──
   No reemplaza el Sidebar principal de la app (ese solo muestra
   un ítem "Administración SaaS" para el rol saas_admin) — esta es
   la navegación interna del panel, entre sus 7 secciones. */
export function AdminSidebarNav({ groups, activeId, onSelect }) {
  return (
    <nav className="w-60 shrink-0 border-r border-[var(--border)] bg-[var(--bg-surface)] overflow-y-auto py-4">
      {groups.map(group => (
        <div key={group.label} className="mb-5 last:mb-0">
          <div className="px-4 mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {group.label}
          </div>
          <div className="flex flex-col gap-0.5 px-2">
            {group.items.map(item => {
              const Icon = item.icon
              const active = item.id === activeId
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-left transition-colors ${
                    active
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-l-2 border-[var(--accent)] pl-2'
                      : 'text-[var(--text-secondary)] border-l-2 border-transparent hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.count != null && (
                    <Badge variant={active ? 'teal' : 'neutral'} className="shrink-0">{item.count}</Badge>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

/* ── Header consistente por sección: eyebrow + título + descripción + acción ── */
export function PageHead({ eyebrow, title, description, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        {eyebrow && (
          <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--accent)] mb-1">{eyebrow}</div>
        )}
        <h2 className="text-[19px] font-bold text-[var(--text-primary)] tracking-tight">{title}</h2>
        {description && <p className="text-[13px] text-[var(--text-muted)] mt-1 max-w-xl">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
