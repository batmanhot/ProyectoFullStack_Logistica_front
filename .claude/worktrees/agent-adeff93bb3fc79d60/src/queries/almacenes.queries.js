import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['almacenes'],
  list: (p) => ['almacenes', 'list', p],
}

export function useAlmacenesList({ incluirInactivos = false, enabled = true } = {}) {
  return useQuery({
    queryKey: KEYS.list({ incluirInactivos }),
    queryFn: async () => {
      const qs = incluirInactivos ? '?incluirInactivos=true' : ''
      const r = await api.get(`/almacenes${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
    enabled,
  })
}

export function useCrearAlmacen() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nombre }) => api.post('/almacenes', { nombre }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useActualizarAlmacen() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre, activo }) => api.put(`/almacenes/${id}`, { nombre, activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useEliminarAlmacen() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/almacenes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
