import { ChevronRight } from 'lucide-react'
import { PROBLEMAS } from './constants'

export function ProblemaEmpresarial({ primary, goSection }) {
  return (
    <section className="py-20 px-6 bg-[#0b0f16]">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border mb-5
                          border-red-500/30 text-red-400 bg-red-500/08">
            ¿Te identificas?
          </div>
          <h2 className="text-[34px] md:text-[44px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
            ¿Tu operación logística depende<br/>
            <span className="text-red-400">de procesos manuales y poca visibilidad?</span>
          </h2>
          <p className="text-[16px] text-[#7a8a99] max-w-2xl mx-auto leading-relaxed">
            Los errores de inventario, retrasos en despachos y el descontrol operativo
            generan pérdidas constantes que muchas veces ni se miden.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-14">
          {PROBLEMAS.map(({ icono, titulo, desc }) => (
            <div key={titulo}
                 className="flex items-start gap-4 p-5 bg-[#141920]/80 border border-red-500/12
                            rounded-xl hover:border-red-500/25 transition-all duration-200 hover:bg-[#141920]">
              <span className="text-[26px] shrink-0 mt-0.5">{icono}</span>
              <div>
                <div className="text-[13px] font-bold text-[#e8edf2] mb-1">{titulo}</div>
                <div className="text-[12px] text-[#7a8a99] leading-relaxed">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Transición — la solución */}
        <div className="relative rounded-2xl p-8 text-center border overflow-hidden"
             style={{ borderColor: `${primary}25`, background: `linear-gradient(135deg, ${primary}06 0%, transparent 100%)` }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl opacity-[0.08]"
               style={{ background: primary }}/>
          <div className="relative">
            <div className="text-[40px] mb-4">💡</div>
            <h3 className="text-[22px] md:text-[28px] font-extrabold text-[#e8edf2] mb-3">
              Existe una forma mejor de operar
            </h3>
            <p className="text-[15px] text-[#7a8a99] max-w-xl mx-auto leading-relaxed mb-6">
              <strong className="text-[#e8edf2]">StockPro centraliza toda tu operación logística</strong> en tiempo real.
              Más control, menos errores y mayor eficiencia operativa desde el primer día.
            </p>
            <button
              onClick={() => goSection('beneficios')}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-[14px] font-bold transition-all hover:opacity-90"
              style={{ background: primary, color: '#082e1e', boxShadow: `0 6px 24px ${primary}40` }}>
              Ver cómo funciona <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
