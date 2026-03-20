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
  _jsPDF = window.jspdf.jsPDF
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
  const JsPDF = await loadJsPDF()
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
  const JsPDF = await loadJsPDF()
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
  const JsPDF = await loadJsPDF()
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
  const JsPDF = await loadJsPDF()
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
