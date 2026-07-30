import ExcelJS from 'exceljs'
import { mostrarPreviewExport } from './exportPreview'

/**
 * exportXLSX.js — Exportación a Excel con formato (ExcelJS).
 * Nota: el paquete `xlsx` (SheetJS Community) instalado en este proyecto NO
 * escribe estilos de celda al generar .xlsx (solo la edición Pro lo soporta) —
 * por eso la generación real usa ExcelJS, que sí permite fills/bordes/negritas
 * y reproduce el mismo look del modal de vista previa. `xlsx` se sigue usando
 * en Configuracion.jsx solo para leer plantillas de importación.
 */

// Color de marca activo (el mismo --accent que usa el modal de preview),
// para que el archivo generado coincida con el tema visual actual.
function colorAcento() {
  try {
    const css = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    if (/^#[0-9a-f]{6}$/i.test(css)) return 'FF' + css.slice(1).toUpperCase()
  } catch { /* SSR / entorno sin DOM */ }
  return 'FF00C896'
}

export async function exportarExcel({
  titulo,
  cabeceras,
  filas,
  totales,
  empresa = '',
  nombreArchivo,
}) {
  const ok = await mostrarPreviewExport({ titulo, cabeceras, filas, totales, empresa, tipo: 'excel' })
  if (!ok) return

  const acento = colorAcento()
  const hoy = new Date().toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
  const meta = `${empresa || 'StockPro'}   ·   Generado: ${hoy}   ·   ${filas.length} registros`

  const wb = new ExcelJS.Workbook()
  wb.creator = 'StockPro'
  wb.created = new Date()
  const ws = wb.addWorksheet(titulo.slice(0, 31))

  const nCols = cabeceras.length
  ws.columns = cabeceras.map((cab, ci) => {
    const maxData = filas.reduce((mx, row) => Math.max(mx, String(row[ci] ?? '').length), 0)
    return { width: Math.min(40, Math.max(10, Math.max(String(cab).length, maxData) + 2)) }
  })

  // ── Título ──────────────────────────────────────────────
  const filaTitulo = ws.addRow([titulo.toUpperCase()])
  ws.mergeCells(filaTitulo.number, 1, filaTitulo.number, nCols)
  filaTitulo.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1A1A1A' } }
  filaTitulo.height = 22

  // ── Metadatos (empresa · fecha · registros) ────────────
  const filaMeta = ws.addRow([meta])
  ws.mergeCells(filaMeta.number, 1, filaMeta.number, nCols)
  filaMeta.getCell(1).font = { size: 10, italic: true, color: { argb: 'FF6B7280' } }

  ws.addRow([]) // separador

  // ── Cabecera ────────────────────────────────────────────
  const filaHeader = ws.addRow(cabeceras)
  filaHeader.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: acento } }
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false }
    cell.border = { bottom: { style: 'medium', color: { argb: acento } } }
  })
  filaHeader.height = 20
  ws.views = [{ state: 'frozen', ySplit: filaHeader.number }]

  // ── Filas de datos (bandas alternadas + bordes finos) ──
  const bordeSuave = { style: 'thin', color: { argb: 'FFE5E7EB' } }
  filas.forEach((fila, i) => {
    const row = ws.addRow(fila)
    const fondo = i % 2 === 1 ? 'FFF7F9FA' : 'FFFFFFFF'
    row.eachCell({ includeEmpty: true }, cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondo } }
      cell.border = { top: bordeSuave, bottom: bordeSuave, left: bordeSuave, right: bordeSuave }
      cell.font = { size: 10, color: { argb: 'FF1F2937' } }
    })
  })

  // ── Totales ─────────────────────────────────────────────
  if (totales && totales.length) {
    const filaTot = ws.addRow(totales)
    filaTot.eachCell({ includeEmpty: true }, cell => {
      cell.font = { bold: true, size: 10, color: { argb: acento } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF7F3' } }
      cell.border = { top: { style: 'medium', color: { argb: acento } } }
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url  = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`
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
      const pmp   = calcPMP(p)
      const valor = valorarStockFn(p)
      const margen = p.precioVenta>0 ? +(((p.precioVenta-pmp)/p.precioVenta)*100).toFixed(1) : '—'
      const cat   = categorias.find(c=>c.id===p.categoriaId)?.nombre||'—'
      const alm   = almacenes.find(a=>a.id===p.almacenId)?.nombre||'—'
      const estado = p.stockActual<=0?'Agotado':p.stockActual<=p.stockMinimo?'Crítico':'OK'
      return [p.sku, p.nombre, p.descripcion||'', cat, alm,
              p.stockActual, p.unidadMedida, p.stockMinimo, p.stockMaximo,
              +pmp.toFixed(2), +Number(p.precioVenta||0).toFixed(2),
              typeof margen==='number'?margen+'%':'—',
              +valor.toFixed(2), estado]
    }),
    totales: ['','','','','TOTAL',activos.length,'','','','','',
              '', +activos.reduce((s,p)=>s+valorarStockFn(p),0).toFixed(2),''],
    nombreArchivo: 'inventario_valorizado',
  })
}

export async function exportarProductosXLSX(productos, categorias) {
  await exportarExcel({
    titulo: 'Inventario de Productos',
    cabeceras: ['SKU','Producto','Categoría','Stock','U.M.','Stock Mín.','Stock Máx.','Precio Compra','Precio Venta','Margen %','Valor Stock','Estado'],
    filas: productos.map(p => {
      const cat = categorias.find(c=>c.id===p.categoriaId)?.nombre||'—'
      const costo = Number(p.precioCompra||0)
      const venta = Number(p.precioVenta||0)
      const margen = venta>0 ? +(((venta-costo)/venta)*100).toFixed(1) : '—'
      const estado = p.stockActual<=0?'Agotado':p.stockActual<=p.stockMinimo?'Crítico':'OK'
      return [p.sku, p.nombre, cat, p.stockActual, p.unidadMedida, p.stockMinimo, p.stockMaximo,
              +costo.toFixed(2), +venta.toFixed(2),
              typeof margen==='number'?margen+'%':'—',
              +(costo*p.stockActual).toFixed(2), estado]
    }),
    totales: ['TOTAL','','',productos.length,'','','','','','',
              +productos.reduce((s,p)=>s+Number(p.precioCompra||0)*p.stockActual,0).toFixed(2),''],
    nombreArchivo: 'inventario_productos',
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
      const costoUnitario = Number(m.costoUnitario||0)
      const costoTotal    = costoUnitario * Number(m.cantidad||0)
      return [m.fecha, hora, m.tipo, m.documento||'', p?.nombre||'—', p?.sku||'—',
              alm?.nombre||'—', m.cantidad, p?.unidadMedida||'',
              +costoUnitario.toFixed(2), +costoTotal.toFixed(2),
              m.lote||'', m.motivo||'']
    }),
    totales: ['TOTAL','','','','','','',movimientos.length,'','',
              +movimientos.reduce((s,m)=>s+Number(m.costoUnitario||0)*Number(m.cantidad||0),0).toFixed(2),'',''],
    nombreArchivo: 'historial_movimientos',
  })
}

export async function exportarDespachosXLSX(despachos, clientes, almacenes, transportistas, simboloMoneda) {
  await exportarExcel({
    titulo: 'Reporte de Despachos',
    cabeceras: ['N° Guía','Fecha','Estado','Cliente','RUC','Almacén','Dir. Entrega','Subtotal','IGV','Total','Transportista','Obs.'],
    filas: despachos.map(d => {
      const cli = clientes.find(c=>c.id===d.clienteId)
      const alm = almacenes.find(a=>a.id===d.almacenId)
      const tr  = transportistas.find(t=>t.id===d.transportistaId)
      return [d.numero, d.fecha, d.estado, cli?.razonSocial||'—', cli?.ruc||'',
              alm?.nombre||'—', d.direccionEntrega||'',
              +Number(d.subtotal||0).toFixed(2), +Number(d.igv||0).toFixed(2), +Number(d.total||0).toFixed(2),
              tr?.nombre||'—', d.observaciones||'']
    }),
    totales: ['TOTAL','',`${despachos.length} despachos`,'','','','','','',
              +despachos.reduce((s,d)=>s+Number(d.total||0),0).toFixed(2),'',''],
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
      +r.pmp.toFixed(2), Number(r.precioVenta)>0?+Number(r.precioVenta).toFixed(2):0,
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

export async function exportarDevolucionesXLSX(devoluciones, productos, almacenes, simboloMoneda) {
  await exportarExcel({
    titulo: 'Reporte de Devoluciones',
    cabeceras: ['Fecha','Documento','Tipo','Producto','SKU','Almacén','Cantidad','Costo Unit.','Costo Total','Motivo'],
    filas: devoluciones.map(d => {
      const p   = productos.find(x=>x.id===d.productoId)
      const alm = almacenes.find(a=>a.id===d.almacenId)
      const costoUnitario = Number(d.costoUnitario||0)
      const costoTotal    = costoUnitario * Number(d.cantidad||0)
      return [d.fecha, d.documento||'—', d.tipo==='ENTRADA'?'De cliente':'A proveedor',
              p?.nombre||'—', p?.sku||'—', alm?.nombre||'—', d.cantidad,
              +costoUnitario.toFixed(2), +costoTotal.toFixed(2), d.motivo||'—']
    }),
    totales: ['TOTAL',`${devoluciones.length} registros`,'','','','','',
              '', +devoluciones.reduce((s,d)=>s+Number(d.costoUnitario||0)*Number(d.cantidad||0),0).toFixed(2),''],
    nombreArchivo: 'reporte_devoluciones',
  })
}

export async function exportarTransferenciasXLSX(transferencias, productos, almacenes, simboloMoneda) {
  await exportarExcel({
    titulo: 'Reporte de Transferencias',
    cabeceras: ['Fecha','Documento','Producto','SKU','Almacén Origen','Almacén Destino','Cantidad','U.M.','Costo Unit.','Costo Total','Motivo'],
    filas: transferencias.map(t => {
      const p    = productos.find(x=>x.id===t.productoId)
      const orig = almacenes.find(a=>a.id===t.almacenId)
      const dest = almacenes.find(a=>a.id===t.almacenDestinoId)
      const costoUnitario = Number(t.costoUnitario||0)
      const costoTotal    = costoUnitario * Number(t.cantidad||0)
      return [t.fecha, t.documento||'—', p?.nombre||'—', p?.sku||'—',
              orig?.nombre||'—', dest?.nombre||'—',
              t.cantidad, p?.unidadMedida||'',
              +costoUnitario.toFixed(2), +costoTotal.toFixed(2),
              t.motivo||'—']
    }),
    totales: ['TOTAL',`${transferencias.length} registros`,'','','','','','',
              '', +transferencias.reduce((s,t)=>s+Number(t.costoUnitario||0)*Number(t.cantidad||0),0).toFixed(2),''],
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
              +Number(o.subtotal||0).toFixed(2), +Number(o.igv||0).toFixed(2), +Number(o.total||0).toFixed(2),
              o.notas||'']
    }),
    totales: ['TOTAL',`${ordenes.length} órdenes`,'','','','','','','',
              +ordenes.reduce((s,o)=>s+Number(o.total||0),0).toFixed(2),''],
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
              respG ? +Number(respG.total).toFixed(2) : '—', provG, c.notas||'']
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
      const pmp    = calcPMP(p)
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
              +Number(p.subtotal||0).toFixed(2), +Number(p.igv||0).toFixed(2), +Number(p.total||0).toFixed(2),
              p.notas||'']
    }),
    totales: ['TOTAL',`${proformas.length} proformas`,'','','','','','','',
              +proformas.reduce((s,p)=>s+Number(p.total||0),0).toFixed(2),''],
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
              +Number(d.monto||0).toFixed(2), +Number(d.saldo||0).toFixed(2), d.estado, d.notas||'']
    }),
    totales: ['TOTAL',`${docs.length} documentos`,'','','','','',
              +docs.reduce((s,d)=>s+Number(d.monto||0),0).toFixed(2),
              +docs.reduce((s,d)=>s+Number(d.saldo||0),0).toFixed(2),'',''],
    nombreArchivo: 'cuentas_por_cobrar',
  })
}

export async function exportarListaPreciosXLSX(lista, productos, categorias, simboloMoneda, calcPMP) {
  const nombre = lista?.nombre||'Lista General'
  await exportarExcel({
    titulo: `Lista de Precios — ${nombre}`,
    cabeceras: ['SKU','Producto','Categoría','U.M.','Costo PMP','Precio Base','Precio Lista','Descuento %','Margen %'],
    filas: productos.filter(p=>p.estado==='Activo').map(p => {
      const cat  = categorias.find(c=>c.id===p.categoriaId)?.nombre||'—'
      const pmp  = Number(calcPMP(p))
      const base = Number(p.precioVenta||0)
      const prec = Number(lista?.precios?.[p.id] ??
                   (lista?.descuento>0 ? +(base*(1-lista.descuento/100)).toFixed(2) :
                    lista?.markup>0    ? +(pmp*(1+lista.markup/100)).toFixed(2) : base))
      const marg = prec>0&&pmp>0 ? +(((prec-pmp)/prec)*100).toFixed(1) : 0
      const desc = base>0&&prec<base ? +(((base-prec)/base)*100).toFixed(1) : 0
      return [p.sku, p.nombre, cat, p.unidadMedida,
              +pmp.toFixed(2), +base.toFixed(2), +prec.toFixed(2),
              desc||'—', marg||'—']
    }),
    nombreArchivo: `lista_precios_${nombre.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')}`,
  })
}
