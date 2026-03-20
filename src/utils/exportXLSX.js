/**
 * exportXLSX.js — Exportación a Excel profesional sin backend
 * Usa SheetJS (XLSX) cargado dinámicamente desde CDN
 * Genera archivos .xlsx con: cabeceras en negrita, totales, autofit de columnas
 */

// Carga SheetJS desde CDN de forma dinámica (solo una vez)
let _XLSX = null
async function loadXLSX() {
  if (_XLSX) return _XLSX
  if (window.XLSX) { _XLSX = window.XLSX; return _XLSX }
  await new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src     = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    s.onload  = res
    s.onerror = rej
    document.head.appendChild(s)
  })
  _XLSX = window.XLSX
  return _XLSX
}

// Calcular ancho óptimo de cada columna
function calcWidths(data) {
  if (!data.length) return []
  return data[0].map((_, ci) => ({
    wch: Math.min(40, Math.max(8,
      ...data.map(row => String(row[ci] ?? '').length)
    ))
  }))
}

// Aplicar estilos básicos a la cabecera (fila 0)
function applyHeaderStyle(ws, numCols) {
  for (let c = 0; c < numCols; c++) {
    const addr = String.fromCharCode(65 + c) + '1'
    if (!ws[addr]) continue
    ws[addr].s = {
      font:    { bold: true, color: { rgb: 'FFFFFF' } },
      fill:    { fgColor: { rgb: '0F4C35' } },
      alignment: { horizontal: 'center' },
    }
  }
}

/**
 * Exportar múltiples hojas a un .xlsx
 * @param {Array<{nombre, datos, totales}>} hojas
 * @param {string} nombreArchivo
 */
export async function exportarXLSX(hojas, nombreArchivo) {
  const XLSX = await loadXLSX()
  const wb   = XLSX.utils.book_new()

  hojas.forEach(({ nombre, datos, totales }) => {
    const filas = [...datos]
    if (totales) filas.push(totales)

    const ws = XLSX.utils.aoa_to_sheet(filas)
    ws['!cols'] = calcWidths(filas)

    // Freeze primera fila (cabecera)
    ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' }

    applyHeaderStyle(ws, filas[0]?.length || 0)
    XLSX.utils.book_append_sheet(wb, ws, nombre.slice(0, 31))
  })

  const hoy = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `${nombreArchivo}_${hoy}.xlsx`)
}

// ─────────────────────────────────────────────────────
// Funciones de exportación específicas por módulo
// ─────────────────────────────────────────────────────

export async function exportarInventarioXLSX(productos, categorias, almacenes, formulaValorizacion, simboloMoneda, calcPMP, valorarStockFn) {
  const datos = [
    ['SKU', 'Producto', 'Descripción', 'Categoría', 'Almacén', 'Stock', 'U.M.', 'Stock Mín.', 'Stock Máx.', `Costo ${formulaValorizacion}`, 'Precio Venta', 'Margen %', 'Valor Stock', 'Estado'],
    ...productos.filter(p => p.activo !== false).map(p => {
      const pmp   = calcPMP(p.batches || [])
      const valor = valorarStockFn(p.batches || [], formulaValorizacion)
      const margen = p.precioVenta > 0 ? (((p.precioVenta - pmp) / p.precioVenta) * 100).toFixed(1) + '%' : '—'
      const cat   = categorias.find(c => c.id === p.categoriaId)?.nombre || '—'
      const alm   = almacenes.find(a => a.id === p.almacenId)?.nombre   || '—'
      const estado = p.stockActual <= 0 ? 'Agotado' : p.stockActual <= p.stockMinimo ? 'Crítico' : 'OK'
      return [p.sku, p.nombre, p.descripcion || '', cat, alm,
              p.stockActual, p.unidadMedida, p.stockMinimo, p.stockMaximo,
              pmp.toFixed(2), (p.precioVenta||0).toFixed(2), margen,
              valor.toFixed(2), estado]
    })
  ]
  const totalValor = productos.reduce((s, p) => s + valorarStockFn(p.batches||[], formulaValorizacion), 0)
  const totales = ['', '', '', '', 'TOTAL', productos.filter(p=>p.activo!==false).length, '', '', '',
                   '', '', '', totalValor.toFixed(2), '']

  await exportarXLSX([{ nombre: 'Inventario', datos, totales }], 'inventario_valorizado')
}

export async function exportarMovimientosXLSX(movimientos, productos, almacenes, simboloMoneda) {
  const datos = [
    ['Fecha', 'Hora', 'Tipo', 'Documento', 'Producto', 'SKU', 'Almacén', 'Cantidad', 'U.M.', 'Costo Unit.', 'Costo Total', 'Lote', 'Motivo'],
    ...movimientos.map(m => {
      const p   = productos.find(x => x.id === m.productoId)
      const alm = almacenes.find(a => a.id === m.almacenId)
      const hora = m.createdAt ? new Date(m.createdAt).toTimeString().slice(0,8) : ''
      return [m.fecha, hora, m.tipo, m.documento||'', p?.nombre||'—', p?.sku||'—',
              alm?.nombre||'—', m.cantidad, p?.unidadMedida||'', 
              (m.costoUnitario||0).toFixed(2), (m.costoTotal||0).toFixed(2),
              m.lote||'', m.motivo||'']
    })
  ]
  const totalE = movimientos.filter(m=>m.tipo==='ENTRADA').reduce((s,m)=>s+(m.costoTotal||0),0)
  const totalS = movimientos.filter(m=>m.tipo==='SALIDA').reduce((s,m)=>s+(m.costoTotal||0),0)
  const totales = ['TOTAL', '', '', '', '', '', '',
                   movimientos.length, '', '', '', '', `E:${totalE.toFixed(2)} / S:${totalS.toFixed(2)}`]

  await exportarXLSX([{ nombre: 'Movimientos', datos, totales }], 'historial_movimientos')
}

export async function exportarDespachosXLSX(despachos, clientes, almacenes, simboloMoneda) {
  const datos = [
    ['N° Guía', 'Fecha', 'Estado', 'Cliente', 'RUC', 'Almacén', 'Dirección Entrega', 'Subtotal', 'IGV', 'Total', 'Transportista', 'Observaciones'],
    ...despachos.map(d => {
      const cli = clientes.find(c => c.id === d.clienteId)
      const alm = almacenes.find(a => a.id === d.almacenId)
      return [d.numero, d.fecha, d.estado, cli?.razonSocial||'—', cli?.ruc||'',
              alm?.nombre||'—', d.direccionEntrega||'',
              (d.subtotal||0).toFixed(2), (d.igv||0).toFixed(2), (d.total||0).toFixed(2),
              d.transportista||'', d.observaciones||'']
    })
  ]
  const totalDes = despachos.reduce((s, d) => s + (d.total||0), 0)
  const totales  = ['TOTAL', '', '', despachos.length + ' despachos', '', '', '',
                    '', '', totalDes.toFixed(2), '', '']

  await exportarXLSX([{ nombre: 'Despachos', datos, totales }], 'reporte_despachos')
}

export async function exportarAuditoriaXLSX(logs, simboloMoneda) {
  const datos = [
    ['Fecha', 'Hora', 'Usuario', 'Acción', 'Módulo', 'Detalle', 'Timestamp'],
    ...logs.map(l => [l.fecha, l.hora, l.usuarioNombre, l.accion, l.modulo, l.detalle, l.timestamp])
  ]
  await exportarXLSX([{ nombre: 'Auditoría', datos }], 'auditoria_sistema')
}

export async function exportarRentabilidadXLSX(rentabilidad, kpisRent, simboloMoneda) {
  const datos = [
    ['SKU', 'Producto', 'Categoría', 'Costo PMP', 'Precio Venta', 'Uds. Vendidas', 'Costo Ventas', 'Ingresos', 'Margen S/', 'Margen %', 'Clasificación ABC'],
    ...rentabilidad.map(r => [
      r.sku, r.nombre, r.catNombre,
      r.pmp.toFixed(2), (r.precioVenta||0).toFixed(2),
      r.unidadesVend, r.costoVentas.toFixed(2), r.ingresos.toFixed(2),
      r.margenBruto.toFixed(2),
      r.margenPct !== null ? r.margenPct.toFixed(1) + '%' : '—',
      r.abc,
    ])
  ]
  const totales = ['TOTAL', '', '', '', '', '',
                   kpisRent.totalCosto.toFixed(2),
                   kpisRent.totalIngresos.toFixed(2),
                   kpisRent.totalMargen.toFixed(2),
                   kpisRent.margenPct.toFixed(1) + '%', '']

  await exportarXLSX([{ nombre: 'Rentabilidad', datos, totales }], 'reporte_rentabilidad')
}
