/**
 * planLimits.js — Validación de límites por plan SaaS
 *
 * Lee el plan asignado al tenant desde saas_negocios (AdminSaaS)
 * y los límites configurados en saas_limites.
 * -1 = ilimitado
 */

const LIMITES_DEFAULT = {
  trial:       { maxUsuarios:1,  maxProductos:100,   maxAlmacenes:1,  maxProveedores:10,  maxClientes:20,   maxOrdenesMes:50   },
  basico:      { maxUsuarios:3,  maxProductos:500,   maxAlmacenes:2,  maxProveedores:50,  maxClientes:100,  maxOrdenesMes:300  },
  profesional: { maxUsuarios:10, maxProductos:2000,  maxAlmacenes:5,  maxProveedores:200, maxClientes:500,  maxOrdenesMes:2000 },
  empresarial: { maxUsuarios:-1, maxProductos:-1,    maxAlmacenes:-1, maxProveedores:-1,  maxClientes:-1,   maxOrdenesMes:-1   },
}

function leer(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}

/** Devuelve el plan ('trial'|'basico'|'profesional'|'empresarial') del tenant, o null si no se encuentra */
export function getPlanTenant(tenantId) {
  if (!tenantId) return null
  const negocios = leer('saas_negocios') || []
  const neg = negocios.find(n => n.empresaId === tenantId)
  return neg?.plan || null
}

/** Devuelve el objeto de límites del tenant según su plan */
export function getLimitesTenant(tenantId) {
  const plan = getPlanTenant(tenantId)
  if (!plan) return null
  const limites = leer('saas_limites') || LIMITES_DEFAULT
  return limites[plan] || LIMITES_DEFAULT[plan] || null
}

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
