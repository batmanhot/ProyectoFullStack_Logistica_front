import { test, expect } from '@playwright/test'
import { loginComoDemo } from './helpers'
import { getFieldControlE2E } from './helpers-fields'

// DESP-00012 (seed dlnorte): LISTO, con una parada "fantasma" en RUTA-00004
// (CANCELADA) — no bloquea una asignación nueva (ver comentario en
// DatosService.sembrarDlNorte: "no se ve afectado"). DESP-00006/07 no sirven
// acá porque ya están en RUTA-00001 (PROGRAMADA, activa).
test('ciclo completo de Ruta — crear, iniciar, entregar parada y cerrar', async ({ page }) => {
  await loginComoDemo(page, /Admin DL Norte/)
  await page.goto('/transportes')

  await page.getByRole('button', { name: 'Nueva Ruta' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await getFieldControlE2E(dialog, 'Transportista *').selectOption({ label: 'Carlos Ríos Huanca' })
  await getFieldControlE2E(dialog, 'Almacén de Origen').selectOption({ label: 'Almacén Central' })
  await dialog.getByRole('checkbox', { name: /DESP-00012/ }).check()
  await dialog.getByRole('button', { name: 'Programar Ruta' }).click()

  const toast = page.getByText(/Ruta RUTA-\d+ programada/)
  await expect(toast).toBeVisible({ timeout: 10_000 })
  const numero = (await toast.innerText()).match(/RUTA-\d+/)![0]

  await page.getByPlaceholder('Buscar número, transportista...').fill(numero)
  const fila = page.locator('tr', { hasText: numero })
  await expect(fila).toBeVisible()
  await expect(fila.getByText('Programada', { exact: true })).toBeVisible()

  // PROGRAMADA -> EN_RUTA
  await fila.getByRole('button', { name: 'Iniciar' }).click()
  await expect(fila.getByText('En Ruta', { exact: true })).toBeVisible({ timeout: 10_000 })

  // Gestionar parada: PENDIENTE -> EN_CAMINO -> ENTREGADO
  await fila.getByRole('button', { name: 'Gestionar' }).click()
  const detalle = page.getByRole('dialog')
  await expect(detalle).toBeVisible()
  await detalle.getByRole('button', { name: 'En Camino' }).click()
  await expect(detalle.getByText('En camino', { exact: true })).toBeVisible({ timeout: 10_000 })
  await detalle.getByRole('button', { name: 'Confirmar Entrega' }).click()
  await expect(detalle.getByText('1/1 entregas')).toBeVisible({ timeout: 10_000 })

  // EN_RUTA -> COMPLETADA
  await detalle.getByRole('button', { name: 'Cerrar Ruta' }).click()
  await expect(detalle).toBeHidden()
  await expect(fila.getByText('Completada', { exact: true })).toBeVisible({ timeout: 10_000 })
})
