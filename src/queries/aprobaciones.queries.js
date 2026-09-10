import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEY = 'aprobaciones'

/**
 * Reglas de aprobación por proceso del tenant (#11b). Devuelve siempre los 4
 * procesos — con su fila real o el valor por defecto (`porDefecto: true`).
 * `{ proceso, label, descripcion, rolesAprobadores[], porDefecto }`
 */
export function useReglasAprobacion() {
  return useQuery({
    queryKey: [KEY],
    queryFn:  () => api.get('/aprobaciones/reglas').then(r => r.data ?? []),
  })
}

/** PUT /aprobaciones/reglas/:proceso — { rolesAprobadores: string[] }. */
export function useActualizarReglaAprobacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ proceso, rolesAprobadores }) =>
      api.put(`/aprobaciones/reglas/${proceso}`, { rolesAprobadores }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
