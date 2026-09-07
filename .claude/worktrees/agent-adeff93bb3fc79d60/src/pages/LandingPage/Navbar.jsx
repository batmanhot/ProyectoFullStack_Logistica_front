import { Package, X } from 'lucide-react'

export function Navbar({ sitio, primary, scrolled, menuOpen, setMenuOpen, navigate, goSection }) {
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-[#0a0e14] border-b border-white/8 shadow-xl shadow-black/50'
        : 'bg-[#0a0e14]/90 backdrop-blur-md border-b border-white/5'
    }`}>
      <div className="max-w-6xl mx-auto px-6 h-[70px] flex items-center justify-between">

        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: `${primary}20`, boxShadow: `0 0 16px ${primary}20` }}>
            <Package size={20} style={{ color: primary }}/>
          </div>
          <span className="font-extrabold text-[19px] text-[#e8edf2] tracking-tight">
            {sitio?.nombre || 'StockPro'}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-7">
          {[
            ['Beneficios',   'beneficios'],
            ['Plataforma',   'plataforma'],
            ['Planes',       'planes'],
            ['Testimonios',  'testimonios'],
            ['Contacto',     'contacto'],
          ].map(([label, id]) => (
            <button key={id} onClick={() => goSection(id)}
              className="text-[13px] font-medium text-[#9ba8b6] hover:text-white transition-colors">
              {label}
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => navigate('/login')}
            className="px-4 py-2 text-[13px] font-medium text-[#9ba8b6] hover:text-white transition-colors">
            Iniciar sesión
          </button>
          <button onClick={() => navigate('/app/dlnorte')}
            className="px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all hover:opacity-90 shadow-lg"
            style={{ background: primary, color: '#082e1e', boxShadow: `0 4px 20px ${primary}40` }}>
            Solicitar Demo
          </button>
        </div>

        <button className="md:hidden p-2 text-[#9ba8b6] hover:text-white transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22}/> : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-[#141920]/98 backdrop-blur-lg border-t border-white/8 px-6 py-5 flex flex-col gap-1">
          {[
            ['Beneficios',  'beneficios'],
            ['Plataforma',  'plataforma'],
            ['Planes',      'planes'],
            ['Testimonios', 'testimonios'],
            ['Contacto',    'contacto'],
          ].map(([label, id]) => (
            <button key={id} onClick={() => goSection(id)}
              className="text-left py-3 text-[14px] font-medium text-[#9ba8b6] hover:text-white transition-colors border-b border-white/5 last:border-0">
              {label}
            </button>
          ))}
          <div className="pt-4 flex flex-col gap-2.5">
            <button onClick={() => { setMenuOpen(false); navigate('/login') }}
              className="w-full py-3 rounded-xl text-[13px] font-semibold text-[#e8edf2] bg-white/5 border border-white/10">
              Iniciar sesión
            </button>
            <button onClick={() => { setMenuOpen(false); navigate('/app/dlnorte') }}
              className="w-full py-3 rounded-xl text-[13px] font-bold transition-all hover:opacity-90"
              style={{ background: primary, color: '#082e1e' }}>
              Solicitar Demo Gratis
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
