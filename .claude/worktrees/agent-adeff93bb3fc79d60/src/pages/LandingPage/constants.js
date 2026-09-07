// ─────────────────────────────────────────────────────────────
// Datos por defecto — se usan si no hay config en localStorage
// ─────────────────────────────────────────────────────────────
export const LANDING_DEFAULT = {
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

export const PLANES_DEFAULT = [
  { id: 'trial',       nombre: 'Prueba Gratuita', descripcion: 'Evalúa el sistema sin compromiso',              precioMensual: 0,   precioAnual: 0,    moneda: 'PEN', color: '#6366f1', destacado: false, activo: true, vigenciaDias: 30, caracteristicas: ['1 usuario', 'Hasta 100 productos', '1 almacén', 'Soporte email', 'Solo modo demo'] },
  { id: 'basico',      nombre: 'Básico',           descripcion: 'Para pequeñas empresas en crecimiento',         precioMensual: 49,  precioAnual: 490,  moneda: 'PEN', color: '#3b82f6', destacado: false, activo: true, vigenciaDias: 30, caracteristicas: ['Hasta 3 usuarios', 'Hasta 500 productos', '2 almacenes', 'Soporte email', 'Exportación básica'] },
  { id: 'profesional', nombre: 'Profesional',      descripcion: 'Ideal para empresas en expansión',              precioMensual: 99,  precioAnual: 990,  moneda: 'PEN', color: '#00c896', destacado: true,  activo: true, vigenciaDias: 30, caracteristicas: ['Hasta 10 usuarios', 'Hasta 2,000 productos', '5 almacenes', 'Soporte prioritario', 'Reportes avanzados', 'Exportación avanzada'] },
  { id: 'empresarial', nombre: 'Empresarial',      descripcion: 'Potencia sin límites para grandes operaciones', precioMensual: 199, precioAnual: 1990, moneda: 'PEN', color: '#f59e0b', destacado: false, activo: true, vigenciaDias: 30, caracteristicas: ['Usuarios ilimitados', 'Productos ilimitados', 'Almacenes ilimitados', 'Multi-empresa', 'API Access', 'SLA garantizado', 'Soporte 24/7', 'Onboarding dedicado'] },
]

export const STATS = [
  { valor: '500+',  label: 'Empresas activas',              icono: '🏢' },
  { valor: '99.9%', label: 'Uptime garantizado',             icono: '⚡' },
  { valor: '50K+',  label: 'Pedidos procesados al mes',      icono: '📦' },
  { valor: '85%',   label: 'Reducción de errores promedio',  icono: '🎯' },
]

export const PASOS = [
  { num: '01', icono: '🏢', titulo: 'Registra tu empresa en minutos', desc: 'Crea tu cuenta sin tarjeta de crédito. Configura tu empresa, usuarios y estructura operativa de forma guiada en menos de 15 minutos.' },
  { num: '02', icono: '📋', titulo: 'Importa tu inventario y almacenes', desc: 'Carga tus productos, categorías y almacenes. Importación masiva desde Excel en un solo clic, sin perder datos.' },
  { num: '03', icono: '🚀', titulo: 'Opera y escala con control total', desc: 'Gestiona pedidos, despachos y genera reportes ejecutivos en tiempo real desde cualquier dispositivo.' },
]

export const TESTIMONIOS = [
  { nombre: 'Carlos Mendoza', cargo: 'Gerente de Operaciones', empresa: 'Distribuidora Lima Norte', texto: 'StockPro transformó nuestra operación. Redujimos los errores de inventario en un 85% y el tiempo de despacho en un 40%. El ROI fue visible desde el primer mes.', rating: 5, avatar: 'CM' },
  { nombre: 'María Rodríguez', cargo: 'Directora Logística', empresa: 'ACME Distribuciones', texto: 'El portal B2B para nuestros clientes cambió todo. Los pedidos entran directamente al sistema sin intermediarios. Los reportes en tiempo real nos dieron la visibilidad que nunca habíamos tenido. Nunca más operamos a ciegas.', rating: 5, avatar: 'MR' },
  { nombre: 'Pedro Torres', cargo: 'Propietario', empresa: 'Ferretería San Martín', texto: 'Empezamos con el plan básico y en 3 meses ya pasamos al profesional. El ROI fue inmediato. Dejamos de perder dinero por errores de stock que no veíamos antes.', rating: 5, avatar: 'PT' },
]

export const PROBLEMAS = [
  { icono: '⚠️', titulo: 'Errores constantes de inventario', desc: 'Diferencias entre el stock físico y el sistema generan pérdidas invisibles mes a mes.' },
  { icono: '🐌', titulo: 'Despachos lentos y con errores', desc: 'Procesos manuales que retrasan las entregas y acumulan reclamos de clientes.' },
  { icono: '👁️', titulo: 'Sin visibilidad en tiempo real', desc: 'Tomar decisiones sin datos actualizados significa operar completamente a ciegas.' },
  { icono: '📑', titulo: 'Datos dispersos en Excel y papel', desc: 'Información fragmentada que nadie puede consolidar cuando más la necesita.' },
  { icono: '💸', titulo: 'Costos operativos que no bajan', desc: 'Horas-hombre desperdiciadas en tareas repetitivas que deberían estar automatizadas.' },
  { icono: '🔍', titulo: 'Sin trazabilidad de pedidos', desc: 'No saber dónde está cada pedido en tiempo real destruye la confianza del cliente.' },
]

// Módulos para la sección de screenshots visuales
export const MODULOS = [
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
