/** Exportación CSV liviana, sin dependencias — mismo patrón que la referencia externa. */
export function exportCsv(rows, filename) {
  const csv = rows.map(row => row.map(cell => {
    const value = cell == null ? '' : String(cell)
    return /[",\n]/.test(value) ? `"${value.replace(/"/g,'""')}"` : value
  }).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
