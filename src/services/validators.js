/**
 * validators.js — Reglas de negocio puras.
 *
 * Todas las funciones reciben los datos a validar MÁS los catálogos necesarios
 * como parámetros explícitos (sin acceder a localStorage directamente).
 * Esto hace las reglas:
 *   - Testeables de forma aislada
 *   - Reutilizables desde la UI para validación anticipada
 *   - Independientes del mecanismo de persistencia
 *
 * Retorno: null si válido, string con mensaje de error si inválido.
 */

// ── Helpers internos ──────────────────────────────────────
function _existe(lista, id) {
  return lista?.some(item => item.id === id)
}

// ── Productos ─────────────────────────────────────────────
export function validateProducto(prod, { categorias = [], almacenes = [], proveedores = [] }) {
  if (!prod.nombre?.trim())
    return 'El nombre del producto es obligatorio'
  if (!prod.sku?.trim())
    return 'El SKU es obligatorio'
  if (prod.categoriaId && !_existe(categorias, prod.categoriaId))
    return `Categoría '${prod.categoriaId}' no encontrada`
  if (prod.almacenId && !_existe(almacenes, prod.almacenId))
    return `Almacén '${prod.almacenId}' no encontrado`
  if (prod.proveedorId && !_existe(proveedores, prod.proveedorId))
    return `Proveedor '${prod.proveedorId}' no encontrado`
  if (prod.stockMinimo != null && prod.stockMaximo != null && prod.stockMinimo > prod.stockMaximo)
    return 'El stock mínimo no puede ser mayor al stock máximo'
  if (prod.precioVenta != null && prod.precioVenta < 0)
    return 'El precio de venta no puede ser negativo'
  return null
}

// ── Movimientos ───────────────────────────────────────────
export function validateMovimiento(mov, { productos = [], almacenes = [] }) {
  if (!mov.productoId)
    return 'El producto es obligatorio'
  if (!_existe(productos, mov.productoId))
    return `Producto '${mov.productoId}' no encontrado`
  if (mov.almacenId && !_existe(almacenes, mov.almacenId))
    return `Almacén '${mov.almacenId}' no encontrado`
  if (!mov.cantidad || mov.cantidad <= 0)
    return 'La cantidad debe ser mayor a cero'
  if (mov.costoUnitario != null && mov.costoUnitario < 0)
    return 'El costo unitario no puede ser negativo'
  return null
}

// ── Órdenes de Compra ─────────────────────────────────────
export function validateOrden(orden, { proveedores = [], productos = [] }) {
  if (!orden.proveedorId)
    return 'El proveedor es obligatorio'
  if (!_existe(proveedores, orden.proveedorId))
    return `Proveedor '${orden.proveedorId}' no encontrado`
  if (!orden.items?.length)
    return 'La orden debe tener al menos un ítem'
  for (const item of orden.items) {
    if (!_existe(productos, item.productoId))
      return `Producto '${item.productoId}' no encontrado en ítem`
    if (!item.cantidad || item.cantidad <= 0)
      return 'Cada ítem debe tener cantidad mayor a cero'
    if (item.costoUnitario != null && item.costoUnitario < 0)
      return 'El costo unitario de un ítem no puede ser negativo'
  }
  return null
}

// ── Despachos ─────────────────────────────────────────────
export function validateDespacho(des, { clientes = [], almacenes = [], productos = [] }) {
  if (!des.clienteId)
    return 'El cliente es obligatorio'
  if (!_existe(clientes, des.clienteId))
    return `Cliente '${des.clienteId}' no encontrado`
  if (des.almacenId && !_existe(almacenes, des.almacenId))
    return `Almacén '${des.almacenId}' no encontrado`
  if (!des.items?.length)
    return 'El despacho debe tener al menos un ítem'
  for (const item of des.items) {
    if (!_existe(productos, item.productoId))
      return `Producto '${item.productoId}' no encontrado en ítem`
    if (!item.cantidad || item.cantidad <= 0)
      return 'Cada ítem debe tener cantidad mayor a cero'
  }
  return null
}

// ── Clientes ──────────────────────────────────────────────
export function validateCliente(cli) {
  if (!cli.razonSocial?.trim())
    return 'La razón social es obligatoria'
  if (cli.ruc && !/^\d{8,11}$/.test(cli.ruc.trim()))
    return 'El RUC debe tener entre 8 y 11 dígitos'
  if (cli.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cli.email.trim()))
    return 'El email no tiene un formato válido'
  return null
}

// ── Transferencias ────────────────────────────────────────
export function validateTransferencia(tr, { productos = [], almacenes = [] }) {
  if (!_existe(productos, tr.productoId))
    return `Producto '${tr.productoId}' no encontrado`
  if (!_existe(almacenes, tr.almacenOrigenId))
    return `Almacén origen '${tr.almacenOrigenId}' no encontrado`
  if (!_existe(almacenes, tr.almacenDestinoId))
    return `Almacén destino '${tr.almacenDestinoId}' no encontrado`
  if (tr.almacenOrigenId === tr.almacenDestinoId)
    return 'El almacén origen y destino no pueden ser el mismo'
  if (!tr.cantidad || tr.cantidad <= 0)
    return 'La cantidad debe ser mayor a cero'
  return null
}

// ── Usuarios ──────────────────────────────────────────────
export function validateUsuario(u, { rolesValidos = ['admin', 'supervisor', 'almacenero'] } = {}) {
  if (!u.nombre?.trim())
    return 'El nombre es obligatorio'
  if (!u.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email.trim()))
    return 'El email no tiene un formato válido'
  if (!u.id && !u.password?.trim())
    return 'La contraseña es obligatoria para usuarios nuevos'
  if (u.rol && !rolesValidos.includes(u.rol))
    return `Rol '${u.rol}' no es válido. Opciones: ${rolesValidos.join(', ')}`
  return null
}
