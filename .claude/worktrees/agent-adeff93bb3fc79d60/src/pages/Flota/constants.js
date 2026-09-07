// Extrae YYYY-MM-DD de ISO datetime o de YYYY-MM-DD directamente
export function toDateStr(v) { return v ? String(v).slice(0, 10) : null }

export function diasHasta(fecha) {
  const d = toDateStr(fecha)
  if (!d) return null
  return Math.ceil((new Date(d + 'T12:00:00') - new Date()) / 86400000)
}

export function estadoVenc(dias) {
  if (dias === null) return { label:'Sin fecha', color:'#5f6f80', badge:'neutral'  }
  if (dias < 0)      return { label:'Vencido',   color:'#ef4444', badge:'danger'   }
  if (dias <= 15)    return { label:'Crítico',   color:'#ef4444', badge:'danger'   }
  if (dias <= 30)    return { label:'Urgente',   color:'#f59e0b', badge:'warning'  }
  if (dias <= 90)    return { label:'Próximo',   color:'#3b82f6', badge:'info'     }
  return              { label:'Vigente',   color:'#22c55e', badge:'success'  }
}

export const TIPO_VEHICULO = ['Camioneta','Camión','Furgón','Moto','Auto','Bus','Otro']
export const TIPO_MANT     = ['Cambio de aceite','Afinamiento','Revisión frenos','Cambio de llantas','Mantenimiento general','Revisión eléctrica','Revisión de suspensión','Otro']
export const TABS = [
  ['unidades',     'Unidades'],
  ['mantenimiento','Mantenimiento'],
  ['combustible',  'Combustible & KM'],
  ['alertas',      'Alertas'],
]
