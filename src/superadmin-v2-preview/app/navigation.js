import { Activity, BarChart3, BellRing, Building2, CreditCard, Globe2, Headphones, HeartPulse, LockKeyhole, ScrollText, UserCog, UsersRound } from 'lucide-react'

export const MODULES = {
  dashboard:{ label:'Dashboard', eyebrow:'Centro de control', description:'Estado general y prioridades de la plataforma.', defaultTab:'resumen', tabs:[['resumen','Resumen']] },
  negocios:{ label:'Negocios', eyebrow:'Clientes', description:'Consulta clientes y atiende riesgos comerciales.', defaultTab:'listado', tabs:[['listado','Todos'],['riesgos','Requieren atención']] },
  usuarios:{ label:'Usuarios', eyebrow:'Accesos', description:'Administra responsables, roles y seguridad de acceso.', defaultTab:'administradores-tenant', tabs:[['administradores-tenant','Administradores'],['roles','Roles'],['accesos','Accesos']] },
  soporte:{ label:'Soporte', eyebrow:'Atención al cliente', description:'Gestiona casos y accesos de soporte controlados.', defaultTab:'casos', tabs:[['casos','Casos'],['accesos','Accesos'],['procedimiento','Políticas']] },
  planes:{ label:'Planes', eyebrow:'Oferta comercial', description:'Define qué incluye cada plan y cómo se compara.', defaultTab:'catalogo', tabs:[['catalogo','Catálogo'],['capacidades','Capacidades'],['comparacion','Comparación']] },
  suscripciones:{ label:'Suscripciones', eyebrow:'Ingresos', description:'Supervisa renovaciones, facturación y pagos.', defaultTab:'resumen', tabs:[['resumen','Resumen'],['renovaciones','Renovaciones'],['facturacion','Facturación y pagos']] },
  operacion:{ label:'Operación SaaS', eyebrow:'Plataforma', description:'Supervisa la salud del servicio y su continuidad.', defaultTab:'salud', tabs:[['salud','Estado general'],['incidentes','Incidentes'],['continuidad','Continuidad']] },
  alertas:{ label:'Alertas', eyebrow:'Atención', description:'Prioriza eventos importantes y define sus reglas.', defaultTab:'bandeja', tabs:[['bandeja','Bandeja'],['reglas','Reglas']] },
  auditoria:{ label:'Auditoría', eyebrow:'Trazabilidad', description:'Consulta acciones y controla el uso de la información.', defaultTab:'eventos', tabs:[['eventos','Eventos'],['exportaciones','Exportaciones'],['politica','Política']] },
  administradores:{ label:'Administradores', eyebrow:'Equipo de plataforma', description:'Gestiona cuentas privilegiadas y su seguridad.', defaultTab:'cuentas', tabs:[['cuentas','Cuentas'],['seguridad','Seguridad'],['actividad','Actividad']] },
  configuracion:{ label:'Configuración', eyebrow:'Sistema', description:'Ajusta preferencias e integraciones de la plataforma.', defaultTab:'general', tabs:[['general','General'],['integraciones','Integraciones'],['experimentos','Funciones experimentales']] },
  landing:{ label:'Landing Page', eyebrow:'Sitio público', description:'Edita el contenido y controla su publicación.', defaultTab:'contenido', tabs:[['contenido','Contenido'],['seo','SEO'],['publicacion','Publicación']] },
  analytics:{ label:'Analytics', eyebrow:'Crecimiento', description:'Entiende adquisición, conversión y privacidad.', defaultTab:'resumen', tabs:[['resumen','Resumen'],['adquisicion','Adquisición'],['consentimiento','Privacidad']] },
}

export const NAV_GROUPS = [
  { label:'', items:[['dashboard',Activity]] },
  { label:'CLIENTES', items:[['negocios',Building2],['usuarios',UsersRound],['soporte',Headphones]] },
  { label:'SUSCRIPCIONES', items:[['planes',CreditCard],['suscripciones',CreditCard]] },
  { label:'PLATAFORMA', items:[['operacion',HeartPulse],['alertas',BellRing]] },
  { label:'SISTEMA', items:[['auditoria',ScrollText],['administradores',UserCog],['configuracion',LockKeyhole]] },
  { label:'MARKETING', items:[['landing',Globe2],['analytics',BarChart3]] },
]

export function readLocation() {
  const [moduleId, tabId] = window.location.hash.replace(/^#\/?/, '').split('/')
  const module = MODULES[moduleId] ? moduleId : 'dashboard'
  const allowed = MODULES[module].tabs.map(([id]) => id)
  return { module, tab:allowed.includes(tabId) ? tabId : MODULES[module].defaultTab }
}

export function writeLocation(module, tab = MODULES[module]?.defaultTab) {
  window.location.hash = `#/${module}/${tab}`
}
