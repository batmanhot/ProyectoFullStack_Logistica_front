import { ArrowRight } from 'lucide-react'

export function CtaCentral({ primary, navigate, goSection, sitio, footer }) {
  return (
    <section className="py-24 px-6 bg-[#111820]">
      <div className="max-w-3xl mx-auto">
        <div className="relative rounded-3xl p-12 text-center overflow-hidden border"
             style={{ borderColor: `${primary}25`, background: `linear-gradient(135deg, ${primary}08 0%, ${primary}03 50%, transparent 100%)` }}>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-[120px] opacity-[0.09]"
               style={{ background: primary }}/>

          <div className="relative">
            <div className="text-[52px] mb-5">🚀</div>
            <h2 className="text-[32px] md:text-[40px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
              ¿Listo para transformar<br/>tu logística empresarial?
            </h2>
            <p className="text-[16px] text-[#7a8a99] mb-3 max-w-lg mx-auto leading-relaxed">
              Únete a más de 500 empresas que ya operan con control total, menos errores y mayor eficiencia con {sitio?.nombre || 'StockPro'}.
            </p>
            {footer?.probarGratisDias > 0 && (
              <p className="text-[13px] mb-8 font-semibold" style={{ color: primary }}>
                ✅ {footer.probarGratisDias} días gratis · Sin tarjeta de crédito · Sin permanencia
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/app/dlnorte')}
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-[15px] font-bold transition-all hover:opacity-90 hover:scale-[1.02] shadow-2xl"
                style={{ background: primary, color: '#082e1e', boxShadow: `0 10px 40px ${primary}45` }}>
                Solicitar Demo Gratis
                <ArrowRight size={17}/>
              </button>
              <button
                onClick={() => goSection('contacto')}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-semibold text-[#9ba8b6] bg-white/4 border border-white/10 hover:bg-white/10 transition-all">
                Hablar con un asesor →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
