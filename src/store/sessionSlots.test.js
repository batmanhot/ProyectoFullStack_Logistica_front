import { describe, it, expect } from 'vitest'
import {
  SESSION_KEY_TENANT,
  SESSION_KEY_ADMIN,
  esRutaSuperAdmin,
  slotParaSesion,
  slotParaRuta,
} from './sessionSlots'

describe('sessionSlots', () => {
  it('las dos claves son distintas y la de tenant sigue siendo sp_session', () => {
    expect(SESSION_KEY_TENANT).toBe('sp_session') // no desloguear a los tenants ya logueados
    expect(SESSION_KEY_ADMIN).not.toBe(SESSION_KEY_TENANT)
  })

  describe('esRutaSuperAdmin', () => {
    it('reconoce el espacio del SuperAdmin / Admin SaaS', () => {
      expect(esRutaSuperAdmin('/superadmin')).toBe(true)
      expect(esRutaSuperAdmin('/superadmin/negocios')).toBe(true)
      expect(esRutaSuperAdmin('/admin-saas')).toBe(true)
      expect(esRutaSuperAdmin('/admin-saas/planes')).toBe(true)
    })

    it('el resto de la app NO es ruta de SuperAdmin', () => {
      expect(esRutaSuperAdmin('/')).toBe(false)
      expect(esRutaSuperAdmin('/app/carbolec')).toBe(false)
      expect(esRutaSuperAdmin('/despachos')).toBe(false)
      expect(esRutaSuperAdmin('/login')).toBe(false)
      expect(esRutaSuperAdmin('/superadministracion')).toBe(false) // no es prefijo válido
      expect(esRutaSuperAdmin('')).toBe(false)
    })
  })

  describe('slotParaSesion', () => {
    it('saas_admin → slot admin; cualquier otro rol → slot tenant', () => {
      expect(slotParaSesion({ rol: { codigo: 'saas_admin' } })).toBe(SESSION_KEY_ADMIN)
      expect(slotParaSesion({ rol: { codigo: 'admin' } })).toBe(SESSION_KEY_TENANT)
      expect(slotParaSesion({ rol: { codigo: 'almacenero' } })).toBe(SESSION_KEY_TENANT)
      expect(slotParaSesion(null)).toBe(SESSION_KEY_TENANT)
      expect(slotParaSesion({})).toBe(SESSION_KEY_TENANT)
    })
  })

  describe('slotParaRuta', () => {
    it('elige el slot por la URL de la pestaña, no por la última sesión escrita', () => {
      expect(slotParaRuta('/superadmin')).toBe(SESSION_KEY_ADMIN)
      expect(slotParaRuta('/admin-saas')).toBe(SESSION_KEY_ADMIN)
      expect(slotParaRuta('/')).toBe(SESSION_KEY_TENANT)
      expect(slotParaRuta('/app/carbolec')).toBe(SESSION_KEY_TENANT)
      expect(slotParaRuta('/despachos')).toBe(SESSION_KEY_TENANT)
    })
  })
})
