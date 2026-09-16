/**
 * Nombre de producto con el resaltado de marca "STOCK" + "PRO" en acento —
 * antes esto solo pasaba cuando el nombre era EXACTAMENTE "StockPro"
 * (Login.jsx, comparación `=== 'stockpro'`); en cuanto se personalizaba a
 * algo como "StockPro ERP Logistics" el efecto desaparecía por completo
 * (auditoría 2026-09-16, pedido explícito del usuario: "STOCKPRO" debe
 * resaltarse siempre que aparezca, el resto del texto se mantiene normal).
 *
 * Busca "stockpro" en cualquier parte del nombre (sin importar mayúsculas)
 * y solo colorea esas 3 letras finales ("PRO"); todo lo demás — antes y
 * después, incluido "STOCK" — queda en el color normal del texto que lo
 * rodea. Si el nombre no contiene "stockpro" (marca completamente distinta),
 * se muestra tal cual, sin resaltar nada.
 */
export default function BrandName({ nombre, accent = '#00c896' }) {
  const n = (nombre || 'StockPro').trim()
  const idx = n.toLowerCase().indexOf('stockpro')
  if (idx === -1) return <>{n}</>

  const antes  = n.slice(0, idx)
  const stock  = n.slice(idx, idx + 5)
  const pro    = n.slice(idx + 5, idx + 8)
  const despues = n.slice(idx + 8)

  return <>{antes}{stock}<span style={{ color: accent }}>{pro}</span>{despues}</>
}
