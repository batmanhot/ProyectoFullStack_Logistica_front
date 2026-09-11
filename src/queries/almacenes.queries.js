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

// El payload puede incluir, además de `nombre`, la ubicación física opcional
// (direccion, ciudad, region, pais, latitud, longitud, responsable, telefono).
// El backend ignora campos no declarados (whitelist), así que se pasa tal cual.
export function useCrearAlmacen() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/almacenes', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useActualizarAlmacen() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/almacenes/${id}`, payload),
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
