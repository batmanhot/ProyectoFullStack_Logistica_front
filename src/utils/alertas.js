import { AlertTriangle, Clock, TrendingDown, ShoppingCart, Package } from 'lucide-react'
import { formatDate, formatCurrency, diasParaVencer, estadoStock } from './helpers'

export const TIPOS = {
  stock_agotado: { label:'Agotado',       color:'danger',  icon:Package,       bg:'bg-red-500/15',    txt:'text-red-400'   },
  stock_critico: { label:'Stock crítico', color:'danger',  icon:AlertTriangle, bg:'bg-red-500/15',    txt:'text-red-400'   },
  vencimiento:   { label:'Vencimiento',   color:'warning', icon:Clock,         bg:'bg-amber-500/15',  txt:'text-amber-400' },
  reorden:       { label:'Punto reorden', color:'warning', icon:TrendingDown,  bg:'bg-amber-500/15',  txt:'text-amber-400' },
  oc_pendiente:  { label:'OC pendiente',  color:'info',    icon:ShoppingCart,  bg:'bg-blue-500/15',   txt:'text-blue-400'  },
}

export function generarAlertas(productos, ordenes, vencPorProducto, config, categorias, almacenes, simboloMoneda) {
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

  return alertas.sort((a, b) => a.prioridad - b.prioridad)
}
