import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEY = 'configuracion'

/** Datos de la empresa: nombre, ruc, contacto, email, telefono, direccion, plan, fechaVencimiento, estado, limites. */
export function useConfiguracion({ enabled = true } = {}) {
  return useQuery({
    queryKey: [KEY],
    queryFn:  () => api.get('/configuracion').then(r => r.data ?? {}),
    enabled,
  })
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
