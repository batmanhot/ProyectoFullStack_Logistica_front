import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['transportistas'],
  list: (f) => ['transportistas', 'list', f],
  one:  (id) => ['transportistas', id],
}

export function useTransportistasList({ incluirInactivos = false } = {}) {
  return useQuery({
    queryKey: KEYS.list({ incluirInactivos }),
    queryFn: async () => {
      const qs = incluirInactivos ? '?incluirInactivos=true' : ''
      const r = await api.get(`/transportistas${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
  })
}

export function useTransportista(id) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: async () => {
      const r = await api.get(`/transportistas/${id}`)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    enabled: !!id,
  })
}

export function useCrearTransportista() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto) => api.post('/transportistas', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useActualizarTransportista() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...campos }) => api.put(`/transportistas/${id}`, campos),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useEliminarTransportista() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/transportistas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
