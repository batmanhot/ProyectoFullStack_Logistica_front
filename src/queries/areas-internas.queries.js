import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['areas-internas'],
  list: (f) => ['areas-internas', 'list', f],
  one:  (id) => ['areas-internas', id],
}

export function useAreasInternasList({ incluirInactivas = false, enabled = true } = {}) {
  return useQuery({
    queryKey: KEYS.list({ incluirInactivas }),
    queryFn: async () => {
      const qs = incluirInactivas ? '?incluirInactivas=true' : ''
      const r = await api.get(`/areas-internas${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
    enabled,
  })
}

export function useAreaInterna(id) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: async () => {
      const r = await api.get(`/areas-internas/${id}`)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    enabled: !!id,
  })
}

export function useCrearAreaInterna() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nombre, codigo }) => api.post('/areas-internas', { nombre, codigo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useActualizarAreaInterna() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...campos }) => api.put(`/areas-internas/${id}`, campos),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useEliminarAreaInterna() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/areas-internas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
