import { CheckCircle, Star } from 'lucide-react'

export function PlanCard({ plan, ciclo, primary, navigate, whatsapp }) {
  const precio = ciclo === 'anual' ? plan.precioAnual : plan.precioMensual
  const esFree = precio === 0
  const ahorro = plan.precioMensual > 0
    ? Math.round(((plan.precioMensual * 12 - plan.precioAnual) / (plan.precioMensual * 12)) * 100)
    : 0
  const esTrial = plan.id === 'trial'
  const waNum = (whatsapp || '').replace(/\D/g, '')
  const waMsg = encodeURIComponent(`Hola, me interesa contratar el plan *${plan.nombre}* de StockPro. ¿Me pueden dar más información?`)
  const waUrl = waNum ? `https://wa.me/${waNum}?text=${waMsg}` : '#contacto'

  return (
    <div className={`relative flex flex-col rounded-2xl p-6 border transition-all duration-300 ${
      plan.destacado
        ? 'border-[#00c896]/50 shadow-2xl shadow-[#00c896]/10'
        : esTrial
          ? 'border-[#6366f1]/30 hover:border-[#6366f1]/50 hover:-translate-y-0.5 hover:shadow-lg'
          : 'bg-[#141920] border-white/8 hover:border-white/20 hover:-translate-y-0.5 hover:shadow-lg'
    }`}
    style={plan.destacado ? {
      background: 'linear-gradient(160deg, rgba(0,200,150,0.08) 0%, rgba(20,25,32,1) 60%)',
    } : esTrial ? {
      background: 'linear-gradient(160deg, rgba(99,102,241,0.07) 0%, rgba(20,25,32,1) 60%)',
    } : {}}>

      {plan.destacado && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5
                        bg-[#00c896] text-[#082e1e] text-[11px] font-extrabold
                        rounded-full uppercase tracking-widest shadow-lg shadow-[#00c896]/30
                        flex items-center gap-1.5">
          <Star size={10} fill="currentColor"/> Más popular
        </div>
      )}

      <div className="flex items-center gap-2 mb-5">
        <div className="w-3 h-3 rounded-full shadow-lg" style={{ background: plan.color, boxShadow: `0 0 8px ${plan.color}60` }}/>
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: plan.color }}>
          {esTrial ? 'Gratis 30 días' : plan.nombre}
        </span>
      </div>

      <h3 className="text-[20px] font-extrabold text-[#e8edf2] mb-1">{plan.nombre}</h3>
      <p className="text-[12px] text-[#7a8a99] mb-5 min-h-[36px]">{plan.descripcion}</p>

      <div className="mb-5">
        {esFree ? (
          <div>
            <div className="text-[42px] font-extrabold text-[#e8edf2] leading-none">Gratis</div>
            <div className="text-[12px] text-[#5f6f80] mt-1">{plan.vigenciaDias} días · Sin tarjeta de crédito</div>
          </div>
        ) : (
          <div>
            <div className="flex items-end gap-1 leading-none">
              <span className="text-[16px] text-[#7a8a99] mb-1.5">S/</span>
              <span className="text-[42px] font-extrabold text-[#e8edf2]">{precio}</span>
              <span className="text-[13px] text-[#7a8a99] mb-1.5">/{ciclo === 'anual' ? 'año' : 'mes'}</span>
            </div>
            {ciclo === 'anual' && ahorro > 0 && (
              <div className="mt-1.5 text-[11px] font-bold" style={{ color: primary }}>
                ✓ Ahorras {ahorro}% vs facturación mensual
              </div>
            )}
            {ciclo === 'mensual' && plan.precioAnual > 0 && (
              <div className="mt-1 text-[11px] text-[#5f6f80]">
                o S/ {plan.precioAnual}/año (ahorra {ahorro}%)
              </div>
            )}
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-2.5 mb-5 flex-1">
        {(plan.caracteristicas || []).map((c, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#9ba8b6]">
            <CheckCircle size={14} className="shrink-0 mt-0.5" style={{ color: plan.color }}/>
            {c}
          </li>
        ))}
      </ul>

      {esTrial ? (
        <button
          onClick={() => navigate('/app/dlnorte')}
          className="w-full py-3 rounded-xl text-[14px] font-bold transition-all
                     flex items-center justify-center gap-2
                     border border-[#6366f1]/50 text-[#a5b4fc]
                     bg-[#6366f1]/15 hover:bg-[#6366f1]/25 hover:border-[#6366f1]/70">
          🎯 Demo en Vivo
        </button>
      ) : (
        <a href={waUrl} target="_blank" rel="noopener noreferrer"
           className={`w-full py-3 rounded-xl text-[14px] font-bold transition-all text-center flex items-center justify-center gap-2 ${
             plan.destacado
               ? 'text-[#082e1e] hover:opacity-90 shadow-lg'
               : 'bg-white/5 text-[#e8edf2] hover:bg-white/10 border border-white/10'
           }`}
           style={plan.destacado ? { background: primary, boxShadow: `0 6px 24px ${primary}40` } : {}}>
          {plan.destacado ? '🚀 Contratar ahora' : '💬 Contratar plan'}
        </a>
      )}
    </div>
  )
}
