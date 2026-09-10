/* ── Header consistente por sección: eyebrow + título + descripción + acción ──
   La navegación del panel vive en el sidebar oficial
   (NAV_SAAS_ADMIN en components/layout/Sidebar.jsx). */
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
