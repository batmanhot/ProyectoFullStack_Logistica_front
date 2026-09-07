/**
 * planLimits.js — Validación de límites por plan SaaS
 *
 * Los límites reales vienen de la API (GET /configuracion → { plan, limites }),
 * resueltos en el backend contra PlanSaaS. Este módulo solo hace la comparación.
 * -1 = ilimitado
 */

/**
 * Verifica si se puede crear un nuevo registro dado el uso actual y el máximo del plan.
 * @returns {{ permitido: boolean, actual: number, maximo: number, porcentaje: number, mensaje: string }}
 */
export function verificarLimite(actual, maximo, etiqueta) {
  if (maximo === -1 || maximo === undefined) {
    return { permitido: true, actual, maximo: -1, porcentaje: 0, mensaje: '' }
  }
  const permitido  = actual < maximo
  const porcentaje = maximo > 0 ? Math.min(100, Math.round((actual / maximo) * 100)) : 100
  const mensaje    = permitido
    ? (porcentaje >= 80 ? `Usando ${actual} de ${maximo} ${etiqueta} (${porcentaje}%)` : '')
    : `Límite alcanzado: ${actual}/${maximo} ${etiqueta}. Actualiza tu plan para continuar.`
  return { permitido, actual, maximo, porcentaje, mensaje }
}
