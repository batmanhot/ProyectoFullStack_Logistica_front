import { describe, expect, it } from 'vitest'
import { analyzePlanChange, dependentsOf, includeDependencies, PLAN_PRESETS } from './planCapabilities'

describe('capacidades comerciales de planes', () => {
  it('activa las dependencias de módulos automáticamente', () => {
    expect(includeDependencies([], 'transporte')).toEqual(expect.arrayContaining(['transporte', 'despachos']))
    expect(includeDependencies([], 'panel-auditoria')).toEqual(expect.arrayContaining(['panel-auditoria', 'inventario', 'operaciones']))
  })

  it('impide retirar un módulo requerido por otro activo', () => {
    expect(dependentsOf(['compras', 'portal-b2b'], 'compras')).toEqual(['portal-b2b'])
  })

  it('calcula empresas y capacidades afectadas', () => {
    const original = { id:'profesional', maxUsuarios:20, maxProductos:-1, modulosIncluidos:['inventario','reportes'] }
    const draft = { maxUsuarios:5, maxProductos:500, modulosIncluidos:['inventario'] }
    const result = analyzePlanChange(original, draft, [{ id:'n1', plan:'profesional' }, { id:'n2', plan:'basico' }])
    expect(result.removedModules).toEqual(['reportes'])
    expect(result.loweredLimits).toEqual(expect.arrayContaining(['maxUsuarios','maxProductos']))
    expect(result.affectedBusinesses).toHaveLength(1)
  })

  it('ofrece perfiles desde microempresa hasta corporativo', () => {
    expect(PLAN_PRESETS.map(item => item.id)).toEqual(['evaluacion','micro','pequena','crecimiento','corporativo'])
    expect(PLAN_PRESETS.find(item => item.id === 'micro').targetPlanId).toBe('basico')
    expect(PLAN_PRESETS.find(item => item.id === 'crecimiento').targetPlanId).toBe('profesional')
    expect(PLAN_PRESETS.at(-1).values.maxUsuarios).toBe(-1)
  })
})
