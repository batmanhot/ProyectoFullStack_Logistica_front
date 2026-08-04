import ExcelJS from 'exceljs'
import { mostrarPreviewExport } from './exportPreview'
import { ESTADOS, PRIORIDADES } from '../pages/PedidosInternos/constants'
import { ESTADO_RUTA } from '../pages/Transportes/constants'
import { toDateStr } from '../pages/Flota/constants'

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

export async function exportarEntradasXLSX(entradas, productos, almacenes, proveedores, simboloMoneda) {
  await exportarExcel({
    titulo: 'Reporte de Entradas',
    cabeceras: ['Fecha','Documento','Producto','SKU','Almacén','Proveedor','Cantidad','Costo Unit.','Costo Total','Motivo'],
    filas: entradas.map(m => {
      const p    = productos.find(x=>x.id===m.productoId)
      const alm  = almacenes.find(a=>a.id===m.almacenId)
      const prov = proveedores.find(x=>x.id===m.proveedorId)
      const costoUnitario = Number(m.costoUnitario||0)
      const costoTotal    = costoUnitario * Number(m.cantidad||0)
      return [m.fecha, m.documento||'—', p?.nombre||'—', p?.sku||'—',
              alm?.nombre||'—', prov?.razonSocial||'—', m.cantidad,
              +costoUnitario.toFixed(2), +costoTotal.toFixed(2), m.motivo||'—']
    }),
    totales: ['TOTAL',`${entradas.length} registros`,'','','','','',
              '', +entradas.reduce((s,m)=>s+Number(m.costoUnitario||0)*Number(m.cantidad||0),0).toFixed(2),''],
    nombreArchivo: 'reporte_entradas',
  })
}

export async function exportarSalidasXLSX(salidas, productos, almacenes, simboloMoneda) {
  await exportarExcel({
    titulo: 'Reporte de Salidas',
    cabeceras: ['Fecha','Documento','Producto','SKU','Almacén','Cantidad','Costo Unit.','Costo Total','Motivo'],
    filas: salidas.map(m => {
      const p   = productos.find(x=>x.id===m.productoId)
      const alm = almacenes.find(a=>a.id===m.almacenId)
      const costoUnitario = Number(m.costoUnitario||0)
      const costoTotal    = costoUnitario * Number(m.cantidad||0)
      return [m.fecha, m.documento||'—', p?.nombre||'—', p?.sku||'—',
              alm?.nombre||'—', m.cantidad,
              +costoUnitario.toFixed(2), +costoTotal.toFixed(2), m.motivo||'—']
    }),
    totales: ['TOTAL',`${salidas.length} registros`,'','','','',
              '', +salidas.reduce((s,m)=>s+Number(m.costoUnitario||0)*Number(m.cantidad||0),0).toFixed(2),''],
    nombreArchivo: 'reporte_salidas',
  })
}

export async function exportarAjustesXLSX(ajustes, productos, almacenes, simboloMoneda) {
  await exportarExcel({
    titulo: 'Reporte de Ajustes',
    cabeceras: ['Fecha','Documento','Producto','SKU','Almacén','Tipo','Cantidad','Costo Unit.','Costo Total','Motivo'],
    filas: ajustes.map(m => {
      const p   = productos.find(x=>x.id===m.productoId)
      const alm = almacenes.find(a=>a.id===m.almacenId)
      const pos = Number(m.cantidad) >= 0
      const costoUnitario = Number(m.costoUnitario||0)
      const costoTotal    = costoUnitario * Number(m.cantidad||0)
      return [m.fecha, m.documento||'—', p?.nombre||'—', p?.sku||'—', alm?.nombre||'—',
              pos?'Positivo':'Negativo', m.cantidad,
              +costoUnitario.toFixed(2), +costoTotal.toFixed(2), m.motivo||'—']
    }),
    totales: ['TOTAL',`${ajustes.length} registros`,'','','','','',
              '', +ajustes.reduce((s,m)=>s+Number(m.costoUnitario||0)*Number(m.cantidad||0),0).toFixed(2),''],
    nombreArchivo: 'reporte_ajustes',
  })
}

export async function exportarKardexXLSX(lineasKardex, producto, simboloMoneda) {
  await exportarExcel({
    titulo: `Kardex — ${producto?.nombre || ''}`,
    cabeceras: ['N°','Fecha','Tipo','Documento','Motivo','Entrada','Salida','Saldo','Costo Unit.','Valor Acum.'],
    filas: lineasKardex.map((l, i) => [
      i + 1, l.fecha, l.tipo, l.documento||'—', l.motivo||'—',
      l.entrada || 0, l.salida || 0, l.saldo,
      +Number(l.costoUnit||0).toFixed(2), +Number(l.valorAcum||0).toFixed(2),
    ]),
    totales: ['TOTAL',`${lineasKardex.length} movimientos`,'','','',
              lineasKardex.reduce((s,l)=>s+(l.entrada||0),0),
              lineasKardex.reduce((s,l)=>s+(l.salida||0),0),'','',''],
    nombreArchivo: `kardex_${producto?.sku || 'producto'}`,
  })
}

export async function exportarInventarioFisicoXLSX(lineas, inventario, simboloMoneda) {
  await exportarExcel({
    titulo: `Conteo Físico — ${inventario?.numero || ''}`,
    cabeceras: ['SKU','Producto','U.M.','Sistema','Contado','Diferencia','Costo Unit.','Valor Dif.'],
    filas: lineas.map(l => {
      const dif    = l.diferencia !== null && l.diferencia !== undefined ? Number(l.diferencia) : ''
      const valDif = dif !== '' && l.costoUnitario ? +(dif * Number(l.costoUnitario)).toFixed(2) : ''
      return [l.producto?.sku||'—', l.producto?.nombre||'—', l.producto?.unidadMedida||'',
              l.stockSistema, l.stockFisico ?? '—', dif,
              +Number(l.costoUnitario||0).toFixed(2), valDif]
    }),
    totales: ['TOTAL',`${lineas.length} productos`,'','','','','',''],
    nombreArchivo: `conteo_${inventario?.numero || 'inventario'}`,
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

export async function exportarPedidosInternosXLSX(pedidos, areas, almacenes) {
  await exportarExcel({
    titulo: 'Pedidos Internos',
    cabeceras: ['Nro. Pedido','Área','Almacén','Fecha','Fecha Requerida','Ítems','Estado','Prioridad'],
    filas: pedidos.map(p => {
      const area    = areas.find(a => a.id === p.areaId)
      const almacen = almacenes.find(a => a.id === p.almacenId)
      return [
        p.numero, area?.nombre || p.areaId, almacen?.nombre || p.almacenId,
        (p.fecha || p.createdAt || '').split('T')[0], p.fechaRequerida?.split('T')[0] || '—',
        p.items?.length || 0, ESTADOS[p.estado]?.label || p.estado, PRIORIDADES[p.prioridad]?.label || p.prioridad,
      ]
    }),
    totales: ['TOTAL', `${pedidos.length} pedidos`,'','','','','',''],
    nombreArchivo: 'pedidos_internos',
  })
}

export async function exportarRutasXLSX(rutas, transportistas) {
  await exportarExcel({
    titulo: 'Rutas de Entrega',
    cabeceras: ['N° Ruta','Transportista','Placa','Fecha Salida','Paradas','Entregadas','Estado'],
    filas: rutas.map(r => {
      const tra = transportistas.find(t => t.id === r.transportistaId)
      const entregadas = (r.paradas || []).filter(p => p.estado === 'ENTREGADO').length
      return [
        r.numero, tra?.nombre || '—', tra?.placa || '—',
        (r.fechaSalida || '').split('T')[0], (r.paradas || []).length, entregadas,
        ESTADO_RUTA[r.estado]?.label || r.estado,
      ]
    }),
    totales: ['TOTAL', `${rutas.length} rutas`,'','','','',''],
    nombreArchivo: 'rutas_entrega',
  })
}

export async function exportarTransportistasXLSX(transportistas) {
  await exportarExcel({
    titulo: 'Directorio de Transportistas',
    cabeceras: ['Nombre','Tipo','Placa','Vehículo','Teléfono','Licencia','Estado'],
    filas: transportistas.map(t => [
      t.nombre, t.tipo === 'PROPIO' ? 'Propio' : 'Tercero', t.placa || '—',
      t.vehiculo || '—', t.telefono || '—', t.licencia || '—',
      t.activo !== false ? 'Activo' : 'Inactivo',
    ]),
    totales: ['TOTAL', `${transportistas.length} transportistas`,'','','','',''],
    nombreArchivo: 'directorio_transportistas',
  })
}

export async function exportarMantenimientosXLSX(mantenimientos) {
  await exportarExcel({
    titulo: 'Historial de Mantenimientos',
    cabeceras: ['Fecha','Unidad','Placa','Tipo','Km','Costo (S/)','Taller','Observaciones'],
    filas: mantenimientos.map(m => [
      toDateStr(m.fecha) || '—', m.vehiculo?.nombre || '—', m.vehiculo?.placa || '—',
      m.tipo, m.kmActual ? Number(m.kmActual) : '—', m.costo ? +Number(m.costo).toFixed(2) : '—',
      m.taller || '—', m.observaciones || '—',
    ]),
    totales: ['TOTAL', `${mantenimientos.length} registros`,'','','','','',''],
    nombreArchivo: 'historial_mantenimientos',
  })
}

export async function exportarCombustibleXLSX(registros) {
  await exportarExcel({
    titulo: 'Registros de Combustible',
    cabeceras: ['Fecha','Unidad','Placa','Litros','Costo (S/)','KM antes','KM después','KM recorridos','Tipo'],
    filas: registros.map(r => [
      toDateStr(r.fecha) || '—', r.vehiculo?.nombre || '—', r.vehiculo?.placa || '—',
      Number(r.litros), +Number(r.costo).toFixed(2),
      r.kmAntes ? Number(r.kmAntes) : '—', r.kmDespues ? Number(r.kmDespues) : '—',
      r.kmRecorridos ? Number(r.kmRecorridos) : '—', r.tipoCombustible || '—',
    ]),
    totales: ['TOTAL', `${registros.length} registros`,'','','','','','',''],
    nombreArchivo: 'registros_combustible',
  })
}

export async function exportarPuntoReordenXLSX(analisis, simboloMoneda) {
  await exportarExcel({
    titulo: 'Análisis de Punto de Reorden',
    cabeceras: ['SKU','Producto','Categoría','Stock actual','Punto reorden','Consumo/día','Días de stock','Cant. sugerida','Costo estimado','Estado'],
    filas: analisis.map(p => [
      p.sku, p.nombre, p.catNombre,
      p.stockActual, p.puntosReorden, p.consumoDiario,
      p.diasStock === null ? '—' : p.diasStock,
      p.cantSugerida, +p.costoSugerido.toFixed(2),
      p.ocPendiente ? 'OC Pendiente' : p.stockActual <= 0 ? 'Agotado' : p.necesitaPedido ? 'Reponer' : 'OK',
    ]),
    totales: ['TOTAL', `${analisis.length} productos`,'','','','','','','',''],
    nombreArchivo: 'punto_reorden',
  })
}

export async function exportarSunatDocumentosXLSX(docs, clientes) {
  await exportarExcel({
    titulo: 'Guías de Remisión Electrónica — SUNAT',
    cabeceras: ['N° Guía','Cliente','Fecha','Estado SUNAT'],
    filas: docs.map(doc => {
      const cli    = clientes.find(c => c.id === (doc.despacho?.clienteId || doc.clienteId))
      const nombre = cli?.razonSocial || doc.despacho?.cliente?.razonSocial || '—'
      const fecha  = doc.despacho?.fechaDespacho || doc.createdAt
      return [doc.guiaNumero, nombre, (fecha || '').split('T')[0], doc.estado]
    }),
    totales: ['TOTAL', `${docs.length} documentos`,'',''],
    nombreArchivo: 'sunat_documentos_gre',
  })
}

export async function exportarSunatGenerarXLSX(despachos, clientes) {
  await exportarExcel({
    titulo: 'Despachos con Guía de Remisión',
    cabeceras: ['N° Guía','Despacho','Cliente','Fecha despacho','Estado despacho'],
    filas: despachos.map(des => {
      const cli = clientes.find(c => c.id === des.clienteId)
      return [des.guiaNumero, des.numero, cli?.razonSocial || '—', (des.fechaDespacho||des.fecha||'').split('T')[0], des.estado]
    }),
    totales: ['TOTAL', `${despachos.length} despachos`,'','',''],
    nombreArchivo: 'sunat_despachos_con_guia',
  })
}

export async function exportarReportesMovimientosXLSX(movMes, simboloMoneda) {
  await exportarExcel({
    titulo: 'Movimientos por Período',
    cabeceras: ['Mes','Entradas','Salidas'],
    filas: movMes.map(m => [m.mes, +m.entradas.toFixed(2), +m.salidas.toFixed(2)]),
    totales: ['TOTAL', +movMes.reduce((s,m)=>s+m.entradas,0).toFixed(2), +movMes.reduce((s,m)=>s+m.salidas,0).toFixed(2)],
    nombreArchivo: 'movimientos_por_periodo',
  })
}

export async function exportarReportesABCXLSX(abc, valorTotal, simboloMoneda) {
  await exportarExcel({
    titulo: 'Análisis ABC de Inventario',
    cabeceras: ['Clase','SKU','Producto','Stock','U.M.','Valor','% Acumulado'],
    filas: abc.map((p, i) => {
      const acum = abc.slice(0, i + 1).reduce((s, x) => s + x.valorStock, 0)
      return [p.abc, p.sku, p.nombre, p.stockActual, p.unidadMedida, +p.valorStock.toFixed(2), valorTotal > 0 ? +((acum/valorTotal)*100).toFixed(1) : 0]
    }),
    totales: ['TOTAL','',`${abc.length} productos`,'','', +valorTotal.toFixed(2), ''],
    nombreArchivo: 'analisis_abc',
  })
}

export async function exportarFinancieroXLSX(plMensual, kpis, simboloMoneda) {
  await exportarExcel({
    titulo: 'Estado de Resultados Mensual (P&L)',
    cabeceras: ['Mes','Ingresos','Costo Ventas','Devoluciones','Margen Bruto','Margen %'],
    filas: plMensual.map(m => [m.mes, +m.ingresos.toFixed(2), +m.costoVentas.toFixed(2), +m.devMes.toFixed(2), +m.margenBruto.toFixed(2), +m.margenPct.toFixed(1)]),
    totales: ['TOTAL', +kpis.totalIngresos.toFixed(2), +kpis.totalCosto.toFixed(2), +kpis.totalDev.toFixed(2), +kpis.margenBruto.toFixed(2), +kpis.margenPct.toFixed(1)],
    nombreArchivo: 'estado_resultados_mensual',
  })
}
