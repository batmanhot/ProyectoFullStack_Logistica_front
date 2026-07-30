import { ArrowRight } from 'lucide-react'
import { PASOS, MODULOS } from './constants'
import { ModuloMockup } from './ModuloMockup'

export function ComoFunciona({ primary, moduloActivo, setModuloActivo, navigate }) {
  const moduloActualData = MODULOS.find(m => m.id === moduloActivo) || MODULOS[0]

  return (
    <>
      {/* ══════════════════════════════════════════════════
          CÓMO FUNCIONA
      ══════════════════════════════════════════════════ */}
      <section id="como-funciona" className="py-24 px-6 bg-[#111820]">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border mb-5"
                 style={{ color: primary, borderColor: `${primary}40`, background: `${primary}10` }}>
              Proceso de implementación
            </div>
            <h2 className="text-[38px] md:text-[48px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
              Operativo en <span style={{ color: primary }}>menos de 15 minutos</span>
            </h2>
            <p className="text-[16px] text-[#8a9ab0]">
              Sin implementaciones costosas. Sin consultores externos. Sin interrumpir tu operación.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PASOS.map((p, i) => (
              <div key={p.num}
                   className="relative flex flex-col bg-[#141c27] border border-white/10 rounded-2xl p-8
                              transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50"
                   style={{ ['--primary']: primary }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[14px] font-extrabold shrink-0"
                       style={{ background: primary, color: '#082e1e' }}>
                    {p.num}
                  </div>
                  {i < PASOS.length - 1 && (
                    <div className="hidden md:block flex-1 border-t border-dashed border-white/12"/>
                  )}
                </div>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-[34px] mb-5 border"
                     style={{ background: `${primary}15`, borderColor: `${primary}25` }}>
                  {p.icono}
                </div>
                <h3 className="text-[17px] font-bold text-[#e8edf2] mb-3">{p.titulo}</h3>
                <p className="text-[13px] text-[#8a9ab0] leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          ASÍ FUNCIONA LA PLATAFORMA — Screenshots visuales
      ══════════════════════════════════════════════════ */}
      <section id="plataforma" className="py-24 px-6 bg-[#0e1117]">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border mb-5"
                 style={{ color: primary, borderColor: `${primary}40`, background: `${primary}10` }}>
              Plataforma en acción
            </div>
            <h2 className="text-[38px] md:text-[48px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
              Así se ve el control<br/>
              <span style={{ color: primary }}>total de tu operación</span>
            </h2>
            <p className="text-[16px] text-[#7a8a99] max-w-xl mx-auto leading-relaxed">
              Cada módulo diseñado para darte visibilidad inmediata y control operativo real.
            </p>
          </div>

          {/* Tabs de módulos */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {MODULOS.map(m => (
              <button key={m.id} onClick={() => setModuloActivo(m.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                  moduloActivo === m.id
                    ? 'text-[#082e1e] shadow-lg'
                    : 'bg-white/4 text-[#7a8a99] border border-white/8 hover:text-white hover:bg-white/7'
                }`}
                style={moduloActivo === m.id ? { background: primary, boxShadow: `0 4px 20px ${primary}40` } : {}}>
                <span>{m.icono}</span>
                {m.label}
              </button>
            ))}
          </div>

          {/* Mockup del módulo activo */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">

            {/* Descripción */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div>
                <div className="text-[40px] mb-4">{moduloActualData.icono}</div>
                <h3 className="text-[24px] font-extrabold text-[#e8edf2] mb-3">
                  {moduloActualData.label}
                </h3>
                <p className="text-[14px] text-[#7a8a99] leading-relaxed mb-6">
                  {moduloActualData.desc}
                </p>
              </div>

              {/* KPIs resumen */}
              <div className="grid grid-cols-2 gap-3">
                {moduloActualData.kpis.map(({ ic, val, lbl, col }) => (
                  <div key={lbl} className="p-4 bg-[#141920] border border-white/8 rounded-xl">
                    <div className="text-[22px] mb-1">{ic}</div>
                    <div className="text-[20px] font-extrabold leading-none mb-1" style={{ color: col }}>{val}</div>
                    <div className="text-[11px] text-[#5f6f80]">{lbl}</div>
                  </div>
                ))}
              </div>

              <button onClick={() => navigate('/app/dlnorte')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold transition-all hover:opacity-90 w-fit"
                style={{ background: primary, color: '#082e1e', boxShadow: `0 6px 24px ${primary}40` }}>
                Ver módulo en vivo <ArrowRight size={15}/>
              </button>
            </div>

            {/* Mockup visual */}
            <div className="lg:col-span-3 relative">
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full blur-3xl opacity-[0.12]"
                   style={{ background: primary }}/>
              <ModuloMockup modulo={moduloActualData} primary={primary}/>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
