export function ModuloMockup({ modulo, primary }) {
  return (
    <div className="bg-[#141920] border border-white/8 rounded-2xl p-4 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)]">
      {/* Browser bar */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/50"/>
          <div className="w-3 h-3 rounded-full bg-amber-500/50"/>
          <div className="w-3 h-3 rounded-full bg-green-500/50"/>
        </div>
        <div className="flex-1 mx-3 h-5 bg-white/4 rounded-md flex items-center px-2">
          <span className="text-[10px] text-[#5f6f80]">stockpro.pe/{modulo.id}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold"
             style={{ background: `${primary}20`, color: primary }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: primary }}/>
          EN VIVO
        </div>
      </div>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {modulo.kpis.map(({ ic, val, lbl, col }) => (
          <div key={lbl} className="bg-[#1a2230] rounded-xl p-3 text-left relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl" style={{ background: col }}/>
            <div className="text-[16px] mb-1">{ic}</div>
            <div className="text-[14px] font-bold text-[#e8edf2]">{val}</div>
            <div className="text-[9px] text-[#5f6f80] leading-tight">{lbl}</div>
          </div>
        ))}
      </div>
      {/* Chart + metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 h-20 bg-[#1a2230] rounded-xl p-3 flex items-end gap-1">
          {modulo.bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-sm"
                 style={{ height: `${h}%`, background: i === modulo.bars.length - 1 ? primary : `${primary}35` }}/>
          ))}
        </div>
        <div className="h-20 bg-[#1a2230] rounded-xl p-3 flex flex-col justify-between">
          {modulo.metrics.map(([l, v, c]) => (
            <div key={l} className="flex items-center justify-between">
              <span className="text-[9px] text-[#5f6f80]">{l}</span>
              <span className="text-[10px] font-bold" style={{ color: c }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
