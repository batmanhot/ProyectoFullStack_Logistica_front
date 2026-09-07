export const seedTenants = [
  { id: 't1', nombre: 'Distribuciones Norte SAC', nombreCorto:'Norte', ruc:'20123456781', contacto:'Andrea Salazar', email:'contacto@norte.pe', telefono:'+51 999 100 101', codigo:'norte', plan: 'Profesional', estado: 'Activo', periodoPago: 'Mensual', fechaInicio: '2026-08-01', fechaVencimiento: '2026-09-01', estadoPago: 'Al día', politicaAcceso: 'Suspender al vencer', diasGracia: 3, admins: 2, usuariosActuales: 12, usuariosLimite: 20, usuarios: '12 / 20', ultimoAcceso: 'Hace 8 min', riesgo: 'Normal' },
  { id: 't2', nombre: 'Logística Andina EIRL', nombreCorto:'Andina', ruc:'20123456782', contacto:'María Castro', email:'contacto@andina.pe', telefono:'+51 999 100 102', codigo:'andina', plan: 'Básico', estado: 'Por vencer', periodoPago: 'Mensual', fechaInicio: '2026-08-01', fechaVencimiento: '2026-08-30', estadoPago: 'Pendiente', politicaAcceso: 'Suspender al vencer', diasGracia: 3, admins: 1, usuariosActuales: 3, usuariosLimite: 3, usuarios: '3 / 3', ultimoAcceso: 'Ayer', riesgo: 'Atención' },
  { id: 't3', nombre: 'Comercial Pacífico SAC', nombreCorto:'Pacífico', ruc:'20123456783', contacto:'Luis Rojas', email:'contacto@pacifico.pe', telefono:'+51 999 100 103', codigo:'pacifico', plan: 'Empresarial', estado: 'Activo', periodoPago: 'Anual', fechaInicio: '2026-01-01', fechaVencimiento: '2026-12-31', estadoPago: 'Al día', politicaAcceso: 'Suspender al vencer', diasGracia: 7, admins: 3, usuariosActuales: 42, usuariosLimite: 60, usuarios: '42 / 60', ultimoAcceso: 'Hace 2 h', riesgo: 'Normal' },
  { id: 't4', nombre: 'Almacenes Sur Perú', nombreCorto:'Almacenes Sur', ruc:'20123456784', contacto:'Rosa Torres', email:'contacto@sur.pe', telefono:'+51 999 100 104', codigo:'almacenes-sur', plan: 'Prueba gratuita', estado: 'Trial', periodoPago: 'Mensual', fechaInicio: '2026-08-01', fechaVencimiento: '2026-08-31', estadoPago: 'Al día', politicaAcceso: 'Suspender al vencer', diasGracia: 0, admins: 1, usuariosActuales: 2, usuariosLimite: 2, usuarios: '2 / 2', ultimoAcceso: 'Hace 5 d', riesgo: 'Atención' },
]

export const seedPlans = [
  { id:'trial', nombre:'Prueba gratuita', descripcion:'Validación guiada antes de contratar.', clientes:8, precioMensual:0, maxUsuarios:2, maxProductos:50, maxAlmacenes:1, maxProveedores:5, maxClientes:10, maxOrdenesMes:20, almacenamientoGB:1, soporte:'email', apiAccess:false, multiEmpresa:false, exportAvanzada:false, reportesAvanzados:false, modulosIncluidos:['inventario','operaciones','despachos'], mrr:'S/ 0', limite:'2 usuarios · 1 almacén', color:'#6366f1', activo:true, esPublico:true },
  { id:'basico', nombre:'Básico', descripcion:'Operación esencial para equipos pequeños.', clientes:18, precioMensual:49, maxUsuarios:3, maxProductos:500, maxAlmacenes:2, maxProveedores:50, maxClientes:100, maxOrdenesMes:300, almacenamientoGB:5, soporte:'email', apiAccess:false, multiEmpresa:false, exportAvanzada:false, reportesAvanzados:false, modulosIncluidos:['inventario','operaciones','compras','despachos'], mrr:'S/ 882', limite:'3 usuarios · 2 almacenes', color:'#3b82f6', activo:true, esPublico:true },
  { id:'profesional', nombre:'Profesional', descripcion:'Operación integral, transporte y analítica.', clientes:24, precioMensual:99, maxUsuarios:10, maxProductos:2000, maxAlmacenes:5, maxProveedores:200, maxClientes:500, maxOrdenesMes:2000, almacenamientoGB:25, soporte:'prioritario', apiAccess:true, multiEmpresa:false, exportAvanzada:true, reportesAvanzados:true, modulosIncluidos:['inventario','operaciones','compras','despachos','transporte','ventas','reportes','panel-auditoria'], mrr:'S/ 2,376', limite:'10 usuarios · 5 almacenes', color:'#00c896', activo:true, esPublico:true },
  { id:'empresarial', nombre:'Empresarial', descripcion:'Escala ilimitada y cobertura funcional completa.', clientes:6, precioMensual:199, maxUsuarios:-1, maxProductos:-1, maxAlmacenes:-1, maxProveedores:-1, maxClientes:-1, maxOrdenesMes:-1, almacenamientoGB:200, soporte:'24/7', apiAccess:true, multiEmpresa:true, exportAvanzada:true, reportesAvanzados:true, modulosIncluidos:['inventario','operaciones','compras','despachos','transporte','ventas','contable','portal-b2b','reportes','panel-auditoria'], mrr:'S/ 1,194', limite:'Usuarios y almacenes ilimitados', color:'#f59e0b', activo:true, esPublico:true },
]

export const seedTenantAdmins = [
  { id: 'a1', tenant: 'Distribuciones Norte SAC', nombre: 'Andrea Salazar', email: 'andrea@norte.pe', tipo: 'Admin Owner', activo: true },
  { id: 'a2', tenant: 'Distribuciones Norte SAC', nombre: 'Luis Rojas', email: 'luis@norte.pe', tipo: 'Admin Tenant', activo: true },
  { id: 'a3', tenant: 'Logística Andina EIRL', nombre: 'María Castro', email: 'maria@andina.pe', tipo: 'Admin Owner', activo: false },
]

export const canAdminAuthenticate = admin => admin.activo === true

export const formatMoney = value => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(Number(value) || 0)
export const formatPlanLimit = plan => `${plan.maxUsuarios} usuarios · ${plan.maxAlmacenes == null ? 'almacenes ilimitados' : `${plan.maxAlmacenes} ${plan.maxAlmacenes === 1 ? 'almacén' : 'almacenes'}`}`
export const tenantUsage = tenant => `${tenant.usuariosActuales ?? 0} / ${tenant.usuariosLimite ?? 0}`

export function dashboardMetrics(tenants, plans) {
  return {
    totalTenants: tenants.length,
    activos: tenants.filter(item => item.estado === 'Activo').length,
    atencion: tenants.filter(item => item.riesgo === 'Atención' || ['Por vencer', 'Vencido'].includes(item.estado)).length,
    mrr: plans.reduce((total, plan) => total + (Number(plan.precioMensual) || 0) * (Number(plan.clientes) || 0), 0),
  }
}

export function validateEditor(kind, data, records) {
  const errors = {}
  if (!data.nombre?.trim()) errors.nombre = 'Este campo es obligatorio.'
  if (kind === 'admin' && !/^\S+@\S+\.\S+$/.test(data.email || '')) errors.email = 'Ingresa un correo válido.'
  if (kind === 'tenant' && records.tenants.some(item => item.id !== data.id && item.nombre.toLowerCase() === data.nombre.trim().toLowerCase())) errors.nombre = 'Ya existe un negocio con este nombre.'
  if (kind === 'tenant' && data.ruc && !/^\d{8,11}$/.test(data.ruc)) errors.ruc = 'Usa entre 8 y 11 dígitos.'
  if (kind === 'tenant' && data.email && !/^\S+@\S+\.\S+$/.test(data.email)) errors.email = 'Ingresa un correo válido.'
  if (kind === 'tenant' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.codigo || '')) errors.codigo = 'Usa minúsculas, números y guiones, sin espacios.'
  if (kind === 'tenant' && records.tenants.some(item => item.id !== data.id && item.codigo === data.codigo)) errors.codigo = 'Este código URL ya está registrado.'
  if (kind === 'tenant' && !data.fechaInicio) errors.fechaInicio = 'Selecciona la fecha de inicio.'
  if (kind === 'tenant' && !data.fechaVencimiento) errors.fechaVencimiento = 'Selecciona la fecha de vencimiento.'
  if (kind === 'tenant' && data.fechaInicio && data.fechaVencimiento && data.fechaVencimiento < data.fechaInicio) errors.fechaVencimiento = 'Debe ser igual o posterior a la fecha de inicio.'
  if (kind === 'plan' && records.plans.some(item => item.id !== data.id && item.nombre.toLowerCase() === data.nombre.trim().toLowerCase())) errors.nombre = 'Ya existe un plan con este nombre.'
  if (kind === 'admin' && records.admins.some(item => item.id !== data.id && item.email.toLowerCase() === (data.email || '').trim().toLowerCase())) errors.email = 'Este correo ya está registrado.'
  if (kind === 'admin') {
    const current = records.admins.find(item => item.id === data.id)
    const otherActiveOwners = records.admins.filter(item => item.id !== data.id && item.tenant === data.tenant && item.tipo === 'Admin Owner' && item.activo === true)
    if (data.activo === true && data.tipo === 'Admin Owner' && otherActiveOwners.length >= 2) errors.tipo = 'Este negocio ya tiene el máximo de 2 Admin Owner activos.'
    if (current?.activo === true && current.tipo === 'Admin Owner' && current.tenant === data.tenant && (data.activo !== true || data.tipo !== 'Admin Owner') && otherActiveOwners.length === 0) errors.activo = 'Debe permanecer al menos un Admin Owner activo en el negocio.'
    const tenant = records.tenants.find(item => item.nombre === data.tenant)
    const plan = records.plans.find(item => item.nombre === tenant?.plan)
    const activatesNewSeat = data.activo === true && current?.activo !== true
    if (activatesNewSeat && plan?.maxUsuarios != null && Number(tenant?.usuariosActuales || 0) >= Number(plan.maxUsuarios)) errors.activo = `El plan ${plan.nombre} alcanzó su límite de ${plan.maxUsuarios} usuarios activos.`
  }
  return errors
}

export function subscriptionAccess(tenant, today = new Date().toISOString().slice(0, 10)) {
  if (tenant.estado === 'Suspendido') return { allowed: false, label: tenant.suspensionManual ? 'Accesos suspendidos manualmente' : 'Accesos suspendidos por falta de pago' }
  if (['Cancelado', 'Archivado'].includes(tenant.estado)) return { allowed: false, label: 'Acceso desactivado' }
  if (tenant.estado === 'Gracia') return { allowed: true, label: 'Acceso activo durante el período de gracia' }
  if (tenant.estadoPago === 'Vencido' || (tenant.fechaVencimiento && tenant.fechaVencimiento < today)) return tenant.politicaAcceso === 'Control manual'
    ? { allowed: true, label: 'Acceso pendiente de revisión manual' }
    : { allowed: false, label: 'Acceso programado para suspensión' }
  if (!['Activo', 'Trial'].includes(tenant.estado)) return { allowed: false, label: 'Acceso pendiente de reactivación' }
  return { allowed: true, label: tenant.estado === 'Trial' ? 'Acceso Trial activo' : 'Acceso activo' }
}

export function deriveBusinessState(tenant, today = new Date().toISOString().slice(0, 10)) {
  if (['Cancelado', 'Archivado'].includes(tenant.estado)) return tenant.estado
  if (tenant.suspensionManual) return 'Suspendido'
  const expired = Boolean(tenant.fechaVencimiento && tenant.fechaVencimiento < today)
  if (tenant.estadoPago === 'Vencido' || expired) {
    if (tenant.politicaAcceso === 'Control manual') return 'Vencido'
    const graceDays = Math.max(0, Number(tenant.diasGracia) || 0)
    if (expired && graceDays > 0 && today <= addDaysToDate(tenant.fechaVencimiento, graceDays)) return 'Gracia'
    return 'Suspendido'
  }
  if (tenant.plan === 'Prueba gratuita') return 'Trial'
  return 'Activo'
}

export function addDaysToDate(date, days) {
  if (!date) return ''
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + Number(days || 0))
  return value.toISOString().slice(0, 10)
}

export function calculateSubscriptionEnd(startDate, period) {
  if (!startDate) return ''
  const months = { Mensual: 1, Trimestral: 3, Semestral: 6, Anual: 12 }[period]
  if (!months) return ''
  const [year, month, day] = startDate.split('-').map(Number)
  const target = new Date(Date.UTC(year, month - 1 + months, day))
  if (target.getUTCDate() !== day) target.setUTCDate(0)
  return target.toISOString().slice(0, 10)
}

export function toTenantSlug(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export const moduleTabs = {
  negocios: [
    ['listado', 'Todos'], ['ciclo', 'Ciclo de vida'], ['riesgos', 'Riesgos'],
  ],
  usuarios: [
    ['administradores', 'Administradores'], ['roles', 'Roles fijos'], ['asignaciones', 'Asignaciones'], ['sesiones', 'Sesiones'], ['reglas', 'Reglas'],
  ],
  soporte: [
    ['casos', 'Casos'], ['intervenciones', 'Intervenciones'], ['accesos', 'Accesos activos'], ['historial', 'Historial'], ['procedimiento', 'Procedimiento'],
  ],
  planes: [
    ['catalogo', 'Catálogo'], ['capacidades', 'Capacidades'], ['modulos', 'Módulos'], ['comparacion', 'Comparación'],
  ],
  suscripciones: [
    ['resumen', 'Resumen'], ['renovaciones', 'Renovaciones'], ['facturacion', 'Facturación y pagos'],
  ],
  operacion: [
    ['salud', 'Salud'], ['incidentes', 'Incidentes'], ['continuidad', 'Continuidad'],
  ],
  alertas: [['bandeja', 'Bandeja'], ['reglas', 'Reglas']],
  auditoria: [['eventos', 'Eventos'], ['exportaciones', 'Exportaciones'], ['retencion', 'Retención']],
  administradores: [['cuentas', 'Cuentas'], ['sesiones', 'Sesiones'], ['mfa', 'MFA'], ['actividad', 'Actividad']],
  configuracion: [['general', 'General'], ['integraciones', 'Integraciones'], ['experimentos', 'Funciones experimentales']],
  landing: [['contenido', 'Contenido'], ['seo', 'SEO y redes'], ['publicacion', 'Publicación']],
  analytics: [['resumen', 'Resumen'], ['adquisicion', 'Adquisición'], ['conversion', 'Conversión'], ['privacidad', 'Privacidad']],
}

const legacyRoutes = {
  renovaciones: 'suscripciones/renovaciones',
  facturacion: 'suscripciones/facturacion',
  limites: 'planes/capacidades',
  salud: 'operacion/salud',
}

export const routeAliases = {
  dashboard: 'resumen',
  negocios: 'tenants', 'negocios/listado': 'tenants', 'negocios/ciclo': 'tenants', 'negocios/riesgos': 'tenants',
  usuarios: 'accesos', 'usuarios/administradores': 'accesos', 'usuarios/roles': 'accesos', 'usuarios/asignaciones': 'accesos', 'usuarios/sesiones': 'accesos', 'usuarios/reglas': 'accesos',
  soporte: 'soporte', 'soporte/casos': 'soporte', 'soporte/intervenciones': 'soporte', 'soporte/accesos': 'soporte', 'soporte/historial': 'soporte', 'soporte/procedimiento': 'soporte',
  planes: 'plan-management', 'planes/catalogo': 'plan-management', 'planes/capacidades': 'plan-management', 'planes/modulos': 'plan-management', 'planes/comparacion': 'plan-management',
  suscripciones: 'suscripciones', 'suscripciones/resumen': 'suscripciones', 'suscripciones/renovaciones': 'suscripciones', 'suscripciones/facturacion': 'suscripciones',
  operacion: 'operacion', 'operacion/salud': 'operacion', 'operacion/incidentes': 'operacion', 'operacion/continuidad': 'operacion',
  alertas: 'alertas', 'alertas/bandeja': 'alertas', 'alertas/reglas': 'alertas',
  auditoria: 'auditoria', 'auditoria/eventos': 'auditoria', 'auditoria/exportaciones': 'auditoria', 'auditoria/retencion': 'auditoria',
  administradores: 'seguridad', 'administradores/cuentas': 'seguridad', 'administradores/sesiones': 'seguridad', 'administradores/mfa': 'seguridad', 'administradores/actividad': 'seguridad',
  configuracion: 'integracion', 'configuracion/general': 'integracion', 'configuracion/integraciones': 'integracion', 'configuracion/experimentos': 'integracion',
  landing: 'landing-management', 'landing/contenido': 'landing-management', 'landing/seo': 'landing-management', 'landing/publicacion': 'landing-management',
  analytics: 'marketing', 'analytics/resumen': 'marketing', 'analytics/adquisicion': 'marketing', 'analytics/conversion': 'marketing', 'analytics/privacidad': 'marketing',
}

const sectionToModule = {
  resumen: 'dashboard', tenants: 'negocios', accesos: 'usuarios', soporte: 'soporte', 'plan-management': 'planes', suscripciones: 'suscripciones', operacion: 'operacion', alertas: 'alertas', auditoria: 'auditoria', seguridad: 'administradores', integracion: 'configuracion', 'landing-management': 'landing', marketing: 'analytics',
}

export function parseRoute(value = '') {
  const raw = legacyRoutes[value.replace(/^#\/?/, '')] || value.replace(/^#\/?/, '') || 'dashboard'
  const parts = raw.split('/').filter(Boolean)
  const module = parts[0]

  if (module === 'negocios' && parts.length >= 3) {
    const tab = ['resumen', 'suscripcion', 'uso', 'administradores', 'seguridad', 'auditoria', 'soporte'].includes(parts[2]) ? parts[2] : 'resumen'
    return { route: `negocios/${parts[1]}/${tab}`, module, tab, tenantId: parts[1], section: 'tenant-detail' }
  }

  if (!routeAliases[module]) return { route: 'dashboard', module: 'dashboard', tab: null, section: 'resumen' }

  const tabs = moduleTabs[module] || []
  const requestedTab = parts[1]
  const tab = tabs.some(([id]) => id === requestedTab) ? requestedTab : tabs[0]?.[0] || null
  const route = tab ? `${module}/${tab}` : module
  return { route, module, tab, section: routeAliases[route] || routeAliases[module] }
}

export function defaultRouteFor(target) {
  const module = sectionToModule[target] || target
  return parseRoute(module).route
}

export function readRoute() {
  const raw = window.location.hash.replace(/^#\/?/, '')
  return routeAliases[raw] ? raw : parseRoute(raw).route
}

export function writeRoute(route) {
  const raw = route.replace(/^#\/?/, '')
  const next = `#/${routeAliases[raw] ? raw : parseRoute(raw).route}`
  if (window.location.hash !== next) window.history.pushState(null, '', next)
}
