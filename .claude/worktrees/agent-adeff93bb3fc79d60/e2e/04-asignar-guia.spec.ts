import { test, expect } from '@playwright/test'
import { loginComoDemo } from './helpers'
import { checkA11y } from './a11y'

// DESP-00005 (seed dlnorte): DESPACHADO sin guiaNumero — sembrado a propósito
// para ejercitar este botón (ver comentario en DatosService.sembrarDlNorte).
const NUMERO = 'DESP-00005'

test('asignar guía de remisión a un despacho que salió sin ella', async ({ page }) => {
  await loginComoDemo(page, /Admin DL Norte/)
  await page.goto('/despachos')

  await page.getByPlaceholder('Buscar número, cliente, guía...').fill(NUMERO)
  const fila = page.locator('tr', { hasText: NUMERO })
  await expect(fila).toBeVisible()
  await expect(fila.locator('td').nth(6)).toHaveText('—') // columna Guía, sin asignar

  await fila.getByRole('button', { name: 'Asignar guía de remisión' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await checkA11y(page, 'Despachos — modal Asignar Guía')

  const input = dialog.locator('input[type="text"], input:not([type])').first()
  await expect(input).not.toHaveValue('') // prellenado con generarNumDoc('GR')
  await dialog.getByRole('button', { name: 'Asignar Guía' }).click()

  await expect(dialog).toBeHidden()
  await expect(fila.locator('td').nth(6)).not.toHaveText('—')
  await expect(fila.getByRole('button', { name: 'PDF / Compartir' })).toBeVisible()
})
