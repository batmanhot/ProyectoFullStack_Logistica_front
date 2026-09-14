import { describe, it, expect } from 'vitest'
import { generarAlertas } from './alertas'

// generarAlertas() con solo lo necesario para las alertas de aprobación
// (productos/ordenes/categorias/almacenes vacíos — no son el foco acá).
function alertasAprobacion(aprobaciones) {
  return generarAlertas([], [], {}, {}, [], [], 'S/', [], aprobaciones)
    .filter(a => a.tipo === 'aprobacion_pendiente')
}

const despacho = { numero: 'DSP-0001', cliente: { razonSocial: 'Ferretería Norte' }, total: '150.00', fecha: '2026-09-01' }
const pedidoInterno = { numero: 'PI-0001', area: { nombre: 'Mantenimiento' }, fecha: '2026-09-01' }

describe('generarAlertas — aprobacion_pendiente', () => {
  it('sin datos de aprobación no genera nada (default aprobaciones={})', () => {
    expect(alertasAprobacion(undefined)).toEqual([])
  })

  it('Owner (comodín "*") ve pendientes aunque su rol no esté en rolesAprobadores', () => {
    const alertas = alertasAprobacion({
      despachos: [despacho],
      reglas: [{ proceso: 'DESPACHO', rolesAprobadores: ['admin'] }],
      rolCodigo: 'owner',
      esComodin: true,
    })
    expect(alertas).toHaveLength(1)
    expect(alertas[0].titulo).toContain('DSP-0001')
  })

  it('regla vacía (sin restricción configurada) deja pasar a cualquiera con permiso de módulo', () => {
    const alertas = alertasAprobacion({
      pedidosInternos: [pedidoInterno],
      reglas: [{ proceso: 'PEDIDO_INTERNO', rolesAprobadores: [] }],
      rolCodigo: 'almacenero',
      esComodin: false,
    })
    expect(alertas).toHaveLength(1)
    expect(alertas[0].titulo).toContain('PI-0001')
  })

  it('rol fuera de rolesAprobadores no ve la alerta (separación de funciones)', () => {
    const alertas = alertasAprobacion({
      despachos: [despacho],
      reglas: [{ proceso: 'DESPACHO', rolesAprobadores: ['admin', 'supervisor', 'gerente-operaciones'] }],
      rolCodigo: 'almacenero',
      esComodin: false,
    })
    expect(alertas).toEqual([])
  })

  it('rol dentro de rolesAprobadores sí ve la alerta', () => {
    const alertas = alertasAprobacion({
      despachos: [despacho],
      reglas: [{ proceso: 'DESPACHO', rolesAprobadores: ['admin', 'supervisor', 'gerente-operaciones'] }],
      rolCodigo: 'gerente-operaciones',
      esComodin: false,
    })
    expect(alertas).toHaveLength(1)
  })

  it('sin fila para el proceso (rolesAprobadores no encontrado) no restringe', () => {
    const alertas = alertasAprobacion({
      despachos: [despacho],
      reglas: [],
      rolCodigo: 'despachador',
      esComodin: false,
    })
    expect(alertas).toHaveLength(1)
  })
})
