import ExcelJS from 'exceljs'
import readXlsxFile from 'read-excel-file/browser'

// Utilidades de importación por Excel. Reemplazan a `xlsx` (SheetJS), que tenía
// una vuln ALTA sin parche (Prototype Pollution + ReDoS) y corría sobre archivos
// que sube el usuario. Lectura → `read-excel-file` (sin dependencias). Escritura
// de la plantilla → `exceljs` (el mismo que usan las exportaciones).

/** Genera un .xlsx (encabezados + filas de ejemplo) y dispara la descarga. */
export async function descargarPlantillaExcel({ nombreHoja = 'Plantilla', nombreArchivo, columnas, filas = [] }) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(nombreHoja.slice(0, 31))
  ws.addRow(columnas)
  ws.getRow(1).font = { bold: true }
  for (const f of filas) ws.addRow(f)
  ws.columns = columnas.map((c) => ({ width: Math.max(14, String(c).length + 4) }))

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombreArchivo}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

function parsearCsv(texto) {
  const filas = []
  let fila = []
  let campo = ''
  let entreComillas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (entreComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++ }
        else entreComillas = false
      } else campo += c
    } else if (c === '"') {
      entreComillas = true
    } else if (c === ',' || c === ';') {
      fila.push(campo); campo = ''
    } else if (c === '\n') {
      fila.push(campo); filas.push(fila); fila = []; campo = ''
    } else if (c !== '\r') {
      campo += c
    }
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila) }
  return filas
}

/**
 * Lee un archivo de importación (.xlsx o .csv) y devuelve las filas como
 * `string[][]` — cada celda coercionada a string y `trim()`, para que el resto
 * del flujo (que ya trataba todo como texto) no cambie.
 */
export async function leerFilasExcel(file) {
  const esCsv = /\.csv$/i.test(file.name || '')
  if (esCsv) {
    const texto = await file.text()
    return parsearCsv(texto)
      .map((r) => r.map((c) => String(c ?? '').trim()))
      .filter((r) => r.some((c) => c !== ''))
  }
  const rows = await readXlsxFile(file)
  return rows
    .map((r) => r.map((c) => (c == null ? '' : c instanceof Date ? c.toISOString().slice(0, 10) : String(c).trim())))
    .filter((r) => r.some((c) => c !== ''))
}
