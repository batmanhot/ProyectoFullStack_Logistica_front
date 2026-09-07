import { AlertTriangle, Clock, TrendingDown, ShoppingCart, Package, PlayCircle, Flag, DollarSign, FileText, Target, Globe, Wrench, FileWarning } from 'lucide-react'
import { formatDate, formatTime, formatCurrency, diasParaVencer, estadoStock } from './helpers'

export const TIPOS = {
  stock_agotado: { label:'Agotado',       color:'danger',  icon:Package,       bg:'bg-red-500/15',    txt:'text-red-400'   },
  stock_critico: { label:'Stock crítico', color:'danger',  icon:AlertTriangle, bg:'bg-red-500/15',    txt:'text-red-400'   },
  vencimiento:   { label:'Vencimiento',   color:'warning', icon:Clock,         bg:'bg-amber-500/15',  txt:'text-amber-400' },
  reorden:       { label:'Punto reorden', color:'warning', icon:TrendingDown,  bg:'bg-amber-500/15',  txt:'text-amber-400' },
  oc_pendiente:  { label:'OC pendiente',  color:'info',    icon:ShoppingCart,  bg:'bg-blue-500/15',   txt:'text-blue-400'  },
  // Compartido con Gerente de Operaciones/Analista de Compras cuando se les
  // pasa `cotizaciones` a generarAlertas() (ver Alertas.jsx) — ninguno de
  // los dos tiene alertas propias, solo les faltaba este tipo en el genérico.
  cotizacion_sin_respuesta: { label:'RFQ sin respuesta', color:'warning', icon:FileWarning, bg:'bg-amber-500/15', txt:'text-amber-400' },
}

// Alertas operativas para el rol Chofer — no le sirven las de inventario (no
// tiene permiso a esos módulos, ver Alertas.jsx), le sirven avisos sobre SUS
// rutas asignadas.
export const TIPOS_CHOFER = {
  parada_demorada:  { label:'Parada demorada', color:'danger',  icon:AlertTriangle, bg:'bg-red-500/15',    txt:'text-red-400'   },
  ruta_sin_iniciar: { label:'Ruta sin iniciar', color:'warning', icon:PlayCircle,    bg:'bg-amber-500/15',  txt:'text-amber-400' },
  ruta_sin_cerrar:  { label:'Ruta sin cerrar',  color:'info',    icon:Flag,          bg:'bg-blue-500/15',   txt:'text-blue-400'  },
}

// Alertas comerciales para el rol Ejecutivo Comercial — no tiene permiso a
// inventario operativo (ordenes/categorias/lotes-series), así que las alertas
// de stock/vencimiento/OC de generarAlertas() no le sirven (ver Alertas.jsx).
// Le sirven avisos sobre SU cartera: cobranza, proformas y pipeline.
export const TIPOS_EJECUTIVO_COMERCIAL = {
  cxc_vencida:             { label:'CxC vencida',           color:'danger',  icon:DollarSign,   bg:'bg-red-500/15',   txt:'text-red-400'   },
  cxc_por_vencer:          { label:'CxC por vencer',         color:'warning', icon:Clock,         bg:'bg-amber-500/15', txt:'text-amber-400' },
  proforma_vencida:        { label:'Proforma vencida',       color:'warning', icon:FileText,      bg:'bg-amber-500/15', txt:'text-amber-400' },
  oportunidad_estancada:   { label:'Oportunidad estancada',  color:'info',    icon:Target,        bg:'bg-blue-500/15',  txt:'text-blue-400'  },
  pedido_portal_pendiente: { label:'Pedido de Portal',       color:'info',    icon:Globe,         bg:'bg-blue-500/15',  txt:'text-blue-400'  },
}

// Alertas operativas para el rol Coordinador de Transporte — no tiene
// permiso a inventario (ordenes/categorias/almacenes/lotes-series), así que
// generarAlertas() nunca encontraría nada real. Le sirven avisos sobre TODAS
// las rutas de la empresa (no solo las propias, a diferencia de Chofer) y
// sobre los vehículos de Flota.
export const TIPOS_COORDINADOR_TRANSPORTE = {
  ...TIPOS_CHOFER,
  vehiculo_documento: { label:'Vehículo — documento', color:'warning', icon:Wrench, bg:'bg-amber-500/15', txt:'text-amber-400' },
}

// Alertas para el rol Contable/Finanzas — no tiene permiso a inventario
// tampoco, le sirven avisos de cobranza (a nivel empresa, no solo la propia
// cartera como Ejecutivo Comercial) y de guías de remisión electrónica.
export const TIPOS_CONTABLE = {
  cxc_vencida:    { label:'CxC vencida',        color:'danger',  icon:DollarSign,  bg:'bg-red-500/15',   txt:'text-red-400'   },
  cxc_por_vencer: { label:'CxC por vencer',      color:'warning', icon:Clock,       bg:'bg-amber-500/15', txt:'text-amber-400' },
  gre_rechazada:  { label:'GRE rechazada',       color:'danger',  icon:FileWarning, bg:'bg-red-500/15',   txt:'text-red-400'   },
  gre_pendiente:  { label:'GRE sin enviar',      color:'info',    icon:FileText,    bg:'bg-blue-500/15',  txt:'text-blue-400'  },
}

const HORAS_PARADA_DEMORADA = 2 // desde la hora de salida de la ruta, no por parada individual (no tienen hora propia)
const DIAS_ALERTA_CXC = 7 // CxC pendiente que vence dentro de esta ventana avisa "por vencer"
const DIAS_ESTANCAMIENTO_OPORTUNIDAD = 7 // sin actividad registrada en el pipeline abierto
const DIAS_GRE_SIN_ENVIAR = 2 // GRE generada (PENDIENTE) sin enviar a SUNAT en este plazo avisa

export function generarAlertas(productos, ordenes, vencPorProducto, config, categorias, almacenes, simboloMoneda, cotizaciones = []) {
  const alertas = []
  const diasAlerta = config?.diasAlertaVencimiento || 30

  productos.forEach(p => {
    if (p.activo === false) return
    const e       = estadoStock(p.stockActual, p.stockMinimo)
    const cat     = categorias.find(c => c.id === p.categoriaId)?.nombre || '—'
    const alm     = almacenes.find(a => a.id === p.almacenId)?.nombre   || '—'
    const base    = { productoId:p.id, sku:p.sku, nombre:p.nombre, categoria:cat, almacen:alm,
                      stock:p.stockActual, stockMin:p.stockMinimo, stockMax:p.stockMaximo,
                      unidad:p.unidadMedida, fecha:new Date().toISOString().split('T')[0] }

    if (p.stockActual <= 0) {
      alertas.push({ ...base, tipo:'stock_agotado', prioridad:1,
        titulo:`${p.nombre} — Sin stock`,
        detalle:`El producto está agotado. Stock mínimo requerido: ${p.stockMinimo} ${p.unidadMedida}.`,
        accion:'Generar Orden de Compra',
        accionPath:'/ordenes',
      })
    } else if (e.estado === 'critico') {
      alertas.push({ ...base, tipo:'stock_critico', prioridad:1,
        titulo:`${p.nombre} — Stock crítico`,
        detalle:`Stock actual (${p.stockActual}) está por debajo del mínimo (${p.stockMinimo}) ${p.unidadMedida}.`,
        accion:'Ver en Punto de Reorden',
        accionPath:'/reorden',
      })
    } else if (e.estado === 'bajo') {
      alertas.push({ ...base, tipo:'reorden', prioridad:2,
        titulo:`${p.nombre} — Stock bajo`,
        detalle:`Stock actual (${p.stockActual}) se acerca al mínimo (${p.stockMinimo}) ${p.unidadMedida}.`,
        accion:'Ver Previsión',
        accionPath:'/prevision',
      })
    }

    const fechaVencimiento = vencPorProducto[p.id]
    if (fechaVencimiento) {
      const dias = diasParaVencer(fechaVencimiento)
      if (dias !== null && dias < 0) {
        alertas.push({ ...base, tipo:'vencimiento', prioridad:1,
          titulo:`${p.nombre} — VENCIDO`,
          detalle:`Venció hace ${Math.abs(dias)} días. Fecha: ${formatDate(fechaVencimiento)}.`,
          diasVencimiento: dias,
          fechaVencimiento,
          accion:'Gestionar baja',
          accionPath:'/vencimientos',
          fecha: fechaVencimiento,
        })
      } else if (dias !== null && dias <= diasAlerta) {
        alertas.push({ ...base, tipo:'vencimiento', prioridad: dias <= 15 ? 1 : 2,
          titulo:`${p.nombre} — Próximo a vencer`,
          detalle:`Vence en ${dias} días (${formatDate(fechaVencimiento)}).`,
          diasVencimiento: dias,
          fechaVencimiento,
          accion:'Ver Vencimientos',
          accionPath:'/vencimientos',
          fecha: fechaVencimiento,
        })
      }
    }
  })

  ordenes.filter(o => o.estado === 'PENDIENTE').forEach(o => {
    alertas.push({
      tipo:'oc_pendiente', prioridad:3,
      titulo:`OC ${o.numero} — Pendiente de aprobación`,
      detalle:`Orden de compra por ${formatCurrency(o.total, simboloMoneda)} esperando aprobación.`,
      ocNumero: o.numero,
      ocTotal:  o.total,
      ocFecha:  o.fecha,
      accion:'Ir a Órdenes de Compra',
      accionPath:'/ordenes',
      fecha: o.fecha,
    })
  })

  cotizaciones.forEach(c => {
    if (c.estado !== 'ENVIADA' || !c.fechaVencimiento) return
    const dias = diasParaVencer(c.fechaVencimiento)
    if (dias !== null && dias < 0) {
      alertas.push({
        tipo:'cotizacion_sin_respuesta', prioridad:2,
        titulo:`RFQ ${c.numero} — Vencida sin respuesta`,
        detalle:`Venció hace ${Math.abs(dias)} días (${formatDate(c.fechaVencimiento)}) sin que ningún proveedor responda.`,
        accion:'Ir a Cotizaciones', accionPath:'/cotizaciones',
        fecha: c.fechaVencimiento,
      })
    }
  })

  return alertas.sort((a, b) => a.prioridad - b.prioridad)
}

/** Alertas comerciales para el rol Ejecutivo Comercial. */
export function generarAlertasEjecutivoComercial(cxc, proformas, oportunidades, pedidosPortal, simboloMoneda) {
  const alertas = []

  cxc.forEach(c => {
    if (c.estado === 'VENCIDA') {
      const dias = diasParaVencer(c.fechaVencimiento)
      alertas.push({
        tipo:'cxc_vencida', prioridad:1,
        titulo:`CxC ${c.numero} — Vencida`,
        detalle:`Saldo de ${formatCurrency(c.saldo, simboloMoneda)} vencido hace ${Math.abs(dias ?? 0)} días (${formatDate(c.fechaVencimiento)}).`,
        accion:'Ir a Cuentas por Cobrar', accionPath:'/cuentas-por-cobrar',
        fecha: c.fechaVencimiento,
      })
    } else if (['PENDIENTE', 'PARCIAL'].includes(c.estado)) {
      const dias = diasParaVencer(c.fechaVencimiento)
      if (dias !== null && dias >= 0 && dias <= DIAS_ALERTA_CXC) {
        alertas.push({
          tipo:'cxc_por_vencer', prioridad:2,
          titulo:`CxC ${c.numero} — Vence en ${dias} día${dias === 1 ? '' : 's'}`,
          detalle:`Saldo de ${formatCurrency(c.saldo, simboloMoneda)} vence el ${formatDate(c.fechaVencimiento)}.`,
          accion:'Ir a Cuentas por Cobrar', accionPath:'/cuentas-por-cobrar',
          fecha: c.fechaVencimiento,
        })
      }
    }
  })

  proformas.forEach(p => {
    if (p.estado !== 'ENVIADA' || !p.fechaVencimiento) return
    const dias = diasParaVencer(p.fechaVencimiento)
    if (dias !== null && dias < 0) {
      alertas.push({
        tipo:'proforma_vencida', prioridad:2,
        titulo:`Proforma ${p.numero} — Vencida sin respuesta`,
        detalle:`Venció hace ${Math.abs(dias)} días (${formatDate(p.fechaVencimiento)}) sin marcarse Aceptada ni Rechazada.`,
        accion:'Ir a Proformas', accionPath:'/proformas',
        fecha: p.fechaVencimiento,
      })
    }
  })

  const abiertas = ['NUEVA', 'CALIFICADA', 'COTIZADA', 'EN_NEGOCIACION']
  oportunidades.forEach(o => {
    if (!abiertas.includes(o.estado)) return
    const referencia = o.fechaUltimaActividad || o.createdAt
    const dias = diasParaVencer(referencia)
    if (dias !== null && dias <= -DIAS_ESTANCAMIENTO_OPORTUNIDAD) {
      alertas.push({
        tipo:'oportunidad_estancada', prioridad:2,
        titulo:`${o.codigo} — Sin actividad hace ${Math.abs(dias)} días`,
        detalle:`"${o.descripcion}" sigue en ${o.estado} sin registrar una actividad reciente.`,
        accion:'Ir a Oportunidades', accionPath:'/oportunidades',
        fecha: referencia,
      })
    }
  })

  pedidosPortal.forEach(p => {
    if (p.estado !== 'NUEVO') return
    alertas.push({
      tipo:'pedido_portal_pendiente', prioridad:2,
      titulo:`Pedido de Portal — Sin revisar`,
      detalle:`Un cliente envió un pedido por el Portal de Pedidos que todavía no fue revisado.`,
      accion:'Ir a Portal de Pedidos', accionPath:'/portal-pedidos',
      fecha: p.createdAt,
    })
  })

  return alertas.sort((a, b) => a.prioridad - b.prioridad)
}

/** Alertas de rutas para el rol Chofer — recibe SUS rutas ya filtradas (ver Alertas.jsx). */
export function generarAlertasChofer(rutas) {
  const alertas = []
  const ahora = new Date()

  rutas.forEach(ruta => {
    const paradas = ruta.paradas || []
    const salida  = ruta.fechaSalida ? new Date(ruta.fechaSalida) : null
    if (!salida) return

    if (ruta.estado === 'PROGRAMADA' && salida <= ahora) {
      const horas = Math.floor((ahora - salida) / 3_600_000)
      alertas.push({
        tipo:'ruta_sin_iniciar', prioridad:1,
        titulo:`Ruta ${ruta.numero} — Sin iniciar`,
        detalle:`Estaba programada para salir a las ${formatTime(ruta.fechaSalida)} y todavía no se inició (hace ${horas}h).`,
        rutaNumero: ruta.numero,
        accion:'Ir a Transportes', accionPath:'/transportes',
        fecha: ruta.fechaSalida,
      })
    }

    if (ruta.estado === 'EN_RUTA') {
      const horasEnRuta = (ahora - salida) / 3_600_000
      const pendientes  = paradas.filter(p => ['PENDIENTE', 'EN_CAMINO'].includes(p.estado))

      if (horasEnRuta >= HORAS_PARADA_DEMORADA) {
        pendientes.forEach(p => {
          alertas.push({
            tipo:'parada_demorada', prioridad:1,
            titulo:`Ruta ${ruta.numero} — Parada #${p.orden} demorada`,
            detalle:`La ruta salió hace ${Math.floor(horasEnRuta)}h y esta parada sigue ${p.estado === 'EN_CAMINO' ? 'en camino' : 'pendiente'}.`,
            rutaNumero: ruta.numero,
            accion:'Ir a Transportes', accionPath:'/transportes',
            fecha: ruta.fechaSalida,
          })
        })
      }

      if (paradas.length > 0 && pendientes.length === 0) {
        alertas.push({
          tipo:'ruta_sin_cerrar', prioridad:2,
          titulo:`Ruta ${ruta.numero} — Lista para cerrar`,
          detalle:`Las ${paradas.length} parada(s) ya están resueltas — falta cerrar la ruta.`,
          rutaNumero: ruta.numero,
          accion:'Ir a Transportes', accionPath:'/transportes',
          fecha: ruta.fechaSalida,
        })
      }
    }
  })

  return alertas.sort((a, b) => a.prioridad - b.prioridad)
}

/**
 * Alertas para el rol Coordinador de Transporte — reutiliza
 * generarAlertasChofer() tal cual (mismas reglas de ruta_sin_iniciar/
 * parada_demorada/ruta_sin_cerrar), pero recibe TODAS las rutas de la
 * empresa, no las de un solo transportista (ver Alertas.jsx) — más las
 * alertas de vencimiento de documentos de Flota (SOAT/Rev. Técnica/
 * Mantenimiento), que ya calcula FlotaService.alertas() en el backend.
 */
export function generarAlertasCoordinadorTransporte(rutas, flotaAlertas) {
  const deRutas = generarAlertasChofer(rutas)
  const deFlota = flotaAlertas.map(f => ({
    tipo:'vehiculo_documento', prioridad: f.dias < 0 || f.dias <= 7 ? 1 : 2,
    titulo:`${f.unidad} (${f.placa}) — ${f.tipo} ${f.dias < 0 ? 'vencido' : 'por vencer'}`,
    detalle: f.dias < 0
      ? `${f.tipo} venció hace ${Math.abs(f.dias)} días.`
      : `${f.tipo} vence en ${f.dias} días (${formatDate(f.fecha)}).`,
    accion:'Ir a Flota', accionPath:'/flota',
    fecha: f.fecha,
  }))
  return [...deRutas, ...deFlota].sort((a, b) => a.prioridad - b.prioridad)
}

/** Alertas para el rol Contable/Finanzas — cobranza a nivel empresa (no una cartera personal) y guías de remisión electrónica. */
export function generarAlertasContable(cxc, guias, simboloMoneda) {
  const alertas = []

  cxc.forEach(c => {
    if (c.estado === 'VENCIDA') {
      const dias = diasParaVencer(c.fechaVencimiento)
      alertas.push({
        tipo:'cxc_vencida', prioridad:1,
        titulo:`CxC ${c.numero} — Vencida`,
        detalle:`Saldo de ${formatCurrency(c.saldo, simboloMoneda)} vencido hace ${Math.abs(dias ?? 0)} días (${formatDate(c.fechaVencimiento)}).`,
        accion:'Ir a Cuentas por Cobrar', accionPath:'/cuentas-por-cobrar',
        fecha: c.fechaVencimiento,
      })
    } else if (['PENDIENTE', 'PARCIAL'].includes(c.estado)) {
      const dias = diasParaVencer(c.fechaVencimiento)
      if (dias !== null && dias >= 0 && dias <= DIAS_ALERTA_CXC) {
        alertas.push({
          tipo:'cxc_por_vencer', prioridad:2,
          titulo:`CxC ${c.numero} — Vence en ${dias} día${dias === 1 ? '' : 's'}`,
          detalle:`Saldo de ${formatCurrency(c.saldo, simboloMoneda)} vence el ${formatDate(c.fechaVencimiento)}.`,
          accion:'Ir a Cuentas por Cobrar', accionPath:'/cuentas-por-cobrar',
          fecha: c.fechaVencimiento,
        })
      }
    }
  })

  guias.forEach(g => {
    const cliente = g.despacho?.cliente?.razonSocial || 'cliente'
    if (g.estado === 'RECHAZADO') {
      alertas.push({
        tipo:'gre_rechazada', prioridad:1,
        titulo:`GRE ${g.despacho?.numero || ''} — Rechazada`,
        detalle: g.motivoRechazo ? `Motivo: ${g.motivoRechazo}` : `Guía de remisión de ${cliente} rechazada, sin motivo registrado.`,
        accion:'Ir a Guías de Remisión', accionPath:'/sunat',
        fecha: g.fechaRespuesta || g.createdAt,
      })
    } else if (g.estado === 'PENDIENTE') {
      const dias = diasParaVencer(g.createdAt)
      if (dias !== null && dias <= -DIAS_GRE_SIN_ENVIAR) {
        alertas.push({
          tipo:'gre_pendiente', prioridad:2,
          titulo:`GRE ${g.despacho?.numero || ''} — Sin enviar hace ${Math.abs(dias)} días`,
          detalle:`Guía de remisión de ${cliente} generada pero todavía no se envió a SUNAT.`,
          accion:'Ir a Guías de Remisión', accionPath:'/sunat',
          fecha: g.createdAt,
        })
      }
    }
  })

  return alertas.sort((a, b) => a.prioridad - b.prioridad)
}
