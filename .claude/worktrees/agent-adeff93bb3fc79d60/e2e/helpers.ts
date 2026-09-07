import { Page } from '@playwright/test'
import { ORG_CODE } from './config'

/**
 * Login vía UI usando un botón de "acceso rápido — modo desarrollo"
 * (Login.jsx, visible porque la empresa demo tiene modoDesarrollo=true).
 * `nombreODescriptor` matchea el texto visible del botón (nombre o rol del
 * usuario demo, ver DatosService.sembrarDlNorte / prisma/seed.ts).
 */
export async function loginComoDemo(page: Page, nombreODescriptor: string | RegExp) {
  await page.goto(`/app/${ORG_CODE}`)
  await page.getByRole('button', { name: nombreODescriptor }).click()
  // Margen generoso: corriendo la suite completa en secuencia (varios
  // navegadores + backend en --watch) el round-trip de demo-login puede
  // superar los 15s por carga acumulada, aunque en runs aislados es <3s.
  await page.waitForURL('/', { timeout: 30_000 })
}
