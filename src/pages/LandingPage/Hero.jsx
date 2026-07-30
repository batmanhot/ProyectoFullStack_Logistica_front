import { Zap, ArrowRight, ChevronRight, Globe } from 'lucide-react'

export function Hero({ primary, hero, footer, navigate, goSection }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 pt-20 pb-16 overflow-hidden">

      {/* Fondo con glow mejorado */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[800px] h-[800px] rounded-full blur-[220px] opacity-[0.09]"
             style={{ background: primary }}/>
        <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[200px] opacity-[0.05] bg-blue-500"/>
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full blur-[150px] opacity-[0.04]"
             style={{ background: primary }}/>
        <div className="absolute inset-0 opacity-[0.018]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}/>
      </div>

      <div className="relative max-w-5xl mx-auto text-center">

        {/* Badge de credibilidad */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/4 text-[12px] text-[#9ba8b6] mb-8 backdrop-blur-sm">
          <Zap size={12} style={{ color: primary }}/>
          <span>
            {footer?.probarGratisDias
              ? `Prueba ${footer.probarGratisDias} días gratis · Sin tarjeta de crédito · Cancela cuando quieras`
              : 'Prueba gratuita · Sin tarjeta de crédito · Cancela cuando quieras'
            }
          </span>
        </div>

        {/* Headline principal — orientado a transformación */}
        <h1 className="text-[42px] sm:text-[58px] lg:text-[72px] font-extrabold leading-[1.06] tracking-tight text-[#e8edf2] mb-6">
          {(() => {
            const titulo = hero?.titulo || 'Digitaliza toda tu operación logística desde una sola plataforma'
            const words  = titulo.split(' ')
            const cutoff = Math.floor(words.length * 0.6)
            const normal = words.slice(0, cutoff).join(' ')
            const hl     = words.slice(cutoff).join(' ')
            return (
              <>
                {normal}{' '}
                <span style={{ color: primary }}>{hl}</span>
              </>
            )
          })()}
        </h1>

        {/* Subtítulo orientado a resultados */}
        <p className="text-[17px] sm:text-[20px] text-[#7a8a99] leading-relaxed max-w-2xl mx-auto mb-10">
          {hero?.subtitulo || 'Centraliza inventarios, pedidos, almacenes y trazabilidad. Reduce errores operativos, automatiza procesos y toma decisiones en tiempo real.'}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
          <button
            onClick={() => navigate('/app/dlnorte')}
            className="flex items-center justify-center gap-2.5 px-9 py-4 rounded-2xl text-[15px] font-bold transition-all hover:opacity-90 hover:scale-[1.02] shadow-2xl"
            style={{ background: primary, color: '#082e1e', boxShadow: `0 10px 40px ${primary}45` }}>
            {hero?.ctaTexto || 'Solicitar Demo Gratis'}
            <ArrowRight size={17}/>
          </button>
          <button
            onClick={() => goSection('planes')}
            className="flex items-center justify-center gap-2.5 px-9 py-4 rounded-2xl text-[15px] font-semibold text-[#e8edf2] bg-white/5 border border-white/10 hover:bg-white/10 transition-all hover:scale-[1.02]">
            Ver Planes y Precios
            <ChevronRight size={17}/>
          </button>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[12px] text-[#5f6f80] mb-14">
          {['✅ Sin instalación requerida', '✅ Datos seguros y cifrados', '✅ Soporte en español', '✅ Onboarding guiado incluido'].map(t => (
            <span key={t}>{t}</span>
          ))}
        </div>

        {/* Dashboard mockup mejorado con floating cards */}
        <div className="relative max-w-3xl mx-auto">

          {/* Floating metric card — izquierda */}
          <div className="absolute -left-8 top-12 hidden lg:flex items-center gap-3 px-4 py-3
                          bg-[#1a2535]/90 backdrop-blur border border-white/12 rounded-2xl
                          shadow-2xl shadow-black/50 z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] shrink-0"
                 style={{ background: `${primary}20` }}>📉</div>
            <div>
              <div className="text-[18px] font-extrabold leading-none" style={{ color: primary }}>-85%</div>
              <div className="text-[10px] text-[#7a8a99] mt-0.5">Errores de inventario</div>
            </div>
          </div>

          {/* Floating metric card — derecha */}
          <div className="absolute -right-8 top-24 hidden lg:flex items-center gap-3 px-4 py-3
                          bg-[#1a2535]/90 backdrop-blur border border-white/12 rounded-2xl
                          shadow-2xl shadow-black/50 z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] shrink-0"
                 style={{ background: `#3b82f620` }}>⚡</div>
            <div>
              <div className="text-[18px] font-extrabold leading-none text-[#3b82f6]">+40%</div>
              <div className="text-[10px] text-[#7a8a99] mt-0.5">Velocidad de despacho</div>
            </div>
          </div>

          {/* Floating badge — abajo */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-2 px-4 py-2
                          bg-[#1a2535]/90 backdrop-blur border border-white/12 rounded-full
                          shadow-2xl shadow-black/50 z-10 whitespace-nowrap">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: primary }}/>
            <span className="text-[11px] font-semibold text-[#e8edf2]">500+ empresas operando en tiempo real</span>
          </div>

          {/* Mockup principal */}
          <div className="bg-[#141920] border border-white/8 rounded-2xl p-4 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/50"/>
                <div className="w-3 h-3 rounded-full bg-amber-500/50"/>
                <div className="w-3 h-3 rounded-full bg-green-500/50"/>
              </div>
              <div className="flex-1 mx-3 h-5 bg-white/4 rounded-md flex items-center px-2">
                <span className="text-[10px] text-[#5f6f80]">stockpro.pe/dashboard</span>
              </div>
              <Globe size={13} className="text-[#5f6f80]"/>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { ic: '📦', val: '1,247', lbl: 'Productos', col: '#3b82f6' },
                { ic: '🚚', val: '38',    lbl: 'Despachos hoy', col: '#00c896' },
                { ic: '📊', val: '94.2%', lbl: 'OTIF', col: '#f59e0b' },
                { ic: '💰', val: 'S/84K', lbl: 'Ventas mes', col: '#a855f7' },
              ].map(({ ic, val, lbl, col }) => (
                <div key={lbl} className="bg-[#1a2230] rounded-xl p-3 text-left relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl" style={{ background: col }}/>
                  <div className="text-[18px] mb-1">{ic}</div>
                  <div className="text-[15px] font-bold text-[#e8edf2]">{val}</div>
                  <div className="text-[10px] text-[#5f6f80]">{lbl}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 h-24 bg-[#1a2230] rounded-xl p-3 flex items-end gap-1.5">
                {[60, 80, 55, 90, 75, 95, 70, 85, 100, 78, 88, 92].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm"
                       style={{ height: `${h}%`, background: i === 11 ? primary : `${primary}40` }}/>
                ))}
              </div>
              <div className="h-24 bg-[#1a2230] rounded-xl p-3 flex flex-col justify-between">
                {[['Fill Rate', '96.4%', '#00c896'], ['Stock Bajo', '3', '#f59e0b'], ['Vencidos', '1', '#ef4444']].map(([l, v, c]) => (
                  <div key={l} className="flex items-center justify-between">
                    <span className="text-[9px] text-[#5f6f80]">{l}</span>
                    <span className="text-[11px] font-bold" style={{ color: c }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Glow bajo el mockup */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-2/3 h-16 blur-3xl rounded-full opacity-30"
               style={{ background: primary }}/>
        </div>
      </div>
    </section>
  )
}
