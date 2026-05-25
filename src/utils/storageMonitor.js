/**
 * storageMonitor — Monitoreo de uso de localStorage
 * Calcula el espacio ocupado y emite niveles de alerta.
 * Límite estimado del navegador: 5 MB (conservador, real ~10 MB en Chrome).
 */

const LIMITE_BYTES = 5 * 1024 * 1024 // 5 MB conservador

export const NIVEL = {
  OK:      'ok',       // < 50%
  MEDIO:   'medio',    // 50–69%
  ALTO:    'alto',     // 70–89%
  CRITICO: 'critico',  // ≥ 90%
}

/** Calcula el uso actual de localStorage en bytes */
export function calcularUso() {
  let totalBytes = 0
  try {
    for (const key of Object.keys(localStorage)) {
      // Cada carácter UTF-16 ocupa 2 bytes
      totalBytes += (key.length + (localStorage.getItem(key)?.length || 0)) * 2
    }
  } catch {
    // localStorage no disponible (modo incógnito u otro)
  }
  return totalBytes
}

/** Retorna el objeto completo de estado de almacenamiento */
export function getStorageInfo() {
  const usadoBytes   = calcularUso()
  const porcentaje   = Math.min(Math.round((usadoBytes / LIMITE_BYTES) * 100), 100)
  const usadoKB      = Math.round(usadoBytes / 1024)
  const usadoMB      = (usadoBytes / (1024 * 1024)).toFixed(2)
  const libreKB      = Math.max(0, Math.round((LIMITE_BYTES - usadoBytes) / 1024))

  let nivel = NIVEL.OK
  if (porcentaje >= 90) nivel = NIVEL.CRITICO
  else if (porcentaje >= 70) nivel = NIVEL.ALTO
  else if (porcentaje >= 50) nivel = NIVEL.MEDIO

  return { usadoBytes, usadoKB, usadoMB, libreKB, porcentaje, nivel }
}

/** Colores por nivel para usar en la UI */
export const NIVEL_COLOR = {
  ok:      { bar: '#22c55e', text: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  medio:   { bar: '#f59e0b', text: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  alto:    { bar: '#f97316', text: '#f97316', bg: 'rgba(249,115,22,0.12)'  },
  critico: { bar: '#ef4444', text: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
}

/** Mensajes de alerta por nivel */
export const NIVEL_MENSAJE = {
  ok:      null,
  medio:   'El almacenamiento está al 50%. Considera hacer un respaldo.',
  alto:    '⚠ Almacenamiento al 70%. Haz un respaldo pronto.',
  critico: '🔴 Almacenamiento crítico (+90%). Exporta los datos ahora.',
}

// ── Respaldo automático ───────────────────────────────────
const KEY_ULTIMO_RESPALDO = 'sp_ultimo_respaldo'
const DIAS_RECORDATORIO   = 3

export function registrarRespaldo() {
  localStorage.setItem(KEY_ULTIMO_RESPALDO, new Date().toISOString())
}

export function getDiasDesdeRespaldo() {
  const val = localStorage.getItem(KEY_ULTIMO_RESPALDO)
  if (!val) return null // nunca se hizo respaldo
  const diff = Date.now() - new Date(val).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function necesitaRespaldo() {
  const dias = getDiasDesdeRespaldo()
  return dias === null || dias >= DIAS_RECORDATORIO
}

export function textoUltimoRespaldo() {
  const dias = getDiasDesdeRespaldo()
  if (dias === null) return 'Nunca se ha realizado un respaldo'
  if (dias === 0)    return 'Último respaldo: hoy'
  if (dias === 1)    return 'Último respaldo: ayer'
  return `Último respaldo: hace ${dias} días`
}
