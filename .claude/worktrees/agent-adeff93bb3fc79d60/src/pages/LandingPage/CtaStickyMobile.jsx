import { ArrowRight } from 'lucide-react'

export function CtaStickyMobile({ primary, showStickyMobile, navigate }) {
  return (
    <div className={`fixed bottom-0 left-0 right-0 md:hidden z-50 transition-all duration-300 ${
      showStickyMobile ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
    }`}>
      <div className="p-4 bg-[#0a0e14]/96 backdrop-blur-lg border-t border-white/8 shadow-2xl shadow-black/60">
        <button
          onClick={() => navigate('/app/dlnorte')}
          className="w-full py-4 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ background: primary, color: '#082e1e', boxShadow: `0 8px 30px ${primary}50` }}>
          Solicitar Demo Gratis
          <ArrowRight size={17}/>
        </button>
      </div>
    </div>
  )
}
