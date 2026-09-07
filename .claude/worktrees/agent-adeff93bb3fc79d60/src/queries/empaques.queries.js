import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEY = 'empaques'

export function useEmpaquesList(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.estadoDespacho) params.set('estadoDespacho', filtros.estadoDespacho)
  if (filtros.estadoEmpaque)  params.set('estadoEmpaque',  filtros.estadoEmpaque)
  const qs = params.toString()
  return useQuery({
    queryKey: [KEY, 'list', filtros],
    queryFn:  () => api.get(`/empaques${qs ? `?${qs}` : ''}`).then(r => r.data ?? []),
  })
}

export function useUpsertEmpaque() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ despachoId, ...dto }) => api.put(`/empaques/${despachoId}`, dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
