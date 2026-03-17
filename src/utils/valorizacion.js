/**
 * StockPro — Motor de Valorización de Inventario
 * Soporta: PMP (Precio Medio Ponderado), FIFO/PEPS, LIFO/UEPS
 *
 * Diseñado para swap fácil cuando se conecte el backend.
 * El cálculo se hace sobre capas de lote (batches).
 */

// ─────────────────────────────────────────────
// PMP — Precio Medio Ponderado (default Perú)
// ─────────────────────────────────────────────
export function calcularPMP(batches) {
  const totalUnidades = batches.reduce((s, b) => s + b.cantidad, 0)
  const totalValor    = batches.reduce((s, b) => s + b.cantidad * b.costo, 0)
  if (totalUnidades === 0) return 0
  return totalValor / totalUnidades
}

/**
 * Aplica una salida con PMP:
 * El costo promedio se recalcula ANTES de cada entrada.
 * @param {Array} batches - [{cantidad, costo}]
 * @param {number} cantidadSalida
 * @returns {{ batches: Array, costoUnitario: number, costoTotal: number }}
 */
export function salida_PMP(batches, cantidadSalida) {
  const costoUnitario = calcularPMP(batches)
  const totalStock    = batches.reduce((s, b) => s + b.cantidad, 0)

  if (cantidadSalida > totalStock) {
    throw new Error(`Stock insuficiente: disponible ${totalStock}, solicitado ${cantidadSalida}`)
  }

  // Con PMP todos los lotes se mezclan — reducimos proporcionalmente
  const factor     = (totalStock - cantidadSalida) / totalStock
  const nuevoBatch = batches.map(b => ({ ...b, cantidad: b.cantidad * factor }))
    .filter(b => b.cantidad > 0.0001)

  return {
    batches:       nuevoBatch,
    costoUnitario: round2(costoUnitario),
    costoTotal:    round2(costoUnitario * cantidadSalida),
  }
}

// ─────────────────────────────────────────────
// FIFO — First In, First Out / PEPS
// ─────────────────────────────────────────────
/**
 * @param {Array} batches - ordenados de más antiguo a más nuevo [{cantidad, costo, fecha}]
 * @param {number} cantidadSalida
 */
export function salida_FIFO(batches, cantidadSalida) {
  const ordenados = [...batches].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
  return _procesar_salida(ordenados, cantidadSalida)
}

// ─────────────────────────────────────────────
// LIFO — Last In, First Out / UEPS
// ─────────────────────────────────────────────
/**
 * @param {Array} batches - [{cantidad, costo, fecha}]
 * @param {number} cantidadSalida
 */
export function salida_LIFO(batches, cantidadSalida) {
  const ordenados = [...batches].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  return _procesar_salida(ordenados, cantidadSalida)
}

// ─────────────────────────────────────────────
// Dispatcher — elige la fórmula según config
// ─────────────────────────────────────────────
export function procesarSalida(batches, cantidad, formula = 'PMP') {
  switch (formula) {
    case 'FIFO': return salida_FIFO(batches, cantidad)
    case 'LIFO': return salida_LIFO(batches, cantidad)
    case 'PMP':
    default:     return salida_PMP(batches, cantidad)
  }
}

/**
 * Calcula el valor total del stock actual según la fórmula
 */
export function valorarStock(batches, formula = 'PMP') {
  if (!batches || batches.length === 0) return 0

  switch (formula) {
    case 'PMP': {
      const pmp = calcularPMP(batches)
      const tot = batches.reduce((s, b) => s + b.cantidad, 0)
      return round2(pmp * tot)
    }
    case 'FIFO': {
      // FIFO: el valor del stock es el de los lotes más nuevos
      return round2(batches.reduce((s, b) => s + b.cantidad * b.costo, 0))
    }
    case 'LIFO': {
      return round2(batches.reduce((s, b) => s + b.cantidad * b.costo, 0))
    }
    default:
      return round2(batches.reduce((s, b) => s + b.cantidad * b.costo, 0))
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function _procesar_salida(batchesOrdenados, cantidadSalida) {
  let restante = cantidadSalida
  const resultado = []
  let costoTotal = 0

  const copia = batchesOrdenados.map(b => ({ ...b }))
  const totalStock = copia.reduce((s, b) => s + b.cantidad, 0)

  if (cantidadSalida > totalStock) {
    throw new Error(`Stock insuficiente: disponible ${totalStock}, solicitado ${cantidadSalida}`)
  }

  for (const batch of copia) {
    if (restante <= 0) break
    const usar = Math.min(batch.cantidad, restante)
    costoTotal += usar * batch.costo
    batch.cantidad -= usar
    restante -= usar
  }

  // Los batches originales con cantidades restantes (sin los agotados)
  const nuevoBatches = copia.filter(b => b.cantidad > 0.0001)
  const costoUnitario = cantidadSalida > 0 ? costoTotal / cantidadSalida : 0

  return {
    batches:       nuevoBatches,
    costoUnitario: round2(costoUnitario),
    costoTotal:    round2(costoTotal),
  }
}

export function round2(n) {
  return Math.round(n * 100) / 100
}

export const FORMULAS_VALORIZACION = [
  {
    id:     'PMP',
    nombre: 'Precio Medio Ponderado (PMP)',
    alias:  'PMP',
    desc:   'Más común en el mercado peruano. Promedia el costo según el volumen de cada lote.',
    recomendado: true,
  },
  {
    id:     'FIFO',
    nombre: 'Primero en Entrar, Primero en Salir (PEPS)',
    alias:  'FIFO / PEPS',
    desc:   'Las primeras unidades compradas son las primeras en salir. Refleja el flujo físico natural.',
    recomendado: false,
  },
  {
    id:     'LIFO',
    nombre: 'Último en Entrar, Primero en Salir (UEPS)',
    alias:  'LIFO / UEPS',
    desc:   'Las últimas unidades compradas son las primeras en salir. Poco usado en Perú.',
    recomendado: false,
  },
]
