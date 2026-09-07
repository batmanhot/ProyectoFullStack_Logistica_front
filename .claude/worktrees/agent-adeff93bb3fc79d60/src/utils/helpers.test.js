import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  diasParaVencer,
  estadoStock,
  badgeClaseStock,
  estadoVencimiento,
  newId,
  clasificarABC,
  round2,
  clamp,
  fechaHoyISO,
} from './helpers'

// ── fechaHoyISO ──────────────────────────────────────────────
describe('fechaHoyISO', () => {
  it('devuelve la fecha en formato yyyy-MM-dd, apto para <input type="date">', () => {
    expect(fechaHoyISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

// ── formatCurrency ───────────────────────────────────────────
describe('formatCurrency', () => {
  it('formatea número con símbolo por defecto S/', () => {
    const r = formatCurrency(1234.5)
    expect(r).toContain('S/')
    expect(r).toContain('1')
  })

  it('usa símbolo personalizado', () => {
    expect(formatCurrency(100, '$')).toContain('$')
  })

  it('devuelve "S/ 0.00" para null', () => {
    expect(formatCurrency(null)).toContain('0.00')
  })

  it('devuelve "S/ 0.00" para undefined', () => {
    expect(formatCurrency(undefined)).toContain('0.00')
  })

  it('devuelve "S/ 0.00" para NaN', () => {
    expect(formatCurrency(NaN)).toContain('0.00')
  })

  it('formatea correctamente cero', () => {
    expect(formatCurrency(0)).toContain('0.00')
  })
})

// ── formatNumber ─────────────────────────────────────────────
describe('formatNumber', () => {
  it('devuelve "0" para null', () => {
    expect(formatNumber(null)).toBe('0')
  })

  it('devuelve "0" para undefined', () => {
    expect(formatNumber(undefined)).toBe('0')
  })

  it('formatea con decimales por defecto 2', () => {
    const r = formatNumber(1000)
    expect(r).toContain('1')
  })

  it('respeta decimales personalizados', () => {
    const r = formatNumber(1.5, 0)
    expect(r).not.toContain('.')
  })
})

// ── formatDate ───────────────────────────────────────────────
describe('formatDate', () => {
  it('formatea ISO string a dd/MM/yyyy', () => {
    expect(formatDate('2025-03-15')).toBe('15/03/2025')
  })

  it('devuelve "—" para null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('devuelve "—" para string vacío', () => {
    expect(formatDate('')).toBe('—')
  })

  it('maneja formato dd/mm/yyyy como entrada', () => {
    const r = formatDate('15/03/2025')
    expect(r).toContain('2025')
  })

  it('acepta objeto Date', () => {
    const fecha = new Date(2025, 2, 15) // 15 mar 2025
    expect(formatDate(fecha)).toBe('15/03/2025')
  })
})

// ── formatDateTime ───────────────────────────────────────────
describe('formatDateTime', () => {
  it('incluye horas y minutos', () => {
    expect(formatDateTime('2025-03-15T14:30:00')).toMatch(/14:30/)
  })

  it('devuelve "—" para null', () => {
    expect(formatDateTime(null)).toBe('—')
  })
})

// ── diasParaVencer ───────────────────────────────────────────
describe('diasParaVencer', () => {
  it('devuelve null para fecha nula', () => {
    expect(diasParaVencer(null)).toBeNull()
  })

  it('devuelve número negativo para fecha pasada', () => {
    expect(diasParaVencer('2020-01-01')).toBeLessThan(0)
  })

  it('devuelve número positivo para fecha futura', () => {
    expect(diasParaVencer('2099-12-31')).toBeGreaterThan(0)
  })
})

// ── estadoStock ──────────────────────────────────────────────
describe('estadoStock', () => {
  it('agotado cuando stock <= 0', () => {
    expect(estadoStock(0, 10).estado).toBe('agotado')
    expect(estadoStock(-1, 10).estado).toBe('agotado')
  })

  it('crítico cuando stock <= stockMinimo', () => {
    expect(estadoStock(5, 10).estado).toBe('critico')
    expect(estadoStock(10, 10).estado).toBe('critico')
  })

  it('bajo cuando stock <= stockMinimo * 1.5', () => {
    // stockMinimo=10 → umbral bajo = 15
    expect(estadoStock(14, 10).estado).toBe('bajo')
    expect(estadoStock(15, 10).estado).toBe('bajo')
  })

  it('ok cuando stock supera el umbral bajo', () => {
    expect(estadoStock(16, 10).estado).toBe('ok')
    expect(estadoStock(100, 10).estado).toBe('ok')
  })

  it('devuelve color correcto para cada estado', () => {
    expect(estadoStock(0, 10).color).toBe('#ef4444')    // agotado — rojo
    expect(estadoStock(5, 10).color).toBe('#f59e0b')    // crítico — ámbar
    expect(estadoStock(100, 10).color).toBe('#22c55e')  // ok — verde
  })
})

// ── badgeClaseStock ──────────────────────────────────────────
describe('badgeClaseStock', () => {
  it.each([
    ['agotado', 'badge-danger'],
    ['critico', 'badge-warning'],
    ['bajo',    'badge-warning'],
    ['ok',      'badge-success'],
  ])('estado "%s" → clase "%s"', (estado, clase) => {
    expect(badgeClaseStock(estado)).toBe(clase)
  })

  it('devuelve badge-neutral para estado desconocido', () => {
    expect(badgeClaseStock('inexistente')).toBe('badge-neutral')
  })
})

// ── estadoVencimiento ────────────────────────────────────────
describe('estadoVencimiento', () => {
  it('devuelve null para dias null', () => {
    expect(estadoVencimiento(null)).toBeNull()
  })

  it('Vencido cuando dias < 0', () => {
    expect(estadoVencimiento(-1).label).toBe('Vencido')
    expect(estadoVencimiento(-1).clase).toBe('badge-danger')
  })

  it('rojo cuando dias <= 15', () => {
    expect(estadoVencimiento(0).clase).toBe('badge-danger')
    expect(estadoVencimiento(15).clase).toBe('badge-danger')
  })

  it('ámbar cuando dias entre 16 y 30', () => {
    expect(estadoVencimiento(16).clase).toBe('badge-warning')
    expect(estadoVencimiento(30).clase).toBe('badge-warning')
  })

  it('azul cuando dias entre 31 y 90', () => {
    expect(estadoVencimiento(31).clase).toBe('badge-info')
    expect(estadoVencimiento(90).clase).toBe('badge-info')
  })

  it('verde cuando dias > 90', () => {
    expect(estadoVencimiento(91).clase).toBe('badge-success')
    expect(estadoVencimiento(365).clase).toBe('badge-success')
  })

  it('incluye el número de días en el label', () => {
    expect(estadoVencimiento(20).label).toBe('20d')
    expect(estadoVencimiento(91).label).toBe('91d')
  })
})

// ── newId ────────────────────────────────────────────────────
describe('newId', () => {
  it('genera strings únicos en llamadas consecutivas', () => {
    const ids = Array.from({ length: 10 }, () => newId())
    const uniq = new Set(ids)
    expect(uniq.size).toBe(10)
  })

  it('devuelve string no vacío en mayúsculas', () => {
    const id = newId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
    expect(id).toBe(id.toUpperCase())
  })
})

// ── clasificarABC ────────────────────────────────────────────
describe('clasificarABC', () => {
  it('devuelve array vacío si no hay productos', () => {
    expect(clasificarABC([])).toEqual([])
  })

  it('clasifica A los de mayor valor hasta 80% acumulado', () => {
    const productos = [
      { nombre: 'Alto', valorStock: 800 },
      { nombre: 'Medio', valorStock: 150 },
      { nombre: 'Bajo', valorStock: 50 },
    ]
    const result = clasificarABC(productos)
    expect(result[0].abc).toBe('A') // 800/1000 = 80% → entra justo en A
    expect(result[1].abc).toBe('B') // 150/1000 = 15% → acum 95% → B
    expect(result[2].abc).toBe('C') // resto → C
  })

  it('ordena por valorStock descendente antes de clasificar', () => {
    const productos = [
      { nombre: 'Pequeño', valorStock: 10 },
      { nombre: 'Grande', valorStock: 990 },
    ]
    const result = clasificarABC(productos)
    expect(result[0].nombre).toBe('Grande')
  })
})

// ── round2 ───────────────────────────────────────────────────
describe('round2', () => {
  it('redondea a 2 decimales (comportamiento IEEE 754 documentado)', () => {
    // 1.005 en IEEE 754 = 1.00499... → redondea a 1.00
    expect(round2(1.005)).toBe(1.00)
    expect(round2(1.006)).toBe(1.01)
    expect(round2(1.004)).toBe(1.00)
    expect(round2(0.125)).toBe(0.13)
  })

  it('mantiene enteros sin cambio', () => {
    expect(round2(5)).toBe(5)
    expect(round2(0)).toBe(0)
    expect(round2(100)).toBe(100)
  })
})

// ── clamp ────────────────────────────────────────────────────
describe('clamp', () => {
  it('devuelve min cuando el valor es menor', () => {
    expect(clamp(-5, 0, 100)).toBe(0)
  })

  it('devuelve max cuando el valor es mayor', () => {
    expect(clamp(150, 0, 100)).toBe(100)
  })

  it('devuelve el valor cuando está dentro del rango', () => {
    expect(clamp(50, 0, 100)).toBe(50)
  })

  it('funciona con los valores exactos de los límites', () => {
    expect(clamp(0, 0, 100)).toBe(0)
    expect(clamp(100, 0, 100)).toBe(100)
  })
})
