import { BenefitCard } from './BenefitCard'

export function Beneficios({ primary, caracteristicas }) {
  return (
    <section id="beneficios" className="py-24 px-6 bg-[#0e1117]">
      <div className="max-w-6xl mx-auto">

        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border mb-5"
               style={{ color: primary, borderColor: `${primary}40`, background: `${primary}10` }}>
            Beneficios empresariales
          </div>
          <h2 className="text-[38px] md:text-[48px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
            No solo un sistema.<br/>
            <span style={{ color: primary }}>Una transformación operativa.</span>
          </h2>
          <p className="text-[16px] text-[#7a8a99] max-w-xl mx-auto leading-relaxed">
            StockPro no te da funcionalidades. Te da control total, reducción de errores
            y eficiencia operativa medible desde el primer mes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(caracteristicas || []).map(f => (
            <BenefitCard key={f.id} icono={f.icono} titulo={f.titulo} descripcion={f.descripcion} primary={primary}/>
          ))}
        </div>
      </div>
    </section>
  )
}
