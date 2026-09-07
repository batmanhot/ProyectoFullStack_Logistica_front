import { beforeEach, describe, expect, it } from 'vitest'
import { addDaysToDate, calculateSubscriptionEnd, canAdminAuthenticate, dashboardMetrics, defaultRouteFor, deriveBusinessState, formatPlanLimit, parseRoute, readRoute, routeAliases, subscriptionAccess, toTenantSlug, validateEditor, writeRoute } from './domain'

describe('dominio de SuperAdmin V2', () => {
  beforeEach(() => window.history.replaceState(null, '', '/'))

  it('calcula indicadores desde los registros actuales', () => {
    const tenants = [
      { estado: 'Activo', riesgo: 'Normal' },
      { estado: 'Por vencer', riesgo: 'Atención' },
    ]
    const plans = [{ precioMensual: 100, clientes: 3 }]
    expect(dashboardMetrics(tenants, plans)).toEqual({ totalTenants: 2, activos: 1, atencion: 1, mrr: 300 })
  })

  it('mantiene límites como datos estructurados', () => {
    expect(formatPlanLimit({ maxUsuarios: 20, maxAlmacenes: 5 })).toBe('20 usuarios · 5 almacenes')
    expect(formatPlanLimit({ maxUsuarios: 60, maxAlmacenes: null })).toContain('ilimitados')
  })

  it('rechaza duplicados y correos inválidos', () => {
    const records = {
      tenants: [{ id: '1', nombre: 'Empresa Uno' }],
      plans: [{ id: 'p1', nombre: 'Básico' }],
      admins: [{ id: 'a1', email: 'owner@empresa.pe' }],
    }
    expect(validateEditor('tenant', { nombre: 'empresa uno' }, records).nombre).toMatch(/existe/)
    expect(validateEditor('plan', { nombre: 'Básico' }, records).nombre).toMatch(/existe/)
    expect(validateEditor('admin', { nombre: 'Ana', email: 'correo-invalido' }, records).email).toMatch(/válido/)
  })

  it('genera y valida el código URL de un negocio', () => {
    expect(toTenantSlug('Comercial Pacífico S.A.C.')).toBe('comercial-pacifico-s-a-c')
    const records = { tenants: [], plans: [], admins: [] }
    expect(validateEditor('tenant', { nombre:'Empresa', codigo:'Código inválido' }, records).codigo).toMatch(/minúsculas/)
    expect(validateEditor('tenant', { nombre:'Empresa', codigo:'empresa-01', ruc:'20123456789', email:'contacto@empresa.pe', fechaInicio:'2026-08-01', fechaVencimiento:'2026-09-01' }, records)).toEqual({})
  })

  it('calcula la vigencia y anticipa el bloqueo por falta de pago', () => {
    expect(calculateSubscriptionEnd('2026-08-15', 'Trimestral')).toBe('2026-11-15')
    expect(subscriptionAccess({ estado:'Activo', estadoPago:'Vencido', politicaAcceso:'Suspender al vencer' }, '2026-08-30')).toEqual({ allowed:false, label:'Acceso programado para suspensión' })
    expect(subscriptionAccess({ estado:'Activo', estadoPago:'Vencido', politicaAcceso:'Control manual' }, '2026-08-30').allowed).toBe(true)
  })

  it('deriva el estado del negocio desde el plan y la vigencia', () => {
    expect(deriveBusinessState({ plan:'Prueba gratuita', estadoPago:'Al día', fechaVencimiento:'2026-09-30' }, '2026-08-30')).toBe('Trial')
    expect(deriveBusinessState({ plan:'Profesional', estadoPago:'Al día', fechaVencimiento:'2026-09-30' }, '2026-08-30')).toBe('Activo')
    expect(deriveBusinessState({ plan:'Profesional', estadoPago:'Vencido', fechaVencimiento:'2026-09-30' }, '2026-08-30')).toBe('Suspendido')
  })

  it('mantiene los accesos bloqueados hasta volver a Activo o Trial', () => {
    expect(subscriptionAccess({ estado:'Suspendido', estadoPago:'Vencido' }, '2026-08-30').allowed).toBe(false)
    expect(subscriptionAccess({ estado:'Activo', estadoPago:'Al día', fechaVencimiento:'2026-09-30' }, '2026-08-30').allowed).toBe(true)
    expect(subscriptionAccess({ estado:'Trial', estadoPago:'Al día', fechaVencimiento:'2026-09-30' }, '2026-08-30').allowed).toBe(true)
    expect(subscriptionAccess({ estado:'Vencido', estadoPago:'Al día', fechaVencimiento:'2026-09-30' }, '2026-08-30').allowed).toBe(false)
  })

  it('aplica los días de gracia antes de suspender por falta de pago', () => {
    expect(addDaysToDate('2026-08-30', 3)).toBe('2026-09-02')
    const contract = { plan:'Profesional', estadoPago:'Pendiente', fechaVencimiento:'2026-08-30', politicaAcceso:'Suspender al vencer', diasGracia:3 }
    expect(deriveBusinessState(contract, '2026-09-01')).toBe('Gracia')
    expect(subscriptionAccess({ ...contract, estado:'Gracia' }, '2026-09-01').allowed).toBe(true)
    expect(deriveBusinessState(contract, '2026-09-03')).toBe('Suspendido')
    expect(deriveBusinessState({ ...contract, diasGracia:0 }, '2026-08-31')).toBe('Suspendido')
  })

  it('permite suspender manualmente aunque el contrato esté pagado y vigente', () => {
    const contract = { plan:'Profesional', estadoPago:'Al día', fechaVencimiento:'2026-09-30', suspensionManual:true }
    expect(deriveBusinessState(contract, '2026-08-30')).toBe('Suspendido')
    expect(subscriptionAccess({ ...contract, estado:'Suspendido' }, '2026-08-30')).toEqual({ allowed:false, label:'Accesos suspendidos manualmente' })
    expect(deriveBusinessState({ ...contract, suspensionManual:false }, '2026-08-30')).toBe('Activo')
  })

  it('solo permite autenticar administradores activos', () => {
    expect(canAdminAuthenticate({ activo:true })).toBe(true)
    expect(canAdminAuthenticate({ activo:false })).toBe(false)
    expect(canAdminAuthenticate({})).toBe(false)
  })

  it('limita owners activos y respeta la capacidad de usuarios del plan', () => {
    const records = {
      tenants: [{ nombre:'Empresa Uno', plan:'Básico', usuariosActuales:2 }],
      plans: [{ nombre:'Básico', maxUsuarios:3 }],
      admins: [
        { id:'a1', tenant:'Empresa Uno', tipo:'Admin Owner', activo:true, email:'owner1@empresa.pe' },
        { id:'a2', tenant:'Empresa Uno', tipo:'Admin Owner', activo:true, email:'owner2@empresa.pe' },
      ],
    }
    const thirdOwner = validateEditor('admin', { nombre:'Tercer Owner', tenant:'Empresa Uno', tipo:'Admin Owner', activo:true, email:'owner3@empresa.pe' }, records)
    expect(thirdOwner.tipo).toMatch(/máximo de 2/)
    const fullRecords = { ...records, tenants:[{ nombre:'Empresa Uno', plan:'Básico', usuariosActuales:3 }] }
    const newAdmin = validateEditor('admin', { nombre:'Admin', tenant:'Empresa Uno', tipo:'Admin Tenant', activo:true, email:'admin@empresa.pe' }, fullRecords)
    expect(newAdmin.activo).toMatch(/límite de 3/)
    expect(validateEditor('admin', { nombre:'Admin', tenant:'Empresa Uno', tipo:'Admin Tenant', activo:false, email:'admin@empresa.pe' }, fullRecords).activo).toBeUndefined()
  })

  it('impide desactivar el último Owner activo', () => {
    const records = {
      tenants: [{ nombre:'Empresa Uno', plan:'Básico', usuariosActuales:1 }],
      plans: [{ nombre:'Básico', maxUsuarios:3 }],
      admins: [{ id:'a1', tenant:'Empresa Uno', tipo:'Admin Owner', activo:true, email:'owner@empresa.pe' }],
    }
    const errors = validateEditor('admin', { id:'a1', nombre:'Owner', tenant:'Empresa Uno', tipo:'Admin Owner', activo:false, email:'owner@empresa.pe' }, records)
    expect(errors.activo).toMatch(/al menos un Admin Owner activo/)
  })

  it('sincroniza una ruta válida con el hash', () => {
    writeRoute('negocios')
    expect(readRoute()).toBe('negocios')
    expect(routeAliases[readRoute()]).toBe('tenants')
  })

  it('vuelve al dashboard ante rutas desconocidas', () => {
    window.history.replaceState(null, '', '#/no-existe')
    expect(readRoute()).toBe('dashboard')
  })

  it('resuelve pestañas y detalle de negocio con URL propia', () => {
    expect(defaultRouteFor('usuarios')).toBe('usuarios/administradores')
    expect(parseRoute('planes/comparacion')).toMatchObject({ module:'planes', tab:'comparacion', section:'plan-management' })
    expect(parseRoute('negocios/t1/seguridad')).toMatchObject({ module:'negocios', tenantId:'t1', tab:'seguridad', section:'tenant-detail' })
  })
})
