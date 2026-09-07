export const PLAN_MODULES = [
  { key:'inventario', label:'Inventario y operaciones', short:'Inventario', desc:'Stock, kardex, inventario físico, lotes y previsión' },
  { key:'operaciones', label:'Operaciones de almacén', short:'Almacén', desc:'Entradas, salidas, transferencias, ajustes y devoluciones' },
  { key:'compras', label:'Compras', short:'Compras', desc:'Órdenes de compra, cotizaciones y proveedores' },
  { key:'despachos', label:'Despachos', short:'Despachos', desc:'Clientes, pedidos, picking, empaque y entregas' },
  { key:'transporte', label:'Transporte', short:'Transporte', desc:'Rutas, flota y mantenimiento', requires:['despachos'] },
  { key:'ventas', label:'Ventas', short:'Ventas', desc:'Proformas, listas de precios y cuentas por cobrar' },
  { key:'contable', label:'Contable', short:'Contable', desc:'SUNAT, reportes contables y financiero' },
  { key:'portal-b2b', label:'Portal Proveedores B2B', short:'Portal B2B', desc:'Acceso externo para proveedores', requires:['compras'] },
  { key:'reportes', label:'Reportes y KPIs', short:'Reportes', desc:'Dashboards e indicadores operativos' },
  { key:'panel-auditoria', label:'Panel de Auditoría', short:'Auditoría', desc:'Bitácora, discrepancias y conciliación en solo lectura', requires:['inventario','operaciones'] },
]

export const PLAN_PRESETS = [
  { id:'evaluacion', nombre:'Prueba guiada', targetPlanId:'trial', targetPlanName:'Prueba gratuita', description:'Validación acotada antes de contratar.', values:{ maxUsuarios:2, maxProductos:50, maxAlmacenes:1, maxProveedores:5, maxClientes:10, maxOrdenesMes:20, almacenamientoGB:1, soporte:'email', exportAvanzada:false, reportesAvanzados:false, modulosIncluidos:['inventario','operaciones','despachos'] } },
  { id:'micro', nombre:'Microempresa', targetPlanId:'basico', targetPlanName:'Básico', description:'Operación esencial para equipos de 1–2 personas.', values:{ maxUsuarios:2, maxProductos:50, maxAlmacenes:1, maxProveedores:10, maxClientes:30, maxOrdenesMes:50, almacenamientoGB:1, soporte:'email', exportAvanzada:false, reportesAvanzados:false, modulosIncluidos:['inventario','operaciones','despachos'] } },
  { id:'pequena', nombre:'Pequeña empresa', targetPlanId:'basico', targetPlanName:'Básico', description:'Más capacidad e incorporación de compras.', values:{ maxUsuarios:5, maxProductos:500, maxAlmacenes:2, maxProveedores:50, maxClientes:150, maxOrdenesMes:300, almacenamientoGB:5, soporte:'email', exportAvanzada:false, reportesAvanzados:false, modulosIncluidos:['inventario','operaciones','compras','despachos'] } },
  { id:'crecimiento', nombre:'En crecimiento', targetPlanId:'profesional', targetPlanName:'Profesional', description:'Operación integral, transporte y analítica.', values:{ maxUsuarios:20, maxProductos:5000, maxAlmacenes:5, maxProveedores:250, maxClientes:1500, maxOrdenesMes:3000, almacenamientoGB:25, soporte:'prioritario', exportAvanzada:true, reportesAvanzados:true, modulosIncluidos:['inventario','operaciones','compras','despachos','transporte','reportes','panel-auditoria'] } },
  { id:'corporativo', nombre:'Corporativo', targetPlanId:'empresarial', targetPlanName:'Empresarial', description:'Escala ilimitada y cobertura funcional completa.', values:{ maxUsuarios:-1, maxProductos:-1, maxAlmacenes:-1, maxProveedores:-1, maxClientes:-1, maxOrdenesMes:-1, almacenamientoGB:100, soporte:'24/7', exportAvanzada:true, reportesAvanzados:true, modulosIncluidos:PLAN_MODULES.map(module => module.key) } },
]

export function includeDependencies(modules, moduleKey) {
  const selected = new Set(modules)
  selected.add(moduleKey)
  const visit = key => {
    const module = PLAN_MODULES.find(item => item.key === key)
    for (const dependency of module?.requires || []) {
      if (!selected.has(dependency)) { selected.add(dependency); visit(dependency) }
    }
  }
  visit(moduleKey)
  return [...selected]
}

export function dependentsOf(modules, moduleKey) {
  return PLAN_MODULES.filter(item => modules.includes(item.key) && item.requires?.includes(moduleKey)).map(item => item.key)
}

export function analyzePlanChange(original, draft, businesses = []) {
  const before = original?.modulosIncluidos || []
  const after = draft?.modulosIncluidos || []
  const removedModules = before.filter(module => !after.includes(module))
  const loweredLimits = ['maxUsuarios','maxProductos','maxAlmacenes','maxProveedores','maxClientes','maxOrdenesMes']
    .filter(key => original?.[key] !== draft?.[key] && draft?.[key] !== -1 && (original?.[key] === -1 || Number(draft?.[key]) < Number(original?.[key])))
  const affectedBusinesses = businesses.filter(item => item.plan === original?.id)
  return { removedModules, loweredLimits, affectedBusinesses }
}

export const displayLimit = value => Number(value) === -1 ? 'Ilimitado' : String(value ?? '—')
