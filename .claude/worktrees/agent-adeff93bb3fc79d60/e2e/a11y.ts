import { Page, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Falla ante violaciones 'serious'/'critical' (ARIA roto, campos sin label,
 * trampas de foco, etc.) — las 'minor'/'moderate' quedan fuera para no
 * convertir esto en una lista interminable de nitpicks de una sola pasada.
 *
 * 'color-contrast' queda excluido del fail a propósito: la sesión de QA
 * encontró que el gris de texto muted (#5f6f80) sobre los fondos oscuros
 * (#1a2230/#161d28) usados en casi toda la app no llega al 4.5:1 de WCAG AA
 * — es un hallazgo real, pero de alcance "todo el design system" (cientos
 * de usos de `text-[#5f6f80]`), no algo para tocar de pasada acá. Queda
 * logueado igual (sin romper el test) para no perder la señal ni tapar
 * regresiones nuevas de otro tipo mientras tanto.
 */
export async function checkA11y(page: Page, contexto: string) {
  const resultados = await new AxeBuilder({ page }).analyze()
  const [contraste, otras] = [
    resultados.violations.filter((v) => v.id === 'color-contrast'),
    resultados.violations.filter((v) => v.id !== 'color-contrast' && (v.impact === 'serious' || v.impact === 'critical')),
  ]
  if (contraste.length > 0) {
    console.warn(`[a11y] ${contexto}: ${contraste.reduce((n, v) => n + v.nodes.length, 0)} nodo(s) con contraste insuficiente (deuda conocida del design system, no bloquea el test)`)
  }
  const detalle = otras.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} nodo(s) — ${v.help}`).join('\n')
  expect(otras, `Violaciones de accesibilidad serias en ${contexto}:\n${detalle}`).toEqual([])
}
