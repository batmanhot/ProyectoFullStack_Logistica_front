/**
 * movimientoService.js — Orquestación de movimientos de inventario.
 *
 * Concentra toda la lógica de negocio para entradas, salidas y sus anulaciones.
 * Los componentes solo invocan estas funciones y manejan el resultado en la UI.
 *
 * Retorno estándar: { ok: boolean, mensaje: string }
 */
import * as storage from './storage'
import { procesarSalida } from '../utils/valorizacion'
import { generarNumDoc, fechaHoy } from '../utils/helpers'

/**
 * Registra una entrada de stock.
 * Actualiza lotes del producto y registra el movimiento.
 */
export function registrarEntrada(data) {
  const { data: prod, error } = storage.getProductoById(data.productoId)
  if (error || !prod) return { ok: false, mensaje: 'Producto no encontrado' }

  const batch = {
    id:       Date.now().toString(36),
    cantidad: +data.cantidad,
    costo:    +data.costoUnitario,
    fecha:    data.fecha,
    lote:     data.lote || '',
  }

  const actualizado = storage._actualizarBatchesProducto(
    prod.id,
    [...(prod.batches || []), batch],
    prod.stockActual + +data.cantidad,
  )
  if (!actualizado) return { ok: false, mensaje: 'Error al actualizar el stock del producto' }

  const resultado = storage.registrarMovimiento({
    tipo:          'ENTRADA',
    productoId:    data.productoId,
    almacenId:     data.almacenId,
    cantidad:      +data.cantidad,
    costoUnitario: +data.costoUnitario,
    costoTotal:    +(data.cantidad * data.costoUnitario).toFixed(2),
    lote:          data.lote,
    fecha:         data.fecha,
    motivo:        data.motivo,
    documento:     data.documento || generarNumDoc('ENT', '001'),
    notas:         data.notas,
    proveedorId:   data.proveedorId,
  })

  if (resultado.error) return { ok: false, mensaje: resultado.error }

  return {
    ok:      true,
    mensaje: `Entrada registrada — ${data.cantidad} ${prod.unidadMedida} de ${prod.nombre}`,
  }
}

/**
 * Anula una entrada existente.
 * Revierte el lote correspondiente y registra un ajuste negativo.
 */
export function anularEntrada(mov) {
  const { data: prod, error } = storage.getProductoById(mov.productoId)
  if (error || !prod) return { ok: false, mensaje: 'Producto no encontrado' }

  if (prod.stockActual < mov.cantidad) {
    return {
      ok:      false,
      mensaje: `No se puede anular: stock actual (${prod.stockActual}) es menor que la cantidad ingresada (${mov.cantidad})`,
    }
  }

  const nuevosBatches = (prod.batches || []).filter(b => b.id !== mov.batchId)
  const actualizado = storage._actualizarBatchesProducto(
    prod.id,
    nuevosBatches,
    prod.stockActual - mov.cantidad,
  )
  if (!actualizado) return { ok: false, mensaje: 'Error al revertir el stock del producto' }

  const resultado = storage.registrarMovimiento({
    tipo:          'AJUSTE',
    productoId:    mov.productoId,
    almacenId:     mov.almacenId,
    cantidad:      mov.cantidad,
    costoUnitario: mov.costoUnitario,
    costoTotal:    mov.costoTotal,
    lote:          '',
    fecha:         fechaHoy(),
    motivo:        `[- AJUSTE] Anulación entrada ${mov.documento}`,
    documento:     `ANU-${mov.documento}`,
    notas:         `Anulación de entrada ${mov.documento}`,
  })

  if (resultado.error) return { ok: false, mensaje: resultado.error }

  return { ok: true, mensaje: `Entrada ${mov.documento} anulada` }
}

/**
 * Registra una salida de stock aplicando la fórmula de valorización configurada.
 */
export function registrarSalida(data, formulaValorizacion = 'PMP') {
  const { data: prod, error } = storage.getProductoById(data.productoId)
  if (error || !prod) return { ok: false, mensaje: 'Producto no encontrado' }

  if (+data.cantidad > prod.stockActual) {
    return {
      ok:      false,
      mensaje: `Stock insuficiente. Disponible: ${prod.stockActual} ${prod.unidadMedida}`,
    }
  }

  let valorizado
  try {
    valorizado = procesarSalida(prod.batches || [], +data.cantidad, formulaValorizacion)
  } catch (e) {
    return { ok: false, mensaje: e.message }
  }

  const actualizado = storage._actualizarBatchesProducto(
    prod.id,
    valorizado.batches,
    prod.stockActual - +data.cantidad,
  )
  if (!actualizado) return { ok: false, mensaje: 'Error al actualizar el stock del producto' }

  const resultado = storage.registrarMovimiento({
    tipo:          'SALIDA',
    productoId:    data.productoId,
    almacenId:     data.almacenId,
    cantidad:      +data.cantidad,
    costoUnitario: valorizado.costoUnitario,
    costoTotal:    valorizado.costoTotal,
    lote:          '',
    fecha:         data.fecha,
    motivo:        data.motivo,
    documento:     data.documento || generarNumDoc('SAL', '001'),
    notas:         data.notas,
    formula:       formulaValorizacion,
  })

  if (resultado.error) return { ok: false, mensaje: resultado.error }

  return {
    ok:      true,
    mensaje: `Salida registrada — ${data.cantidad} ${prod.unidadMedida} de ${prod.nombre}`,
    costoTotal: valorizado.costoTotal,
  }
}

/**
 * Anula una salida existente.
 * Restituye el stock y registra un ajuste positivo.
 */
export function anularSalida(mov) {
  const { data: prod, error } = storage.getProductoById(mov.productoId)
  if (error || !prod) return { ok: false, mensaje: 'Producto no encontrado' }

  const batchRestituido = {
    id:       Date.now().toString(36),
    cantidad: mov.cantidad,
    costo:    mov.costoUnitario,
    fecha:    fechaHoy(),
    lote:     `REST-${mov.documento}`,
  }

  const actualizado = storage._actualizarBatchesProducto(
    prod.id,
    [...(prod.batches || []), batchRestituido],
    prod.stockActual + mov.cantidad,
  )
  if (!actualizado) return { ok: false, mensaje: 'Error al restituir el stock del producto' }

  const resultado = storage.registrarMovimiento({
    tipo:          'AJUSTE',
    productoId:    mov.productoId,
    almacenId:     mov.almacenId,
    cantidad:      mov.cantidad,
    costoUnitario: mov.costoUnitario,
    costoTotal:    mov.costoTotal,
    lote:          '',
    fecha:         fechaHoy(),
    motivo:        `[+ AJUSTE] Anulación salida ${mov.documento}`,
    documento:     `ANU-${mov.documento}`,
    notas:         `Anulación de salida ${mov.documento}`,
  })

  if (resultado.error) return { ok: false, mensaje: resultado.error }

  return { ok: true, mensaje: `Salida ${mov.documento} anulada — stock repuesto` }
}
