import { TestimonioCard } from './TestimonioCard'

export function Testimonios({ primary, testimonios }) {
  // Sin testimonios reales configurados todavía (SuperAdmin → Landing Page →
  // Testimonios) — se oculta la sección entera en vez de mostrar ejemplos
  // inventados como "resultados reales" (auditoría 2026-09-16).
  if (!testimonios?.length) return null

  return (
    <section id="testimonios" className="py-24 px-6 bg-[#0e1117]">
      <div className="max-w-6xl mx-auto">

        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border mb-5"
               style={{ color: primary, borderColor: `${primary}40`, background: `${primary}10` }}>
            Casos de éxito
          </div>
          <h2 className="text-[38px] md:text-[48px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
            Empresas que ya<br/>
            <span style={{ color: primary }}>transformaron su operación</span>
          </h2>
          <p className="text-[16px] text-[#7a8a99]">
            Resultados reales de empresas que usaban Excel y procesos manuales antes de StockPro.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonios.map(t => <TestimonioCard key={t.id || t.nombre} t={t} primary={primary}/>)}
        </div>
      </div>
    </section>
  )
}
