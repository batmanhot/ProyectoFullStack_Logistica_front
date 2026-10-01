import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEY = 'configuracion'

/** Datos de la empresa: nombre, ruc, contacto, email, telefono, direccion, plan, fechaVencimiento, estado, limites, formulaValorizacion, alertaVencimiento. */
export function useConfiguracion({ enabled = true } = {}) {
  return useQuery({
    queryKey: [KEY],
    queryFn:  () => api.get('/configuracion').then(r => r.data ?? {}),
    enabled,
  })
}

/**
 * Datos de empresa listos para inyectar en las plantillas de PDF (pdfTemplates.js
 * espera `config.empresa`, no `config.nombre` — de ahí el mapeo). Sin esto, las
 * plantillas caen a su valor por defecto hardcodeado ("Mi Empresa S.A.C.").
 */
export function useEmpresaPDFConfig() {
  const { data } = useConfiguracion()
  return {
    simboloMoneda: 'S/',
    empresa:       data?.nombre    || '',
    ruc:           data?.ruc       || '',
    telefono:      data?.telefono  || '',
    email:         data?.email     || '',
    direccion:     data?.direccion || '',
  }
}

/** Actualiza los campos de empresa (PATCH parcial — solo envía los campos modificados). */
export function usePatchConfiguracion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (campos) => api.patch('/configuracion', campos),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

/** Elimina todos los datos operativos del tenant (conserva config/categorías/almacenes/usuarios). */
export function useLimpiarOperativos() {
  return useMutation({
    // Fastify rechaza un body vacío cuando Content-Type es application/json — se manda {} explícito.
    mutationFn: () => api.post('/datos/limpiar-operativos', {}),
  })
}

/** Wipe completo + re-siembra datos demo del tenant. */
export function useRestaurarDemo() {
  return useMutation({
    mutationFn: () => api.post('/datos/restaurar-demo', {}),
  })
}

/**
 * Activa Empresa.costeoAutomatico — el backend migra (backfill) el stock
 * existente ANTES de encender el flag, en la misma transacción, para que
 * ninguna salida posterior falle por falta de capas de costo previas.
 */
export function useActivarCosteoAutomatico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/valorizacion/activar', {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

/** Apaga el motor de capas de costo. No borra las capas ya creadas. */
export function useDesactivarCosteoAutomatico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/valorizacion/desactivar', {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
