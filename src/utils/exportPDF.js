/**
 * exportPDF.js — Exportación a PDF profesional sin backend
 * Usa jsPDF + jspdf-autotable cargados dinámicamente desde CDN
 */

let _jsPDF = null

async function loadJsPDF() {
  if (_jsPDF) return _jsPDF
  if (window.jspdf?.jsPDF) { _jsPDF = window.jspdf.jsPDF; return _jsPDF }
  await new Promise((res, rej) => {
    const s1 = document.createElement('script')
    s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    s1.onload = () => {
      const s2 = document.createElement('script')
      s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
      s2.onload = res
      s2.onerror = rej
      document.head.appendChild(s2)
    }
    s1.onerror = rej
    document.head.appendChild(s1)
  })
  // Try multiple paths jsPDF exposes itself
  _jsPDF = window.jspdf?.jsPDF || window.jsPDF || null
  if (!_jsPDF) throw new Error('jsPDF no pudo cargarse desde CDN')
  return _jsPDF
}

const C = {
  verde:   [0,   200, 150],
  oscuro:  [14,  25,  39],
  gris:    [95,  111, 128],
  blanco:  [255, 255, 255],
  negro:   [20,  30,  40],
  cabTxt:  [230, 237, 242],
  filaPar: [26,  34,  48],
  filaImpar:[22, 29,  42],
  borde:   [40,  55,  75],
}

function crearDoc(titulo, subtitulo, empresa) {
  if (!_jsPDF) throw new Error('Llama a loadJsPDF() antes de crearDoc()')
  const doc = new _jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W   = doc.internal.pageSize.getWidth()

  // Fondo oscuro del header
  doc.setFillColor(...C.oscuro)
  doc.rect(0, 0, W, 22, 'F')

  // Barra verde superior
  doc.setFillColor(...C.verde)
  doc.rect(0, 0, W, 2, 'F')

  // Título
  doc.setTextColor(...C.verde)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(titulo, 10, 12)

  // Subtítulo / empresa
  doc.setFontSize(8)
  doc.setTextColor(...C.gris)
  doc.setFont('helvetica', 'normal')
  doc.text(subtitulo, 10, 18)
  if (empresa) doc.text(empresa, W - 10, 18, { align: 'right' })

  // Fecha
  const hoy = new Date().toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' })
  doc.text(`Generado: ${hoy}`, W - 10, 12, { align: 'right' })

  return doc
}

function guardar(doc, nombre) {
  const hoy = new Date().toISOString().split('T')[0]
  doc.save(`${nombre}_${hoy}.pdf`)
}

// ── Exportaciones específicas ─────────────────────────────

export async function exportarInventarioPDF(productos, categorias, almacenes, formulaValorizacion, simboloMoneda, calcPMP, valorarStockFn, empresa) {
  _jsPDF = await loadJsPDF()
  const doc = crearDoc(
    'Inventario Valorizado',
    `Método de valorización: ${formulaValorizacion}`,
    empresa
  )

  const rows = productos.filter(p => p.activo !== false).map(p => {
    const pmp   = calcPMP(p.batches || [])
    const valor = valorarStockFn(p.batches || [], formulaValorizacion)
    const margen = p.precioVenta > 0 ? `${(((p.precioVenta - pmp) / p.precioVenta) * 100).toFixed(1)}%` : '—'
    const cat   = categorias.find(c => c.id === p.categoriaId)?.nombre || '—'
    const alm   = almacenes.find(a => a.id === p.almacenId)?.nombre   || '—'
    const estado = p.stockActual <= 0 ? 'Agotado' : p.stockActual <= p.stockMinimo ? 'Crítico' : 'OK'
    return [p.sku, p.nombre.slice(0,30), cat, alm, p.stockActual, p.unidadMedida,
            `${simboloMoneda} ${pmp.toFixed(2)}`, `${simboloMoneda} ${(p.precioVenta||0).toFixed(2)}`,
            margen, `${simboloMoneda} ${valor.toFixed(2)}`, estado]
  })

  const totalValor = productos.filter(p=>p.activo!==false)
    .reduce((s,p) => s + valorarStockFn(p.batches||[], formulaValorizacion), 0)

  doc.autoTable({
    startY: 26,
    head: [['SKU','Producto','Categoría','Almacén','Stock','U.M.','Costo PMP','P. Venta','Margen','Valor Stock','Estado']],
    body: rows,
    foot: [['','','','',`${rows.length} prod.`,'','','','',`${simboloMoneda} ${totalValor.toFixed(2)}`,''  ]],
    ...estiloTabla()
  })

  guardar(doc, 'inventario_valorizado')
}

export async function exportarMovimientosPDF(movimientos, productos, almacenes, simboloMoneda, empresa, titulo = 'Historial de Movimientos') {
  _jsPDF = await loadJsPDF()
  const doc = crearDoc(titulo, `${movimientos.length} registros`, empresa)

  const rows = movimientos.slice(0, 500).map(m => {
    const p   = productos.find(x => x.id === m.productoId)
    const alm = almacenes.find(a => a.id === m.almacenId)
    return [m.fecha, m.tipo, m.documento||'—', p?.sku||'—', p?.nombre?.slice(0,25)||'—',
            alm?.nombre?.slice(0,18)||'—', m.cantidad, `${simboloMoneda} ${(m.costoTotal||0).toFixed(2)}`, m.motivo?.slice(0,25)||'—']
  })

  doc.autoTable({
    startY: 26,
    head: [['Fecha','Tipo','Documento','SKU','Producto','Almacén','Cant.','Total','Motivo']],
    body: rows,
    ...estiloTabla()
  })

  guardar(doc, titulo.toLowerCase().replace(/ /g, '_'))
}

export async function exportarRentabilidadPDF(rentabilidad, kpisRent, simboloMoneda, empresa) {
  _jsPDF = await loadJsPDF()
  const doc = crearDoc('Reporte de Rentabilidad', `Margen global: ${kpisRent.margenPct.toFixed(1)}%`, empresa)

  const rows = rentabilidad.map(r => [
    r.sku, r.nombre.slice(0,28), r.catNombre,
    `${simboloMoneda} ${r.pmp.toFixed(2)}`,
    r.precioVenta > 0 ? `${simboloMoneda} ${r.precioVenta.toFixed(2)}` : '—',
    r.unidadesVend,
    `${simboloMoneda} ${r.ingresos.toFixed(2)}`,
    `${simboloMoneda} ${r.margenBruto.toFixed(2)}`,
    r.margenPct !== null ? `${r.margenPct.toFixed(1)}%` : '—',
    r.abc,
  ])

  doc.autoTable({
    startY: 26,
    head: [['SKU','Producto','Categoría','Costo PMP','P. Venta','Uds.','Ingresos','Margen S/','Margen %','ABC']],
    body: rows,
    foot: [['','','','','',
      '', `${simboloMoneda} ${kpisRent.totalIngresos.toFixed(2)}`,
      `${simboloMoneda} ${kpisRent.totalMargen.toFixed(2)}`,
      `${kpisRent.margenPct.toFixed(1)}%`, '']],
    ...estiloTabla()
  })

  guardar(doc, 'reporte_rentabilidad')
}

export async function exportarAuditoriaPDF(logs, empresa) {
  _jsPDF = await loadJsPDF()
  const doc = crearDoc('Auditoría del Sistema', `${logs.length} registros`, empresa)

  const rows = logs.slice(0, 500).map(l => [
    l.fecha, l.hora, l.usuarioNombre, l.accion, l.modulo, (l.detalle||'').slice(0,50)
  ])

  doc.autoTable({
    startY: 26,
    head: [['Fecha','Hora','Usuario','Acción','Módulo','Detalle']],
    body: rows,
    ...estiloTabla()
  })

  guardar(doc, 'auditoria_sistema')
}

function estiloTabla() {
  return {
    styles: {
      fontSize: 7.5, cellPadding: 2.5,
      textColor: [230, 237, 242], lineColor: C.borde, lineWidth: 0.1,
    },
    headStyles: {
      fillColor: C.oscuro, textColor: C.verde, fontStyle: 'bold', fontSize: 8,
    },
    footStyles: {
      fillColor: [20, 30, 44], textColor: C.verde, fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: C.filaPar },
    bodyStyles:         { fillColor: C.filaImpar },
    tableLineColor:     C.borde,
    tableLineWidth:     0.1,
    margin: { left: 8, right: 8 },
  }
}

// ══════════════════════════════════════════════════════
// DEVOLUCIONES
// ══════════════════════════════════════════════════════
export async function exportarDevolucionesPDF(devoluciones, productos, simboloMoneda, empresa) {
  _jsPDF = await loadJsPDF()
  const doc = crearDoc('Reporte de Devoluciones', `${devoluciones.length} registros`, empresa)
  const rows = devoluciones.map(d => {
    const p = productos.find(x=>x.id===d.productoId)
    return [d.fecha, d.documento||'—', d.tipo==='CLIENTE'?'De cliente':'A proveedor',
            p?.sku||'—', p?.nombre?.slice(0,22)||'—',
            d.estadoItem||'—', d.cantidad,
            `${simboloMoneda} ${(d.costoTotal||0).toFixed(2)}`, d.motivo?.slice(0,20)||'—']
  })
  const totalVal = devoluciones.reduce((s,d)=>s+(d.costoTotal||0),0)
  doc.autoTable({
    startY:26,
    head:[['Fecha','Doc.','Tipo','SKU','Producto','Estado Item','Cant.','Total','Motivo']],
    body: rows,
    foot:[[`${devoluciones.length} reg.`,'','','','','','',`${simboloMoneda} ${totalVal.toFixed(2)}`,'']],
    ...estiloTabla()
  })
  guardar(doc,'reporte_devoluciones')
}

// ══════════════════════════════════════════════════════
// TRANSFERENCIAS
// ══════════════════════════════════════════════════════
export async function exportarTransferenciasPDF(transferencias, productos, almacenes, simboloMoneda, empresa) {
  _jsPDF = await loadJsPDF()
  const doc = crearDoc('Reporte de Transferencias', `${transferencias.length} registros`, empresa)
  const rows = transferencias.map(t => {
    const p    = productos.find(x=>x.id===t.productoId)
    const orig = almacenes.find(a=>a.id===t.almacenOrigenId)
    const dest = almacenes.find(a=>a.id===t.almacenDestinoId)
    return [t.fecha, t.numero||'—', p?.sku||'—', p?.nombre?.slice(0,20)||'—',
            orig?.nombre?.slice(0,15)||'—', dest?.nombre?.slice(0,15)||'—',
            t.cantidad, `${simboloMoneda} ${(t.costoTotal||0).toFixed(2)}`, t.motivo?.slice(0,18)||'—']
  })
  const totalVal = transferencias.reduce((s,t)=>s+(t.costoTotal||0),0)
  doc.autoTable({
    startY:26,
    head:[['Fecha','N° Transfer.','SKU','Producto','Origen','Destino','Cant.','Total','Motivo']],
    body: rows,
    foot:[[`${transferencias.length} reg.`,'','','','','','',`${simboloMoneda} ${totalVal.toFixed(2)}`,'']],
    ...estiloTabla()
  })
  guardar(doc,'reporte_transferencias')
}

// ══════════════════════════════════════════════════════
// ÓRDENES DE COMPRA
// ══════════════════════════════════════════════════════
export async function exportarOrdenesPDF(ordenes, proveedores, simboloMoneda, empresa) {
  _jsPDF = await loadJsPDF()
  const doc = crearDoc('Órdenes de Compra', `${ordenes.length} documentos`, empresa)
  const rows = ordenes.map(o => {
    const prov = proveedores.find(p=>p.id===o.proveedorId)
    return [o.numero, o.fecha, o.fechaEntrega||'—',
            prov?.razonSocial?.slice(0,22)||'—', o.estado,
            o.items?.length||0, `${simboloMoneda} ${(o.total||0).toFixed(2)}`]
  })
  const totalVal = ordenes.reduce((s,o)=>s+(o.total||0),0)
  doc.autoTable({
    startY:26,
    head:[['N° OC','Fecha','F. Entrega','Proveedor','Estado','Ítems','Total']],
    body: rows,
    foot:[[`${ordenes.length} OC`,'','','','','',`${simboloMoneda} ${totalVal.toFixed(2)}`]],
    ...estiloTabla()
  })
  guardar(doc,'ordenes_de_compra')
}

// ══════════════════════════════════════════════════════
// COTIZACIONES A PROVEEDORES
// ══════════════════════════════════════════════════════
export async function exportarCotizacionesPDF(cotizaciones, proveedores, simboloMoneda, empresa) {
  _jsPDF = await loadJsPDF()
  const doc = crearDoc('Cotizaciones a Proveedores (RFQ)', `${cotizaciones.length} solicitudes`, empresa)
  const rows = cotizaciones.map(c => {
    const resp = c.respuestas?.find(r=>r.ganadora)
    const prov = resp ? proveedores.find(p=>p.id===resp.proveedorId)?.razonSocial?.slice(0,18)||'—' : '—'
    return [c.numero, c.fecha, c.fechaVencimiento||'—', c.estado,
            c.items?.length||0, c.respuestas?.length||0,
            resp ? `${simboloMoneda} ${resp.total.toFixed(2)}` : '—', prov]
  })
  doc.autoTable({
    startY:26,
    head:[['N° RFQ','Fecha','Vencimiento','Estado','Ítems','Resp.','Mejor precio','Proveedor ganador']],
    body: rows,
    ...estiloTabla()
  })
  guardar(doc,'cotizaciones_proveedores')
}

// ══════════════════════════════════════════════════════
// PROVEEDORES
// ══════════════════════════════════════════════════════
export async function exportarProveedoresPDF(proveedores, empresa) {
  _jsPDF = await loadJsPDF()
  const doc = crearDoc('Directorio de Proveedores', `${proveedores.length} registros`, empresa)
  const rows = proveedores.map(p => [
    p.razonSocial?.slice(0,25)||'—', p.ruc||'—', p.contacto?.slice(0,18)||'—',
    p.telefono||'—', p.email?.slice(0,22)||'—',
    p.plazoEntrega ? `${p.plazoEntrega}d` : '—',
    p.activo!==false?'Activo':'Inactivo'
  ])
  doc.autoTable({
    startY:26,
    head:[['Razón Social','RUC','Contacto','Teléfono','Email','Plazo','Estado']],
    body: rows,
    foot:[[`Activos: ${proveedores.filter(p=>p.activo!==false).length} / Total: ${proveedores.length}`,'','','','','','']],
    ...estiloTabla()
  })
  guardar(doc,'directorio_proveedores')
}

// ══════════════════════════════════════════════════════
// CLIENTES
// ══════════════════════════════════════════════════════
export async function exportarClientesPDF(clientes, empresa) {
  _jsPDF = await loadJsPDF()
  const doc = crearDoc('Directorio de Clientes', `${clientes.length} registros`, empresa)
  const rows = clientes.map(c => [
    c.razonSocial?.slice(0,25)||'—', c.ruc||'—', c.contacto?.slice(0,18)||'—',
    c.telefono||'—', c.email?.slice(0,22)||'—',
    c.condicionPago ? `${c.condicionPago}d` : 'Contado',
    c.activo!==false?'Activo':'Inactivo'
  ])
  doc.autoTable({
    startY:26,
    head:[['Razón Social','RUC','Contacto','Teléfono','Email','Pago','Estado']],
    body: rows,
    foot:[[`Activos: ${clientes.filter(c=>c.activo!==false).length} / Total: ${clientes.length}`,'','','','','','']],
    ...estiloTabla()
  })
  guardar(doc,'directorio_clientes')
}

// ══════════════════════════════════════════════════════
// VENCIMIENTOS
// ══════════════════════════════════════════════════════
export async function exportarVencimientosPDF(productos, categorias, almacenes, simboloMoneda, calcPMP, empresa) {
  _jsPDF = await loadJsPDF()
  const conVenc = productos.filter(p=>p.activo!==false&&p.tieneVencimiento&&p.fechaVencimiento)
    .sort((a,b)=>a.fechaVencimiento.localeCompare(b.fechaVencimiento))
  const doc = crearDoc('Control de Vencimientos', `${conVenc.length} productos con fecha de vencimiento`, empresa)
  const rows = conVenc.map(p => {
    const diff  = Math.ceil((new Date(p.fechaVencimiento+'T12:00:00')-new Date())/86400000)
    const estado = diff<0?'VENCIDO':diff<=15?'CRÍTICO':diff<=30?'URGENTE':diff<=90?'PRÓXIMO':'OK'
    const cat   = categorias.find(c=>c.id===p.categoriaId)?.nombre?.slice(0,12)||'—'
    const alm   = almacenes.find(a=>a.id===p.almacenId)?.nombre?.slice(0,12)||'—'
    const pmp   = calcPMP(p.batches||[])
    return [p.sku, p.nombre?.slice(0,25)||'—', cat, alm,
            p.stockActual, p.unidadMedida, p.fechaVencimiento,
            diff < 0 ? `Vencido ${Math.abs(diff)}d` : `${diff}d`, estado]
  })
  doc.autoTable({
    startY:26,
    head:[['SKU','Producto','Categoría','Almacén','Stock','U.M.','Vencimiento','Días','Estado']],
    body: rows,
    foot:[[`Vencidos: ${rows.filter(r=>r[8]==='VENCIDO').length}`,'','','','','','','','']],
    ...estiloTabla()
  })
  guardar(doc,'control_vencimientos')
}

// ══════════════════════════════════════════════════════
// PROFORMAS
// ══════════════════════════════════════════════════════
export async function exportarProformasPDF(proformas, clientes, simboloMoneda, empresa) {
  _jsPDF = await loadJsPDF()
  const doc = crearDoc('Proformas / Cotizaciones de Venta', `${proformas.length} documentos`, empresa)
  const rows = proformas.map(p => {
    const cli = clientes.find(c=>c.id===p.clienteId)
    return [p.numero, p.fecha, p.fechaVencimiento||'—',
            cli?.razonSocial?.slice(0,20)||'—', p.estado,
            p.items?.length||0,
            `${simboloMoneda} ${(p.subtotal||0).toFixed(2)}`,
            `${simboloMoneda} ${(p.igv||0).toFixed(2)}`,
            `${simboloMoneda} ${(p.total||0).toFixed(2)}`]
  })
  const totalVal = proformas.reduce((s,p)=>s+(p.total||0),0)
  doc.autoTable({
    startY:26,
    head:[['N° Proforma','Fecha','Vence','Cliente','Estado','Ítems','Subtotal','IGV','Total']],
    body: rows,
    foot:[[`${proformas.length} proformas`,'','','','','','','',`${simboloMoneda} ${totalVal.toFixed(2)}`]],
    ...estiloTabla()
  })
  guardar(doc,'proformas_venta')
}

// ══════════════════════════════════════════════════════
// CUENTAS POR COBRAR
// ══════════════════════════════════════════════════════
export async function exportarCxCPDF(docs, clientes, simboloMoneda, empresa) {
  _jsPDF = await loadJsPDF()
  const doc = crearDoc('Cuentas por Cobrar', `${docs.length} documentos`, empresa)
  const rows = docs.map(d => {
    const cli  = clientes.find(c=>c.id===d.clienteId)
    const mora = d.estado==='VENCIDA'?Math.max(0,Math.ceil((new Date()-new Date(d.fechaVencimiento+'T12:00:00'))/86400000)):0
    return [d.numero, cli?.razonSocial?.slice(0,20)||'—', d.fechaEmision||'—',
            d.fechaVencimiento||'—', mora>0?`${mora}d`:'—',
            `${simboloMoneda} ${(d.monto||0).toFixed(2)}`,
            `${simboloMoneda} ${(d.saldo||0).toFixed(2)}`, d.estado]
  })
  const totalSaldo = docs.reduce((s,d)=>s+(d.saldo||0),0)
  doc.autoTable({
    startY:26,
    head:[['N° Doc.','Cliente','Emisión','Vencimiento','Mora','Monto','Saldo','Estado']],
    body: rows,
    foot:[[`${docs.length} docs.`,'','','','','',`${simboloMoneda} ${totalSaldo.toFixed(2)}`,'']],
    ...estiloTabla()
  })
  guardar(doc,'cuentas_por_cobrar')
}

// ══════════════════════════════════════════════════════
// LISTA DE PRECIOS
// ══════════════════════════════════════════════════════
export async function exportarListaPreciosPDF(lista, productos, categorias, simboloMoneda, calcPMP, empresa) {
  _jsPDF = await loadJsPDF()
  const nombre = lista?.nombre || 'Lista General'
  const doc = crearDoc(`Lista de Precios — ${nombre}`, `${productos.filter(p=>p.activo!==false).length} productos`, empresa)
  const rows = productos.filter(p=>p.activo!==false).map(p => {
    const cat  = categorias.find(c=>c.id===p.categoriaId)?.nombre?.slice(0,12)||'—'
    const pmp  = calcPMP(p.batches||[])
    const base = p.precioVenta||0
    const prec = lista?.precios?.[p.id] ?? (lista?.descuento>0 ? +(base*(1-lista.descuento/100)).toFixed(2) : lista?.markup>0 ? +(pmp*(1+lista.markup/100)).toFixed(2) : base)
    const marg = prec>0&&pmp>0 ? `${(((prec-pmp)/prec)*100).toFixed(1)}%` : '—'
    return [p.sku, p.nombre?.slice(0,28)||'—', cat, p.unidadMedida,
            `${simboloMoneda} ${pmp.toFixed(2)}`, `${simboloMoneda} ${base.toFixed(2)}`,
            `${simboloMoneda} ${prec.toFixed(2)}`, marg]
  })
  doc.autoTable({
    startY:26,
    head:[['SKU','Producto','Categoría','U.M.','Costo PMP','P. Base','P. Lista','Margen']],
    body: rows,
    ...estiloTabla()
  })
  guardar(doc,`lista_precios_${nombre.toLowerCase().replace(/\s+/g,'_')}`)
}
