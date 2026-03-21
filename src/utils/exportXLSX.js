/**
 * exportXLSX.js — Exportación a Excel FORMATEADA
 * Usa ExcelJS cargado dinámicamente desde CDN
 * ExcelJS sí soporta estilos (colores, negrita, bordes, autofit) a diferencia
 * de SheetJS free que ignora la propiedad .s en el output
 *
 * Formato igual a la imagen de referencia:
 *   - Fila 1 título del reporte (merge, verde oscuro, texto blanco grande)
 *   - Fila 2 metadata (empresa, fecha, total registros) gris
 *   - Fila 3 vacía separadora
 *   - Fila 4 cabeceras: fondo #0F4C35, texto blanco, negrita, centrado
 *   - Filas de datos: alternadas #1E2835 / #161D28, texto claro
 *   - Fila final TOTALES: fondo #0F4C35, texto verde, negrita
 *   - Columnas con autofit según contenido
 *   - Freeze primera fila de cabeceras
 *   - Bordes sutiles en todas las celdas de datos
 */

let _ExcelJS = null

async function loadExcelJS() {
  if (_ExcelJS) return _ExcelJS
  if (window.ExcelJS) { _ExcelJS = window.ExcelJS; return _ExcelJS }
  await new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js'
    s.onload = res
    s.onerror = rej
    document.head.appendChild(s)
  })
  _ExcelJS = window.ExcelJS
  if (!_ExcelJS) throw new Error('ExcelJS no pudo cargarse')
  return _ExcelJS
}

// ── Paleta de colores ─────────────────────────────────
const COLOR = {
  headerBg:    '0F4C35',   // verde oscuro cabecera
  headerFg:    'FFFFFF',   // texto blanco
  titleBg:     '082E1E',   // verde muy oscuro título
  titleFg:     '00C896',   // verde acento
  metaBg:      '1A2230',   // fondo meta
  metaFg:      '9BA8B6',   // texto gris
  rowEven:     '161D28',   // fila par
  rowOdd:      '1E2835',   // fila impar
  rowFg:       'E8EDF2',   // texto filas
  rowFgMuted:  '9BA8B6',   // texto secundario
  totalBg:     '0F4C35',   // fondo totales
  totalFg:     '00C896',   // texto totales
  borderColor: '2A3748',   // borde sutil
}

function borderStyle() {
  const b = { style:'thin', color:{ argb:'FF'+COLOR.borderColor } }
  return { top:b, left:b, bottom:b, right:b }
}

function fillSolid(hex) {
  return { type:'pattern', pattern:'solid', fgColor:{ argb:'FF'+hex } }
}

/**
 * Función principal de exportación formateada
 * @param {string} titulo        Nombre del reporte
 * @param {string[]} cabeceras   Array de nombres de columna
 * @param {Array[]} filas        Array de arrays con datos
 * @param {string[]} totales     Fila de totales (opcional)
 * @param {string} empresa       Nombre de empresa
 * @param {string} nombreArchivo Nombre del archivo sin extensión
 * @param {Object} opciones      { anchos: number[] opcional }
 */
export async function exportarExcel({
  titulo,
  cabeceras,
  filas,
  totales,
  empresa = '',
  nombreArchivo,
  opciones = {}
}) {
  const EJS = await loadExcelJS()
  const wb  = new EJS.Workbook()
  wb.creator  = 'StockPro v2.0'
  wb.created  = new Date()

  const ws = wb.addWorksheet(titulo.slice(0, 31), {
    views: [{ state:'frozen', ySplit:4 }]  // freeze hasta fila 4 (inicio de datos)
  })

  const nCols = cabeceras.length

  // ── Fila 1: Título del reporte ────────────────────
  ws.addRow([titulo])
  const titleRow = ws.getRow(1)
  titleRow.height = 28
  ws.mergeCells(1, 1, 1, nCols)
  const titleCell = ws.getCell('A1')
  titleCell.value = titulo.toUpperCase()
  titleCell.fill  = fillSolid(COLOR.titleBg)
  titleCell.font  = { bold:true, size:13, color:{ argb:'FF'+COLOR.titleFg }, name:'Arial' }
  titleCell.alignment = { horizontal:'left', vertical:'middle', indent:1 }
  titleCell.border = borderStyle()

  // ── Fila 2: Metadata ──────────────────────────────
  const hoy = new Date().toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
  ws.addRow([`${empresa || 'StockPro'}   ·   Generado: ${hoy}   ·   ${filas.length} registros`])
  const metaRow = ws.getRow(2)
  metaRow.height = 16
  ws.mergeCells(2, 1, 2, nCols)
  const metaCell = ws.getCell('A2')
  metaCell.fill  = fillSolid(COLOR.metaBg)
  metaCell.font  = { size:8, color:{ argb:'FF'+COLOR.metaFg }, name:'Arial' }
  metaCell.alignment = { horizontal:'left', vertical:'middle', indent:1 }

  // ── Fila 3: Vacía separadora ──────────────────────
  ws.addRow([])
  ws.getRow(3).height = 4
  for (let c = 1; c <= nCols; c++) {
    ws.getCell(3, c).fill = fillSolid(COLOR.metaBg)
  }

  // ── Fila 4: Cabeceras ─────────────────────────────
  ws.addRow(cabeceras)
  const hdrRow = ws.getRow(4)
  hdrRow.height = 22
  hdrRow.eachCell((cell, colNum) => {
    cell.value     = cell.value
    cell.fill      = fillSolid(COLOR.headerBg)
    cell.font      = { bold:true, size:9, color:{ argb:'FF'+COLOR.headerFg }, name:'Arial' }
    cell.alignment = { horizontal:'center', vertical:'middle', wrapText:false }
    cell.border    = borderStyle()
  })

  // ── Filas de datos ────────────────────────────────
  filas.forEach((fila, rowIdx) => {
    ws.addRow(fila)
    const row    = ws.getRow(rowIdx + 5)  // filas empiezan en fila 5
    const isEven = rowIdx % 2 === 0
    row.height   = 16
    row.eachCell({ includeEmpty:true }, (cell, colNum) => {
      cell.fill   = fillSolid(isEven ? COLOR.rowEven : COLOR.rowOdd)
      cell.font   = { size:8.5, color:{ argb:'FF'+COLOR.rowFg }, name:'Arial' }
      cell.alignment = { vertical:'middle', indent:1 }
      cell.border = borderStyle()

      // Alinear números a la derecha
      const val = cell.value
      if (typeof val === 'number') {
        cell.alignment = { horizontal:'right', vertical:'middle' }
        cell.numFmt = '#,##0.00'
      } else if (typeof val === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(val)) {
        // Fechas centradas
        cell.alignment = { horizontal:'center', vertical:'middle' }
      }
    })
  })

  // ── Fila de TOTALES ───────────────────────────────
  if (totales && totales.length) {
    ws.addRow(totales)
    const totalRow = ws.getRow(filas.length + 5)
    totalRow.height = 20
    totalRow.eachCell({ includeEmpty:true }, (cell, colNum) => {
      cell.fill      = fillSolid(COLOR.totalBg)
      cell.font      = { bold:true, size:9, color:{ argb:'FF'+COLOR.totalFg }, name:'Arial' }
      cell.alignment = typeof cell.value === 'number'
        ? { horizontal:'right', vertical:'middle' }
        : { horizontal:'left', vertical:'middle', indent:1 }
      cell.border = borderStyle()
      if (typeof cell.value === 'number') {
        cell.numFmt = '#,##0.00'
      }
    })
  }

  // ── Autofit de columnas ───────────────────────────
  // Calcular ancho por contenido de cabecera + datos
  const anchos = cabeceras.map((cab, ci) => {
    const maxData = filas.reduce((mx, row) => {
      const len = String(row[ci] ?? '').length
      return len > mx ? len : mx
    }, 0)
    const cabLen = String(cab).length
    const raw    = Math.max(cabLen, maxData)
    return opciones.anchos?.[ci] ?? Math.min(40, Math.max(8, raw + 2))
  })
  ws.columns = anchos.map(w => ({ width: w }))

  // ── Descargar ─────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob   = new Blob([buffer], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  a.href       = url
  a.download   = `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ══════════════════════════════════════════════════════
// Funciones específicas por módulo
// ══════════════════════════════════════════════════════

export async function exportarInventarioXLSX(productos, categorias, almacenes, formulaValorizacion, simboloMoneda, calcPMP, valorarStockFn) {
  const activos = productos.filter(p => p.activo !== false)
  await exportarExcel({
    titulo: 'Inventario Valorizado',
    cabeceras: ['SKU','Producto','Descripción','Categoría','Almacén','Stock','U.M.','Stock Mín.','Stock Máx.',`Costo ${formulaValorizacion}`,'Precio Venta','Margen %','Valor Stock','Estado'],
    filas: activos.map(p => {
      const pmp   = calcPMP(p.batches||[])
      const valor = valorarStockFn(p.batches||[], formulaValorizacion)
      const margen = p.precioVenta>0 ? +(((p.precioVenta-pmp)/p.precioVenta)*100).toFixed(1) : '—'
      const cat   = categorias.find(c=>c.id===p.categoriaId)?.nombre||'—'
      const alm   = almacenes.find(a=>a.id===p.almacenId)?.nombre||'—'
      const estado = p.stockActual<=0?'Agotado':p.stockActual<=p.stockMinimo?'Crítico':'OK'
      return [p.sku, p.nombre, p.descripcion||'', cat, alm,
              p.stockActual, p.unidadMedida, p.stockMinimo, p.stockMaximo,
              +pmp.toFixed(2), +(p.precioVenta||0).toFixed(2),
              typeof margen==='number'?margen+'%':'—',
              +valor.toFixed(2), estado]
    }),
    totales: ['','','','','TOTAL',activos.length,'','','','','',
              '', +activos.reduce((s,p)=>s+valorarStockFn(p.batches||[],formulaValorizacion),0).toFixed(2),''],
    nombreArchivo: 'inventario_valorizado',
  })
}

export async function exportarMovimientosXLSX(movimientos, productos, almacenes, simboloMoneda) {
  await exportarExcel({
    titulo: 'Historial de Movimientos',
    cabeceras: ['Fecha','Hora','Tipo','Documento','Producto','SKU','Almacén','Cantidad','U.M.','Costo Unit.','Costo Total','Lote','Motivo'],
    filas: movimientos.map(m => {
      const p   = productos.find(x=>x.id===m.productoId)
      const alm = almacenes.find(a=>a.id===m.almacenId)
      const hora = m.createdAt ? new Date(m.createdAt).toTimeString().slice(0,8) : ''
      return [m.fecha, hora, m.tipo, m.documento||'', p?.nombre||'—', p?.sku||'—',
              alm?.nombre||'—', m.cantidad, p?.unidadMedida||'',
              +(m.costoUnitario||0).toFixed(2), +(m.costoTotal||0).toFixed(2),
              m.lote||'', m.motivo||'']
    }),
    totales: ['TOTAL','','','','','','',movimientos.length,'','',
              +movimientos.reduce((s,m)=>s+(m.costoTotal||0),0).toFixed(2),'',''],
    nombreArchivo: 'historial_movimientos',
  })
}

export async function exportarDespachosXLSX(despachos, clientes, almacenes, simboloMoneda) {
  await exportarExcel({
    titulo: 'Reporte de Despachos',
    cabeceras: ['N° Guía','Fecha','Estado','Cliente','RUC','Almacén','Dir. Entrega','Subtotal','IGV','Total','Transportista','Obs.'],
    filas: despachos.map(d => {
      const cli = clientes.find(c=>c.id===d.clienteId)
      const alm = almacenes.find(a=>a.id===d.almacenId)
      return [d.numero, d.fecha, d.estado, cli?.razonSocial||'—', cli?.ruc||'',
              alm?.nombre||'—', d.direccionEntrega||'',
              +(d.subtotal||0).toFixed(2), +(d.igv||0).toFixed(2), +(d.total||0).toFixed(2),
              d.transportista||'', d.observaciones||'']
    }),
    totales: ['TOTAL','',`${despachos.length} despachos`,'','','','','','',
              +despachos.reduce((s,d)=>s+(d.total||0),0).toFixed(2),'',''],
    nombreArchivo: 'reporte_despachos',
  })
}

export async function exportarAuditoriaXLSX(logs) {
  await exportarExcel({
    titulo: 'Auditoría del Sistema',
    cabeceras: ['Fecha','Hora','Usuario','Acción','Módulo','Detalle','Timestamp'],
    filas: logs.map(l => [l.fecha, l.hora, l.usuarioNombre, l.accion, l.modulo, l.detalle, l.timestamp]),
    nombreArchivo: 'auditoria_sistema',
  })
}

export async function exportarRentabilidadXLSX(rentabilidad, kpisRent, simboloMoneda) {
  await exportarExcel({
    titulo: 'Reporte de Rentabilidad',
    cabeceras: ['SKU','Producto','Categoría','Costo PMP','Precio Venta','Uds. Vendidas','Costo Ventas','Ingresos','Margen S/','Margen %','ABC'],
    filas: rentabilidad.map(r => [
      r.sku, r.nombre, r.catNombre,
      +r.pmp.toFixed(2), r.precioVenta>0?+r.precioVenta.toFixed(2):0,
      r.unidadesVend, +r.costoVentas.toFixed(2), +r.ingresos.toFixed(2),
      +r.margenBruto.toFixed(2),
      r.margenPct!==null?+r.margenPct.toFixed(1):0, r.abc,
    ]),
    totales: ['TOTAL','','','','','',
              +kpisRent.totalCosto.toFixed(2), +kpisRent.totalIngresos.toFixed(2),
              +kpisRent.totalMargen.toFixed(2), +kpisRent.margenPct.toFixed(1), ''],
    nombreArchivo: 'reporte_rentabilidad',
  })
}

export async function exportarDevolucionesXLSX(devoluciones, productos, proveedores, clientes, simboloMoneda) {
  await exportarExcel({
    titulo: 'Reporte de Devoluciones',
    cabeceras: ['Fecha','Documento','Tipo','Referencia','Producto','SKU','Estado Item','Cantidad','Costo Unit.','Costo Total','Motivo','Notas'],
    filas: devoluciones.map(d => {
      const p = productos.find(x=>x.id===d.productoId)
      return [d.fecha, d.documento||'—', d.tipo==='CLIENTE'?'De cliente':'A proveedor',
              d.referenciaDoc||'—', p?.nombre||'—', p?.sku||'—',
              d.estadoItem||'—', d.cantidad,
              +(d.costoUnitario||0).toFixed(2), +(d.costoTotal||0).toFixed(2),
              d.motivo||'—', d.notas||'']
    }),
    totales: ['TOTAL',`${devoluciones.length} registros`,'','','','','','','',
              +devoluciones.reduce((s,d)=>s+(d.costoTotal||0),0).toFixed(2),'',''],
    nombreArchivo: 'reporte_devoluciones',
  })
}

export async function exportarTransferenciasXLSX(transferencias, productos, almacenes, simboloMoneda) {
  await exportarExcel({
    titulo: 'Reporte de Transferencias',
    cabeceras: ['Fecha','N° Transferencia','Producto','SKU','Almacén Origen','Almacén Destino','Cantidad','U.M.','Costo Unit.','Costo Total','Motivo','Notas'],
    filas: transferencias.map(t => {
      const p    = productos.find(x=>x.id===t.productoId)
      const orig = almacenes.find(a=>a.id===t.almacenOrigenId)
      const dest = almacenes.find(a=>a.id===t.almacenDestinoId)
      return [t.fecha, t.numero||'—', p?.nombre||'—', p?.sku||'—',
              orig?.nombre||'—', dest?.nombre||'—',
              t.cantidad, p?.unidadMedida||'',
              +(t.costoUnitario||0).toFixed(2), +(t.costoTotal||0).toFixed(2),
              t.motivo||'—', t.notas||'']
    }),
    totales: ['TOTAL',`${transferencias.length} registros`,'','','','','','','',
              +transferencias.reduce((s,t)=>s+(t.costoTotal||0),0).toFixed(2),'',''],
    nombreArchivo: 'reporte_transferencias',
  })
}

export async function exportarOrdenesXLSX(ordenes, proveedores, productos, simboloMoneda) {
  await exportarExcel({
    titulo: 'Órdenes de Compra',
    cabeceras: ['N° OC','Fecha','F. Entrega','Proveedor','RUC','Estado','Ítems','Subtotal','IGV','Total','Notas'],
    filas: ordenes.map(o => {
      const prov = proveedores.find(p=>p.id===o.proveedorId)
      return [o.numero, o.fecha, o.fechaEntrega||'—',
              prov?.razonSocial||'—', prov?.ruc||'—', o.estado,
              o.items?.length||0,
              +(o.subtotal||0).toFixed(2), +(o.igv||0).toFixed(2), +(o.total||0).toFixed(2),
              o.notas||'']
    }),
    totales: ['TOTAL',`${ordenes.length} órdenes`,'','','','','','','',
              +ordenes.reduce((s,o)=>s+(o.total||0),0).toFixed(2),''],
    nombreArchivo: 'ordenes_de_compra',
  })
}

export async function exportarCotizacionesXLSX(cotizaciones, proveedores, productos) {
  await exportarExcel({
    titulo: 'Cotizaciones a Proveedores (RFQ)',
    cabeceras: ['N° RFQ','Fecha','F. Vencimiento','Estado','Ítems solicitados','Respuestas','Mejor precio','Proveedor ganador','Notas'],
    filas: cotizaciones.map(c => {
      const respG = c.respuestas?.find(r=>r.ganadora)
      const provG = respG ? proveedores.find(p=>p.id===respG.proveedorId)?.razonSocial||'—' : '—'
      return [c.numero, c.fecha, c.fechaVencimiento||'—', c.estado,
              c.items?.length||0, c.respuestas?.length||0,
              respG ? +respG.total.toFixed(2) : '—', provG, c.notas||'']
    }),
    nombreArchivo: 'cotizaciones_proveedores',
  })
}

export async function exportarProveedoresXLSX(proveedores) {
  await exportarExcel({
    titulo: 'Directorio de Proveedores',
    cabeceras: ['Razón Social','RUC','Contacto','Teléfono','Email','Dirección','Plazo Entrega (días)','Estado'],
    filas: proveedores.map(p => [
      p.razonSocial, p.ruc||'—', p.contacto||'—', p.telefono||'—',
      p.email||'—', p.direccion||'—',
      p.plazoEntrega||'—', p.activo!==false?'Activo':'Inactivo'
    ]),
    totales: ['TOTAL',`${proveedores.length} proveedores`,
              `Activos: ${proveedores.filter(p=>p.activo!==false).length}`,'','','','',''],
    nombreArchivo: 'directorio_proveedores',
  })
}

export async function exportarClientesXLSX(clientes) {
  await exportarExcel({
    titulo: 'Directorio de Clientes',
    cabeceras: ['Razón Social','RUC/DNI','Contacto','Teléfono','Email','Dirección','Condición Pago','Estado'],
    filas: clientes.map(c => [
      c.razonSocial, c.ruc||'—', c.contacto||'—', c.telefono||'—',
      c.email||'—', c.direccion||'—',
      c.condicionPago ? `${c.condicionPago} días` : 'Contado',
      c.activo!==false?'Activo':'Inactivo'
    ]),
    totales: ['TOTAL',`${clientes.length} clientes`,
              `Activos: ${clientes.filter(c=>c.activo!==false).length}`,'','','','',''],
    nombreArchivo: 'directorio_clientes',
  })
}

export async function exportarVencimientosXLSX(productos, categorias, almacenes, simboloMoneda, calcPMP) {
  const conVenc = productos.filter(p=>p.activo!==false&&p.tieneVencimiento&&p.fechaVencimiento)
    .sort((a,b)=>a.fechaVencimiento.localeCompare(b.fechaVencimiento))
  await exportarExcel({
    titulo: 'Control de Vencimientos',
    cabeceras: ['SKU','Producto','Categoría','Almacén','Stock','U.M.','Fecha Vencimiento','Días restantes','Costo PMP','Valor Stock','Estado'],
    filas: conVenc.map(p => {
      const diff   = Math.ceil((new Date(p.fechaVencimiento+'T12:00:00')-new Date())/86400000)
      const estado = diff<0?'VENCIDO':diff<=15?'CRÍTICO':diff<=30?'URGENTE':diff<=90?'PRÓXIMO':'OK'
      const cat    = categorias.find(c=>c.id===p.categoriaId)?.nombre||'—'
      const alm    = almacenes.find(a=>a.id===p.almacenId)?.nombre||'—'
      const pmp    = calcPMP(p.batches||[])
      return [p.sku, p.nombre, cat, alm, p.stockActual, p.unidadMedida,
              p.fechaVencimiento, diff, +pmp.toFixed(2),
              +(p.stockActual*pmp).toFixed(2), estado]
    }),
    totales: ['TOTAL',`${conVenc.length} productos`,'','','','','','','','',
              `Vencidos: ${conVenc.filter(p=>Math.ceil((new Date(p.fechaVencimiento+'T12:00:00')-new Date())/86400000)<0).length}`],
    nombreArchivo: 'control_vencimientos',
  })
}

export async function exportarProformasXLSX(proformas, clientes, simboloMoneda) {
  await exportarExcel({
    titulo: 'Proformas / Cotizaciones de Venta',
    cabeceras: ['N° Proforma','Fecha','Válida hasta','Cliente','RUC','Estado','Ítems','Subtotal','IGV','Total','Notas'],
    filas: proformas.map(p => {
      const cli = clientes.find(c=>c.id===p.clienteId)
      return [p.numero, p.fecha, p.fechaVencimiento||'—',
              cli?.razonSocial||'—', cli?.ruc||'—', p.estado,
              p.items?.length||0,
              +(p.subtotal||0).toFixed(2), +(p.igv||0).toFixed(2), +(p.total||0).toFixed(2),
              p.notas||'']
    }),
    totales: ['TOTAL',`${proformas.length} proformas`,'','','','','','','',
              +proformas.reduce((s,p)=>s+(p.total||0),0).toFixed(2),''],
    nombreArchivo: 'proformas_venta',
  })
}

export async function exportarCxCXLSX(docs, clientes, simboloMoneda) {
  await exportarExcel({
    titulo: 'Cuentas por Cobrar',
    cabeceras: ['N° Doc.','Cliente','RUC','Fecha Emisión','Fecha Vencimiento','Días Crédito','Días Mora','Monto','Saldo','Estado','Notas'],
    filas: docs.map(d => {
      const cli  = clientes.find(c=>c.id===d.clienteId)
      const mora = d.estado==='VENCIDA'?Math.max(0,Math.ceil((new Date()-new Date(d.fechaVencimiento+'T12:00:00'))/86400000)):0
      return [d.numero, cli?.razonSocial||'—', cli?.ruc||'—',
              d.fechaEmision||'—', d.fechaVencimiento||'—',
              d.diasCredito||0, mora,
              +(d.monto||0).toFixed(2), +(d.saldo||0).toFixed(2), d.estado, d.notas||'']
    }),
    totales: ['TOTAL',`${docs.length} documentos`,'','','','','',
              +docs.reduce((s,d)=>s+(d.monto||0),0).toFixed(2),
              +docs.reduce((s,d)=>s+(d.saldo||0),0).toFixed(2),'',''],
    nombreArchivo: 'cuentas_por_cobrar',
  })
}

export async function exportarListaPreciosXLSX(lista, productos, categorias, simboloMoneda, calcPMP) {
  const nombre = lista?.nombre||'Lista General'
  await exportarExcel({
    titulo: `Lista de Precios — ${nombre}`,
    cabeceras: ['SKU','Producto','Categoría','U.M.','Costo PMP','Precio Base','Precio Lista','Descuento %','Margen %'],
    filas: productos.filter(p=>p.activo!==false).map(p => {
      const cat  = categorias.find(c=>c.id===p.categoriaId)?.nombre||'—'
      const pmp  = calcPMP(p.batches||[])
      const base = p.precioVenta||0
      const prec = lista?.precios?.[p.id] ??
                   (lista?.descuento>0 ? +(base*(1-lista.descuento/100)).toFixed(2) :
                    lista?.markup>0    ? +(pmp*(1+lista.markup/100)).toFixed(2) : base)
      const marg = prec>0&&pmp>0 ? +(((prec-pmp)/prec)*100).toFixed(1) : 0
      const desc = base>0&&prec<base ? +(((base-prec)/base)*100).toFixed(1) : 0
      return [p.sku, p.nombre, cat, p.unidadMedida,
              +pmp.toFixed(2), +base.toFixed(2), +prec.toFixed(2),
              desc||'—', marg||'—']
    }),
    nombreArchivo: `lista_precios_${nombre.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')}`,
  })
}
