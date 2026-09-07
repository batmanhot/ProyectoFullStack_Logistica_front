/**
 * Tests de normalizers — funciones puras que mapean respuestas del backend
 * al shape esperado por el frontend. Sin DOM, sin React, sin API calls.
 */
import { describe, it, expect } from 'vitest'
import { normNegocio, normPlan, normRenovacion } from './admin.queries'
import { normListaPrecio } from './listas-precios.queries'

// ── normNegocio ──────────────────────────────────────────────
describe('normNegocio', () => {
  const base = {
    id: 'n1',
    codigo: 'empresa-xyz',
    nombre: 'Empresa XYZ',
    createdAt: '2025-01-15T10:30:00Z',
    fechaVencimiento: '2026-01-15T00:00:00Z',
  }

  it('mapea codigo → empresaId', () => {
    expect(normNegocio(base).empresaId).toBe('empresa-xyz')
  })

  it('recorta createdAt a solo fecha (10 chars)', () => {
    expect(normNegocio(base).fechaRegistro).toBe('2025-01-15')
  })

  it('recorta fechaVencimiento a solo fecha', () => {
    expect(normNegocio(base).fechaVencimiento).toBe('2026-01-15')
  })

  it('devuelve strings vacíos cuando las fechas son null', () => {
    const r = normNegocio({ ...base, createdAt: null, fechaVencimiento: null })
    expect(r.fechaRegistro).toBe('')
    expect(r.fechaVencimiento).toBe('')
  })

  it('preserva todos los campos originales', () => {
    const r = normNegocio(base)
    expect(r.id).toBe('n1')
    expect(r.nombre).toBe('Empresa XYZ')
  })
})

// ── normPlan ─────────────────────────────────────────────────
describe('normPlan', () => {
  it('convierte Decimal string a número flotante', () => {
    const r = normPlan({ precioMensual: '99.99', precioAnual: '999.00' })
    expect(r.precioMensual).toBe(99.99)
    expect(r.precioAnual).toBe(999.00)
  })

  it('devuelve 0 cuando el campo es null o undefined', () => {
    const r = normPlan({ precioMensual: null, precioAnual: undefined })
    expect(r.precioMensual).toBe(0)
    expect(r.precioAnual).toBe(0)
  })

  it('devuelve 0 cuando el campo es string vacío', () => {
    const r = normPlan({ precioMensual: '', precioAnual: '' })
    expect(r.precioMensual).toBe(0)
    expect(r.precioAnual).toBe(0)
  })

  it('maneja números ya numéricos (no solo strings)', () => {
    const r = normPlan({ precioMensual: 49.9, precioAnual: 499 })
    expect(r.precioMensual).toBe(49.9)
    expect(r.precioAnual).toBe(499)
  })

  it('preserva campos adicionales del plan', () => {
    const r = normPlan({ id: 'p1', nombre: 'Pro', precioMensual: '10', precioAnual: '100', activo: true })
    expect(r.id).toBe('p1')
    expect(r.nombre).toBe('Pro')
    expect(r.activo).toBe(true)
  })
})

// ── normRenovacion ───────────────────────────────────────────
describe('normRenovacion', () => {
  const base = {
    id: 'r1',
    empresaId: 'e1',
    planId: 'p1',
    estado: 'PAGADO',
    monto: '299.00',
    empresa: { nombre: 'Mi Empresa' },
    fechaPago: '2025-06-01T00:00:00Z',
    periodoInicio: '2025-06-01T00:00:00Z',
    periodoFin: '2026-06-01T00:00:00Z',
  }

  it('mapea empresaId → negocioId', () => {
    expect(normRenovacion(base).negocioId).toBe('e1')
  })

  it('extrae nombre del objeto empresa anidado', () => {
    expect(normRenovacion(base).negocioNombre).toBe('Mi Empresa')
  })

  it('devuelve string vacío si empresa es null', () => {
    expect(normRenovacion({ ...base, empresa: null }).negocioNombre).toBe('')
  })

  it('mapea planId → plan', () => {
    expect(normRenovacion(base).plan).toBe('p1')
  })

  it('convierte estado a lowercase', () => {
    expect(normRenovacion(base).estado).toBe('pagado')
    expect(normRenovacion({ ...base, estado: 'PENDIENTE' }).estado).toBe('pendiente')
    expect(normRenovacion({ ...base, estado: 'ANULADO' }).estado).toBe('anulado')
  })

  it('devuelve "pagado" cuando estado es null', () => {
    expect(normRenovacion({ ...base, estado: null }).estado).toBe('pagado')
  })

  it('convierte monto Decimal string a número', () => {
    expect(normRenovacion(base).monto).toBe(299)
  })

  it('recorta fechas ISO a solo YYYY-MM-DD', () => {
    const r = normRenovacion(base)
    expect(r.fechaPago).toBe('2025-06-01')
    expect(r.periodoInicio).toBe('2025-06-01')
    expect(r.periodoFin).toBe('2026-06-01')
  })

  it('devuelve strings vacíos si las fechas son null', () => {
    const r = normRenovacion({ ...base, fechaPago: null, periodoInicio: null, periodoFin: null })
    expect(r.fechaPago).toBe('')
    expect(r.periodoInicio).toBe('')
    expect(r.periodoFin).toBe('')
  })
})

// ── normListaPrecio ──────────────────────────────────────────
describe('normListaPrecio', () => {
  it('convierte descuento y markup Decimal a número', () => {
    const r = normListaPrecio({ descuento: '15.50', markup: '5.00', precios: {} })
    expect(r.descuento).toBe(15.5)
    expect(r.markup).toBe(5)
  })

  it('devuelve 0 para descuento/markup null', () => {
    const r = normListaPrecio({ descuento: null, markup: null, precios: {} })
    expect(r.descuento).toBe(0)
    expect(r.markup).toBe(0)
  })

  it('usa {} cuando precios es null', () => {
    const r = normListaPrecio({ descuento: 0, markup: 0, precios: null })
    expect(r.precios).toEqual({})
  })

  it('preserva el mapa de precios cuando está definido', () => {
    const precios = { 'prod-1': 99.99, 'prod-2': 49.50 }
    const r = normListaPrecio({ descuento: 0, markup: 0, precios })
    expect(r.precios).toEqual(precios)
  })

  it('preserva campos adicionales', () => {
    const r = normListaPrecio({ id: 'lp1', nombre: 'Mayorista', descuento: '10', markup: '0', precios: {}, activa: true })
    expect(r.id).toBe('lp1')
    expect(r.nombre).toBe('Mayorista')
    expect(r.activa).toBe(true)
  })
})
