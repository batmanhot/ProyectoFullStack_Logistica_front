import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { mostrarPreviewExport } from './exportPreview'

/**
 * exportPDF.js — Documentos PDF formales: fondo blanco, texto negro, sin colores.
 */

function crearDoc(titulo, subtitulo, empresa) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W   = doc.internal.pageSize.getWidth()
  const hoy = new Date().toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' })

  // Línea superior delgada gris
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.5)
  doc.line(10, 14, W - 10, 14)

  // Título del reporte
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(30, 30, 30)
  doc.text(titulo.toUpperCase(), 10, 10)

  // Subtítulo / empresa / fecha
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text(subtitulo, 10, 18)
  if (empresa) doc.text(empresa, W - 10, 18, { align: 'right' })
  doc.text(`Generado: ${hoy}`, W - 10, 10, { align: 'right' })

  return doc
}

function guardar(doc, nombre) {
  doc.save(`${nombre}_${new Date().toISOString().split('T')[0]}.pdf`)
}

function estiloTabla() {
  return {
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: [30, 30, 30],
      lineColor: [210, 210, 210],
      lineWidth: 0.1,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
      fontSize: 7.5,
      lineColor: [180, 180, 180],
      lineWidth: 0.2,
    },
    footStyles: {
      fillColor: [235, 235, 235],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
      fontSize: 7.5,
      lineColor: [180, 180, 180],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    tableLineColor: [200, 200, 200],
    tableLineWidth: 0.2,
    margin: { left: 10, right: 10 },
  }
}

// ══════════════════════════════════════════════════════

export async function exportarInventarioPDF(productos, categorias, almacenes, formulaValorizacion, simboloMoneda, calcPMP, valorarStockFn, empresa) {
  const titulo = 'Inventario Valorizado'
  const cabeceras = ['SKU','Producto','Categoría','Almacén','Stock','U.M.',`Costo ${formulaValorizacion}`,'Precio Venta','Margen','Valor Stock','Estado']

  const activos = productos.filter(p => p.activo !== false)
  const rows = activos.map(p => {
    const pmp    = calcPMP(p)
    const valor  = valorarStockFn(p)
    const margen = p.precioVenta > 0 ? `${(((p.precioVenta - pmp) / p.precioVenta) * 100).toFixed(1)}%` : '—'
    const cat    = categorias.find(c => c.id === p.categoriaId)?.nombre || '—'
    const alm    = almacenes.find(a => a.id === p.almacenId)?.nombre   || '—'
    const estado = p.stockActual <= 0 ? 'Agotado' : p.stockActual <= p.stockMinimo ? 'Crítico' : 'Normal'
    return [p.sku, p.nombre.slice(0,30), cat, alm,
            p.stockActual, p.unidadMedida,
            `${simboloMoneda} ${pmp.toFixed(2)}`,
            `${simboloMoneda} ${Number(p.precioVenta||0).toFixed(2)}`,
            margen, `${simboloMoneda} ${valor.toFixed(2)}`, estado]
  })
  const totalValor = activos.reduce((s,p) => s + valorarStockFn(p), 0)
  const totales    = ['TOTAL','','','',`${rows.length} productos`,'','','','',`${simboloMoneda} ${totalValor.toFixed(2)}`,'']

  const ok = await mostrarPreviewExport({ titulo, cabeceras, filas: rows, totales, empresa, tipo: 'pdf' })
  if (!ok) return

  const doc = crearDoc(titulo, `Método: ${formulaValorizacion}  ·  ${activos.length} productos`, empresa)
  autoTable(doc, { startY: 24, head: [cabeceras], body: rows, foot: [totales], ...estiloTabla() })
  guardar(doc, 'inventario_valorizado')
}

export async function exportarProductosPDF(productos, categorias, simboloMoneda, empresa) {
  const titulo = 'Inventario de Productos'
  const cabeceras = ['SKU','Producto','Categoría','Stock','U.M.','Precio Compra','Precio Venta','Margen','Valor Stock','Estado']

  const rows = productos.map(p => {
    const cat = categorias.find(c=>c.id===p.categoriaId)?.nombre||'—'
    const costo = Number(p.precioCompra||0)
    const venta = Number(p.precioVenta||0)
    const margen = venta>0 ? `${(((venta-costo)/venta)*100).toFixed(1)}%` : '—'
    const estado = p.stockActual<=0?'Agotado':p.stockActual<=p.stockMinimo?'Crítico':'Normal'
    return [p.sku, p.nombre?.slice(0,30)||'—', cat, p.stockActual, p.unidadMedida,
            `${simboloMoneda} ${costo.toFixed(2)}`, `${simboloMoneda} ${venta.toFixed(2)}`,
            margen, `${simboloMoneda} ${(costo*p.stockActual).toFixed(2)}`, estado]
  })
  const totalValor = productos.reduce((s,p)=>s+Number(p.precioCompra||0)*p.stockActual,0)
  const totales = ['TOTAL','','',`${productos.length} productos`,'','','','',`${simboloMoneda} ${totalValor.toFixed(2)}`,'']

  const ok = await mostrarPreviewExport({ titulo, cabeceras, filas: rows, totales, empresa, tipo: 'pdf' })
  if (!ok) return

  const doc = crearDoc(titulo, `${productos.length} productos`, empresa)
  autoTable(doc, { startY: 24, head: [cabeceras], body: rows, foot: [totales], ...estiloTabla() })
  guardar(doc, 'inventario_productos')
}

export async function exportarDespachosPDF(despachos, clientes, almacenes, transportistas, simboloMoneda, empresa) {
  const titulo = 'Reporte de Despachos'
  const cabeceras = ['N° Guía','Fecha','Estado','Cliente','RUC','Almacén','Subtotal','IGV','Total','Transportista']

  const rows = despachos.map(d => {
    const cli = clientes.find(c=>c.id===d.clienteId)
    const alm = almacenes.find(a=>a.id===d.almacenId)
    const tr  = transportistas.find(t=>t.id===d.transportistaId)
    return [d.numero, d.fecha, d.estado, cli?.razonSocial?.slice(0,25)||'—', cli?.ruc||'—',
            alm?.nombre?.slice(0,18)||'—',
            `${simboloMoneda} ${Number(d.subtotal||0).toFixed(2)}`,
            `${simboloMoneda} ${Number(d.igv||0).toFixed(2)}`,
            `${simboloMoneda} ${Number(d.total||0).toFixed(2)}`,
            tr?.nombre?.slice(0,20)||'—']
  })
  const totalVal = despachos.reduce((s,d)=>s+Number(d.total||0),0)
  const totales  = ['TOTAL','',`${despachos.length} despachos`,'','','','','',`${simboloMoneda} ${totalVal.toFixed(2)}`,'']

  const ok = await mostrarPreviewExport({ titulo, cabeceras, filas: rows, totales, empresa, tipo: 'pdf' })
  if (!ok) return

  const doc = crearDoc(titulo, `${despachos.length} documentos`, empresa)
  autoTable(doc, { startY: 24, head: [cabeceras], body: rows, foot: [totales], ...estiloTabla() })
  guardar(doc, 'reporte_despachos')
}

export async function exportarMovimientosPDF(movimientos, productos, almacenes, simboloMoneda, empresa, titulo = 'Historial de Movimientos') {
  const cabeceras = ['Fecha','Tipo','Documento','SKU','Producto','Almacén','Cant.','Costo Unit.','Total','Motivo']

  const rows = movimientos.slice(0, 500).map(m => {
    const p   = productos.find(x => x.id === m.productoId)
    const alm = almacenes.find(a => a.id === m.almacenId)
    const costoUnitario = Number(m.costoUnitario||0)
    const costoTotal    = costoUnitario * Number(m.cantidad||0)
    return [m.fecha, m.tipo, m.documento||'—', p?.sku||'—', p?.nombre?.slice(0,25)||'—',
            alm?.nombre?.slice(0,18)||'—', m.cantidad,
            `${simboloMoneda} ${costoUnitario.toFixed(2)}`,
            `${simboloMoneda} ${costoTotal.toFixed(2)}`,
            m.motivo?.slice(0,25)||'—']
  })
  const totalCosto = movimientos.reduce((s,m)=>s+Number(m.costoUnitario||0)*Number(m.cantidad||0),0)
  const totales    = ['TOTAL','','','','','',movimientos.length,'',`${simboloMoneda} ${totalCosto.toFixed(2)}`,'']

  const ok = await mostrarPreviewExport({ titulo, cabeceras, filas: rows, totales, empresa, tipo: 'pdf' })
  if (!ok) return

  const doc = crearDoc(titulo, `${movimientos.length} registros`, empresa)
  autoTable(doc, { startY: 24, head: [cabeceras], body: rows, foot: [totales], ...estiloTabla() })
  guardar(doc, titulo.toLowerCase().replace(/ /g, '_'))
}

export async function exportarRentabilidadPDF(rentabilidad, kpisRent, simboloMoneda, empresa) {
  const titulo = 'Reporte de Rentabilidad'
  const cabeceras = ['SKU','Producto','Categoría','Costo PMP','Precio Venta','Uds. Vendidas','Ingresos','Margen S/','Margen %','Clasif.']

  const rows = rentabilidad.map(r => [
    r.sku, r.nombre.slice(0,28), r.catNombre,
    `${simboloMoneda} ${r.pmp.toFixed(2)}`,
    Number(r.precioVenta) > 0 ? `${simboloMoneda} ${Number(r.precioVenta).toFixed(2)}` : '—',
    r.unidadesVend,
    `${simboloMoneda} ${r.ingresos.toFixed(2)}`,
    `${simboloMoneda} ${r.margenBruto.toFixed(2)}`,
    r.margenPct !== null ? `${r.margenPct.toFixed(1)}%` : '—',
    r.abc,
  ])
  const totales = ['TOTAL','','','','',
    kpisRent.totalUnd || '',
    `${simboloMoneda} ${kpisRent.totalIngresos.toFixed(2)}`,
    `${simboloMoneda} ${kpisRent.totalMargen.toFixed(2)}`,
    `${kpisRent.margenPct.toFixed(1)}%`, '']

  const ok = await mostrarPreviewExport({ titulo, cabeceras, filas: rows, totales, empresa, tipo: 'pdf' })
  if (!ok) return

  const doc = crearDoc(titulo, `Margen global: ${kpisRent.margenPct.toFixed(1)}%  ·  ${rentabilidad.length} productos`, empresa)
  autoTable(doc, { startY: 24, head: [cabeceras], body: rows, foot: [totales], ...estiloTabla() })
  guardar(doc, 'reporte_rentabilidad')
}

export async function exportarAuditoriaPDF(logs, empresa) {
  const titulo = 'Registro de Auditoría'
  const cabeceras = ['Fecha','Hora','Usuario','Acción','Módulo','Detalle']

  const rows = logs.slice(0, 500).map(l => [
    l.fecha, l.hora, l.usuarioNombre, l.accion, l.modulo, (l.detalle||'').slice(0,60)
  ])

  const ok = await mostrarPreviewExport({ titulo, cabeceras, filas: rows, empresa, tipo: 'pdf' })
  if (!ok) return

  const doc = crearDoc(titulo, `${logs.length} registros`, empresa)
  autoTable(doc, { startY: 24, head: [cabeceras], body: rows, ...estiloTabla() })
  guardar(doc, 'registro_auditoria')
}

export async function exportarDevolucionesPDF(devoluciones, productos, almacenes, simboloMoneda, empresa) {
  const titulo = 'Reporte de Devoluciones'
  const cabeceras = ['Fecha','Documento','Tipo','SKU','Producto','Almacén','Cantidad','Costo Unit.','Total','Motivo']

  const rows = devoluciones.map(d => {
    const p   = productos.find(x=>x.id===d.productoId)
    const alm = almacenes.find(a=>a.id===d.almacenId)
    const costoUnitario = Number(d.costoUnitario||0)
    const costoTotal    = costoUnitario * Number(d.cantidad||0)
    return [d.fecha, d.documento||'—', d.tipo==='ENTRADA'?'De cliente':'A proveedor',
            p?.sku||'—', p?.nombre?.slice(0,22)||'—', alm?.nombre?.slice(0,18)||'—', d.cantidad,
            `${simboloMoneda} ${costoUnitario.toFixed(2)}`,
            `${simboloMoneda} ${costoTotal.toFixed(2)}`,
            d.motivo?.slice(0,20)||'—']
  })
  const totalVal = devoluciones.reduce((s,d)=>s+Number(d.costoUnitario||0)*Number(d.cantidad||0),0)
  const totales  = ['TOTAL',`${devoluciones.length} registros`,'','','','','','',`${simboloMoneda} ${totalVal.toFixed(2)}`,'']

  const ok = await mostrarPreviewExport({ titulo, cabeceras, filas: rows, totales, empresa, tipo: 'pdf' })
  if (!ok) return

  const doc = crearDoc(titulo, `${devoluciones.length} registros`, empresa)
  autoTable(doc, { startY: 24, head: [cabeceras], body: rows, foot: [totales], ...estiloTabla() })
  guardar(doc, 'reporte_devoluciones')
}

export async function exportarTransferenciasPDF(transferencias, productos, almacenes, simboloMoneda, empresa) {
  const titulo = 'Reporte de Transferencias'
  const cabeceras = ['Fecha','N° Transferencia','SKU','Producto','Almacén Origen','Almacén Destino','Cantidad','U.M.','Costo Total','Motivo']

  const rows = transferencias.map(t => {
    const p    = productos.find(x=>x.id===t.productoId)
    const orig = almacenes.find(a=>a.id===t.almacenId)
    const dest = almacenes.find(a=>a.id===t.almacenDestinoId)
    const costoTotal = Number(t.costoUnitario||0) * Number(t.cantidad||0)
    return [t.fecha, t.documento||'—', p?.sku||'—', p?.nombre?.slice(0,20)||'—',
            orig?.nombre?.slice(0,18)||'—', dest?.nombre?.slice(0,18)||'—',
            t.cantidad, p?.unidadMedida||'',
            `${simboloMoneda} ${costoTotal.toFixed(2)}`, t.motivo?.slice(0,20)||'—']
  })
  const totalVal = transferencias.reduce((s,t)=>s+Number(t.costoUnitario||0)*Number(t.cantidad||0),0)
  const totales  = ['TOTAL',`${transferencias.length} registros`,'','','','','','',`${simboloMoneda} ${totalVal.toFixed(2)}`,'']

  const ok = await mostrarPreviewExport({ titulo, cabeceras, filas: rows, totales, empresa, tipo: 'pdf' })
  if (!ok) return

  const doc = crearDoc(titulo, `${transferencias.length} registros`, empresa)
  autoTable(doc, { startY: 24, head: [cabeceras], body: rows, foot: [totales], ...estiloTabla() })
  guardar(doc, 'reporte_transferencias')
}

export async function exportarOrdenesPDF(ordenes, proveedores, simboloMoneda, empresa) {
  const titulo = 'Órdenes de Compra'
  const cabeceras = ['N° OC','Fecha','F. Entrega','Proveedor','RUC','Estado','Ítems','Subtotal','IGV','Total']

  const rows = ordenes.map(o => {
    const prov = proveedores.find(p=>p.id===o.proveedorId)
    return [o.numero, o.fecha, o.fechaEntrega||'—',
            prov?.razonSocial?.slice(0,25)||'—', prov?.ruc||'—', o.estado,
            o.items?.length||0,
            `${simboloMoneda} ${Number(o.subtotal||0).toFixed(2)}`,
            `${simboloMoneda} ${Number(o.igv||0).toFixed(2)}`,
            `${simboloMoneda} ${Number(o.total||0).toFixed(2)}`]
  })
  const totalVal = ordenes.reduce((s,o)=>s+Number(o.total||0),0)
  const totales  = ['TOTAL',`${ordenes.length} órdenes`,'','','','','','','',`${simboloMoneda} ${totalVal.toFixed(2)}`]

  const ok = await mostrarPreviewExport({ titulo, cabeceras, filas: rows, totales, empresa, tipo: 'pdf' })
  if (!ok) return

  const doc = crearDoc(titulo, `${ordenes.length} documentos`, empresa)
  autoTable(doc, { startY: 24, head: [cabeceras], body: rows, foot: [totales], ...estiloTabla() })
  guardar(doc, 'ordenes_de_compra')
}

export async function exportarCotizacionesPDF(cotizaciones, proveedores, simboloMoneda, empresa) {
  const titulo = 'Cotizaciones a Proveedores'
  const cabeceras = ['N° RFQ','Fecha','Vencimiento','Estado','Ítems','Respuestas','Mejor Precio','Proveedor Ganador']

  const rows = cotizaciones.map(c => {
    const resp = c.respuestas?.find(r=>r.ganadora)
    const prov = resp ? proveedores.find(p=>p.id===resp.proveedorId)?.razonSocial?.slice(0,22)||'—' : '—'
    return [c.numero, c.fecha, c.fechaVencimiento||'—', c.estado,
            c.items?.length||0, c.respuestas?.length||0,
            resp ? `${simboloMoneda} ${Number(resp.total).toFixed(2)}` : '—', prov]
  })

  const ok = await mostrarPreviewExport({ titulo, cabeceras, filas: rows, empresa, tipo: 'pdf' })
  if (!ok) return

  const doc = crearDoc(titulo, `${cotizaciones.length} solicitudes de cotización`, empresa)
  autoTable(doc, { startY: 24, head: [cabeceras], body: rows, ...estiloTabla() })
  guardar(doc, 'cotizaciones_proveedores')
}

export async function exportarProveedoresPDF(proveedores, empresa) {
  const titulo = 'Directorio de Proveedores'
  const cabeceras = ['Razón Social','RUC','Contacto','Teléfono','Email','Dirección','Plazo (días)','Estado']

  const rows = proveedores.map(p => [
    p.razonSocial?.slice(0,28)||'—', p.ruc||'—', p.contacto?.slice(0,20)||'—',
    p.telefono||'—', p.email?.slice(0,25)||'—', p.direccion?.slice(0,22)||'—',
    p.plazoEntrega||'—',
    p.activo!==false ? 'Activo' : 'Inactivo'
  ])
  const totales = [`Total: ${proveedores.length}  ·  Activos: ${proveedores.filter(p=>p.activo!==false).length}`,'','','','','','','']

  const ok = await mostrarPreviewExport({ titulo, cabeceras, filas: rows, totales, empresa, tipo: 'pdf' })
  if (!ok) return

  const doc = crearDoc(titulo, `${proveedores.length} proveedores registrados`, empresa)
  autoTable(doc, { startY: 24, head: [cabeceras], body: rows, foot: [totales], ...estiloTabla() })
  guardar(doc, 'directorio_proveedores')
}

export async function exportarClientesPDF(clientes, empresa) {
  const titulo = 'Directorio de Clientes'
  const cabeceras = ['Razón Social','RUC / DNI','Contacto','Teléfono','Email','Dirección','Cond. Pago','Estado']

  const rows = clientes.map(c => [
    c.razonSocial?.slice(0,28)||'—', c.ruc||'—', c.contacto?.slice(0,20)||'—',
    c.telefono||'—', c.email?.slice(0,25)||'—', c.direccion?.slice(0,22)||'—',
    c.condicionPago ? `${c.condicionPago} días` : 'Contado',
    c.activo!==false ? 'Activo' : 'Inactivo'
  ])
  const totales = [`Total: ${clientes.length}  ·  Activos: ${clientes.filter(c=>c.activo!==false).length}`,'','','','','','','']

  const ok = await mostrarPreviewExport({ titulo, cabeceras, filas: rows, totales, empresa, tipo: 'pdf' })
  if (!ok) return

  const doc = crearDoc(titulo, `${clientes.length} clientes registrados`, empresa)
  autoTable(doc, { startY: 24, head: [cabeceras], body: rows, foot: [totales], ...estiloTabla() })
  guardar(doc, 'directorio_clientes')
}

export async function exportarVencimientosPDF(productos, categorias, almacenes, simboloMoneda, calcPMP, empresa) {
  const titulo = 'Control de Vencimientos'
  const cabeceras = ['SKU','Producto','Categoría','Almacén','Stock','U.M.','Fecha Venc.','Días','Estado']

  const conVenc = productos.filter(p=>p.activo!==false&&p.tieneVencimiento&&p.fechaVencimiento)
    .sort((a,b)=>a.fechaVencimiento.localeCompare(b.fechaVencimiento))

  const rows = conVenc.map(p => {
    const diff   = Math.ceil((new Date(p.fechaVencimiento+'T12:00:00')-new Date())/86400000)
    const estado = diff<0?'VENCIDO':diff<=15?'CRÍTICO':diff<=30?'URGENTE':diff<=90?'PRÓXIMO':'VIGENTE'
    const cat    = categorias.find(c=>c.id===p.categoriaId)?.nombre?.slice(0,14)||'—'
    const alm    = almacenes.find(a=>a.id===p.almacenId)?.nombre?.slice(0,14)||'—'
    return [p.sku, p.nombre?.slice(0,25)||'—', cat, alm,
            p.stockActual, p.unidadMedida, p.fechaVencimiento,
            diff < 0 ? `Vencido ${Math.abs(diff)}d` : `${diff}d`, estado]
  })
  const totales = [`Total con vencimiento: ${conVenc.length}  ·  Vencidos: ${rows.filter(r=>r[8]==='VENCIDO').length}`,'','','','','','','','']

  const ok = await mostrarPreviewExport({ titulo, cabeceras, filas: rows, totales, empresa, tipo: 'pdf' })
  if (!ok) return

  const doc = crearDoc(titulo, `${conVenc.length} productos con fecha de vencimiento registrada`, empresa)
  autoTable(doc, { startY: 24, head: [cabeceras], body: rows, foot: [totales], ...estiloTabla() })
  guardar(doc, 'control_vencimientos')
}

export async function exportarProformasPDF(proformas, clientes, simboloMoneda, empresa) {
  const titulo = 'Proformas de Venta'
  const cabeceras = ['N° Proforma','Fecha','Válida hasta','Cliente','RUC','Estado','Ítems','Subtotal','IGV','Total']

  const rows = proformas.map(p => {
    const cli = clientes.find(c=>c.id===p.clienteId)
    return [p.numero, p.fecha, p.fechaVencimiento||'—',
            cli?.razonSocial?.slice(0,22)||'—', cli?.ruc||'—', p.estado,
            p.items?.length||0,
            `${simboloMoneda} ${Number(p.subtotal||0).toFixed(2)}`,
            `${simboloMoneda} ${Number(p.igv||0).toFixed(2)}`,
            `${simboloMoneda} ${Number(p.total||0).toFixed(2)}`]
  })
  const totalVal = proformas.reduce((s,p)=>s+Number(p.total||0),0)
  const totales  = ['TOTAL',`${proformas.length} proformas`,'','','','','','','',`${simboloMoneda} ${totalVal.toFixed(2)}`]

  const ok = await mostrarPreviewExport({ titulo, cabeceras, filas: rows, totales, empresa, tipo: 'pdf' })
  if (!ok) return

  const doc = crearDoc(titulo, `${proformas.length} documentos`, empresa)
  autoTable(doc, { startY: 24, head: [cabeceras], body: rows, foot: [totales], ...estiloTabla() })
  guardar(doc, 'proformas_venta')
}

export async function exportarCxCPDF(docs, clientes, simboloMoneda, empresa) {
  const titulo = 'Cuentas por Cobrar'
  const cabeceras = ['N° Documento','Cliente','RUC','F. Emisión','F. Vencimiento','Días Mora','Monto','Saldo Pendiente','Estado']

  const rows = docs.map(d => {
    const cli  = clientes.find(c=>c.id===d.clienteId)
    const mora = d.estado==='VENCIDA'?Math.max(0,Math.ceil((new Date()-new Date(d.fechaVencimiento+'T12:00:00'))/86400000)):0
    return [d.numero, cli?.razonSocial?.slice(0,22)||'—', cli?.ruc||'—',
            d.fechaEmision||'—', d.fechaVencimiento||'—',
            mora > 0 ? `${mora} días` : '—',
            `${simboloMoneda} ${Number(d.monto||0).toFixed(2)}`,
            `${simboloMoneda} ${Number(d.saldo||0).toFixed(2)}`, d.estado]
  })
  const totalMonto = docs.reduce((s,d)=>s+Number(d.monto||0),0)
  const totalSaldo = docs.reduce((s,d)=>s+Number(d.saldo||0),0)
  const totales    = ['TOTAL',`${docs.length} documentos`,'','','','',
                      `${simboloMoneda} ${totalMonto.toFixed(2)}`,
                      `${simboloMoneda} ${totalSaldo.toFixed(2)}`,'']

  const ok = await mostrarPreviewExport({ titulo, cabeceras, filas: rows, totales, empresa, tipo: 'pdf' })
  if (!ok) return

  const doc = crearDoc(titulo, `${docs.length} documentos pendientes`, empresa)
  autoTable(doc, { startY: 24, head: [cabeceras], body: rows, foot: [totales], ...estiloTabla() })
  guardar(doc, 'cuentas_por_cobrar')
}

export async function exportarListaPreciosPDF(lista, productos, categorias, simboloMoneda, calcPMP, empresa) {
  const nombre = lista?.nombre || 'Lista General'
  const titulo = `Lista de Precios — ${nombre}`
  const cabeceras = ['SKU','Producto','Categoría','U.M.','Costo PMP','Precio Base','Precio Lista','Descuento %','Margen %']

  const rows = productos.filter(p=>p.estado==='Activo').map(p => {
    const cat  = categorias.find(c=>c.id===p.categoriaId)?.nombre?.slice(0,14)||'—'
    const pmp  = Number(calcPMP(p))
    const base = Number(p.precioVenta||0)
    const prec = Number(lista?.precios?.[p.id] ?? (lista?.descuento>0 ? +(base*(1-lista.descuento/100)).toFixed(2) : lista?.markup>0 ? +(pmp*(1+lista.markup/100)).toFixed(2) : base))
    const marg = prec>0&&pmp>0 ? `${(((prec-pmp)/prec)*100).toFixed(1)}%` : '—'
    const desc = base>0&&prec<base ? `${(((base-prec)/base)*100).toFixed(1)}%` : '—'
    return [p.sku, p.nombre?.slice(0,28)||'—', cat, p.unidadMedida,
            `${simboloMoneda} ${pmp.toFixed(2)}`,
            `${simboloMoneda} ${base.toFixed(2)}`,
            `${simboloMoneda} ${prec.toFixed(2)}`,
            desc, marg]
  })

  const ok = await mostrarPreviewExport({ titulo, cabeceras, filas: rows, empresa, tipo: 'pdf' })
  if (!ok) return

  const doc = crearDoc(titulo, `${rows.length} productos activos`, empresa)
  autoTable(doc, { startY: 24, head: [cabeceras], body: rows, ...estiloTabla() })
  guardar(doc, `lista_precios_${nombre.toLowerCase().replace(/\s+/g,'_')}`)
}
