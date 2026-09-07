import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['cdr'],
  list: (f) => ['cdr', 'list', f],
  one:  (id) => ['cdr', id],
}

export function useCdrList({ incluirInactivos = false, enabled = true } = {}) {
  return useQuery({
    queryKey: KEYS.list({ incluirInactivos }),
    queryFn: async () => {
      const qs = incluirInactivos ? '?incluirInactivos=true' : ''
      const r = await api.get(`/cdr${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
    enabled,
  })
}

export function useCrearCdr() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos) => api.post('/cdr', datos),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useActualizarCdr() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...campos }) => api.put(`/cdr/${id}`, campos),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useEliminarCdr() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/cdr/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
