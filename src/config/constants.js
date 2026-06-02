/**
 * constants.js — Constantes de negocio y configuración global.
 *
 * Centraliza valores que antes estaban hardcodeados en helpers, storage y componentes.
 * Modificar aquí impacta a todo el sistema sin necesidad de buscar en múltiples archivos.
 */

// ── Inventario ────────────────────────────────────────────
export const STOCK = {
  // Multiplicador sobre stockMinimo para considerar stock "Bajo" (antes hardcoded a 1.5)
  UMBRAL_BAJO_MULTIPLICADOR: 1.5,
  // Días hacia adelante para alertar vencimiento próximo
  DIAS_ALERTA_VENCIMIENTO: 30,
}

// ── Auditoría ─────────────────────────────────────────────
export const AUDITORIA = {
  MAX_LOGS: 500,
}

// ── Paginación ────────────────────────────────────────────
export const PAGINACION = {
  ITEMS_POR_PAGINA: 20,
}

// ── Movimientos ───────────────────────────────────────────
export const MOTIVOS_ENTRADA = [
  'Compra',
  'Reposición',
  'Devolución de cliente',
  'Ajuste positivo',
  'Inventario inicial',
  'Otro',
]

export const MOTIVOS_SALIDA = [
  'Venta',
  'Consumo interno',
  'Muestra',
  'Merma',
  'Transferencia',
  'Devolución a proveedor',
  'Otro',
]

// ── Roles ─────────────────────────────────────────────────
export const ROLES_ADMIN = ['admin', 'owner', 'supervisor']

// ── Monitoreo de Storage ──────────────────────────────────
export const STORAGE = {
  // Porcentaje de uso a partir del cual mostrar alerta
  ALERTA_PORCENTAJE: 80,
  // Intervalo de monitoreo en ms
  INTERVALO_MONITOR: 30_000,
  // Intervalo de sincronización pendientes en ms
  INTERVALO_PENDIENTES: 15_000,
}
