export function Stat({ label, value, color = '#00c896' }) {
  return (
    <div className="bg-[#161d28] border border-white/6 rounded-xl p-4"
         style={{ borderTop: `2px solid ${color}` }}>
      <div className="text-[28px] font-semibold text-[#e8edf2]">{value}</div>
      <div className="text-[11px] text-[#5f6f80] mt-0.5">{label}</div>
    </div>
  )
}
