import { STATS } from './constants'

export function StatsBar({ primary }) {
  return (
    <section className="border-y border-white/8 bg-[#111820] py-10">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map(s => (
          <div key={s.label} className="flex flex-col items-center text-center p-5 rounded-2xl bg-white/3 border border-white/7">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px] mb-3"
                 style={{ background: `${primary}20`, border: `1px solid ${primary}30` }}>
              {s.icono}
            </div>
            <div className="text-[30px] font-extrabold leading-none mb-1" style={{ color: primary }}>
              {s.valor}
            </div>
            <div className="text-[12px] text-[#7a8a99]">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
