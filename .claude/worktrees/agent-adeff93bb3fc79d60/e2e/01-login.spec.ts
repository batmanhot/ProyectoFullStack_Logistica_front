import { test, expect } from '@playwright/test'
import { ORG_CODE } from './config'
import { checkA11y } from './a11y'

test.describe('Login', () => {
  test('código de organización inválido muestra error y no avanza', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('ej: dlnorte, acme...').fill('organizacion-inexistente-xyz')
    await page.getByRole('button', { name: 'Continuar' }).click()

    // res.error del backend (401 "Empresa no encontrada o inactiva") pisa el
    // fallback genérico de Login.jsx — ver api.js: normaliza {statusCode,message}
    await expect(page.getByText(/Empresa no encontrada o inactiva/)).toBeVisible()
    await checkA11y(page, 'Login — paso código de organización')
  })

  test('acceso rápido con usuario demo lleva al Dashboard con datos reales', async ({ page }) => {
    await page.goto(`/app/${ORG_CODE}`)

    // Paso 2: bloque de "Modo desarrollo — acceso rápido" con un botón por usuario demo
    await expect(page.getByText('Modo desarrollo — acceso rápido')).toBeVisible()
    await page.getByRole('button', { name: /Admin DL Norte/ }).click()

    await page.waitForURL('/', { timeout: 30_000 })
    await expect(page.getByText(/Bienvenido/)).toBeVisible()
    // El Dashboard trae KPIs reales del backend, no placeholders
    await expect(page.locator('body')).not.toContainText('No existe ninguna organización')
    await checkA11y(page, 'Dashboard')
  })
})
