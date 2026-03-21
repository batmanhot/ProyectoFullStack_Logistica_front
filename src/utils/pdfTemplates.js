/**
 * pdfTemplates.js
 * Genera PDFs usando un iframe oculto dentro de la misma página.
 * No requiere dependencias externas. Funciona en todos los navegadores.
 * El iframe se inserta en el DOM, se inyecta el HTML, se imprime y se destruye.
 */

// ── CSS del documento PDF ────────────────────────────────
const CSS = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#111;background:#fff;padding:28px 32px}
  h1{font-size:22px;font-weight:700;color:#007a5e;letter-spacing:-0.5px}
  .sub{color:#555;font-size:11px;margin-top:3px;line-height:1.5}
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:2.5px solid #00c896;margin-bottom:20px}
  .doc-tipo{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#888;margin-bottom:4px}
  .doc-num{font-size:20px;font-weight:700;color:#111}
  .doc-right{text-align:right}
  .badge{display:inline-block;padding:3px 11px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-top:5px}
  .verde{background:#dcfce7;color:#166534}
  .azul{background:#dbeafe;color:#1e40af}
  .ambar{background:#fef3c7;color:#92400e}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}
  .stitle{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#888;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin-bottom:8px}
  .fl{margin-bottom:5px}
  .fl label{display:block;font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.04em;margin-bottom:1px}
  .fl span{font-size:12px;font-weight:500;color:#111}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px}
  thead th{background:#f3f4f6;padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#555;border-bottom:2px solid #e5e7eb}
  th.r,td.r{text-align:right}
  tbody td{padding:7px 10px;border-bottom:1px solid #f3f4f6;color:#222;vertical-align:top}
  tbody tr:last-child td{border-bottom:none}
  tfoot td{padding:7px 10px;font-weight:600}
  .totales{margin-top:14px;border-top:1px solid #e5e7eb;padding-top:12px}
  .trow{display:flex;justify-content:flex-end;gap:50px;font-size:12px;margin-bottom:4px}
  .trow label{color:#888;min-width:90px;text-align:right}
  .trow span{min-width:110px;text-align:right;font-weight:600}
  .trow.grand{font-size:15px;font-weight:700;color:#007a5e;margin-top:8px;padding-top:8px;border-top:2px solid #e5e7eb}
  .notas{margin-top:16px;padding:10px 14px;background:#f0fdf4;border-left:3px solid #00c896;border-radius:0 6px 6px 0;font-size:11px;color:#444;line-height:1.6}
  .firmas{margin-top:44px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px}
  .firma{text-align:center;padding-top:8px;border-top:1px solid #ccc;font-size:10px;color:#666;line-height:1.6}
  .footer{margin-top:22px;padding-top:10px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#aaa}
  .aviso{background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:11px;color:#78350f;line-height:1.6}
  .aviso b{display:block;margin-bottom:2px;color:#92400e;font-size:12px}
  .blank{background:#fafafa;border:1px dashed #d1d5db}
  @media print{body{padding:0}@page{margin:14mm;size:A4 portrait}}
`

function fm(v, s = 'S/') {
  return `${s} ${Number(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function badgeCls(estado) {
  return { APROBADA:'verde', RECIBIDA:'verde', ENVIADA:'azul', PARCIAL:'azul', PENDIENTE:'ambar' }[estado] || 'ambar'
}

// ── Inyecta HTML en iframe oculto y llama print() ────────
function imprimirConIframe(html) {
  // Remover iframe previo si existe
  const viejo = document.getElementById('__stockpro_print_frame')
  if (viejo) viejo.remove()

  const frame = document.createElement('iframe')
  frame.id = '__stockpro_print_frame'
  frame.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;visibility:hidden'
  document.body.appendChild(frame)

  const doc = frame.contentDocument || frame.contentWindow.document
  doc.open()
  doc.write(html)
  doc.close()

  // Esperar a que el iframe cargue antes de imprimir
  frame.onload = () => {
    try {
      frame.contentWindow.focus()
      frame.contentWindow.print()
    } catch(e) {
      console.error('Error al imprimir:', e)
    }
    // Destruir iframe después de imprimir
    setTimeout(() => {
      if (frame && frame.parentNode) frame.parentNode.removeChild(frame)
    }, 3000)
  }

  // Fallback: si onload no dispara (algunos browsers)
  setTimeout(() => {
    try {
      if (frame && frame.contentWindow) {
        frame.contentWindow.focus()
        frame.contentWindow.print()
      }
    } catch(e) {}
  }, 500)
}

// ════════════════════════════════════════════════════════
// ORDEN DE COMPRA
// ════════════════════════════════════════════════════════
export function imprimirOC({ oc, proveedor, productos, config }) {
  const s   = config?.simboloMoneda || 'S/'
  const emp = config?.empresa        || 'Mi Empresa S.A.C.'
  const ruc = config?.ruc             || ''
  const dir = config?.direccion       || ''
  const tel = config?.telefono        || ''
  const ema = config?.email           || ''

  const filas = (oc.items || []).map(item => {
    const p = productos.find(x => x.id === item.productoId)
    return `
      <tr>
        <td>${p?.sku || '—'}</td>
        <td><strong>${p?.nombre || item.productoId}</strong></td>
        <td class="r">${item.cantidad} ${p?.unidadMedida || ''}</td>
        <td class="r">${fm(item.costoUnitario, s)}</td>
        <td class="r" style="font-weight:700">${fm(item.subtotal, s)}</td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>OC ${oc.numero}</title>
  <style>${CSS}</style>
</head>
<body>

<div class="header">
  <div>
    <h1>${emp}</h1>
    <div class="sub">${ruc ? `RUC: ${ruc}` : ''}${dir ? ` &nbsp;&middot;&nbsp; ${dir}` : ''}</div>
    <div class="sub">${tel}${ema ? ` &nbsp;&middot;&nbsp; ${ema}` : ''}</div>
  </div>
  <div class="doc-right">
    <div class="doc-tipo">Orden de Compra</div>
    <div class="doc-num">${oc.numero}</div>
    <span class="badge ${badgeCls(oc.estado)}">${oc.estado}</span>
  </div>
</div>

<div class="grid2">
  <div>
    <div class="stitle">Datos del Proveedor</div>
    <div class="fl"><label>Razón Social</label><span>${proveedor?.razonSocial || '—'}</span></div>
    <div class="fl"><label>RUC</label><span>${proveedor?.ruc || '—'}</span></div>
    <div class="fl"><label>Contacto</label><span>${proveedor?.contacto || '—'}</span></div>
    <div class="fl"><label>Teléfono</label><span>${proveedor?.telefono || '—'}</span></div>
    <div class="fl"><label>Email</label><span>${proveedor?.email || '—'}</span></div>
  </div>
  <div>
    <div class="stitle">Datos del Documento</div>
    <div class="fl"><label>Fecha de Emisión</label><span>${oc.fecha || '—'}</span></div>
    <div class="fl"><label>Fecha de Entrega</label><span>${oc.fechaEntrega || '—'}</span></div>
    <div class="fl"><label>Estado</label><span>${oc.estado}</span></div>
    <div class="fl"><label>Condición de Pago</label><span>Por definir</span></div>
  </div>
</div>

<div class="stitle">Ítems Solicitados</div>
<table>
  <thead>
    <tr>
      <th style="width:75px">SKU</th>
      <th>Descripción</th>
      <th class="r" style="width:95px">Cantidad</th>
      <th class="r" style="width:120px">P. Unitario</th>
      <th class="r" style="width:120px">Subtotal</th>
    </tr>
  </thead>
  <tbody>${filas}</tbody>
</table>

<div class="totales">
  <div class="trow"><label>Subtotal</label><span>${fm(oc.subtotal, s)}</span></div>
  <div class="trow"><label>IGV (18%)</label><span>${fm(oc.igv, s)}</span></div>
  <div class="trow grand"><label>TOTAL</label><span>${fm(oc.total, s)}</span></div>
</div>

${oc.notas ? `<div class="notas"><strong>Notas:</strong> ${oc.notas}</div>` : ''}

<div class="firmas">
  <div class="firma">Elaborado por<br/><br/><br/>________________________________<br/><span style="font-size:9px">Nombre y firma</span></div>
  <div class="firma">Aprobado por<br/><br/><br/>________________________________<br/><span style="font-size:9px">Nombre y firma</span></div>
  <div class="firma">Recibido (Proveedor)<br/><br/><br/>________________________________<br/><span style="font-size:9px">Nombre y sello</span></div>
</div>

<div class="footer">
  <span>Generado por StockPro &nbsp;&middot;&nbsp; ${new Date().toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'})}</span>
  <span>${emp} &nbsp;&middot;&nbsp; ${oc.numero}</span>
</div>

</body>
</html>`

  imprimirConIframe(html)
}

// ════════════════════════════════════════════════════════
// COTIZACIÓN / RFQ
// ════════════════════════════════════════════════════════
export function imprimirRFQ({ cotiz, productos, config }) {
  const s   = config?.simboloMoneda || 'S/'
  const emp = config?.empresa        || 'Mi Empresa S.A.C.'
  const ruc = config?.ruc             || ''
  const tel = config?.telefono        || ''
  const ema = config?.email           || ''

  const filas = (cotiz.items || []).map(item => {
    const p = productos.find(x => x.id === item.productoId)
    return `
      <tr>
        <td>${p?.sku || '—'}</td>
        <td><strong>${item.descripcion || p?.nombre || item.productoId}</strong></td>
        <td class="r">${item.cantidad} ${p?.unidadMedida || 'UND'}</td>
        <td class="blank"></td>
        <td class="blank"></td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>RFQ ${cotiz.numero}</title>
  <style>${CSS}</style>
</head>
<body>

<div class="header">
  <div>
    <h1>${emp}</h1>
    <div class="sub">${ruc ? `RUC: ${ruc}` : ''}${tel ? ` &nbsp;&middot;&nbsp; ${tel}` : ''}</div>
    <div class="sub">${ema}</div>
  </div>
  <div class="doc-right">
    <div class="doc-tipo">Solicitud de Cotización</div>
    <div class="doc-num">${cotiz.numero}</div>
    <span class="badge ${badgeCls(cotiz.estado)}">${cotiz.estado}</span>
    ${cotiz.fechaVencimiento ? `<div style="font-size:11px;color:#888;margin-top:6px">Válida hasta <strong>${cotiz.fechaVencimiento}</strong></div>` : ''}
  </div>
</div>

<div class="aviso">
  <b>Estimado Proveedor:</b>
  Solicitamos su mejor cotización para los productos indicados a continuación.
  Por favor complete los precios unitarios y subtotales, luego remita este documento
  a más tardar el <strong>${cotiz.fechaVencimiento || 'por definir'}</strong>.
  ${cotiz.notas ? `<br/>Referencia: <em>${cotiz.notas}</em>` : ''}
</div>

<div class="stitle">Productos Requeridos</div>
<table>
  <thead>
    <tr>
      <th style="width:75px">SKU</th>
      <th>Descripción</th>
      <th class="r" style="width:95px">Cantidad</th>
      <th class="r" style="width:140px">P. Unitario (sin IGV)</th>
      <th class="r" style="width:120px">Subtotal</th>
    </tr>
  </thead>
  <tbody>${filas}</tbody>
  <tfoot>
    <tr><td colspan="4" style="text-align:right;color:#666;font-size:11px;font-weight:700">SUBTOTAL</td><td class="blank"></td></tr>
    <tr><td colspan="4" style="text-align:right;color:#666;font-size:11px;font-weight:700">IGV (18%)</td><td class="blank"></td></tr>
    <tr style="background:#f0fdf4"><td colspan="4" style="text-align:right;color:#166534;font-size:13px;font-weight:700">TOTAL</td><td style="border:2px solid #86efac;background:#f0fdf4"></td></tr>
  </tfoot>
</table>

<div class="grid2" style="margin-top:20px">
  <div>
    <div class="stitle">Condiciones (completar)</div>
    <div class="fl"><label>Plazo de Entrega</label><span>______________________</span></div>
    <div class="fl"><label>Condición de Pago</label><span>______________________</span></div>
    <div class="fl"><label>Validez de Oferta</label><span>______________________</span></div>
    <div class="fl"><label>Garantía / Devoluciones</label><span>______________________</span></div>
  </div>
  <div>
    <div class="stitle">Datos del Proveedor (completar)</div>
    <div class="fl"><label>Razón Social</label><span>______________________</span></div>
    <div class="fl"><label>RUC</label><span>______________________</span></div>
    <div class="fl"><label>Vendedor / Contacto</label><span>______________________</span></div>
    <div class="fl"><label>Teléfono / WhatsApp</label><span>______________________</span></div>
    <div class="fl"><label>Email Cotización</label><span>______________________</span></div>
  </div>
</div>

<div class="firmas">
  <div class="firma">Elaborado por<br/>${emp}<br/><br/>________________________________<br/><span style="font-size:9px">Nombre y firma</span></div>
  <div class="firma">Autorizado por<br/><br/><br/>________________________________<br/><span style="font-size:9px">Nombre y firma</span></div>
  <div class="firma">Firma y Sello Proveedor<br/><br/><br/>________________________________<br/><span style="font-size:9px">Nombre y sello</span></div>
</div>

<div class="footer">
  <span>Generado por StockPro &nbsp;&middot;&nbsp; ${new Date().toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'})}</span>
  <span>${emp} &nbsp;&middot;&nbsp; ${cotiz.numero}</span>
</div>

</body>
</html>`

  imprimirConIframe(html)
}

// ════════════════════════════════════════════════════════
// GUÍA DE REMISIÓN / DESPACHO
// ════════════════════════════════════════════════════════
export function imprimirGuia({ des, cliente, productos, config }) {
  const s   = config?.simboloMoneda || 'S/'
  const emp = config?.empresa        || 'Mi Empresa S.A.C.'
  const ruc = config?.ruc             || ''
  const tel = config?.telefono        || ''
  const ema = config?.email           || ''
  const dir = config?.direccion       || ''

  const filas = (des.items || []).map(item => {
    const p = productos.find(x => x.id === item.productoId)
    return `<tr>
      <td>${p?.sku || '—'}</td>
      <td><strong>${p?.nombre || item.productoId}</strong></td>
      <td class="r">${item.cantidad} ${p?.unidadMedida || ''}</td>
      <td class="r">${fm(item.precioVenta, s)}</td>
      <td class="r" style="font-weight:700">${fm(item.subtotal, s)}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8">
<title>${des.guiaNumero || des.numero}</title>
<style>${CSS}
.destinatario{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin-bottom:16px}
.destinatario .stitle{color:#166534}
</style>
</head><body>

<div class="header">
  <div>
    <h1>${emp}</h1>
    <div class="sub">${ruc ? `RUC: ${ruc}` : ''}${dir ? ` &nbsp;&middot;&nbsp; ${dir}` : ''}</div>
    <div class="sub">${tel}${ema ? ` &nbsp;&middot;&nbsp; ${ema}` : ''}</div>
  </div>
  <div class="doc-right">
    <div class="doc-tipo">Guía de Remisión</div>
    <div class="doc-num">${des.guiaNumero || des.numero}</div>
    <span class="badge verde">DESPACHADO</span>
    <div style="font-size:11px;color:#888;margin-top:6px">Fecha: <strong>${des.fechaDespacho || des.fecha}</strong></div>
  </div>
</div>

<div class="grid2">
  <div>
    <div class="stitle">Remitente</div>
    <div class="fl"><label>Empresa</label><span>${emp}</span></div>
    <div class="fl"><label>RUC</label><span>${ruc || '—'}</span></div>
    <div class="fl"><label>Dirección</label><span>${dir || '—'}</span></div>
    <div class="fl"><label>Teléfono</label><span>${tel || '—'}</span></div>
  </div>
  <div class="destinatario">
    <div class="stitle">Destinatario</div>
    <div class="fl"><label>Cliente</label><span>${cliente?.razonSocial || '—'}</span></div>
    <div class="fl"><label>RUC/DNI</label><span>${cliente?.ruc || '—'}</span></div>
    <div class="fl"><label>Contacto</label><span>${cliente?.contacto || '—'}</span></div>
    <div class="fl"><label>Dirección de Entrega</label><span>${des.direccionEntrega || cliente?.direccion || '—'}</span></div>
    <div class="fl"><label>Teléfono</label><span>${cliente?.telefono || '—'}</span></div>
  </div>
</div>

<div class="fl" style="margin-bottom:16px"><label>Transportista</label><span>${des.transportista || '—'}</span></div>

<div class="stitle">Mercadería Despachada</div>
<table>
  <thead><tr>
    <th style="width:75px">SKU</th><th>Descripción</th>
    <th class="r" style="width:95px">Cantidad</th>
    <th class="r" style="width:120px">P. Venta</th>
    <th class="r" style="width:120px">Subtotal</th>
  </tr></thead>
  <tbody>${filas}</tbody>
</table>

<div class="totales">
  <div class="trow"><label>Subtotal</label><span>${fm(des.subtotal, s)}</span></div>
  <div class="trow"><label>IGV (18%)</label><span>${fm(des.igv, s)}</span></div>
  <div class="trow grand"><label>TOTAL</label><span>${fm(des.total, s)}</span></div>
</div>

${des.observaciones ? `<div class="notas"><strong>Observaciones:</strong> ${des.observaciones}</div>` : ''}

<div class="firmas" style="margin-top:44px">
  <div class="firma">Despachado por<br/><br/><br/>________________________________<br/><span style="font-size:9px">Nombre y firma</span></div>
  <div class="firma">Transportista<br/><br/><br/>________________________________<br/><span style="font-size:9px">Nombre y firma</span></div>
  <div class="firma">Recibido por (Cliente)<br/><br/><br/>________________________________<br/><span style="font-size:9px">Nombre, firma y sello</span></div>
</div>

<div class="footer">
  <span>Generado por StockPro &nbsp;&middot;&nbsp; ${new Date().toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'})}</span>
  <span>${emp} &nbsp;&middot;&nbsp; ${des.guiaNumero || des.numero}</span>
</div>

</body></html>`

  imprimirConIframe(html)
}

// ════════════════════════════════════════════════════════
// PICKING LIST — Documento para almacenero
// ════════════════════════════════════════════════════════
export function imprimirPickingList({ des, cliente, productos, almacen, config, sesion }) {
  const emp = config?.empresa  || 'Mi Empresa S.A.C.'
  const ruc = config?.ruc       || ''

  const filas = (des.items || []).map((item, idx) => {
    const p = productos.find(x => x.id === item.productoId)
    return `<tr>
      <td style="font-weight:700;font-size:16px;color:#555;text-align:center;width:32px">${idx + 1}</td>
      <td style="font-family:monospace;font-size:11px;color:#007a5e;font-weight:700;white-space:nowrap">${p?.sku || '—'}</td>
      <td>
        <strong style="font-size:13px">${p?.nombre || item.productoId}</strong>
        ${p?.descripcion ? `<div style="font-size:10px;color:#888;margin-top:2px">${p.descripcion.slice(0,80)}</div>` : ''}
      </td>
      <td style="text-align:center;font-size:11px;color:#666">${almacen?.nombre || '—'}</td>
      <td style="text-align:center;font-size:11px;color:#888;font-style:italic">—</td>
      <td style="text-align:center;background:#fafafa;border:1px dashed #ccc;border-radius:4px">
        <div style="font-size:20px;font-weight:700;color:#111;line-height:1.8">${item.cantidad}</div>
        <div style="font-size:10px;color:#888">${p?.unidadMedida || 'UND'}</div>
      </td>
      <td style="text-align:center;min-width:80px">
        <div style="width:24px;height:24px;border:2px solid #ccc;border-radius:4px;margin:0 auto"></div>
      </td>
    </tr>`
  }).join('')

  const total = des.items?.length || 0
  const fecha = new Date().toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })

  const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8">
<title>Picking List ${des.numero}</title>
<style>
${CSS}
body{font-size:12px}
.picking-header{background:#1a1a2e;color:#fff;padding:16px 20px;border-radius:8px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}
.picking-header h1{font-size:20px;font-weight:900;color:#00c896;letter-spacing:-0.5px;margin-bottom:2px}
.picking-header .sub{color:rgba(255,255,255,0.6);font-size:11px}
.picking-header .badge-pick{background:#00c896;color:#000;font-weight:900;font-size:13px;padding:6px 16px;border-radius:20px;letter-spacing:0.05em}
.meta-grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:20px;background:#f8fafc;border-radius:8px;padding:14px 16px;border:1px solid #e5e7eb}
.meta-item label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#888;display:block;margin-bottom:2px}
.meta-item span{font-size:13px;font-weight:600;color:#111}
.instrucciones{background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px 16px;margin-bottom:18px;font-size:11px;color:#78350f}
.instrucciones b{display:block;margin-bottom:3px;font-size:12px;color:#92400e}
table.picking{width:100%;border-collapse:collapse;font-size:12px}
table.picking thead th{background:#1a1a2e;color:#fff;padding:9px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
table.picking tbody tr{border-bottom:1px solid #f3f4f6}
table.picking tbody tr:nth-child(even){background:#f9fafb}
table.picking tbody td{padding:10px 10px;vertical-align:middle}
.resumen{margin-top:20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;background:#f0fdf4;border-radius:8px;padding:14px 16px;border:1px solid #bbf7d0}
.resumen-item{text-align:center}
.resumen-item .num{font-size:24px;font-weight:900;color:#166534}
.resumen-item .lbl{font-size:10px;color:#166534;font-weight:600;text-transform:uppercase}
.firmas{margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:24px}
.firma{text-align:center;padding-top:10px;border-top:1.5px solid #ccc;font-size:10px;color:#666;line-height:1.8}
.footer{margin-top:16px;padding-top:8px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#aaa}
@media print{body{padding:0}@page{margin:12mm;size:A4 portrait}}
</style>
</head><body>

<div class="picking-header">
  <div>
    <h1>PICKING LIST</h1>
    <div class="sub">${emp}${ruc ? ` · RUC ${ruc}` : ''}</div>
  </div>
  <div class="badge-pick">N° ${des.numero}</div>
</div>

<div class="meta-grid">
  <div class="meta-item"><label>Cliente</label><span>${cliente?.razonSocial?.slice(0,28) || '—'}</span></div>
  <div class="meta-item"><label>Almacén origen</label><span>${almacen?.nombre || '—'}</span></div>
  <div class="meta-item"><label>Fecha entrega</label><span>${des.fechaEntrega || des.fecha || '—'}</span></div>
  <div class="meta-item"><label>Operario</label><span style="color:#007a5e">${sesion?.nombre || '— Asignar —'}</span></div>
  <div class="meta-item"><label>Dirección entrega</label><span style="font-size:11px">${des.direccionEntrega || cliente?.direccion || '—'}</span></div>
  <div class="meta-item"><label>Observaciones</label><span style="font-size:11px">${des.observaciones || '—'}</span></div>
  <div class="meta-item"><label>Total ítems</label><span style="color:#007a5e;font-size:18px;font-weight:900">${total}</span></div>
  <div class="meta-item"><label>Generado</label><span style="font-size:11px">${fecha}</span></div>
</div>

<div class="instrucciones">
  <b>Instrucciones para el almacenero:</b>
  1. Recoger cada producto en el orden listado. &nbsp; 2. Verificar cantidad exacta. &nbsp;
  3. Marcar la casilla ✓ al recoger. &nbsp; 4. Si hay faltante, anotar la cantidad real recogida. &nbsp;
  5. Entregar este documento firmado al supervisor antes del despacho.
</div>

<table class="picking">
  <thead>
    <tr>
      <th style="width:32px">#</th>
      <th style="width:90px">SKU</th>
      <th>Producto</th>
      <th style="width:110px;text-align:center">Ubicación</th>
      <th style="width:90px;text-align:center">Lote</th>
      <th style="width:80px;text-align:center">Cant. a recoger</th>
      <th style="width:70px;text-align:center">Recogido ✓</th>
    </tr>
  </thead>
  <tbody>${filas}</tbody>
</table>

<div class="resumen">
  <div class="resumen-item"><div class="num">${total}</div><div class="lbl">Líneas totales</div></div>
  <div class="resumen-item"><div class="num">${des.items?.reduce((s, i) => s + i.cantidad, 0) || 0}</div><div class="lbl">Unidades totales</div></div>
  <div class="resumen-item"><div class="num" style="font-size:18px">___/___</div><div class="lbl">Líneas verificadas</div></div>
</div>

<div class="firmas">
  <div class="firma">Preparado por (Almacenero)<br/><br/><br/>________________________________<br/>Nombre, firma y fecha</div>
  <div class="firma">Supervisado / Aprobado<br/><br/><br/>________________________________<br/>Nombre, firma y fecha</div>
</div>

<div class="footer">
  <span>Picking List generado por StockPro · ${new Date().toLocaleDateString('es-PE')}</span>
  <span>${des.numero} · ${emp}</span>
</div>

</body></html>`

  imprimirConIframe(html)
}

// ════════════════════════════════════════════════════════
// PROFORMA / COTIZACIÓN DE VENTA
// ════════════════════════════════════════════════════════
export function imprimirProforma({ doc, cliente, productos, config }) {
  const s   = config?.simboloMoneda || 'S/'
  const emp = config?.empresa        || 'Mi Empresa S.A.C.'
  const ruc = config?.ruc             || ''
  const tel = config?.telefono        || ''
  const ema = config?.email           || ''
  const dir = config?.direccion       || ''

  const filas = (doc.items || []).map(item => {
    const p = productos.find(x => x.id === item.productoId)
    return `<tr>
      <td>${p?.sku || '—'}</td>
      <td><strong>${item.descripcion || p?.nombre || '—'}</strong></td>
      <td class="r">${item.cantidad} ${p?.unidadMedida || ''}</td>
      <td class="r">${fm(item.precioUnitario, s)}</td>
      <td class="r" style="font-weight:700">${fm(item.subtotal, s)}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8"><title>Proforma ${doc.numero}</title>
<style>${CSS}
.proforma-banner{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin-bottom:16px;text-align:center}
.proforma-banner .pnum{font-size:22px;font-weight:900;color:#166534;letter-spacing:-0.5px}
.proforma-banner .valid{font-size:11px;color:#4ade80;margin-top:3px}
</style>
</head><body>

<div class="header">
  <div>
    <h1>${emp}</h1>
    <div class="sub">${ruc ? `RUC: ${ruc}` : ''}${dir ? ` &nbsp;&middot;&nbsp; ${dir}` : ''}</div>
    <div class="sub">${tel}${ema ? ` &nbsp;&middot;&nbsp; ${ema}` : ''}</div>
  </div>
  <div class="doc-right">
    <div class="doc-tipo">Proforma / Cotización de Venta</div>
    <div class="doc-num">${doc.numero}</div>
    <span class="badge verde">${doc.estado}</span>
    <div style="font-size:11px;color:#888;margin-top:6px">Fecha: <strong>${doc.fecha}</strong></div>
    <div style="font-size:11px;color:#888">Válida hasta: <strong>${doc.fechaVencimiento || '—'}</strong></div>
  </div>
</div>

<div class="grid2">
  <div>
    <div class="stitle">Empresa emisora</div>
    <div class="fl"><label>Empresa</label><span>${emp}</span></div>
    <div class="fl"><label>RUC</label><span>${ruc || '—'}</span></div>
    <div class="fl"><label>Dirección</label><span>${dir || '—'}</span></div>
    <div class="fl"><label>Contacto</label><span>${tel} ${ema}</span></div>
  </div>
  <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px">
    <div class="stitle" style="color:#166534">Dirigido a</div>
    <div class="fl"><label>Cliente</label><span><strong>${cliente?.razonSocial || '—'}</strong></span></div>
    <div class="fl"><label>RUC/DNI</label><span>${cliente?.ruc || '—'}</span></div>
    <div class="fl"><label>Contacto</label><span>${cliente?.contacto || '—'}</span></div>
    <div class="fl"><label>Dirección</label><span>${cliente?.direccion || '—'}</span></div>
    <div class="fl"><label>Teléfono</label><span>${cliente?.telefono || '—'}</span></div>
  </div>
</div>

<div class="stitle">Productos / Servicios cotizados</div>
<table>
  <thead><tr>
    <th style="width:75px">SKU</th><th>Descripción</th>
    <th class="r" style="width:95px">Cantidad</th>
    <th class="r" style="width:120px">P. Unitario</th>
    <th class="r" style="width:120px">Subtotal</th>
  </tr></thead>
  <tbody>${filas}</tbody>
</table>

<div class="totales">
  <div class="trow"><label>Subtotal</label><span>${fm(doc.subtotal, s)}</span></div>
  <div class="trow"><label>IGV (18%)</label><span>${fm(doc.igv, s)}</span></div>
  <div class="trow grand"><label>TOTAL</label><span>${fm(doc.total, s)}</span></div>
</div>

${doc.notas ? `<div class="notas"><strong>Notas y condiciones:</strong> ${doc.notas}</div>` : ''}

<div class="aviso" style="margin-top:20px">
  <b>Validez de la proforma</b>
  Los precios indicados son válidos hasta el <strong>${doc.fechaVencimiento || '— días a partir de la fecha'}</strong>.
  Pasada esta fecha, los precios pueden variar sin previo aviso.
</div>

<div class="firmas" style="margin-top:36px">
  <div class="firma">Elaborado por<br/><br/><br/>________________________________<br/><span style="font-size:9px">Nombre y firma</span></div>
  <div class="firma" style="visibility:hidden"></div>
  <div class="firma">Aceptado por (Cliente)<br/><br/><br/>________________________________<br/><span style="font-size:9px">Nombre, firma y sello</span></div>
</div>

<div class="footer">
  <span>Proforma generada por StockPro &nbsp;&middot;&nbsp; ${new Date().toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'})}</span>
  <span>${emp} &nbsp;&middot;&nbsp; ${doc.numero}</span>
</div>
</body></html>`

  imprimirConIframe(html)
}
