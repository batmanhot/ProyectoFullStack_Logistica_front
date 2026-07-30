import { test, expect } from '@playwright/test'
import { loginComoDemo } from './helpers'
import { getFieldControlE2E } from './helpers-fields'
import { ORG_CODE } from './config'
import { checkA11y } from './a11y'

const SUFIJO = Date.now()
const ROL_LABEL = `QA Sin Permisos E2E ${SUFIJO}`
const EMAIL = `qa403.${SUFIJO}@test.local`
const PASSWORD = 'Password123'

test('un rol sin un permiso recibe 403 al consultar el módulo correspondiente', async ({ page }) => {
  await loginComoDemo(page, /Admin DL Norte/)
  await page.goto('/usuarios')
  await checkA11y(page, 'Usuarios — listado')

  // Rol nuevo con el mínimo por defecto (solo 'dashboard') — a propósito no
  // se le da el permiso 'panel-auditoria', que gatea la clase completa del
  // controller (src/panel-auditoria/panel-auditoria.controller.ts).
  await page.getByRole('button', { name: 'Roles y Permisos' }).click()
  await page.getByRole('button', { name: 'Nuevo Rol' }).click()
  const dialogRol = page.getByRole('dialog')
  await dialogRol.getByPlaceholder('Ej: Vendedor, Auditor...').fill(ROL_LABEL)
  await dialogRol.getByRole('button', { name: 'Guardar Rol' }).click()
  await expect(page.getByText('Rol creado')).toBeVisible({ timeout: 10_000 })

  // Usuario nuevo con ese rol
  await page.getByRole('button', { name: 'Usuarios' }).click()
  await page.getByRole('button', { name: 'Nuevo Usuario' }).click()
  const dialogUsuario = page.getByRole('dialog')
  await dialogUsuario.getByPlaceholder('Juan Pérez').fill('QA E2E Sin Permisos')
  await dialogUsuario.getByPlaceholder('usuario@empresa.pe').fill(EMAIL)
  await dialogUsuario.getByPlaceholder('Mínimo 8 caracteres').fill(PASSWORD)
  await getFieldControlE2E(dialogUsuario, 'Rol *').selectOption({ label: ROL_LABEL })
  await dialogUsuario.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Usuario creado')).toBeVisible({ timeout: 10_000 })

  // Logout y login como el usuario recién creado
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await page.waitForURL(/\/(login)?$/)
  await page.goto(`/app/${ORG_CODE}`)
  await page.getByPlaceholder('usuario@empresa.pe').fill(EMAIL)
  await page.getByPlaceholder('••••••••').or(page.locator('input[type="password"]')).fill(PASSWORD)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await page.waitForURL('/')

  // El nuevo rol no tiene 'panel-auditoria' → el GET debe volver 403
  const resp403 = page.waitForResponse(r => r.url().includes('/panel-auditoria/') && r.request().method() === 'GET')
  await page.goto('/panel-auditoria')
  const resp = await resp403
  expect(resp.status()).toBe(403)
})
