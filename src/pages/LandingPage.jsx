/**
 * LandingPage.jsx — Landing Page pública de StockPro
 *
 * Lee dinámicamente desde localStorage:
 *   - saas_landing  → configurada por SuperADMIN (AdminSaaS → tab "Landing Page")
 *   - saas_planes   → planes activos con precios y características
 *   - saas_limites  → límites por plan
 *
 * Accesible en / y /landing sin autenticación.
 */
import { useMemo, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package, ArrowRight, Phone, Mail, MessageCircle,
  MapPin, Zap, ChevronRight, Menu, X,
  CheckCircle, Linkedin, Facebook, Instagram,
  Twitter, Youtube, Star, Shield, Globe, TrendingUp
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Datos por defecto (se usan si aún no hay config en localStorage)
// ─────────────────────────────────────────────────────────────
const LANDING_DEFAULT = {
  sitio: {
    nombre: 'StockPro',
    tagline: 'Logística inteligente para tu empresa',
    descripcion: 'Sistema SaaS de gestión de inventario, despachos y operaciones logísticas para empresas modernas.',
    colorPrimario: '#00c896',
    logoUrl: '',
  },
  hero: {
    titulo: 'Controla tu logística con precisión',
    subtitulo: 'Sistema completo de gestión de inventario, pedidos y despachos para empresas que quieren crecer sin límites.',
    ctaTexto: 'Comenzar prueba gratis',
    ctaUrl: '#planes',
    ctaTexto2: 'Iniciar sesión',
    ctaUrl2: '/login',
    imagenUrl: '',
  },
  caracteristicas: [
    { id: 'cf_1', icono: '📦', titulo: 'Inventario en Tiempo Real', descripcion: 'Control de stock con alertas automáticas y kardex valorizado completo.' },
    { id: 'cf_2', icono: '🚚', titulo: 'Gestión de Despachos', descripcion: 'Planifica rutas, controla tu flota y rastrea entregas en tiempo real.' },
    { id: 'cf_3', icono: '📊', titulo: 'Reportes y KPIs', descripcion: 'Dashboards con indicadores clave: OTIF, Fill Rate, Perfect Order y más.' },
    { id: 'cf_4', icono: '🤝', titulo: 'Gestión de Proveedores', descripcion: 'Centraliza proveedores, condiciones comerciales e historial de compras. Evalúa desempeño y optimiza tu abastecimiento.' },
    { id: 'cf_5', icono: '👥', titulo: 'Multi-usuario', descripcion: 'Gestión de roles y permisos por módulo para todo tu equipo.' },
    { id: 'cf_6', icono: '☁️', titulo: '100% en la Nube', descripcion: 'Accede desde cualquier dispositivo, sin instalaciones ni actualizaciones.' },
  ],
  contacto: { email: 'ventas@stockpro.com', telefono: '+51 1 234 5678', whatsapp: '+51999000111', direccion: 'Lima, Perú' },
  redesSociales: { linkedin: '', twitter: '', facebook: '', instagram: '', youtube: '' },
  seo: { titulo: 'StockPro — Sistema Logístico SaaS', descripcion: 'Gestiona tu inventario, despachos y logística con StockPro. Prueba gratis.', keywords: 'logística, inventario, saas, gestión almacén, peru' },
  footer: { textoLegal: '© 2026 StockPro. Todos los derechos reservados.', mostrarPrecios: true, moneda: 'PEN', probarGratisDias: 14 },
}

const PLANES_DEFAULT = [
  { id: 'trial',       nombre: 'Prueba Gratuita', descripcion: 'Evalúa el sistema sin compromiso',               precioMensual: 0,   precioAnual: 0,    moneda: 'PEN', color: '#6366f1', destacado: false, activo: true, vigenciaDias: 30, caracteristicas: ['1 usuario', 'Hasta 100 productos', '1 almacén', 'Soporte email', 'Solo modo demo'] },
  { id: 'basico',      nombre: 'Básico',           descripcion: 'Para pequeñas empresas en crecimiento',          precioMensual: 49,  precioAnual: 490,  moneda: 'PEN', color: '#3b82f6', destacado: false, activo: true, vigenciaDias: 30, caracteristicas: ['Hasta 3 usuarios', 'Hasta 500 productos', '2 almacenes', 'Soporte email', 'Exportación básica'] },
  { id: 'profesional', nombre: 'Profesional',      descripcion: 'Ideal para empresas en expansión',               precioMensual: 99,  precioAnual: 990,  moneda: 'PEN', color: '#00c896', destacado: true,  activo: true, vigenciaDias: 30, caracteristicas: ['Hasta 10 usuarios', 'Hasta 2,000 productos', '5 almacenes', 'Soporte prioritario', 'Reportes avanzados', 'Exportación avanzada'] },
  { id: 'empresarial', nombre: 'Empresarial',      descripcion: 'Potencia sin límites para grandes operaciones',  precioMensual: 199, precioAnual: 1990, moneda: 'PEN', color: '#f59e0b', destacado: false, activo: true, vigenciaDias: 30, caracteristicas: ['Usuarios ilimitados', 'Productos ilimitados', 'Almacenes ilimitados', 'Multi-empresa', 'API Access', 'SLA garantizado', 'Soporte 24/7', 'Onboarding dedicado'] },
]

const STATS = [
  { valor: '500+',  label: 'Empresas activas',         icono: '🏢' },
  { valor: '99.9%', label: 'Uptime garantizado',        icono: '⚡' },
  { valor: '50K+',  label: 'Pedidos procesados/mes',    icono: '📦' },
  { valor: '24/7',  label: 'Soporte disponible',        icono: '🛡️' },
]

const PASOS = [
  { num: '01', icono: '🏢', titulo: 'Registra tu empresa', desc: 'Crea tu cuenta en minutos. Sin tarjeta de crédito para la prueba gratuita de 14 días.' },
  { num: '02', icono: '📋', titulo: 'Configura tu inventario', desc: 'Agrega tus productos, categorías y almacenes. Importa desde Excel fácilmente.' },
  { num: '03', icono: '🚀', titulo: 'Optimiza tu operación', desc: 'Gestiona pedidos, despachos y genera reportes en tiempo real desde cualquier dispositivo.' },
]

const TESTIMONIOS = [
  { nombre: 'Carlos Mendoza', cargo: 'Gerente de Operaciones', empresa: 'Distribuidora Lima Norte', texto: 'StockPro transformó nuestra operación. Redujimos los errores de inventario en un 85% y el tiempo de despacho en un 40%.', rating: 5, avatar: 'CM' },
  { nombre: 'María Rodríguez', cargo: 'Directora Logística', empresa: 'ACME Distribuciones', texto: 'La integración con SUNAT y los reportes en tiempo real son increíbles. Ahora tenemos visibilidad total de nuestra cadena de suministro.', rating: 5, avatar: 'MR' },
  { nombre: 'Pedro Torres', cargo: 'Propietario', empresa: 'Ferretería San Martín', texto: 'Empezamos con el plan básico y en 3 meses ya pasamos al profesional. El ROI fue inmediato.', rating: 5, avatar: 'PT' },
]

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function loadLS(key, fb) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fb } catch { return fb }
}

function scrollSmoothTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ─────────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────────
function FeatureCard({ icono, titulo, descripcion, primary }) {
  return (
    <div className="group bg-[#141920] border border-white/[0.10] rounded-2xl p-6
                    hover:border-[#00c896]/50 hover:bg-[#161e2a]
                    transition-all duration-300 hover:shadow-2xl hover:shadow-[#00c896]/8
                    hover:-translate-y-1">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[28px] mb-5 border"
           style={{ background: `${primary}18`, borderColor: `${primary}30` }}>
        {icono}
      </div>
      <h3 className="text-[15px] font-bold text-[#e8edf2] mb-2">{titulo}</h3>
      <p className="text-[13px] text-[#8a9ab0] leading-relaxed">{descripcion}</p>
    </div>
  )
}

function PlanCard({ plan, ciclo, primary, navigate, whatsapp }) {
  const precio  = ciclo === 'anual' ? plan.precioAnual : plan.precioMensual
  const esFree  = precio === 0
  const ahorro  = plan.precioMensual > 0
    ? Math.round(((plan.precioMensual * 12 - plan.precioAnual) / (plan.precioMensual * 12)) * 100)
    : 0
  const esTrial = plan.id === 'trial'

  // WhatsApp con mensaje pre-cargado por plan
  const waNum  = (whatsapp || '').replace(/\D/g, '')
  const waMsg  = encodeURIComponent(`Hola, me interesa contratar el plan *${plan.nombre}* de StockPro. ¿Me pueden dar más información?`)
  const waUrl  = waNum ? `https://wa.me/${waNum}?text=${waMsg}` : '#contacto'

  return (
    <div className={`relative flex flex-col rounded-2xl p-6 border transition-all duration-300 ${
      plan.destacado
        ? 'border-[#00c896]/50 shadow-2xl shadow-[#00c896]/10'
        : esTrial
          ? 'border-[#6366f1]/30 hover:border-[#6366f1]/50 hover:-translate-y-0.5 hover:shadow-lg'
          : 'bg-[#141920] border-white/[0.08] hover:border-white/20 hover:-translate-y-0.5 hover:shadow-lg'
    }`}
    style={plan.destacado ? {
      background: 'linear-gradient(160deg, rgba(0,200,150,0.08) 0%, rgba(20,25,32,1) 60%)',
    } : esTrial ? {
      background: 'linear-gradient(160deg, rgba(99,102,241,0.07) 0%, rgba(20,25,32,1) 60%)',
    } : {}}>

      {/* Más popular badge */}
      {plan.destacado && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5
                        bg-[#00c896] text-[#082e1e] text-[11px] font-extrabold
                        rounded-full uppercase tracking-widest shadow-lg shadow-[#00c896]/30
                        flex items-center gap-1.5">
          <Star size={10} fill="currentColor"/> Más popular
        </div>
      )}

      {/* Color indicator dot */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-3 h-3 rounded-full shadow-lg" style={{ background: plan.color, boxShadow: `0 0 8px ${plan.color}60` }}/>
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: plan.color }}>
          {esTrial ? 'Gratis 30 días' : plan.nombre}
        </span>
      </div>

      <h3 className="text-[20px] font-extrabold text-[#e8edf2] mb-1">{plan.nombre}</h3>
      <p className="text-[12px] text-[#7a8a99] mb-5 min-h-[36px]">{plan.descripcion}</p>

      {/* Precio */}
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

      {/* Características */}
      <ul className="flex flex-col gap-2.5 mb-5 flex-1">
        {(plan.caracteristicas || []).map((c, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#9ba8b6]">
            <CheckCircle size={14} className="shrink-0 mt-0.5" style={{ color: plan.color }}/>
            {c}
          </li>
        ))}
      </ul>

      {/* CTA principal */}
      {esTrial ? (
        /* Trial → botón directo al demo */
        <button
          onClick={() => navigate('/app/dlnorte')}
          className="w-full py-3 rounded-xl text-[14px] font-bold transition-all
                     flex items-center justify-center gap-2
                     border border-[#6366f1]/50 text-[#a5b4fc]
                     bg-[#6366f1]/15 hover:bg-[#6366f1]/25 hover:border-[#6366f1]/70
                     hover:shadow-lg hover:shadow-[#6366f1]/10">
          🎯 Demo en Vivo
        </button>
      ) : (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full py-3 rounded-xl text-[14px] font-bold transition-all text-center block flex items-center justify-center gap-2 ${
            plan.destacado
              ? 'text-[#082e1e] hover:opacity-90 shadow-lg'
              : 'bg-white/5 text-[#e8edf2] hover:bg-white/10 border border-white/10'
          }`}
          style={plan.destacado
            ? { background: primary, boxShadow: `0 6px 24px ${primary}40` }
            : {}
          }>
          {plan.destacado ? '🚀 Contratar ahora' : '💬 Contratar plan'}
        </a>
      )}
    </div>
  )
}

function TestimonioCard({ t, primary }) {
  return (
    <div className="bg-[#141c27] border border-white/[0.10] rounded-2xl p-6 flex flex-col gap-4
                    hover:border-white/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40">
      <div className="flex gap-0.5">
        {Array(t.rating).fill(0).map((_, i) => (
          <Star key={i} size={14} className="text-amber-400" fill="currentColor"/>
        ))}
      </div>
      <p className="text-[13px] text-[#a0adb8] leading-relaxed italic flex-1">"{t.texto}"</p>
      <div className="flex items-center gap-3 pt-3 border-t border-white/[0.08]">
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

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate    = useNavigate()
  const [menuOpen, setMenuOpen]   = useState(false)
  const [ciclo,    setCiclo]      = useState('mensual')   // mensual | anual
  const [scrolled, setScrolled]   = useState(false)

  // ── Cargar config desde localStorage ──────────────────────
  const landing = useMemo(() => loadLS('saas_landing', LANDING_DEFAULT), [])
  const planes  = useMemo(() =>
    (loadLS('saas_planes', PLANES_DEFAULT) || []).filter(p => p.activo !== false)
  , [])

  const { sitio, hero, caracteristicas, contacto, redesSociales, footer } = landing
  const primary = sitio?.colorPrimario || '#00c896'

  // ── Efectos ───────────────────────────────────────────────
  useEffect(() => {
    if (landing?.seo?.titulo) document.title = landing.seo.titulo
    const desc = document.querySelector('meta[name="description"]')
    if (desc && landing?.seo?.descripcion) desc.setAttribute('content', landing.seo.descripcion)

    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [landing])

  // ── Helper interno ────────────────────────────────────────
  function goSection(id) {
    setMenuOpen(false)
    scrollSmoothTo(id)
  }

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div data-landing="true" className="min-h-screen bg-[#0e1117] text-[#e8edf2] font-sans overflow-x-hidden" style={{ backgroundColor:'#0e1117', color:'#e8edf2' }}>

      {/* ══════════════════════════════════════════════════
          NAVBAR — fijo, scroll-aware
      ══════════════════════════════════════════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0e1117]/96 backdrop-blur-md border-b border-white/[0.08] shadow-xl shadow-black/30'
          : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-[70px] flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: `${primary}20`, boxShadow: `0 0 16px ${primary}20` }}>
              <Package size={20} style={{ color: primary }}/>
            </div>
            <span className="font-extrabold text-[19px] text-[#e8edf2] tracking-tight">
              {sitio?.nombre || 'StockPro'}
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-7">
            {[
              ['Características', 'caracteristicas'],
              ['Cómo funciona',   'como-funciona'],
              ['Planes',          'planes'],
              ['Testimonios',     'testimonios'],
              ['Contacto',        'contacto'],
            ].map(([label, id]) => (
              <button key={id} onClick={() => goSection(id)}
                className="text-[13px] font-medium text-[#9ba8b6] hover:text-white transition-colors">
                {label}
              </button>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate('/superadmin')}
              className="px-4 py-2 text-[13px] font-medium text-[#9ba8b6] hover:text-white transition-colors">
              Iniciar sesión
            </button>
            <button onClick={() => navigate('/app/dlnorte')}
              className="px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all hover:opacity-90 shadow-lg"
              style={{ background: primary, color: '#082e1e', boxShadow: `0 4px 20px ${primary}40` }}>
              Comenzar gratis
            </button>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2 text-[#9ba8b6] hover:text-white transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22}/> : <Menu size={22}/>}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-[#141920]/98 backdrop-blur-lg border-t border-white/[0.08] px-6 py-5 flex flex-col gap-1">
            {[
              ['Características', 'caracteristicas'],
              ['Cómo funciona',   'como-funciona'],
              ['Planes',          'planes'],
              ['Testimonios',     'testimonios'],
              ['Contacto',        'contacto'],
            ].map(([label, id]) => (
              <button key={id} onClick={() => goSection(id)}
                className="text-left py-3 text-[14px] font-medium text-[#9ba8b6] hover:text-white transition-colors border-b border-white/[0.05] last:border-0">
                {label}
              </button>
            ))}
            <div className="pt-4 flex flex-col gap-2.5">
              <button onClick={() => { setMenuOpen(false); navigate('/superadmin') }}
                className="w-full py-3 rounded-xl text-[13px] font-semibold text-[#e8edf2] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                Iniciar sesión
              </button>
              <button onClick={() => { setMenuOpen(false); navigate('/app/dlnorte') }}
                className="w-full py-3 rounded-xl text-[13px] font-bold transition-all hover:opacity-90"
                style={{ background: primary, color: '#082e1e' }}>
                Comenzar gratis
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20 pb-16 overflow-hidden">

        {/* Fondo degradado animado */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-5%] w-[700px] h-[700px] rounded-full blur-[200px] opacity-[0.07]"
               style={{ background: primary }}/>
          <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[180px] opacity-[0.04] bg-blue-500"/>
          {/* Grid sutil */}
          <div className="absolute inset-0 opacity-[0.018]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}/>
        </div>

        <div className="relative max-w-5xl mx-auto text-center">

          {/* Badge promo */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.04] text-[12px] text-[#9ba8b6] mb-8 backdrop-blur-sm">
            <Zap size={12} style={{ color: primary }}/>
            <span>
              {footer?.probarGratisDias
                ? `${footer.probarGratisDias} días de prueba gratis · Sin tarjeta de crédito`
                : 'Prueba gratuita · Sin tarjeta de crédito'
              }
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[44px] sm:text-[60px] lg:text-[74px] font-extrabold leading-[1.08] tracking-tight text-[#e8edf2] mb-6">
            {(() => {
              const words = (hero?.titulo || 'Controla tu logística con precisión').split(' ')
              // Highlight las 2 últimas palabras
              const normal = words.slice(0, -2).join(' ')
              const hl     = words.slice(-2).join(' ')
              return (
                <>
                  {normal}{' '}
                  <span style={{ color: primary }}>{hl}</span>
                </>
              )
            })()}
          </h1>

          {/* Subtítulo */}
          <p className="text-[17px] sm:text-[20px] text-[#7a8a99] leading-relaxed max-w-2xl mx-auto mb-10">
            {hero?.subtitulo || 'Sistema completo de gestión de inventario, pedidos y despachos para empresas que quieren crecer sin límites.'}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => navigate('/app/dlnorte')}
              className="flex items-center justify-center gap-2.5 px-9 py-4 rounded-2xl text-[15px] font-bold transition-all hover:opacity-90 hover:scale-[1.02] shadow-2xl"
              style={{ background: primary, color: '#082e1e', boxShadow: `0 10px 40px ${primary}40` }}>
              {hero?.ctaTexto || 'Comenzar prueba gratis'}
              <ArrowRight size={17}/>
            </button>
            <button
              onClick={() => navigate('/superadmin')}
              className="flex items-center justify-center gap-2.5 px-9 py-4 rounded-2xl text-[15px] font-semibold text-[#e8edf2] bg-white/[0.05] border border-white/10 hover:bg-white/10 transition-all hover:scale-[1.02]">
              {hero?.ctaTexto2 || 'Iniciar sesión'}
              <ChevronRight size={17}/>
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[12px] text-[#5f6f80]">
            {['✅ Sin instalación', '✅ Datos seguros y cifrados', '✅ Soporte en español', '✅ Cancela cuando quieras'].map(t => (
              <span key={t}>{t}</span>
            ))}
          </div>

          {/* Dashboard mockup */}
          <div className="mt-16 relative max-w-3xl mx-auto">
            <div className="bg-[#141920] border border-white/[0.08] rounded-2xl p-4 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)]">
              {/* Browser bar */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/50"/>
                  <div className="w-3 h-3 rounded-full bg-amber-500/50"/>
                  <div className="w-3 h-3 rounded-full bg-green-500/50"/>
                </div>
                <div className="flex-1 mx-3 h-5 bg-white/[0.04] rounded-md flex items-center px-2">
                  <span className="text-[10px] text-[#5f6f80]">stockpro.pe/dashboard</span>
                </div>
                <Globe size={13} className="text-[#5f6f80]"/>
              </div>

              {/* KPIs row */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { ic: '📦', val: '1,247', lbl: 'Productos', col: '#3b82f6' },
                  { ic: '🚚', val: '38',    lbl: 'Despachos hoy', col: '#00c896' },
                  { ic: '📊', val: '94.2%', lbl: 'OTIF', col: '#f59e0b' },
                  { ic: '💰', val: 'S/84K', lbl: 'Ingresos', col: '#a855f7' },
                ].map(({ ic, val, lbl, col }) => (
                  <div key={lbl} className="bg-[#1a2230] rounded-xl p-3 text-left relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl" style={{ background: col }}/>
                    <div className="text-[18px] mb-1">{ic}</div>
                    <div className="text-[15px] font-bold text-[#e8edf2]">{val}</div>
                    <div className="text-[10px] text-[#5f6f80]">{lbl}</div>
                  </div>
                ))}
              </div>

              {/* Chart placeholder row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 h-24 bg-[#1a2230] rounded-xl p-3 flex items-end gap-1.5">
                  {[60, 80, 55, 90, 75, 95, 70, 85, 100, 78, 88, 92].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm transition-all"
                         style={{ height: `${h}%`, background: i === 11 ? primary : `${primary}40` }}/>
                  ))}
                </div>
                <div className="h-24 bg-[#1a2230] rounded-xl p-3 flex flex-col justify-between">
                  {[['Fill Rate', '96.4%', '#00c896'], ['Stock Bajo', '3', '#f59e0b'], ['Vencidos', '1', '#ef4444']].map(([l, v, c]) => (
                    <div key={l} className="flex items-center justify-between">
                      <span className="text-[9px] text-[#5f6f80]">{l}</span>
                      <span className="text-[11px] font-bold" style={{ color: c }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Glow bajo el mockup */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-2/3 h-16 blur-3xl rounded-full opacity-25"
                 style={{ background: primary }}/>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════════════ */}
      <section className="border-y border-white/[0.08] bg-[#111820] py-10">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map(s => (
            <div key={s.label} className="flex flex-col items-center text-center p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px] mb-3"
                   style={{ background: `${primary}20`, border: `1px solid ${primary}30` }}>
                {s.icono}
              </div>
              <div className="text-[32px] font-extrabold leading-none mb-1" style={{ color: primary }}>
                {s.valor}
              </div>
              <div className="text-[12px] text-[#7a8a99]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          CARACTERÍSTICAS
      ══════════════════════════════════════════════════ */}
      <section id="caracteristicas" className="py-24 px-6 bg-[#0e1117]">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border mb-5"
                 style={{ color: primary, borderColor: `${primary}40`, background: `${primary}10` }}>
              Funcionalidades
            </div>
            <h2 className="text-[38px] md:text-[48px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
              Todo lo que necesitas<br/>
              <span className="text-[#7a8a99]">en un solo sistema</span>
            </h2>
            <p className="text-[16px] text-[#7a8a99] max-w-xl mx-auto leading-relaxed">
              {sitio?.descripcion || 'Sistema SaaS de gestión logística para empresas modernas que quieren escalar.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(caracteristicas || []).map(f => (
              <FeatureCard key={f.id} icono={f.icono} titulo={f.titulo} descripcion={f.descripcion} primary={primary}/>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          CÓMO FUNCIONA
      ══════════════════════════════════════════════════ */}
      <section id="como-funciona" className="py-24 px-6 bg-[#111820]">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border mb-5"
                 style={{ color: primary, borderColor: `${primary}40`, background: `${primary}10` }}>
              Proceso
            </div>
            <h2 className="text-[38px] md:text-[48px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
              Empieza en <span style={{ color: primary }}>3 simples pasos</span>
            </h2>
            <p className="text-[16px] text-[#8a9ab0]">
              Sin complicaciones. Sin instalaciones. Lista para usar desde el primer día.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {PASOS.map((p, i) => (
              <div key={p.num} className="relative flex flex-col bg-[#141c27] border border-white/[0.10] rounded-2xl p-8
                                          hover:border-[primary]/40 transition-all duration-300
                                          hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50"
                   style={{ ['--hover-border']: `${primary}40` }}>

                {/* Número badge */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[14px] font-extrabold shrink-0"
                       style={{ background: primary, color: '#082e1e' }}>
                    {p.num}
                  </div>
                  {i < PASOS.length - 1 && (
                    <div className="hidden md:block flex-1 border-t border-dashed border-white/[0.12]"/>
                  )}
                </div>

                {/* Icono */}
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-[34px] mb-5 border"
                     style={{ background: `${primary}15`, borderColor: `${primary}25` }}>
                  {p.icono}
                </div>

                <h3 className="text-[17px] font-bold text-[#e8edf2] mb-3">{p.titulo}</h3>
                <p className="text-[13px] text-[#8a9ab0] leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          PLANES Y PRECIOS
      ══════════════════════════════════════════════════ */}
      <section id="planes" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border mb-5"
                 style={{ color: primary, borderColor: `${primary}40`, background: `${primary}10` }}>
              Precios
            </div>
            <h2 className="text-[38px] md:text-[48px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
              El plan perfecto<br/>
              <span className="text-[#7a8a99]">para cada empresa</span>
            </h2>
            <p className="text-[16px] text-[#7a8a99] mb-8">
              Sin contratos. Sin costos ocultos. Cambia de plan cuando quieras.
            </p>

            {/* Toggle mensual / anual */}
            <div className="inline-flex items-center bg-[#141920] border border-white/[0.08] rounded-xl p-1">
              <button
                onClick={() => setCiclo('mensual')}
                className={`px-6 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
                  ciclo === 'mensual' ? 'bg-white/10 text-[#e8edf2] shadow-sm' : 'text-[#7a8a99] hover:text-white'
                }`}>
                Mensual
              </button>
              <button
                onClick={() => setCiclo('anual')}
                className={`px-6 py-2.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2 ${
                  ciclo === 'anual' ? 'bg-white/10 text-[#e8edf2] shadow-sm' : 'text-[#7a8a99] hover:text-white'
                }`}>
                Anual
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold"
                      style={{ background: `${primary}25`, color: primary }}>
                  -20%
                </span>
              </button>
            </div>
          </div>

          <div className={`grid gap-5 ${
            planes.length <= 2
              ? 'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto'
              : planes.length === 3
                ? 'grid-cols-1 md:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
          }`}>
            {planes.map(plan => (
              <PlanCard key={plan.id} plan={plan} ciclo={ciclo} primary={primary} navigate={navigate} whatsapp={contacto?.whatsapp}/>
            ))}
          </div>

          <p className="text-center text-[13px] text-[#5f6f80] mt-8">
            Precios en {planes[0]?.moneda || 'PEN'}. ¿Necesitas un plan a medida?{' '}
            <button onClick={() => goSection('contacto')}
              className="font-semibold transition-colors hover:opacity-80"
              style={{ color: primary }}>
              Contáctanos →
            </button>
          </p>

          {/* ── Tabla comparativa de límites ──────────────────── */}
          <div className="mt-12 bg-[#141920] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.07] flex items-center gap-2">
              <span className="text-[14px]">📊</span>
              <h3 className="text-[14px] font-bold text-[#e8edf2]">Comparativa de límites operativos por plan</h3>
              <span className="ml-2 text-[11px] text-[#5f6f80]">— Al suscribirte, el plan elegido define tus capacidades</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-6 py-3 text-[#5f6f80] font-semibold">Recurso</th>
                    {planes.map(p => (
                      <th key={p.id} className="px-4 py-3 text-center font-bold" style={{ color: p.color }}>
                        {p.nombre}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label:'👤 Usuarios',         key:'maxUsuarios' },
                    { label:'📦 Productos',         key:'maxProductos' },
                    { label:'🏭 Almacenes',         key:'maxAlmacenes' },
                    { label:'🤝 Proveedores',       key:'maxProveedores' },
                    { label:'👥 Clientes',          key:'maxClientes' },
                    { label:'📋 Órdenes/mes',       key:'maxOrdenesMes' },
                  ].map(({ label, key }, ri) => {
                    const limites = loadLS('saas_limites', {
                      trial:       { maxUsuarios:1,  maxProductos:100,  maxAlmacenes:1,  maxProveedores:10,  maxClientes:20,  maxOrdenesMes:50   },
                      basico:      { maxUsuarios:3,  maxProductos:500,  maxAlmacenes:2,  maxProveedores:50,  maxClientes:100, maxOrdenesMes:300  },
                      profesional: { maxUsuarios:10, maxProductos:2000, maxAlmacenes:5,  maxProveedores:200, maxClientes:500, maxOrdenesMes:2000 },
                      empresarial: { maxUsuarios:-1, maxProductos:-1,   maxAlmacenes:-1, maxProveedores:-1,  maxClientes:-1,  maxOrdenesMes:-1   },
                    })
                    return (
                      <tr key={key} className={`border-b border-white/[0.04] ${ri % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                        <td className="px-6 py-2.5 text-[#9ba8b6] font-medium">{label}</td>
                        {planes.map(p => {
                          const val = limites[p.id]?.[key]
                          const txt = val === -1 || val === undefined ? '∞ Ilimitado' : val?.toLocaleString() || '—'
                          const isMax = val === -1
                          return (
                            <td key={p.id} className="px-4 py-2.5 text-center font-bold">
                              <span style={{ color: isMax ? primary : p.color }}>
                                {txt}
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 bg-white/[0.01] border-t border-white/[0.06] flex items-center gap-2 text-[11px] text-[#5f6f80]">
              <span>💡</span>
              <span>Puedes cambiar de plan en cualquier momento. Los límites se ajustan de inmediato sin perder tus datos.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          TESTIMONIOS
      ══════════════════════════════════════════════════ */}
      <section id="testimonios" className="py-24 px-6 bg-[#111820]">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border mb-5"
                 style={{ color: primary, borderColor: `${primary}40`, background: `${primary}10` }}>
              Testimonios
            </div>
            <h2 className="text-[38px] md:text-[48px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
              Lo que dicen nuestros<br/>
              <span style={{ color: primary }}>clientes</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIOS.map(t => <TestimonioCard key={t.nombre} t={t} primary={primary}/>)}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          CTA CENTRAL
      ══════════════════════════════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-3xl p-12 text-center overflow-hidden border"
               style={{ borderColor: `${primary}25`, background: `linear-gradient(135deg, ${primary}08 0%, ${primary}03 50%, transparent 100%)` }}>

            {/* Glow de fondo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] opacity-10"
                 style={{ background: primary }}/>

            <div className="relative">
              <div className="text-[52px] mb-5">🚀</div>
              <h2 className="text-[34px] md:text-[42px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
                ¿Listo para transformar<br/>tu logística?
              </h2>
              <p className="text-[16px] text-[#7a8a99] mb-8 max-w-lg mx-auto leading-relaxed">
                Únete a cientos de empresas que ya optimizaron su inventario y despachos con {sitio?.nombre || 'StockPro'}.
                {footer?.probarGratisDias > 0 && ` Prueba ${footer.probarGratisDias} días gratis, sin compromiso.`}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/app/dlnorte')}
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-[15px] font-bold transition-all hover:opacity-90 hover:scale-[1.02] shadow-2xl"
                  style={{ background: primary, color: '#082e1e', boxShadow: `0 10px 40px ${primary}40` }}>
                  Comenzar ahora — Es gratis
                  <ArrowRight size={17}/>
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-semibold text-[#9ba8b6] bg-white/[0.04] border border-white/10 hover:bg-white/10 transition-all">
                  Ya tengo cuenta →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          CONTACTO
      ══════════════════════════════════════════════════ */}
      <section id="contacto" className="py-24 px-6 bg-[#111820]">
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
              Nuestro equipo responde en menos de 24 horas hábiles.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {/* Email */}
            {contacto?.email && (
              <a href={`mailto:${contacto.email}`}
                 className="group flex flex-col items-center text-center p-7 bg-[#141920] border border-white/[0.07] rounded-2xl hover:border-[#00c896]/40 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#00c896]/5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all"
                     style={{ background: `${primary}15` }}>
                  <Mail size={22} style={{ color: primary }}/>
                </div>
                <div className="text-[13px] font-bold text-[#e8edf2] mb-1">Email</div>
                <div className="text-[12px] text-[#7a8a99] break-all">{contacto.email}</div>
              </a>
            )}

            {/* Teléfono */}
            {contacto?.telefono && (
              <a href={`tel:${contacto.telefono}`}
                 className="group flex flex-col items-center text-center p-7 bg-[#141920] border border-white/[0.07] rounded-2xl hover:border-[#00c896]/40 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#00c896]/5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                     style={{ background: `${primary}15` }}>
                  <Phone size={22} style={{ color: primary }}/>
                </div>
                <div className="text-[13px] font-bold text-[#e8edf2] mb-1">Teléfono</div>
                <div className="text-[12px] text-[#7a8a99]">{contacto.telefono}</div>
              </a>
            )}

            {/* WhatsApp */}
            {contacto?.whatsapp && (
              <a href={`https://wa.me/${contacto.whatsapp.replace(/\D/g, '')}`}
                 target="_blank" rel="noopener noreferrer"
                 className="group flex flex-col items-center text-center p-7 bg-[#141920] border border-white/[0.07] rounded-2xl hover:border-green-500/40 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-green-500/5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-green-500/10">
                  <MessageCircle size={22} className="text-green-400"/>
                </div>
                <div className="text-[13px] font-bold text-[#e8edf2] mb-1">WhatsApp</div>
                <div className="text-[12px] text-[#7a8a99]">{contacto.whatsapp}</div>
              </a>
            )}

            {/* Dirección */}
            {contacto?.direccion && (
              <div className="flex flex-col items-center text-center p-7 bg-[#141920] border border-white/[0.07] rounded-2xl">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                     style={{ background: `${primary}15` }}>
                  <MapPin size={22} style={{ color: primary }}/>
                </div>
                <div className="text-[13px] font-bold text-[#e8edf2] mb-1">Ubicación</div>
                <div className="text-[12px] text-[#7a8a99]">{contacto.direccion}</div>
              </div>
            )}
          </div>

          {/* Beneficios de soporte */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { ic: '⚡', t: 'Respuesta rápida', d: 'Menos de 24h hábiles en todos los canales' },
              { ic: '🌎', t: 'Soporte en español', d: 'Equipo nativo hispanohablante, sin barreras' },
              { ic: '🛡️', t: 'Datos protegidos', d: 'Cifrado SSL · Backups diarios · GDPR compliant' },
            ].map(({ ic, t, d }) => (
              <div key={t} className="flex items-start gap-4 p-5 bg-[#141920]/60 border border-white/[0.06] rounded-2xl">
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

      {/* ══════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════ */}
      <footer className="border-t border-white/[0.07] bg-[#0a0e14]">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-8">

            {/* Marca */}
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                     style={{ background: `${primary}20` }}>
                  <Package size={17} style={{ color: primary }}/>
                </div>
                <span className="font-extrabold text-[17px] text-[#e8edf2]">{sitio?.nombre || 'StockPro'}</span>
              </div>
              <p className="text-[12px] text-[#5f6f80] max-w-xs leading-relaxed">
                {sitio?.tagline || 'Logística inteligente para tu empresa'}
              </p>
            </div>

            {/* Redes + Login */}
            <div className="flex items-center gap-2">
              {redesSociales?.linkedin  && <a href={redesSociales.linkedin}  target="_blank" rel="noopener noreferrer" className="p-2 text-[#5f6f80] hover:text-white transition-colors"><Linkedin  size={17}/></a>}
              {redesSociales?.twitter   && <a href={redesSociales.twitter}   target="_blank" rel="noopener noreferrer" className="p-2 text-[#5f6f80] hover:text-white transition-colors"><Twitter   size={17}/></a>}
              {redesSociales?.facebook  && <a href={redesSociales.facebook}  target="_blank" rel="noopener noreferrer" className="p-2 text-[#5f6f80] hover:text-white transition-colors"><Facebook  size={17}/></a>}
              {redesSociales?.instagram && <a href={redesSociales.instagram} target="_blank" rel="noopener noreferrer" className="p-2 text-[#5f6f80] hover:text-white transition-colors"><Instagram size={17}/></a>}
              {redesSociales?.youtube   && <a href={redesSociales.youtube}   target="_blank" rel="noopener noreferrer" className="p-2 text-[#5f6f80] hover:text-white transition-colors"><Youtube   size={17}/></a>}
              <button onClick={() => navigate('/superadmin')}
                className="ml-2 px-4 py-2 rounded-lg text-[12px] font-semibold border border-white/10 text-[#9ba8b6] hover:text-white hover:border-white/20 transition-all">
                Iniciar sesión
              </button>
            </div>
          </div>

          {/* Bottom bar */}
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

    </div>
  )
}
