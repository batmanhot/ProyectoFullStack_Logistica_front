import { Package, Linkedin, Facebook, Instagram, Twitter, Youtube, Shield } from 'lucide-react'

export function Footer({ sitio, primary, redesSociales, footer, navigate }) {
  return (
    <footer className="border-t border-white/7 bg-[#0a0e14]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                   style={{ background: `${primary}20` }}>
                <Package size={17} style={{ color: primary }}/>
              </div>
              <span className="font-extrabold text-[17px] text-[#e8edf2]">{sitio?.nombre || 'StockPro'}</span>
            </div>
            <p className="text-[12px] text-[#5f6f80] max-w-xs leading-relaxed">
              {sitio?.tagline || 'La plataforma logística diseñada para empresas que necesitan control total.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {redesSociales?.linkedin  && <a href={redesSociales.linkedin}  target="_blank" rel="noopener noreferrer" className="p-2 text-[#5f6f80] hover:text-white transition-colors"><Linkedin  size={17}/></a>}
            {redesSociales?.twitter   && <a href={redesSociales.twitter}   target="_blank" rel="noopener noreferrer" className="p-2 text-[#5f6f80] hover:text-white transition-colors"><Twitter   size={17}/></a>}
            {redesSociales?.facebook  && <a href={redesSociales.facebook}  target="_blank" rel="noopener noreferrer" className="p-2 text-[#5f6f80] hover:text-white transition-colors"><Facebook  size={17}/></a>}
            {redesSociales?.instagram && <a href={redesSociales.instagram} target="_blank" rel="noopener noreferrer" className="p-2 text-[#5f6f80] hover:text-white transition-colors"><Instagram size={17}/></a>}
            {redesSociales?.youtube   && <a href={redesSociales.youtube}   target="_blank" rel="noopener noreferrer" className="p-2 text-[#5f6f80] hover:text-white transition-colors"><Youtube   size={17}/></a>}
            <button onClick={() => navigate('/login')}
              className="ml-2 px-4 py-2 rounded-lg text-[12px] font-semibold border border-white/10 text-[#9ba8b6] hover:text-white hover:border-white/20 transition-all">
              Iniciar sesión
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-white/6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-[#3a4a5a]">
            {footer?.textoLegal || `© ${new Date().getFullYear()} ${sitio?.nombre || 'StockPro'}. Todos los derechos reservados.`}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-[#3a4a5a]">
            <Shield size={11}/>
            Hecho con ❤️ en Perú · Datos seguros y cifrados
          </div>
        </div>
      </div>
    </footer>
  )
}
