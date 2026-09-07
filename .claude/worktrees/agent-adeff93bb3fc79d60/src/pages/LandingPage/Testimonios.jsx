import { TESTIMONIOS } from './constants'
import { TestimonioCard } from './TestimonioCard'

export function Testimonios({ primary }) {
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
          {TESTIMONIOS.map(t => <TestimonioCard key={t.nombre} t={t} primary={primary}/>)}
        </div>

        {/* Trust bar */}
        <div className="mt-12 flex flex-wrap justify-center gap-8 items-center">
          {[
            { ic: '🏢', label: '500+ empresas activas' },
            { ic: '⭐', label: '4.9/5 valoración promedio' },
            { ic: '🔒', label: 'Datos 100% seguros y cifrados' },
            { ic: '🇵🇪', label: 'Soporte en español 24/7' },
          ].map(({ ic, label }) => (
            <div key={label} className="flex items-center gap-2 text-[13px] text-[#5f6f80]">
              <span>{ic}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
