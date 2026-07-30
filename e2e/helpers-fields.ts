import { Locator } from '@playwright/test'

/**
 * Equivalente Playwright de test/test-utils.jsx#getFieldControl: `Field`
 * (components/ui/index.jsx) no asocia su <label> al control vía
 * htmlFor/id, así que se ubica el control a partir del texto de la etiqueta.
 */
export function getFieldControlE2E(scope: Locator, labelText: string) {
  return scope.getByText(labelText, { exact: true }).locator('xpath=..').locator('input, select, textarea')
}
