import { Mail, Phone, MessageCircle, MapPin } from 'lucide-react'

export function Contacto({ primary, contacto }) {
  return (
    <section id="contacto" className="py-24 px-6 bg-[#0e1117]">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border mb-5"
               style={{ color: primary, borderColor: `${primary}40`, background: `${primary}10` }}>
            Contacto
          </div>
          <h2 className="text-[38px] md:text-[48px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
            ¿Tienes preguntas?<br/>
            <span className="text-[#7a8a99]">Estamos aquí para ti</span>
          </h2>
          <p className="text-[16px] text-[#7a8a99]">
            Nuestro equipo de especialistas responde en menos de 24 horas hábiles.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {contacto?.email && (
            <a href={`mailto:${contacto.email}`}
               className="group flex flex-col items-center text-center p-7 bg-[#141920] border border-white/7 rounded-2xl hover:border-[#00c896]/40 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#00c896]/5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                   style={{ background: `${primary}15` }}>
                <Mail size={22} style={{ color: primary }}/>
              </div>
              <div className="text-[13px] font-bold text-[#e8edf2] mb-1">Email</div>
              <div className="text-[12px] text-[#7a8a99] break-all">{contacto.email}</div>
            </a>
          )}
          {contacto?.telefono && (
            <a href={`tel:${contacto.telefono}`}
               className="group flex flex-col items-center text-center p-7 bg-[#141920] border border-white/7 rounded-2xl hover:border-[#00c896]/40 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#00c896]/5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                   style={{ background: `${primary}15` }}>
                <Phone size={22} style={{ color: primary }}/>
              </div>
              <div className="text-[13px] font-bold text-[#e8edf2] mb-1">Teléfono</div>
              <div className="text-[12px] text-[#7a8a99]">{contacto.telefono}</div>
            </a>
          )}
          {contacto?.whatsapp && (
            <a href={`https://wa.me/${contacto.whatsapp.replace(/\D/g, '')}`}
               target="_blank" rel="noopener noreferrer"
               className="group flex flex-col items-center text-center p-7 bg-[#141920] border border-white/7 rounded-2xl hover:border-green-500/40 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-green-500/5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-green-500/10">
                <MessageCircle size={22} className="text-green-400"/>
              </div>
              <div className="text-[13px] font-bold text-[#e8edf2] mb-1">WhatsApp</div>
              <div className="text-[12px] text-[#7a8a99]">{contacto.whatsapp}</div>
            </a>
          )}
          {contacto?.direccion && (
            <div className="flex flex-col items-center text-center p-7 bg-[#141920] border border-white/7 rounded-2xl">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                   style={{ background: `${primary}15` }}>
                <MapPin size={22} style={{ color: primary }}/>
              </div>
              <div className="text-[13px] font-bold text-[#e8edf2] mb-1">Ubicación</div>
              <div className="text-[12px] text-[#7a8a99]">{contacto.direccion}</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { ic: '⚡', t: 'Respuesta rápida', d: 'Menos de 24h hábiles en todos los canales de contacto' },
            { ic: '🌎', t: 'Soporte en español', d: 'Equipo nativo hispanohablante, sin barreras idiomáticas' },
            { ic: '🛡️', t: 'Datos protegidos', d: 'Cifrado SSL · Backups diarios · GDPR compliant' },
          ].map(({ ic, t, d }) => (
            <div key={t} className="flex items-start gap-4 p-5 bg-[#141920]/60 border border-white/6 rounded-2xl">
              <span className="text-[28px] shrink-0">{ic}</span>
              <div>
                <div className="text-[14px] font-bold text-[#e8edf2] mb-1">{t}</div>
                <div className="text-[12px] text-[#7a8a99] leading-relaxed">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
