import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  one: (despachoId) => ['picking', despachoId],
}

export function usePickingByDespacho(despachoId) {
  return useQuery({
    queryKey: KEYS.one(despachoId),
    queryFn: async () => {
      const r = await api.get(`/picking/${despachoId}`)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    enabled: !!despachoId,
  })
}

function invalidar(qc, despachoId) {
  qc.invalidateQueries({ queryKey: KEYS.one(despachoId) })
  qc.invalidateQueries({ queryKey: ['despachos'] })
}

export function useConfirmarLineaPicking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ despachoId, lineaId, cantidad, ubicacionId }) =>
      api.post(`/picking/${despachoId}/lineas/${lineaId}/confirmar`, { cantidad, ubicacionId }),
    onSuccess: (_data, { despachoId }) => invalidar(qc, despachoId),
  })
}

export function useAsignarPicking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ despachoId, usuarioId }) => api.put(`/picking/${despachoId}/asignar`, { usuarioId }),
    onSuccess: (_data, { despachoId }) => invalidar(qc, despachoId),
  })
}
