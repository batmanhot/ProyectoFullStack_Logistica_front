import { Star } from 'lucide-react'

export function TestimonioCard({ t, primary }) {
  return (
    <div className="bg-[#141c27] border border-white/10 rounded-2xl p-6 flex flex-col gap-4
                    hover:border-white/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40">
      <div className="flex gap-0.5">
        {Array(t.rating).fill(0).map((_, i) => (
          <Star key={i} size={14} className="text-amber-400" fill="currentColor"/>
        ))}
      </div>
      <p className="text-[13px] text-[#a0adb8] leading-relaxed italic flex-1">"{t.texto}"</p>
      <div className="flex items-center gap-3 pt-3 border-t border-white/8">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-extrabold shrink-0"
             style={{ background: `${primary || '#00c896'}25`, color: primary || '#00c896', border: `1.5px solid ${primary || '#00c896'}40` }}>
          {t.avatar}
        </div>
        <div>
          <div className="text-[13px] font-bold text-[#e8edf2]">{t.nombre}</div>
          <div className="text-[11px] text-[#6a7a8a]">{t.cargo} · {t.empresa}</div>
        </div>
      </div>
    </div>
  )
}
