import { test, expect } from '@playwright/test'
import { loginComoDemo } from './helpers'

// DESP-00001 (seed dlnorte) sin empaque inicial. Verifica la automatización
// nueva: confirmar el empaque ANTES de terminar el picking no avanza nada
// todavía (falta la condición de picking completo); pero en cuanto se
// confirma la última línea de picking, el despacho pasa a LISTO solo, sin
// tocar el botón manual "Marcar Listo" — DespachosService.marcarListo()
// queda de respaldo idempotente si igual se hace clic.
const NUMERO = 'DESP-00001'

test('confirmar empaque + terminar picking (en ese orden) avanza el despacho a LISTO automáticamente', async ({ page }) => {
  await loginComoDemo(page, /Admin DL Norte/)

  // Aprobar -> Iniciar Picking
  await page.goto('/despachos')
  await page.getByPlaceholder('Buscar número, cliente, guía...').fill(NUMERO)
  const fila = page.locator('tr', { hasText: NUMERO })
  await expect(fila).toBeVisible()
  await fila.getByRole('button', { name: 'Aprobar' }).click()
  await expect(fila.getByText('Aprobado', { exact: true })).toBeVisible({ timeout: 10_000 })
  await fila.getByRole('button', { name: 'Iniciar Picking' }).click()
  await expect(fila.getByText('Picking', { exact: true })).toBeVisible({ timeout: 10_000 })

  // Confirmar el empaque ANTES de que el picking esté completo — el módulo
  // de Empaque permite registrarlo en cualquier etapa activa a propósito.
  await page.goto('/empaque')
  await page.getByPlaceholder('Buscar número o cliente...').fill(NUMERO)
  const tarjeta = page.locator('div', { hasText: NUMERO }).filter({ hasText: 'Registrar empaque' })
  await tarjeta.getByRole('button', { name: 'Registrar empaque' }).click()
  const dialogEmpaque = page.getByRole('dialog')
  await expect(dialogEmpaque).toBeVisible()
  await dialogEmpaque.getByRole('button', { name: 'Confirmar empaque' }).click()
  await expect(page.getByText('Empaque confirmado')).toBeVisible({ timeout: 10_000 })

  // Todavía en Picking — falta la otra condición (picking completo).
  await page.goto('/despachos')
  await page.getByPlaceholder('Buscar número, cliente, guía...').fill(NUMERO)
  await expect(fila.getByText('Picking', { exact: true })).toBeVisible()

  // Termina el picking: confirma todas las líneas SIN tocar "Marcar Listo".
  await fila.getByRole('button', { name: 'Marcar Listo' }).click()
  const pickingDialog = page.getByRole('dialog', { name: /^Picking —/ })
  await expect(pickingDialog).toBeVisible()
  // Espera a que cargue la lista (usePickingByDespacho) antes de contar botones.
  await expect(pickingDialog.getByRole('button', { name: 'Confirmar' }).first()).toBeVisible({ timeout: 10_000 })

  let pendientes = await pickingDialog.getByRole('button', { name: 'Confirmar' }).count()
  expect(pendientes).toBeGreaterThan(0)
  while (pendientes > 0) {
    await pickingDialog.getByRole('button', { name: 'Confirmar' }).first().click()
    await expect(pickingDialog.getByRole('button', { name: 'Confirmar' })).toHaveCount(pendientes - 1, { timeout: 10_000 })
    pendientes = await pickingDialog.getByRole('button', { name: 'Confirmar' }).count()
  }

  // Cierra el modal SIN clic en "Marcar Listo" — si el auto-avance funcionó,
  // la fila ya debe mostrar LISTO por sí sola (invalidación de ['despachos']
  // disparada por confirmarLinea()).
  await pickingDialog.getByRole('button', { name: 'Cerrar' }).last().click()
  await expect(fila.getByText('Listo', { exact: true })).toBeVisible({ timeout: 10_000 })
  await expect(fila.getByRole('button', { name: 'Despachar' })).toBeVisible()
})
