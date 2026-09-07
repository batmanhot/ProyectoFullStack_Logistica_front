/**
 * Resuelve el precio de un producto dentro de una Lista de Precios:
 * override puntual (`lista.precios[productoId]`) > descuento% sobre precioVenta >
 * markup% sobre precioCompra > precioVenta base del catálogo.
 * El markup solo aplica si hay costo registrado (`precioCompra > 0`) — si no,
 * cae al precio base en vez de devolver 0 (ver docs/BITACORA.md 2026-08-04).
 * Compartido entre ListaPrecios.jsx (vista/edición de la lista) y Proformas.jsx
 * (autocompletado de precio según la lista asignada al cliente).
 */
export function getPrecio(prod, lista) {
  const pmp  = Number(prod.precioCompra || 0)
  const base = Number(prod.precioVenta  || 0)
  const especial = lista?.precios?.[prod.id]
  if (especial !== undefined) return especial
  if (lista?.descuento > 0) return +(base * (1 - lista.descuento / 100)).toFixed(2)
  if (lista?.markup > 0 && pmp > 0) return +(pmp * (1 + lista.markup / 100)).toFixed(2)
  return base
}
