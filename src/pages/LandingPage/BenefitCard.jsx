export function BenefitCard({ icono, titulo, descripcion, primary }) {
  return (
    <div className="group relative bg-[#141920] border border-white/10 rounded-2xl p-6
                    hover:border-[#00c896]/50 hover:bg-[#161e2a]
                    transition-all duration-300 hover:shadow-2xl hover:shadow-[#00c896]/8
                    hover:-translate-y-1 overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500 pointer-events-none"
           style={{ background: primary, transform: 'translate(40%, -40%)' }}/>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[28px] mb-5 border"
           style={{ background: `${primary}18`, borderColor: `${primary}30` }}>
        {icono}
      </div>
      <h3 className="text-[15px] font-bold text-[#e8edf2] mb-2">{titulo}</h3>
      <p className="text-[13px] text-[#8a9ab0] leading-relaxed">{descripcion}</p>
    </div>
  )
}
