import { describe, it, expect } from 'vitest'
import { calcularStockDisponible } from './useStockPorAlmacen'

describe('calcularStockDisponible', () => {
  it('suma cantidad por almacén y descuenta lo reservado del bucket sin ubicar', () => {
    const stock = calcularStockDisponible([
      { almacenId: 'a1', productoId: 'p1', ubicacionId: null, cantidad: 10, cantidadReservada: 3 },
      { almacenId: 'a1', productoId: 'p1', ubicacionId: 'u1', cantidad: 5,  cantidadReservada: 0 },
    ])
    // 10-3 (sin ubicar) + 5 (en ubicación, nunca reserva) = 12
    expect(stock.enAlmacen('a1', 'p1')).toBe(12)
  })

  it('la reserva de una ubicación específica NO se descuenta (solo aplica al bucket sin ubicar)', () => {
    const stock = calcularStockDisponible([
      { almacenId: 'a1', productoId: 'p1', ubicacionId: 'u1', cantidad: 5, cantidadReservada: 99 },
    ])
    expect(stock.enAlmacen('a1', 'p1')).toBe(5)
  })

  it('devuelve 0 para un (almacén, producto) sin filas', () => {
    const stock = calcularStockDisponible([])
    expect(stock.enAlmacen('a1', 'p1')).toBe(0)
    expect(stock.global('p1')).toBe(0)
  })

  it('global() suma el disponible de todos los almacenes', () => {
    const stock = calcularStockDisponible([
      { almacenId: 'a1', productoId: 'p1', ubicacionId: null, cantidad: 10, cantidadReservada: 0 },
      { almacenId: 'a2', productoId: 'p1', ubicacionId: null, cantidad: 4,  cantidadReservada: 1 },
      { almacenId: 'a1', productoId: 'p2', ubicacionId: null, cantidad: 7,  cantidadReservada: 0 },
    ])
    expect(stock.global('p1')).toBe(13) // 10 + (4-1)
    expect(stock.enAlmacen('a1', 'p1')).toBe(10)
    expect(stock.enAlmacen('a2', 'p1')).toBe(3)
  })
})
