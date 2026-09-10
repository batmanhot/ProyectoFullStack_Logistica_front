// Helpers compartidos por los tabs del SuperAdmin. Antes estaban copiados
// idénticos en TabAuditoria / TabBackups / TabDashboard / TabFacturacion /
// TabMonitor / TabSuscripciones (auditoría 2026-09-09, hallazgo #7).
import { format } from 'date-fns'

const SIMBOLO = { PEN: 'S/', USD: '$', EUR: '€' }

/** Monto formateado con símbolo: `money(57.82)` → "S/ 57.82". */
export function money(n, moneda = 'PEN') {
  const s = (Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${SIMBOLO[moneda] || moneda} ${s}`
}

/** Fecha corta es-ish: `fdate('2026-09-10')` → "10 sep 2026" (o "—" si vacío). */
export const fdate = d => (d ? format(new Date(d), 'dd MMM yyyy') : '—')

/**
 * Descarga un CSV desde el navegador. `filas` es un array de arrays (la
 * primera fila suele ser el encabezado). Escapa comillas / comas / saltos y
 * antepone BOM para que Excel respete UTF-8.
 */
export function descargarCsv(nombre, filas) {
  const csv = filas
    .map(f => f.map(c => {
      const s = String(c ?? '')
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }).join(','))
    .join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
