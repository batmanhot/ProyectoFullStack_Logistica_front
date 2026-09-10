import { format } from 'date-fns'

export const uid   = () => `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
export const today = () => format(new Date(), 'yyyy-MM-dd')

// Fallback del contenido de la landing mientras responde `useLanding`. El resto
// del panel ya no usa datos semilla — se quitaron PLANES_INIT / NEGOCIOS_INIT /
// RENOVACIONES_INIT / LIMITES_INIT / ALERTAS_INIT (2026-09-09), eran datos
// hardcodeados muertos de antes de conectar la API.
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

export const ESTADO_BADGE = {
  activo:'success', trial:'info', por_vencer:'warning', gracia:'warning',
  suspendido:'warning', vencido:'danger', cancelado:'neutral', archivado:'neutral',
}
export const ESTADO_LABEL = {
  activo:'Activo', trial:'Trial', por_vencer:'Por vencer', gracia:'En gracia',
  suspendido:'Suspendido', vencido:'Vencido', cancelado:'Cancelado', archivado:'Archivado',
}

/**
 * FUENTE DE VERDAD: el backend (`NegociosService.calcularEstadoEfectivo`,
 * ver `estado-negocio.util.ts`) ya manda `estadoEfectivo` calculado —
 * incluye por_vencer/gracia/vencido, que nunca se guardan en `estado`.
 * Este fallback SOLO cubre datos viejos en caché o el estado local de
 * creación antes de que responda la API; si diverge, gana el backend.
 */
export function estadoEfectivo(n) {
  if (n.estadoEfectivo) return n.estadoEfectivo
  if (n.estado === 'cancelado' || n.estado === 'suspendido' || n.estado === 'archivado') return n.estado
  if (n.fechaVencimiento && new Date(n.fechaVencimiento) < new Date(new Date().toDateString())) return 'vencido'
  return n.estado
}
