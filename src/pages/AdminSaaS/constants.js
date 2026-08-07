import { format } from 'date-fns'

export const uid   = () => `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
export const today = () => format(new Date(), 'yyyy-MM-dd')

// ── Initial demo data ───────────────────────────────────
export const PLANES_INIT = [
  { id:'trial',        nombre:'Prueba Gratuita', descripcion:'Evalúa el sistema sin compromiso', precioMensual:0,   precioAnual:0,    moneda:'PEN', color:'#6366f1', destacado:false, activo:true, vigenciaDias:30, caracteristicas:['1 usuario','Hasta 100 productos','1 almacén','Soporte email','Solo modo demo'] },
  { id:'basico',       nombre:'Básico',          descripcion:'Para pequeñas empresas en crecimiento', precioMensual:49,  precioAnual:490,  moneda:'PEN', color:'#3b82f6', destacado:false, activo:true, vigenciaDias:30, caracteristicas:['Hasta 3 usuarios','Hasta 500 productos','2 almacenes','Soporte email','Exportación básica'] },
  { id:'profesional',  nombre:'Profesional',     descripcion:'Ideal para empresas en expansión',    precioMensual:99,  precioAnual:990,  moneda:'PEN', color:'#00c896', destacado:true,  activo:true, vigenciaDias:30, caracteristicas:['Hasta 10 usuarios','Hasta 2,000 productos','5 almacenes','Soporte prioritario','Reportes avanzados','Exportación avanzada'] },
  { id:'empresarial',  nombre:'Empresarial',     descripcion:'Potencia sin límites para grandes operaciones', precioMensual:199, precioAnual:1990, moneda:'PEN', color:'#f59e0b', destacado:false, activo:true, vigenciaDias:30, caracteristicas:['Usuarios ilimitados','Productos ilimitados','Almacenes ilimitados','Multi-empresa','API Access','SLA garantizado','Soporte 24/7','Onboarding dedicado'] },
]

export const NEGOCIOS_INIT = [
  { id:'neg_1', nombre:'Distribuidora Lima Norte S.A.C.', ruc:'20512345678', contacto:'Carlos Mendoza', email:'carlos@dlnorte.com', telefono:'+51 944 123 456', plan:'profesional', estado:'activo',    fechaRegistro:'2024-03-15', fechaVencimiento:'2027-03-15', empresaId:'dlnorte',  password:'demo123',    notas:'Renovación automática activa.' },
  { id:'neg_2', nombre:'ACME Distribuciones E.I.R.L.',   ruc:'20598765432', contacto:'María Rodríguez', email:'maria@acme.com',    telefono:'+51 955 987 654', plan:'empresarial',  estado:'activo',    fechaRegistro:'2023-11-01', fechaVencimiento:'2027-11-01', empresaId:'acme',      password:'acme2025',   notas:'Plan personalizado. Facturación anual.' },
  { id:'neg_3', nombre:'Ferretería San Martín E.I.R.L.', ruc:'20111222333', contacto:'Pedro Torres',    email:'pedro@sanmartin.pe', telefono:'+51 966 555 444', plan:'trial',         estado:'trial',     fechaRegistro:'2026-05-25', fechaVencimiento:'2026-06-24', empresaId:'sanmartin', password:'trial123',   notas:'Prueba gratuita de 30 días activa.' },
  { id:'neg_4', nombre:'Ferrmax Industrial S.A.',         ruc:'20444555666', contacto:'Ana Gutiérrez',   email:'ana@ferrmax.com',    telefono:'+51 977 111 222', plan:'profesional',   estado:'suspendido',fechaRegistro:'2025-01-15', fechaVencimiento:'2026-05-31', empresaId:'ferrmax',   password:'ferrmax2026',notas:'Suspendido por falta de pago.' },
  { id:'neg_5', nombre:'TechInventarios SRL',             ruc:'20777888999', contacto:'Luis Paredes',    email:'luis@techinv.com',   telefono:'+51 988 333 444', plan:'basico',         estado:'vencido',   fechaRegistro:'2025-06-01', fechaVencimiento:'2026-05-10', empresaId:'techinv',   password:'tech2025',   notas:'Contrato vencido.' },
]

export const RENOVACIONES_INIT = [
  { id:'ren_1', negocioId:'neg_1', negocioNombre:'Distribuidora Lima Norte S.A.C.', plan:'profesional', monto:990,  moneda:'PEN', ciclo:'anual', fechaPago:'2026-03-15', metodoPago:'tarjeta',        periodoInicio:'2026-03-15', periodoFin:'2027-03-15', estado:'pagado', comprobante:'REC-2026-031' },
  { id:'ren_2', negocioId:'neg_2', negocioNombre:'ACME Distribuciones E.I.R.L.',    plan:'empresarial', monto:1990, moneda:'PEN', ciclo:'anual', fechaPago:'2026-11-01', metodoPago:'transferencia',  periodoInicio:'2026-11-01', periodoFin:'2027-11-01', estado:'pagado', comprobante:'REC-2026-110' },
  { id:'ren_3', negocioId:'neg_2', negocioNombre:'ACME Distribuciones E.I.R.L.',    plan:'empresarial', monto:1990, moneda:'PEN', ciclo:'anual', fechaPago:'2025-11-01', metodoPago:'transferencia',  periodoInicio:'2025-11-01', periodoFin:'2026-11-01', estado:'pagado', comprobante:'REC-2025-110' },
  { id:'ren_4', negocioId:'neg_1', negocioNombre:'Distribuidora Lima Norte S.A.C.', plan:'profesional', monto:990,  moneda:'PEN', ciclo:'anual', fechaPago:'2025-03-15', metodoPago:'tarjeta',        periodoInicio:'2025-03-15', periodoFin:'2026-03-15', estado:'pagado', comprobante:'REC-2025-031' },
]

export const LIMITES_INIT = {
  trial:       { maxUsuarios:1,  maxProductos:100,   maxAlmacenes:1,  maxProveedores:10,  maxClientes:20,   maxOrdenesMes:50,   almacenamientoGB:1,   soporte:'email',        apiAccess:false, multiEmpresa:false, exportAvanzada:false, reportesAvanzados:false },
  basico:      { maxUsuarios:3,  maxProductos:500,   maxAlmacenes:2,  maxProveedores:50,  maxClientes:100,  maxOrdenesMes:300,  almacenamientoGB:5,   soporte:'email',        apiAccess:false, multiEmpresa:false, exportAvanzada:false, reportesAvanzados:false },
  profesional: { maxUsuarios:10, maxProductos:2000,  maxAlmacenes:5,  maxProveedores:200, maxClientes:500,  maxOrdenesMes:2000, almacenamientoGB:25,  soporte:'prioritario',  apiAccess:true,  multiEmpresa:false, exportAvanzada:true,  reportesAvanzados:true  },
  empresarial: { maxUsuarios:-1, maxProductos:-1,    maxAlmacenes:-1, maxProveedores:-1,  maxClientes:-1,   maxOrdenesMes:-1,   almacenamientoGB:200, soporte:'24/7',         apiAccess:true,  multiEmpresa:true,  exportAvanzada:true,  reportesAvanzados:true  },
}

export const ALERTAS_INIT = [
  { id:'al_1', diasAntes:30, activa:true, canales:['email','sistema'], asunto:'Plan próximo a vencer', mensaje:'Tu plan {plan} vence en {dias} días. Renueva para continuar sin interrupciones.' },
  { id:'al_2', diasAntes:15, activa:true, canales:['email','sistema'], asunto:'Recordatorio de renovación', mensaje:'Quedan {dias} días para que venza tu plan {plan}. ¡No pierdas el acceso!' },
  { id:'al_3', diasAntes:7, activa:true, canales:['email','sistema','whatsapp'], asunto:'¡Plan por vencer pronto!', mensaje:'Tu plan vence en {dias} días. Contáctanos para renovar.' },
  { id:'al_4', diasAntes:1, activa:true, canales:['email','sistema','whatsapp'], asunto:'¡Tu plan vence mañana!', mensaje:'Mañana vence tu acceso. Renueva ahora para no perder tu información.' }
]

export const LANDING_INIT = {
  sitio: { nombre:'StockPro', tagline:'Logística inteligente para tu empresa', descripcion:'Sistema SaaS de gestión de inventario, despachos y operaciones logísticas para empresas modernas.', colorPrimario:'#00c896', logoUrl:'' },
  hero: { titulo:'Controla tu logística con precisión', subtitulo:'Sistema completo de gestión de inventario, pedidos y despachos para empresas que quieren crecer sin límites.', ctaTexto:'Comenzar prueba gratis', ctaUrl:'#planes', ctaTexto2:'Ver demo en vivo', ctaUrl2:'#demo', imagenUrl:'' },
  caracteristicas: [
    { id:'cf_1', icono:'📦', titulo:'Inventario en Tiempo Real', descripcion:'Control de stock con alertas automáticas y kardex valorizado completo.' },
    { id:'cf_2', icono:'🚚', titulo:'Gestión de Despachos', descripcion:'Planifica rutas, controla tu flota y rastrea entregas en tiempo real.' },
    { id:'cf_3', icono:'📊', titulo:'Reportes y KPIs', descripcion:'Dashboards con indicadores clave: OTIF, Fill Rate, Perfect Order y más.' },
    { id:'cf_4', icono:'🌐', titulo:'Portal B2B de Clientes', descripcion:'Tus clientes hacen pedidos directamente desde un portal personalizado. Sin llamadas, sin errores, con trazabilidad en tiempo real.' },
    { id:'cf_5', icono:'👥', titulo:'Multi-usuario', descripcion:'Gestión de roles y permisos por módulo para todo tu equipo.' },
    { id:'cf_6', icono:'☁️', titulo:'100% en la Nube', descripcion:'Accede desde cualquier dispositivo, sin instalaciones ni actualizaciones.' },
    { id:'cf_7', icono:'🔮', titulo:'Previsión de Demanda', descripcion:'Anticipa la demanda con análisis histórico de movimientos. Reabastécete antes de que el stock se agote y reduce el capital inmovilizado.' }
  ],
  contacto: { email:'ventas@stockpro.com', telefono:'+51 1 234 5678', whatsapp:'+51 999 000 111', direccion:'Lima, Perú', emailSoporte:'' },
  redesSociales: { linkedin:'', twitter:'', facebook:'', instagram:'', youtube:'' },
  seo: { titulo:'StockPro — Sistema Logístico SaaS', descripcion:'Gestiona tu inventario, despachos y logística con StockPro. Prueba gratis por 14 días.', keywords:'logística, inventario, saas, gestión almacén, stockpro, peru' },
  footer: { textoLegal:'© 2026 StockPro. Todos los derechos reservados.', mostrarPrecios:true, moneda:'USD', probarGratisDias:14 }
}

export const ESTADO_BADGE = { activo:'success', trial:'info', suspendido:'warning', vencido:'danger', cancelado:'neutral' }

export function estadoEfectivo(n) {
  if (n.estado === 'cancelado' || n.estado === 'suspendido') return n.estado
  if (n.fechaVencimiento && new Date(n.fechaVencimiento) < new Date(new Date().toDateString())) return 'vencido'
  return n.estado
}
