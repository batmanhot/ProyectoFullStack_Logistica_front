import { describe, it, expect } from 'vitest'
import {
  validateProducto,
  validateMovimiento,
  validateOrden,
  validateDespacho,
  validateCliente,
  validateTransferencia,
  validateUsuario,
} from './validators'

// ── Fixtures ────────────────────────────────────────────────
const categorias  = [{ id: 'cat1', nombre: 'Electrónica' }]
const almacenes   = [{ id: 'alm1', nombre: 'Principal' }, { id: 'alm2', nombre: 'Secundario' }]
const proveedores = [{ id: 'prov1', razonSocial: 'Proveedor A' }]
const productos   = [{ id: 'prod1', nombre: 'Laptop', sku: 'LAP-001' }]
const clientes    = [{ id: 'cli1', razonSocial: 'Cliente X' }]

// ── validateProducto ─────────────────────────────────────────
describe('validateProducto', () => {
  it('acepta un producto válido', () => {
    expect(validateProducto({ nombre: 'Laptop', sku: 'LAP-001' }, { categorias, almacenes, proveedores }))
      .toBeNull()
  })

  it('rechaza si falta nombre', () => {
    expect(validateProducto({ sku: 'LAP-001' }, {})).not.toBeNull()
  })

  it('rechaza si falta SKU', () => {
    expect(validateProducto({ nombre: 'Laptop' }, {})).not.toBeNull()
  })

  it('rechaza si categoría no existe', () => {
    expect(validateProducto({ nombre: 'X', sku: 'X-001', categoriaId: 'inexistente' }, { categorias }))
      .not.toBeNull()
  })

  it('rechaza si almacenId existe pero no está en el catálogo', () => {
    expect(validateProducto(
      { nombre: 'X', sku: 'X-001', almacenId: 'no-existe' },
      { categorias, almacenes, proveedores }
    )).not.toBeNull()
  })

  it('rechaza si proveedorId existe pero no está en el catálogo', () => {
    expect(validateProducto(
      { nombre: 'X', sku: 'X-001', proveedorId: 'no-existe' },
      { categorias, almacenes, proveedores }
    )).not.toBeNull()
  })

  it('rechaza si stockMinimo > stockMaximo', () => {
    expect(validateProducto({ nombre: 'X', sku: 'X-001', stockMinimo: 10, stockMaximo: 5 }, {}))
      .not.toBeNull()
  })

  it('rechaza si precioVenta es negativo', () => {
    expect(validateProducto({ nombre: 'X', sku: 'X-001', precioVenta: -1 }, {}))
      .not.toBeNull()
  })
})

// ── validateMovimiento ───────────────────────────────────────
describe('validateMovimiento', () => {
  it('acepta movimiento válido', () => {
    expect(validateMovimiento(
      { productoId: 'prod1', cantidad: 5, costoUnitario: 10 },
      { productos, almacenes }
    )).toBeNull()
  })

  it('rechaza si falta productoId', () => {
    expect(validateMovimiento({ cantidad: 5 }, { productos })).not.toBeNull()
  })

  it('rechaza si productoId no existe en el catálogo', () => {
    expect(validateMovimiento({ productoId: 'no-existe', cantidad: 5 }, { productos }))
      .not.toBeNull()
  })

  it('rechaza si cantidad es 0 o negativa', () => {
    expect(validateMovimiento({ productoId: 'prod1', cantidad: 0 }, { productos })).not.toBeNull()
    expect(validateMovimiento({ productoId: 'prod1', cantidad: -5 }, { productos })).not.toBeNull()
  })

  it('rechaza si costoUnitario es negativo', () => {
    expect(validateMovimiento({ productoId: 'prod1', cantidad: 1, costoUnitario: -1 }, { productos }))
      .not.toBeNull()
  })

  it('rechaza si almacenId existe pero no está en el catálogo', () => {
    expect(validateMovimiento(
      { productoId: 'prod1', cantidad: 5, almacenId: 'no-existe' },
      { productos, almacenes }
    )).not.toBeNull()
  })
})

// ── validateOrden ────────────────────────────────────────────
describe('validateOrden', () => {
  const itemValido = { productoId: 'prod1', cantidad: 2, costoUnitario: 50 }

  it('acepta orden válida', () => {
    expect(validateOrden(
      { proveedorId: 'prov1', items: [itemValido] },
      { proveedores, productos }
    )).toBeNull()
  })

  it('rechaza si falta proveedorId', () => {
    expect(validateOrden({ items: [itemValido] }, { proveedores, productos })).not.toBeNull()
  })

  it('rechaza si proveedorId no está en el catálogo', () => {
    expect(validateOrden(
      { proveedorId: 'no-existe', items: [itemValido] },
      { proveedores, productos }
    )).not.toBeNull()
  })

  it('rechaza si no hay items', () => {
    expect(validateOrden({ proveedorId: 'prov1', items: [] }, { proveedores, productos })).not.toBeNull()
  })

  it('rechaza si un item tiene producto inexistente', () => {
    expect(validateOrden(
      { proveedorId: 'prov1', items: [{ productoId: 'no-existe', cantidad: 1 }] },
      { proveedores, productos }
    )).not.toBeNull()
  })

  it('rechaza si un ítem tiene cantidad cero o negativa', () => {
    expect(validateOrden(
      { proveedorId: 'prov1', items: [{ productoId: 'prod1', cantidad: 0 }] },
      { proveedores, productos }
    )).not.toBeNull()
  })

  it('rechaza si un ítem tiene costoUnitario negativo', () => {
    expect(validateOrden(
      { proveedorId: 'prov1', items: [{ productoId: 'prod1', cantidad: 2, costoUnitario: -5 }] },
      { proveedores, productos }
    )).not.toBeNull()
  })
})

// ── validateDespacho ─────────────────────────────────────────
describe('validateDespacho', () => {
  const itemValido = { productoId: 'prod1', cantidad: 2 }

  it('acepta despacho válido', () => {
    expect(validateDespacho(
      { clienteId: 'cli1', items: [itemValido] },
      { clientes, almacenes, productos }
    )).toBeNull()
  })

  it('rechaza si falta clienteId', () => {
    expect(validateDespacho({ items: [itemValido] }, { clientes, almacenes, productos }))
      .not.toBeNull()
  })

  it('rechaza si clienteId no está en el catálogo', () => {
    expect(validateDespacho(
      { clienteId: 'no-existe', items: [itemValido] },
      { clientes, almacenes, productos }
    )).not.toBeNull()
  })

  it('rechaza si items está vacío', () => {
    expect(validateDespacho({ clienteId: 'cli1', items: [] }, { clientes, almacenes, productos }))
      .not.toBeNull()
  })

  it('rechaza si almacenId existe pero no está en el catálogo', () => {
    expect(validateDespacho(
      { clienteId: 'cli1', almacenId: 'no-existe', items: [{ productoId: 'prod1', cantidad: 1 }] },
      { clientes, almacenes, productos }
    )).not.toBeNull()
  })

  it('rechaza si un ítem del despacho tiene producto inexistente', () => {
    expect(validateDespacho(
      { clienteId: 'cli1', items: [{ productoId: 'no-existe', cantidad: 1 }] },
      { clientes, almacenes, productos }
    )).not.toBeNull()
  })

  it('rechaza si un ítem tiene cantidad cero o negativa', () => {
    expect(validateDespacho(
      { clienteId: 'cli1', items: [{ productoId: 'prod1', cantidad: 0 }] },
      { clientes, almacenes, productos }
    )).not.toBeNull()

    expect(validateDespacho(
      { clienteId: 'cli1', items: [{ productoId: 'prod1', cantidad: -3 }] },
      { clientes, almacenes, productos }
    )).not.toBeNull()
  })
})

// ── validateCliente ──────────────────────────────────────────
describe('validateCliente', () => {
  it('acepta cliente válido', () => {
    expect(validateCliente({ razonSocial: 'Empresa SAC' })).toBeNull()
  })

  it('rechaza si falta razón social', () => {
    expect(validateCliente({})).not.toBeNull()
  })

  it('rechaza RUC con formato inválido', () => {
    expect(validateCliente({ razonSocial: 'X', ruc: '123' })).not.toBeNull()
    expect(validateCliente({ razonSocial: 'X', ruc: 'ABCDEFGHIJK' })).not.toBeNull()
  })

  it('acepta RUC con 11 dígitos', () => {
    expect(validateCliente({ razonSocial: 'X', ruc: '20123456789' })).toBeNull()
  })

  it('rechaza email con formato inválido', () => {
    expect(validateCliente({ razonSocial: 'X', email: 'no-es-email' })).not.toBeNull()
  })

  it('acepta email válido', () => {
    expect(validateCliente({ razonSocial: 'X', email: 'test@empresa.com' })).toBeNull()
  })
})

// ── validateTransferencia ────────────────────────────────────
describe('validateTransferencia', () => {
  it('acepta transferencia válida', () => {
    expect(validateTransferencia(
      { productoId: 'prod1', almacenOrigenId: 'alm1', almacenDestinoId: 'alm2', cantidad: 5 },
      { productos, almacenes }
    )).toBeNull()
  })

  it('rechaza si origen === destino', () => {
    expect(validateTransferencia(
      { productoId: 'prod1', almacenOrigenId: 'alm1', almacenDestinoId: 'alm1', cantidad: 5 },
      { productos, almacenes }
    )).not.toBeNull()
  })

  it('rechaza si cantidad es 0', () => {
    expect(validateTransferencia(
      { productoId: 'prod1', almacenOrigenId: 'alm1', almacenDestinoId: 'alm2', cantidad: 0 },
      { productos, almacenes }
    )).not.toBeNull()
  })

  it('rechaza si el producto no existe', () => {
    expect(validateTransferencia(
      { productoId: 'no-existe', almacenOrigenId: 'alm1', almacenDestinoId: 'alm2', cantidad: 5 },
      { productos, almacenes }
    )).not.toBeNull()
  })

  it('rechaza si el almacén origen no existe', () => {
    expect(validateTransferencia(
      { productoId: 'prod1', almacenOrigenId: 'no-existe', almacenDestinoId: 'alm2', cantidad: 5 },
      { productos, almacenes }
    )).not.toBeNull()
  })

  it('rechaza si el almacén destino no existe', () => {
    expect(validateTransferencia(
      { productoId: 'prod1', almacenOrigenId: 'alm1', almacenDestinoId: 'no-existe', cantidad: 5 },
      { productos, almacenes }
    )).not.toBeNull()
  })
})

// ── validateUsuario ──────────────────────────────────────────
describe('validateUsuario', () => {
  it('acepta usuario nuevo válido', () => {
    expect(validateUsuario({ nombre: 'Juan', email: 'juan@empresa.com', password: '123', rol: 'admin' }))
      .toBeNull()
  })

  it('rechaza si falta nombre', () => {
    expect(validateUsuario({ email: 'x@x.com', password: '123' })).not.toBeNull()
  })

  it('rechaza email inválido', () => {
    expect(validateUsuario({ nombre: 'Juan', email: 'no-email', password: '123' })).not.toBeNull()
  })

  it('rechaza usuario nuevo sin contraseña', () => {
    expect(validateUsuario({ nombre: 'Juan', email: 'j@x.com' })).not.toBeNull()
  })

  it('acepta usuario existente (con id) sin contraseña', () => {
    expect(validateUsuario({ id: 'usr1', nombre: 'Juan', email: 'j@x.com', rol: 'admin' }))
      .toBeNull()
  })

  it('rechaza rol inválido', () => {
    expect(validateUsuario({ nombre: 'X', email: 'x@x.com', password: '123', rol: 'superheroe' }))
      .not.toBeNull()
  })
})
