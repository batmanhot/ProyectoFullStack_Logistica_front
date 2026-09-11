/**
 * StockHint — "pista de stock" para colgar debajo de un selector de artículo.
 *
 * `disponible` ya viene calculado (ver hook useStockPorAlmacen): unidades
 * libres = cantidad − reservado. `requerido` opcional: si la cantidad que se
 * quiere mover lo excede, el texto pasa a rojo. `contexto` = nombre del
 * almacén (o "todos los almacenes") para que el número sea inequívoco.
 */
export default function StockHint({ disponible, unidad, requerido, contexto }) {
  if (disponible == null) return null
  const req = requerido === '' || requerido == null ? null : Number(requerido)
  const excede = req != null && Number.isFinite(req) && req > disponible
  const cls = excede ? 'text-red-400' : disponible <= 0 ? 'text-amber-400' : 'text-[#5f6f80]'
  return (
    <div className={`text-[11px] mt-1 ${cls}`}>
      {disponible <= 0
        ? `Sin stock disponible${contexto ? ` en ${contexto}` : ''}`
        : `Disponible${contexto ? ` en ${contexto}` : ''}: ${disponible}${unidad ? ` ${unidad}` : ''}`}
      {excede && ` — pides ${req}, excede lo disponible`}
    </div>
  )
}
