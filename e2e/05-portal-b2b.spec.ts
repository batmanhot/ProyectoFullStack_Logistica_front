import { test, expect } from '@playwright/test'
import { loginComoDemo } from './helpers'

// Flujo B2B de punta a punta: el admin genera un link de portal para un
// cliente real (dlnorte), el "cliente" (pestaña de navegador sin sesión de
// tenant, solo el JWT propio del portal) hace un pedido, y el admin lo
// aprueba — PortalService.aprobarYConvertir() debe crear el Despacho de
// forma atómica junto con marcar el pedido CONVERTIDO.
const CLIENTE = 'Corporación Lima E.I.R.L.'

test('Portal B2B — pedido de cliente, aprobación y conversión atómica a Despacho', async ({ page: adminPage }) => {
  await loginComoDemo(adminPage, /Admin DL Norte/)
  await adminPage.goto('/portal-pedidos')
  await adminPage.getByRole('button', { name: 'Links por cliente' }).click()

  const filaCliente = adminPage.getByText(CLIENTE, { exact: true }).locator('xpath=ancestor::div[.//button][1]')
  await filaCliente.getByRole('button', { name: 'Generar link' }).click()
  const linkEl = filaCliente.locator('a').first()
  await expect(linkEl).toBeVisible({ timeout: 10_000 })
  const href = await linkEl.getAttribute('href')
  expect(href).toBeTruthy()

  // ── Cliente: pestaña nueva, sin la sesión de tenant del admin ──────────
  const clientPage = await adminPage.context().newPage()
  await clientPage.goto(href!)
  await expect(clientPage.getByText('Hacer un pedido')).toBeVisible()

  await clientPage.getByRole('button', { name: 'Agregar producto' }).click()
  await clientPage.locator('select').first().selectOption({ index: 1 })
  await clientPage.getByRole('button', { name: 'Enviar pedido' }).click()

  await expect(clientPage.getByText('¡Pedido enviado!')).toBeVisible({ timeout: 10_000 })
  const numeroPedido = (await clientPage.locator('span.font-mono.font-bold').first().innerText()).trim()
  expect(numeroPedido).toMatch(/^PPE-/)
  await clientPage.close()

  // ── Admin: aprobar y verificar conversión a Despacho ────────────────────
  // El pedido se creó desde otra pestaña — la cache de React Query de
  // adminPage no tiene motivo para refetchear sola, se recarga a propósito.
  await adminPage.reload()
  await adminPage.getByRole('button', { name: 'Pedidos recibidos' }).click()
  const filaPedido = adminPage.locator('tr', { hasText: numeroPedido })
  await expect(filaPedido).toBeVisible({ timeout: 10_000 })
  await expect(filaPedido.getByText('Nuevo', { exact: true })).toBeVisible()

  await filaPedido.getByRole('button', { name: 'Aprobar' }).click()
  const dialog = adminPage.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Aprobar y crear despacho' }).click()

  // El toast confirma el numero real de Despacho creado atómicamente junto
  // con la conversión del pedido (PortalService.aprobarYConvertir)
  await expect(adminPage.getByText(/convertido a Despacho DESP-\d+/)).toBeVisible({ timeout: 10_000 })
  await expect(filaPedido.getByText('En despacho', { exact: true })).toBeVisible({ timeout: 10_000 })
})
