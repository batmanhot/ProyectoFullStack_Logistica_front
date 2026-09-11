import { useMemo } from 'react'
import { useInventarioList } from '../queries/inventario.queries'

/**
 * Pura y testeable sin red: agrega filas de `/inventario` en dos lectores de
 * stock DISPONIBLE, con el mismo criterio que valida el backend —
 * `cantidad − cantidadReservada` (la reserva solo vive en el bucket sin
 * ubicar, `ubicacionId === null`).
 *
 *   - `enAlmacen(almacenId, productoId)` → disponible en ese almacén.
 *   - `global(productoId)`               → disponible sumando todos los almacenes.
 */
export function calcularStockDisponible(inventario) {
  const porAlmacen = {} // `${almacenId}:${productoId}` -> number
  const global = {}     // `${productoId}` -> number
  for (const it of inventario) {
    const cant = Number(it.cantidad || 0)
    const reserv = it.ubicacionId == null ? Number(it.cantidadReservada || 0) : 0
    const disp = cant - reserv
    const k = `${it.almacenId}:${it.productoId}`
    porAlmacen[k] = (porAlmacen[k] || 0) + disp
    global[it.productoId] = (global[it.productoId] || 0) + disp
  }
  return {
    enAlmacen: (almacenId, productoId) => porAlmacen[`${almacenId}:${productoId}`] || 0,
    global: (productoId) => global[productoId] || 0,
  }
}

/**
 * Hook de conveniencia: trae `/inventario` y lo agrega con `calcularStockDisponible`.
 * Pensado para poner una "pista de stock" al lado de cualquier selector de
 * artículo. React Query deduplica: aunque varios modales lo llamen, es un solo
 * fetch de `/inventario`.
 *
 * `enabled` (default true): pásale el `open` del modal si el selector solo
 * existe puertas adentro de un modal — evita traer `/inventario` en cada
 * carga de la página cuando el modal ni siquiera está abierto.
 */
export function useStockPorAlmacen(enabled = true) {
  const { data: inventario = [] } = useInventarioList({ enabled })
  return useMemo(() => calcularStockDisponible(inventario), [inventario])
}
