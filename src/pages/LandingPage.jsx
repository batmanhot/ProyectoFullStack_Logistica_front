/**
 * LandingPage.jsx — Landing Page pública de StockPro (v2.0)
 *
 * Optimización comercial completa orientada a conversión:
 *   - Hero con headline de resultados empresariales
 *   - Sección "Problema Empresarial" (nueva)
 *   - Beneficios orientados a impacto (no funcionalidades)
 *   - Sección "Así funciona" con mockups visuales por módulo (nueva)
 *   - CTA sticky en mobile
 *   - SEO comercial mejorado con OpenGraph
 *
 * Carga dinámicamente desde localStorage:
 *   - saas_landing  → configurada por SuperADMIN (AdminSaaS → "Landing Page")
 *   - saas_planes   → planes activos con precios
 *   - saas_limites  → límites por plan
 */
import { useMemo, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package, ArrowRight, Phone, Mail, MessageCircle,
  MapPin, Zap, ChevronRight, Menu, X,
  CheckCircle, Linkedin, Facebook, Instagram,
  Twitter, Youtube, Star, Shield, Globe,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Datos por defecto — se usan si no hay config en localStorage
// ─────────────────────────────────────────────────────────────
const LANDING_DEFAULT = {
  sitio: {
    nombre: 'StockPro',
    tagline: 'La plataforma logística diseñada para empresas que necesitan control total.',
    descripcion: 'Sistema SaaS de gestión de inventario, despachos y operaciones logísticas para empresas modernas.',
    colorPrimario: '#00c896',
    logoUrl: '',
  },
  hero: {
    titulo: 'Digitaliza toda tu operación logística desde una sola plataforma',
    subtitulo: 'Centraliza inventarios, pedidos, almacenes, distribución y trazabilidad. Reduce errores operativos, automatiza procesos y toma decisiones en tiempo real.',
    ctaTexto: 'Solicitar Demo Gratis',
    ctaUrl: '#planes',
    ctaTexto2: 'Ver Planes',
    ctaUrl2: '#planes',
    imagenUrl: '',
  },
  caracteristicas: [
    { id: 'cf_1', icono: '📦', titulo: 'Reduce Errores de Inventario hasta 85%', descripcion: 'Control total de stock con trazabilidad completa, alertas automáticas y kardex valorizado. Elimina las discrepancias entre sistema y almacén.' },
    { id: 'cf_2', icono: '🚚', titulo: 'Acelera tus Despachos hasta un 40%', descripcion: 'Planifica rutas, controla tu flota y rastrea cada entrega en tiempo real. Más OTIF, menos reclamos, clientes más satisfechos.' },
    { id: 'cf_3', icono: '📊', titulo: 'Visibilidad Total en Tiempo Real', descripcion: 'Dashboards ejecutivos con KPIs logísticos: OTIF, Fill Rate, Perfect Order. Decisiones basadas en datos, no en suposiciones.' },
    { id: 'cf_4', icono: '🌐', titulo: 'Portal B2B de Clientes y Pedidos', descripcion: 'Tus clientes hacen pedidos directamente desde un portal personalizado. Sin llamadas, sin errores y con trazabilidad en tiempo real desde el momento en que el pedido entra al sistema.' },
    { id: 'cf_5', icono: '👥', titulo: 'Equipo Sincronizado, Sin Silos', descripcion: 'Multi-usuario con roles y permisos granulares por módulo. Todo tu equipo trabajando sobre la misma fuente de verdad.' },
    { id: 'cf_6', icono: '☁️', titulo: 'Escala sin Límites, 99.9% Uptime', descripcion: 'Plataforma cloud con SLA garantizado. Sin instalaciones ni actualizaciones manuales. Crece sin perder el control.' },
    { id: 'cf_7', icono: '🔮', titulo: 'Previsión de Demanda Inteligente', descripcion: 'Anticipa la demanda con análisis histórico de movimientos. Reabastécete antes de que el stock se agote y reduce el capital inmovilizado en inventario parado.' },
  ],
  contacto: { email: 'ventas@stockpro.com', telefono: '+51 1 234 5678', whatsapp: '+51999000111', direccion: 'Lima, Perú' },
  redesSociales: { linkedin: '', twitter: '', facebook: '', instagram: '', youtube: '' },
  seo: {
    titulo: 'StockPro — Software Logístico SaaS | Inventario, Almacenes y Despachos',
    descripcion: 'Digitaliza tu operación logística con StockPro. Software ERP logístico para gestión de inventario, almacenes, pedidos y trazabilidad en tiempo real. Prueba 30 días gratis sin tarjeta.',
    keywords: 'software logístico, sistema logístico, gestión de inventario, control de almacenes, trazabilidad logística, ERP logístico, software distribución, logística empresarial, plataforma logística, saas logística peru',
  },
  footer: { textoLegal: '© 2026 StockPro. Todos los derechos reservados.', mostrarPrecios: true, moneda: 'PEN', probarGratisDias: 30 },
}

const PLANES_DEFAULT = [
  { id: 'trial',       nombre: 'Prueba Gratuita', descripcion: 'Evalúa el sistema sin compromiso',              precioMensual: 0,   precioAnual: 0,    moneda: 'PEN', color: '#6366f1', destacado: false, activo: true, vigenciaDias: 30, caracteristicas: ['1 usuario', 'Hasta 100 productos', '1 almacén', 'Soporte email', 'Solo modo demo'] },
  { id: 'basico',      nombre: 'Básico',           descripcion: 'Para pequeñas empresas en crecimiento',         precioMensual: 49,  precioAnual: 490,  moneda: 'PEN', color: '#3b82f6', destacado: false, activo: true, vigenciaDias: 30, caracteristicas: ['Hasta 3 usuarios', 'Hasta 500 productos', '2 almacenes', 'Soporte email', 'Exportación básica'] },
  { id: 'profesional', nombre: 'Profesional',      descripcion: 'Ideal para empresas en expansión',              precioMensual: 99,  precioAnual: 990,  moneda: 'PEN', color: '#00c896', destacado: true,  activo: true, vigenciaDias: 30, caracteristicas: ['Hasta 10 usuarios', 'Hasta 2,000 productos', '5 almacenes', 'Soporte prioritario', 'Reportes avanzados', 'Exportación avanzada'] },
  { id: 'empresarial', nombre: 'Empresarial',      descripcion: 'Potencia sin límites para grandes operaciones', precioMensual: 199, precioAnual: 1990, moneda: 'PEN', color: '#f59e0b', destacado: false, activo: true, vigenciaDias: 30, caracteristicas: ['Usuarios ilimitados', 'Productos ilimitados', 'Almacenes ilimitados', 'Multi-empresa', 'API Access', 'SLA garantizado', 'Soporte 24/7', 'Onboarding dedicado'] },
]

const STATS = [
  { valor: '500+',  label: 'Empresas activas',              icono: '🏢' },
  { valor: '99.9%', label: 'Uptime garantizado',             icono: '⚡' },
  { valor: '50K+',  label: 'Pedidos procesados al mes',      icono: '📦' },
  { valor: '85%',   label: 'Reducción de errores promedio',  icono: '🎯' },
]

const PASOS = [
  { num: '01', icono: '🏢', titulo: 'Registra tu empresa en minutos', desc: 'Crea tu cuenta sin tarjeta de crédito. Configura tu empresa, usuarios y estructura operativa de forma guiada en menos de 15 minutos.' },
  { num: '02', icono: '📋', titulo: 'Importa tu inventario y almacenes', desc: 'Carga tus productos, categorías y almacenes. Importación masiva desde Excel en un solo clic, sin perder datos.' },
  { num: '03', icono: '🚀', titulo: 'Opera y escala con control total', desc: 'Gestiona pedidos, despachos y genera reportes ejecutivos en tiempo real desde cualquier dispositivo.' },
]

const TESTIMONIOS = [
  { nombre: 'Carlos Mendoza', cargo: 'Gerente de Operaciones', empresa: 'Distribuidora Lima Norte', texto: 'StockPro transformó nuestra operación. Redujimos los errores de inventario en un 85% y el tiempo de despacho en un 40%. El ROI fue visible desde el primer mes.', rating: 5, avatar: 'CM' },
  { nombre: 'María Rodríguez', cargo: 'Directora Logística', empresa: 'ACME Distribuciones', texto: 'El portal B2B para nuestros clientes cambió todo. Los pedidos entran directamente al sistema sin intermediarios. Los reportes en tiempo real nos dieron la visibilidad que nunca habíamos tenido. Nunca más operamos a ciegas.', rating: 5, avatar: 'MR' },
  { nombre: 'Pedro Torres', cargo: 'Propietario', empresa: 'Ferretería San Martín', texto: 'Empezamos con el plan básico y en 3 meses ya pasamos al profesional. El ROI fue inmediato. Dejamos de perder dinero por errores de stock que no veíamos antes.', rating: 5, avatar: 'PT' },
]

const PROBLEMAS = [
  { icono: '⚠️', titulo: 'Errores constantes de inventario', desc: 'Diferencias entre el stock físico y el sistema generan pérdidas invisibles mes a mes.' },
  { icono: '🐌', titulo: 'Despachos lentos y con errores', desc: 'Procesos manuales que retrasan las entregas y acumulan reclamos de clientes.' },
  { icono: '👁️', titulo: 'Sin visibilidad en tiempo real', desc: 'Tomar decisiones sin datos actualizados significa operar completamente a ciegas.' },
  { icono: '📑', titulo: 'Datos dispersos en Excel y papel', desc: 'Información fragmentada que nadie puede consolidar cuando más la necesita.' },
  { icono: '💸', titulo: 'Costos operativos que no bajan', desc: 'Horas-hombre desperdiciadas en tareas repetitivas que deberían estar automatizadas.' },
  { icono: '🔍', titulo: 'Sin trazabilidad de pedidos', desc: 'No saber dónde está cada pedido en tiempo real destruye la confianza del cliente.' },
]

// Módulos para la sección de screenshots visuales
const MODULOS = [
  {
    id: 'dashboard',
    label: 'Dashboard Ejecutivo',
    icono: '📊',
    desc: 'Visión completa del negocio en un vistazo: ventas, OTIF, stock crítico y despachos del día.',
    kpis: [
      { val: '1,247', lbl: 'Productos activos', col: '#3b82f6', ic: '📦' },
      { val: '94.2%', lbl: 'OTIF del mes',       col: '#00c896', ic: '🎯' },
      { val: 'S/84K', lbl: 'Ventas del mes',     col: '#f59e0b', ic: '💰' },
      { val: '38',    lbl: 'Despachos hoy',       col: '#a855f7', ic: '🚚' },
    ],
    bars: [60, 80, 55, 90, 75, 95, 70, 85, 100, 78, 88, 92],
    metrics: [['OTIF', '94.2%', '#00c896'], ['Fill Rate', '96.4%', '#3b82f6'], ['Stock Bajo', '3', '#f59e0b']],
  },
  {
    id: 'inventario',
    label: 'Control de Inventario',
    icono: '📦',
    desc: 'Kardex valorizado en tiempo real, alertas de stock mínimo y trazabilidad de cada movimiento.',
    kpis: [
      { val: '1,247', lbl: 'SKUs en sistema', col: '#3b82f6', ic: '📦' },
      { val: '3',     lbl: 'Alertas activas', col: '#f59e0b', ic: '⚠️' },
      { val: '99.1%', lbl: 'Exactitud stock', col: '#00c896', ic: '✅' },
      { val: '5',     lbl: 'Almacenes',       col: '#a855f7', ic: '🏭' },
    ],
    bars: [95, 88, 92, 78, 99, 85, 91, 88, 94, 97, 89, 96],
    metrics: [['Entradas', '+127', '#00c896'], ['Salidas', '98', '#3b82f6'], ['Vencidos', '1', '#ef4444']],
  },
  {
    id: 'despachos',
    label: 'Gestión de Despachos',
    icono: '🚚',
    desc: 'Seguimiento de cada despacho en tiempo real, rutas optimizadas y confirmación de entrega digital.',
    kpis: [
      { val: '38',  lbl: 'Despachos activos',  col: '#00c896', ic: '🚚' },
      { val: '96%', lbl: 'On-time delivery',   col: '#3b82f6', ic: '⏱️' },
      { val: '4',   lbl: 'Rutas en curso',     col: '#f59e0b', ic: '🗺️' },
      { val: '0',   lbl: 'Reclamos hoy',       col: '#22c55e', ic: '✅' },
    ],
    bars: [70, 85, 90, 88, 95, 92, 88, 96, 91, 94, 89, 98],
    metrics: [['Entregados', '34', '#00c896'], ['En ruta', '4', '#f59e0b'], ['Pendientes', '2', '#3b82f6']],
  },
  {
    id: 'reportes',
    label: 'Reportes y KPIs',
    icono: '📈',
    desc: 'Indicadores logísticos clave: OTIF, Perfect Order, Fill Rate. Exporta en PDF o Excel con un clic.',
    kpis: [
      { val: '94%', lbl: 'Perfect Order',  col: '#00c896', ic: '🏆' },
      { val: '96%', lbl: 'Fill Rate',      col: '#3b82f6', ic: '📊' },
      { val: '2.1d', lbl: 'Lead time avg', col: '#f59e0b', ic: '⏱️' },
      { val: '12',  lbl: 'Reportes listos', col: '#a855f7', ic: '📄' },
    ],
    bars: [75, 88, 82, 91, 85, 94, 89, 96, 92, 98, 94, 97],
    metrics: [['OTIF', '94.2%', '#00c896'], ['Devoluc.', '0.8%', '#f59e0b'], ['Rotación', '8.3x', '#3b82f6']],
  },
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

function BenefitCard({ icono, titulo, descripcion, primary }) {
  return (
    <div className="group relative bg-[#141920] border border-white/[0.10] rounded-2xl p-6
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

function ModuloMockup({ modulo, primary }) {
  return (
    <div className="bg-[#141920] border border-white/[0.08] rounded-2xl p-4 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)]">
      {/* Browser bar */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/50"/>
          <div className="w-3 h-3 rounded-full bg-amber-500/50"/>
          <div className="w-3 h-3 rounded-full bg-green-500/50"/>
        </div>
        <div className="flex-1 mx-3 h-5 bg-white/[0.04] rounded-md flex items-center px-2">
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

function PlanCard({ plan, ciclo, primary, navigate, whatsapp }) {
  const precio = ciclo === 'anual' ? plan.precioAnual : plan.precioMensual
  const esFree = precio === 0
  const ahorro = plan.precioMensual > 0
    ? Math.round(((plan.precioMensual * 12 - plan.precioAnual) / (plan.precioMensual * 12)) * 100)
    : 0
  const esTrial = plan.id === 'trial'
  const waNum = (whatsapp || '').replace(/\D/g, '')
  const waMsg = encodeURIComponent(`Hola, me interesa contratar el plan *${plan.nombre}* de StockPro. ¿Me pueden dar más información?`)
  const waUrl = waNum ? `https://wa.me/${waNum}?text=${waMsg}` : '#contacto'

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

      {plan.destacado && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5
                        bg-[#00c896] text-[#082e1e] text-[11px] font-extrabold
                        rounded-full uppercase tracking-widest shadow-lg shadow-[#00c896]/30
                        flex items-center gap-1.5">
          <Star size={10} fill="currentColor"/> Más popular
        </div>
      )}

      <div className="flex items-center gap-2 mb-5">
        <div className="w-3 h-3 rounded-full shadow-lg" style={{ background: plan.color, boxShadow: `0 0 8px ${plan.color}60` }}/>
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: plan.color }}>
          {esTrial ? 'Gratis 30 días' : plan.nombre}
        </span>
      </div>

      <h3 className="text-[20px] font-extrabold text-[#e8edf2] mb-1">{plan.nombre}</h3>
      <p className="text-[12px] text-[#7a8a99] mb-5 min-h-[36px]">{plan.descripcion}</p>

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

      <ul className="flex flex-col gap-2.5 mb-5 flex-1">
        {(plan.caracteristicas || []).map((c, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#9ba8b6]">
            <CheckCircle size={14} className="shrink-0 mt-0.5" style={{ color: plan.color }}/>
            {c}
          </li>
        ))}
      </ul>

      {esTrial ? (
        <button
          onClick={() => navigate('/app/dlnorte')}
          className="w-full py-3 rounded-xl text-[14px] font-bold transition-all
                     flex items-center justify-center gap-2
                     border border-[#6366f1]/50 text-[#a5b4fc]
                     bg-[#6366f1]/15 hover:bg-[#6366f1]/25 hover:border-[#6366f1]/70">
          🎯 Demo en Vivo
        </button>
      ) : (
        <a href={waUrl} target="_blank" rel="noopener noreferrer"
           className={`w-full py-3 rounded-xl text-[14px] font-bold transition-all text-center flex items-center justify-center gap-2 ${
             plan.destacado
               ? 'text-[#082e1e] hover:opacity-90 shadow-lg'
               : 'bg-white/5 text-[#e8edf2] hover:bg-white/10 border border-white/10'
           }`}
           style={plan.destacado ? { background: primary, boxShadow: `0 6px 24px ${primary}40` } : {}}>
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
  const navigate   = useNavigate()
  const [menuOpen,         setMenuOpen]         = useState(false)
  const [ciclo,            setCiclo]            = useState('mensual')
  const [scrolled,         setScrolled]         = useState(false)
  const [moduloActivo,     setModuloActivo]     = useState('dashboard')
  const [showStickyMobile, setShowStickyMobile] = useState(false)

  const landing = useMemo(() => loadLS('saas_landing', LANDING_DEFAULT), [])
  const planes  = useMemo(() =>
    (loadLS('saas_planes', PLANES_DEFAULT) || []).filter(p => p.activo !== false)
  , [])

  const { sitio, hero, caracteristicas, contacto, redesSociales, footer } = landing
  const primary = sitio?.colorPrimario || '#00c896'

  useEffect(() => {
    // ── SEO mejorado ──────────────────────────────────────
    const seo = landing?.seo
    document.title = seo?.titulo || 'StockPro — Software Logístico SaaS | Inventario, Almacenes y Despachos'

    const setMeta = (name, content) => {
      let el = document.querySelector(`meta[name="${name}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }
    const setOG = (prop, content) => {
      let el = document.querySelector(`meta[property="${prop}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }

    setMeta('description', seo?.descripcion || 'Digitaliza tu operación logística con StockPro. Software ERP logístico para gestión de inventario, almacenes, pedidos y trazabilidad en tiempo real. Prueba 30 días gratis.')
    setMeta('keywords',    seo?.keywords    || 'software logístico, sistema logístico, gestión de inventario, control de almacenes, trazabilidad logística, ERP logístico')
    setOG('og:title',       seo?.titulo      || 'StockPro — Software Logístico SaaS')
    setOG('og:description', seo?.descripcion || 'Digitaliza tu operación logística')
    setOG('og:type', 'website')

    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 60)
      setShowStickyMobile(y > 500)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [landing])

  function goSection(id) { setMenuOpen(false); scrollSmoothTo(id) }

  const moduloActualData = MODULOS.find(m => m.id === moduloActivo) || MODULOS[0]

  // ─────────────────────────────────────────────────────────
  return (
    <div data-landing="true"
         className="min-h-screen bg-[#0e1117] text-[#e8edf2] font-sans overflow-x-hidden"
         style={{ backgroundColor: '#0e1117', color: '#e8edf2' }}>

      {/* ══════════════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0a0e14] border-b border-white/[0.08] shadow-xl shadow-black/50'
          : 'bg-[#0a0e14]/90 backdrop-blur-md border-b border-white/[0.05]'
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
          <div className="md:hidden bg-[#141920]/98 backdrop-blur-lg border-t border-white/[0.08] px-6 py-5 flex flex-col gap-1">
            {[
              ['Beneficios',  'beneficios'],
              ['Plataforma',  'plataforma'],
              ['Planes',      'planes'],
              ['Testimonios', 'testimonios'],
              ['Contacto',    'contacto'],
            ].map(([label, id]) => (
              <button key={id} onClick={() => goSection(id)}
                className="text-left py-3 text-[14px] font-medium text-[#9ba8b6] hover:text-white transition-colors border-b border-white/[0.05] last:border-0">
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

      {/* ══════════════════════════════════════════════════
          HERO — Orientado a resultados empresariales
      ══════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20 pb-16 overflow-hidden">

        {/* Fondo con glow mejorado */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-15%] left-[-10%] w-[800px] h-[800px] rounded-full blur-[220px] opacity-[0.09]"
               style={{ background: primary }}/>
          <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[200px] opacity-[0.05] bg-blue-500"/>
          <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full blur-[150px] opacity-[0.04]"
               style={{ background: primary }}/>
          <div className="absolute inset-0 opacity-[0.018]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}/>
        </div>

        <div className="relative max-w-5xl mx-auto text-center">

          {/* Badge de credibilidad */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.04] text-[12px] text-[#9ba8b6] mb-8 backdrop-blur-sm">
            <Zap size={12} style={{ color: primary }}/>
            <span>
              {footer?.probarGratisDias
                ? `Prueba ${footer.probarGratisDias} días gratis · Sin tarjeta de crédito · Cancela cuando quieras`
                : 'Prueba gratuita · Sin tarjeta de crédito · Cancela cuando quieras'
              }
            </span>
          </div>

          {/* Headline principal — orientado a transformación */}
          <h1 className="text-[42px] sm:text-[58px] lg:text-[72px] font-extrabold leading-[1.06] tracking-tight text-[#e8edf2] mb-6">
            {(() => {
              const titulo = hero?.titulo || 'Digitaliza toda tu operación logística desde una sola plataforma'
              const words  = titulo.split(' ')
              const cutoff = Math.floor(words.length * 0.6)
              const normal = words.slice(0, cutoff).join(' ')
              const hl     = words.slice(cutoff).join(' ')
              return (
                <>
                  {normal}{' '}
                  <span style={{ color: primary }}>{hl}</span>
                </>
              )
            })()}
          </h1>

          {/* Subtítulo orientado a resultados */}
          <p className="text-[17px] sm:text-[20px] text-[#7a8a99] leading-relaxed max-w-2xl mx-auto mb-10">
            {hero?.subtitulo || 'Centraliza inventarios, pedidos, almacenes y trazabilidad. Reduce errores operativos, automatiza procesos y toma decisiones en tiempo real.'}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <button
              onClick={() => navigate('/app/dlnorte')}
              className="flex items-center justify-center gap-2.5 px-9 py-4 rounded-2xl text-[15px] font-bold transition-all hover:opacity-90 hover:scale-[1.02] shadow-2xl"
              style={{ background: primary, color: '#082e1e', boxShadow: `0 10px 40px ${primary}45` }}>
              {hero?.ctaTexto || 'Solicitar Demo Gratis'}
              <ArrowRight size={17}/>
            </button>
            <button
              onClick={() => goSection('planes')}
              className="flex items-center justify-center gap-2.5 px-9 py-4 rounded-2xl text-[15px] font-semibold text-[#e8edf2] bg-white/[0.05] border border-white/10 hover:bg-white/10 transition-all hover:scale-[1.02]">
              Ver Planes y Precios
              <ChevronRight size={17}/>
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[12px] text-[#5f6f80] mb-14">
            {['✅ Sin instalación requerida', '✅ Datos seguros y cifrados', '✅ Soporte en español', '✅ Onboarding guiado incluido'].map(t => (
              <span key={t}>{t}</span>
            ))}
          </div>

          {/* Dashboard mockup mejorado con floating cards */}
          <div className="relative max-w-3xl mx-auto">

            {/* Floating metric card — izquierda */}
            <div className="absolute -left-8 top-12 hidden lg:flex items-center gap-3 px-4 py-3
                            bg-[#1a2535]/90 backdrop-blur border border-white/[0.12] rounded-2xl
                            shadow-2xl shadow-black/50 z-10">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] shrink-0"
                   style={{ background: `${primary}20` }}>📉</div>
              <div>
                <div className="text-[18px] font-extrabold leading-none" style={{ color: primary }}>-85%</div>
                <div className="text-[10px] text-[#7a8a99] mt-0.5">Errores de inventario</div>
              </div>
            </div>

            {/* Floating metric card — derecha */}
            <div className="absolute -right-8 top-24 hidden lg:flex items-center gap-3 px-4 py-3
                            bg-[#1a2535]/90 backdrop-blur border border-white/[0.12] rounded-2xl
                            shadow-2xl shadow-black/50 z-10">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] shrink-0"
                   style={{ background: `#3b82f620` }}>⚡</div>
              <div>
                <div className="text-[18px] font-extrabold leading-none text-[#3b82f6]">+40%</div>
                <div className="text-[10px] text-[#7a8a99] mt-0.5">Velocidad de despacho</div>
              </div>
            </div>

            {/* Floating badge — abajo */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-2 px-4 py-2
                            bg-[#1a2535]/90 backdrop-blur border border-white/[0.12] rounded-full
                            shadow-2xl shadow-black/50 z-10 whitespace-nowrap">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: primary }}/>
              <span className="text-[11px] font-semibold text-[#e8edf2]">500+ empresas operando en tiempo real</span>
            </div>

            {/* Mockup principal */}
            <div className="bg-[#141920] border border-white/[0.08] rounded-2xl p-4 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]">
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
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { ic: '📦', val: '1,247', lbl: 'Productos', col: '#3b82f6' },
                  { ic: '🚚', val: '38',    lbl: 'Despachos hoy', col: '#00c896' },
                  { ic: '📊', val: '94.2%', lbl: 'OTIF', col: '#f59e0b' },
                  { ic: '💰', val: 'S/84K', lbl: 'Ventas mes', col: '#a855f7' },
                ].map(({ ic, val, lbl, col }) => (
                  <div key={lbl} className="bg-[#1a2230] rounded-xl p-3 text-left relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl" style={{ background: col }}/>
                    <div className="text-[18px] mb-1">{ic}</div>
                    <div className="text-[15px] font-bold text-[#e8edf2]">{val}</div>
                    <div className="text-[10px] text-[#5f6f80]">{lbl}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 h-24 bg-[#1a2230] rounded-xl p-3 flex items-end gap-1.5">
                  {[60, 80, 55, 90, 75, 95, 70, 85, 100, 78, 88, 92].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm"
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
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-2/3 h-16 blur-3xl rounded-full opacity-30"
                 style={{ background: primary }}/>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          PROBLEMA EMPRESARIAL — Nueva sección
      ══════════════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-[#0b0f16]">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border mb-5
                            border-red-500/30 text-red-400 bg-red-500/08">
              ¿Te identificas?
            </div>
            <h2 className="text-[34px] md:text-[44px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
              ¿Tu operación logística depende<br/>
              <span className="text-red-400">de procesos manuales y poca visibilidad?</span>
            </h2>
            <p className="text-[16px] text-[#7a8a99] max-w-2xl mx-auto leading-relaxed">
              Los errores de inventario, retrasos en despachos y el descontrol operativo
              generan pérdidas constantes que muchas veces ni se miden.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-14">
            {PROBLEMAS.map(({ icono, titulo, desc }) => (
              <div key={titulo}
                   className="flex items-start gap-4 p-5 bg-[#141920]/80 border border-red-500/[0.12]
                              rounded-xl hover:border-red-500/25 transition-all duration-200 hover:bg-[#141920]">
                <span className="text-[26px] shrink-0 mt-0.5">{icono}</span>
                <div>
                  <div className="text-[13px] font-bold text-[#e8edf2] mb-1">{titulo}</div>
                  <div className="text-[12px] text-[#7a8a99] leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Transición — la solución */}
          <div className="relative rounded-2xl p-8 text-center border overflow-hidden"
               style={{ borderColor: `${primary}25`, background: `linear-gradient(135deg, ${primary}06 0%, transparent 100%)` }}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl opacity-[0.08]"
                 style={{ background: primary }}/>
            <div className="relative">
              <div className="text-[40px] mb-4">💡</div>
              <h3 className="text-[22px] md:text-[28px] font-extrabold text-[#e8edf2] mb-3">
                Existe una forma mejor de operar
              </h3>
              <p className="text-[15px] text-[#7a8a99] max-w-xl mx-auto leading-relaxed mb-6">
                <strong className="text-[#e8edf2]">StockPro centraliza toda tu operación logística</strong> en tiempo real.
                Más control, menos errores y mayor eficiencia operativa desde el primer día.
              </p>
              <button
                onClick={() => goSection('beneficios')}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-[14px] font-bold transition-all hover:opacity-90"
                style={{ background: primary, color: '#082e1e', boxShadow: `0 6px 24px ${primary}40` }}>
                Ver cómo funciona <ChevronRight size={16}/>
              </button>
            </div>
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
              <div className="text-[30px] font-extrabold leading-none mb-1" style={{ color: primary }}>
                {s.valor}
              </div>
              <div className="text-[12px] text-[#7a8a99]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          BENEFICIOS EMPRESARIALES — orientados a impacto
      ══════════════════════════════════════════════════ */}
      <section id="beneficios" className="py-24 px-6 bg-[#0e1117]">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border mb-5"
                 style={{ color: primary, borderColor: `${primary}40`, background: `${primary}10` }}>
              Beneficios empresariales
            </div>
            <h2 className="text-[38px] md:text-[48px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
              No solo un sistema.<br/>
              <span style={{ color: primary }}>Una transformación operativa.</span>
            </h2>
            <p className="text-[16px] text-[#7a8a99] max-w-xl mx-auto leading-relaxed">
              StockPro no te da funcionalidades. Te da control total, reducción de errores
              y eficiencia operativa medible desde el primer mes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(caracteristicas || []).map(f => (
              <BenefitCard key={f.id} icono={f.icono} titulo={f.titulo} descripcion={f.descripcion} primary={primary}/>
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
              Proceso de implementación
            </div>
            <h2 className="text-[38px] md:text-[48px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
              Operativo en <span style={{ color: primary }}>menos de 15 minutos</span>
            </h2>
            <p className="text-[16px] text-[#8a9ab0]">
              Sin implementaciones costosas. Sin consultores externos. Sin interrumpir tu operación.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PASOS.map((p, i) => (
              <div key={p.num}
                   className="relative flex flex-col bg-[#141c27] border border-white/[0.10] rounded-2xl p-8
                              transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50"
                   style={{ ['--primary']: primary }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[14px] font-extrabold shrink-0"
                       style={{ background: primary, color: '#082e1e' }}>
                    {p.num}
                  </div>
                  {i < PASOS.length - 1 && (
                    <div className="hidden md:block flex-1 border-t border-dashed border-white/[0.12]"/>
                  )}
                </div>
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
          ASÍ FUNCIONA LA PLATAFORMA — Screenshots visuales
      ══════════════════════════════════════════════════ */}
      <section id="plataforma" className="py-24 px-6 bg-[#0e1117]">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border mb-5"
                 style={{ color: primary, borderColor: `${primary}40`, background: `${primary}10` }}>
              Plataforma en acción
            </div>
            <h2 className="text-[38px] md:text-[48px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
              Así se ve el control<br/>
              <span style={{ color: primary }}>total de tu operación</span>
            </h2>
            <p className="text-[16px] text-[#7a8a99] max-w-xl mx-auto leading-relaxed">
              Cada módulo diseñado para darte visibilidad inmediata y control operativo real.
            </p>
          </div>

          {/* Tabs de módulos */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {MODULOS.map(m => (
              <button key={m.id} onClick={() => setModuloActivo(m.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                  moduloActivo === m.id
                    ? 'text-[#082e1e] shadow-lg'
                    : 'bg-white/[0.04] text-[#7a8a99] border border-white/[0.08] hover:text-white hover:bg-white/[0.07]'
                }`}
                style={moduloActivo === m.id ? { background: primary, boxShadow: `0 4px 20px ${primary}40` } : {}}>
                <span>{m.icono}</span>
                {m.label}
              </button>
            ))}
          </div>

          {/* Mockup del módulo activo */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">

            {/* Descripción */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div>
                <div className="text-[40px] mb-4">{moduloActualData.icono}</div>
                <h3 className="text-[24px] font-extrabold text-[#e8edf2] mb-3">
                  {moduloActualData.label}
                </h3>
                <p className="text-[14px] text-[#7a8a99] leading-relaxed mb-6">
                  {moduloActualData.desc}
                </p>
              </div>

              {/* KPIs resumen */}
              <div className="grid grid-cols-2 gap-3">
                {moduloActualData.kpis.map(({ ic, val, lbl, col }) => (
                  <div key={lbl} className="p-4 bg-[#141920] border border-white/[0.08] rounded-xl">
                    <div className="text-[22px] mb-1">{ic}</div>
                    <div className="text-[20px] font-extrabold leading-none mb-1" style={{ color: col }}>{val}</div>
                    <div className="text-[11px] text-[#5f6f80]">{lbl}</div>
                  </div>
                ))}
              </div>

              <button onClick={() => navigate('/app/dlnorte')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold transition-all hover:opacity-90 w-fit"
                style={{ background: primary, color: '#082e1e', boxShadow: `0 6px 24px ${primary}40` }}>
                Ver módulo en vivo <ArrowRight size={15}/>
              </button>
            </div>

            {/* Mockup visual */}
            <div className="lg:col-span-3 relative">
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full blur-3xl opacity-[0.12]"
                   style={{ background: primary }}/>
              <ModuloMockup modulo={moduloActualData} primary={primary}/>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          PLANES Y PRECIOS
      ══════════════════════════════════════════════════ */}
      <section id="planes" className="py-24 px-6 bg-[#111820]">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border mb-5"
                 style={{ color: primary, borderColor: `${primary}40`, background: `${primary}10` }}>
              Planes y Precios
            </div>
            <h2 className="text-[38px] md:text-[48px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
              El plan perfecto<br/>
              <span className="text-[#7a8a99]">para cada empresa</span>
            </h2>
            <p className="text-[16px] text-[#7a8a99] mb-8">
              Sin contratos de permanencia. Sin costos ocultos. Cambia de plan cuando necesites.
            </p>

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
              <PlanCard key={plan.id} plan={plan} ciclo={ciclo} primary={primary}
                        navigate={navigate} whatsapp={contacto?.whatsapp}/>
            ))}
          </div>

          <p className="text-center text-[13px] text-[#5f6f80] mt-8">
            Precios en {planes[0]?.moneda || 'PEN'}. ¿Necesitas un plan a medida o para más de 10 empresas?{' '}
            <button onClick={() => goSection('contacto')}
              className="font-semibold transition-colors hover:opacity-80"
              style={{ color: primary }}>
              Hablemos →
            </button>
          </p>

          {/* Tabla comparativa */}
          <div className="mt-12 bg-[#141920] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.07] flex items-center gap-2">
              <span className="text-[14px]">📊</span>
              <h3 className="text-[14px] font-bold text-[#e8edf2]">Comparativa de límites operativos por plan</h3>
              <span className="ml-2 text-[11px] text-[#5f6f80]">— El plan elegido define tus capacidades operativas</span>
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
                    { label: '👤 Usuarios',      key: 'maxUsuarios'    },
                    { label: '📦 Productos',      key: 'maxProductos'   },
                    { label: '🏭 Almacenes',      key: 'maxAlmacenes'   },
                    { label: '🤝 Proveedores',    key: 'maxProveedores' },
                    { label: '👥 Clientes',       key: 'maxClientes'    },
                    { label: '📋 Órdenes/mes',    key: 'maxOrdenesMes'  },
                  ].map(({ label, key }, ri) => {
                    const limites = loadLS('saas_limites', {
                      trial:       { maxUsuarios: 1,  maxProductos: 100,  maxAlmacenes: 1,  maxProveedores: 10,  maxClientes: 20,  maxOrdenesMes: 50   },
                      basico:      { maxUsuarios: 3,  maxProductos: 500,  maxAlmacenes: 2,  maxProveedores: 50,  maxClientes: 100, maxOrdenesMes: 300  },
                      profesional: { maxUsuarios: 10, maxProductos: 2000, maxAlmacenes: 5,  maxProveedores: 200, maxClientes: 500, maxOrdenesMes: 2000 },
                      empresarial: { maxUsuarios: -1, maxProductos: -1,   maxAlmacenes: -1, maxProveedores: -1,  maxClientes: -1,  maxOrdenesMes: -1   },
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
                              <span style={{ color: isMax ? primary : p.color }}>{txt}</span>
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
      <section id="testimonios" className="py-24 px-6 bg-[#0e1117]">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border mb-5"
                 style={{ color: primary, borderColor: `${primary}40`, background: `${primary}10` }}>
              Casos de éxito
            </div>
            <h2 className="text-[38px] md:text-[48px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
              Empresas que ya<br/>
              <span style={{ color: primary }}>transformaron su operación</span>
            </h2>
            <p className="text-[16px] text-[#7a8a99]">
              Resultados reales de empresas que usaban Excel y procesos manuales antes de StockPro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIOS.map(t => <TestimonioCard key={t.nombre} t={t} primary={primary}/>)}
          </div>

          {/* Trust bar */}
          <div className="mt-12 flex flex-wrap justify-center gap-8 items-center">
            {[
              { ic: '🏢', label: '500+ empresas activas' },
              { ic: '⭐', label: '4.9/5 valoración promedio' },
              { ic: '🔒', label: 'Datos 100% seguros y cifrados' },
              { ic: '🇵🇪', label: 'Soporte en español 24/7' },
            ].map(({ ic, label }) => (
              <div key={label} className="flex items-center gap-2 text-[13px] text-[#5f6f80]">
                <span>{ic}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          CTA CENTRAL — Alta urgencia y conversión
      ══════════════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-[#111820]">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-3xl p-12 text-center overflow-hidden border"
               style={{ borderColor: `${primary}25`, background: `linear-gradient(135deg, ${primary}08 0%, ${primary}03 50%, transparent 100%)` }}>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-[120px] opacity-[0.09]"
                 style={{ background: primary }}/>

            <div className="relative">
              <div className="text-[52px] mb-5">🚀</div>
              <h2 className="text-[32px] md:text-[40px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
                ¿Listo para transformar<br/>tu logística empresarial?
              </h2>
              <p className="text-[16px] text-[#7a8a99] mb-3 max-w-lg mx-auto leading-relaxed">
                Únete a más de 500 empresas que ya operan con control total, menos errores y mayor eficiencia con {sitio?.nombre || 'StockPro'}.
              </p>
              {footer?.probarGratisDias > 0 && (
                <p className="text-[13px] mb-8 font-semibold" style={{ color: primary }}>
                  ✅ {footer.probarGratisDias} días gratis · Sin tarjeta de crédito · Sin permanencia
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/app/dlnorte')}
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-[15px] font-bold transition-all hover:opacity-90 hover:scale-[1.02] shadow-2xl"
                  style={{ background: primary, color: '#082e1e', boxShadow: `0 10px 40px ${primary}45` }}>
                  Solicitar Demo Gratis
                  <ArrowRight size={17}/>
                </button>
                <button
                  onClick={() => goSection('contacto')}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-semibold text-[#9ba8b6] bg-white/[0.04] border border-white/10 hover:bg-white/10 transition-all">
                  Hablar con un asesor →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          CONTACTO
      ══════════════════════════════════════════════════ */}
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
                 className="group flex flex-col items-center text-center p-7 bg-[#141920] border border-white/[0.07] rounded-2xl hover:border-[#00c896]/40 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#00c896]/5">
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
                 className="group flex flex-col items-center text-center p-7 bg-[#141920] border border-white/[0.07] rounded-2xl hover:border-[#00c896]/40 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#00c896]/5">
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
                 className="group flex flex-col items-center text-center p-7 bg-[#141920] border border-white/[0.07] rounded-2xl hover:border-green-500/40 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-green-500/5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-green-500/10">
                  <MessageCircle size={22} className="text-green-400"/>
                </div>
                <div className="text-[13px] font-bold text-[#e8edf2] mb-1">WhatsApp</div>
                <div className="text-[12px] text-[#7a8a99]">{contacto.whatsapp}</div>
              </a>
            )}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { ic: '⚡', t: 'Respuesta rápida', d: 'Menos de 24h hábiles en todos los canales de contacto' },
              { ic: '🌎', t: 'Soporte en español', d: 'Equipo nativo hispanohablante, sin barreras idiomáticas' },
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

          <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
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

      {/* ══════════════════════════════════════════════════
          CTA STICKY MÓVIL — solo visible en mobile al hacer scroll
      ══════════════════════════════════════════════════ */}
      <div className={`fixed bottom-0 left-0 right-0 md:hidden z-50 transition-all duration-300 ${
        showStickyMobile ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}>
        <div className="p-4 bg-[#0a0e14]/96 backdrop-blur-lg border-t border-white/[0.08] shadow-2xl shadow-black/60">
          <button
            onClick={() => navigate('/app/dlnorte')}
            className="w-full py-4 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ background: primary, color: '#082e1e', boxShadow: `0 8px 30px ${primary}50` }}>
            Solicitar Demo Gratis
            <ArrowRight size={17}/>
          </button>
        </div>
      </div>

    </div>
  )
}
