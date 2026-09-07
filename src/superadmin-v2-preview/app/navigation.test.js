import { beforeEach, describe, expect, it } from 'vitest'
import { MODULES, readLocation, writeLocation } from './navigation'

describe('navegación SuperAdmin V2', () => {
  beforeEach(() => { window.location.hash = '' })

  it('abre el dashboard cuando la ruta no existe', () => {
    window.location.hash = '#/ruta-inexistente'
    expect(readLocation()).toEqual({ module:'dashboard', tab:'resumen' })
  })

  it('usa la pestaña predeterminada de cada módulo', () => {
    window.location.hash = '#/usuarios'
    expect(readLocation()).toEqual({ module:'usuarios', tab:'administradores-tenant' })
  })

  it('conserva una pestaña válida en la URL', () => {
    window.location.hash = '#/usuarios/accesos'
    expect(readLocation()).toEqual({ module:'usuarios', tab:'accesos' })
  })

  it('corrige una pestaña que no pertenece al módulo', () => {
    window.location.hash = '#/soporte/facturacion'
    expect(readLocation()).toEqual({ module:'soporte', tab:'casos' })
  })

  it('genera rutas compartibles para una pestaña', () => {
    writeLocation('suscripciones', 'facturacion')
    expect(window.location.hash).toBe('#/suscripciones/facturacion')
  })

  it('todos los módulos declaran pestaña inicial válida', () => {
    for (const module of Object.values(MODULES)) {
      expect(module.tabs.map(([id]) => id)).toContain(module.defaultTab)
    }
  })
})
