// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
export function scrollSmoothTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
