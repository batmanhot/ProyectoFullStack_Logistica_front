import { test, expect } from '@playwright/test'
import { loginComoDemo } from './helpers'
import { checkA11y } from './a11y'

// DESP-00001 (seed dlnorte, ver DatosService.sembrarDlNorte): PEDIDO, 5x
// OFI-003 (Archivador) + 3x LIMP-006. Sigue el ciclo completo de estados y
// confirma que el stock de OFI-003 baja en Inventario recién al despachar
// (antes solo se reserva — DespachosService.ajustarReserva vs. despachar()).
const NUMERO = 'DESP-00001'
const SKU_A_VERIFICAR = 'OFI-003'
const CANTIDAD_DESPACHADA = 5

async function leerStock(page: import('@playwright/test').Page, sku: string) {
  await page.goto('/inventario')
  await page.getByPlaceholder('Buscar SKU, nombre...').fill(sku)
  const fila = page.locator('tr', { hasText: sku })
  await expect(fila).toBeVisible()
  const texto = await fila.locator('td').nth(3).innerText() // columna Stock Actual
  return Number(texto.match(/-?\d+(\.\d+)?/)?.[0])
}

test('ciclo completo de Despacho — de Pedido a Entregado, con baja real de stock', async ({ page }) => {
  await loginComoDemo(page, /Admin DL Norte/)

  const stockAntes = await leerStock(page, SKU_A_VERIFICAR)

  await page.goto('/despachos')
  const buscar = page.getByPlaceholder('Buscar número, cliente, guía...')
  await buscar.fill(NUMERO)
  const fila = page.locator('tr', { hasText: NUMERO })
  await expect(fila).toBeVisible()
  await checkA11y(page, 'Despachos — listado')

  // PEDIDO -> APROBADO -> PICKING (transiciones directas)
  for (const [accion, estadoEsperado] of [
    ['Aprobar', 'Aprobado'],
    ['Iniciar Picking', 'Picking'],
  ] as const) {
    await fila.getByRole('button', { name: accion }).click()
    await expect(fila.getByText(estadoEsperado, { exact: true })).toBeVisible({ timeout: 10_000 })
  }

  // PICKING -> LISTO ya no es directo: "Marcar Listo" abre la lista de picking
  // generada por DespachosService.iniciarPicking() y exige confirmar el 100%
  // de las líneas antes de habilitar el avance (módulo de Picking, Fase 1).
  await fila.getByRole('button', { name: 'Marcar Listo' }).click()
  const pickingDialog = page.getByRole('dialog', { name: /^Picking —/ })
  await expect(pickingDialog).toBeVisible()
  await checkA11y(page, 'Despachos — modal Picking')

  const marcarListoModal = pickingDialog.getByRole('button', { name: 'Marcar Listo' })
  await expect(marcarListoModal).toBeDisabled()

  // Confirma cada línea con la cantidad sugerida por defecto (input ya viene con cantidadRequerida).
  let pendientes = await pickingDialog.getByRole('button', { name: 'Confirmar' }).count()
  expect(pendientes).toBeGreaterThan(0)
  while (pendientes > 0) {
    await pickingDialog.getByRole('button', { name: 'Confirmar' }).first().click()
    await expect(pickingDialog.getByRole('button', { name: 'Confirmar' })).toHaveCount(pendientes - 1, { timeout: 10_000 })
    pendientes = await pickingDialog.getByRole('button', { name: 'Confirmar' }).count()
  }

  await expect(marcarListoModal).toBeEnabled()
  await marcarListoModal.click()
  await expect(fila.getByText('Listo', { exact: true })).toBeVisible({ timeout: 10_000 })

  // LISTO -> DESPACHADO
  await fila.getByRole('button', { name: 'Despachar' }).click()
  await expect(fila.getByText('Despachado', { exact: true })).toBeVisible({ timeout: 10_000 })

  // DESPACHADO -> ENTREGADO: abre ModalEvidencia, exige receptor
  await fila.getByRole('button', { name: 'Confirmar Entrega' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await checkA11y(page, 'Despachos — modal Confirmar Entrega')
  await dialog.getByPlaceholder('Nombre completo de quien recibe').fill('Recepción E2E')
  await dialog.getByRole('button', { name: 'Confirmar Entrega' }).click()

  await expect(fila.getByText('Entregado', { exact: true })).toBeVisible({ timeout: 10_000 })

  const stockDespues = await leerStock(page, SKU_A_VERIFICAR)
  expect(stockDespues).toBe(stockAntes - CANTIDAD_DESPACHADA)
})
