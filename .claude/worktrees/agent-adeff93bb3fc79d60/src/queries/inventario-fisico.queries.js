import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['inventario-fisico'],
  list: (f) => ['inventario-fisico', 'list', f],
  one:  (id) => ['inventario-fisico', id],
}

export function useInventarioFisicoList({ almacenId, estado } = {}) {
  return useQuery({
    queryKey: KEYS.list({ almacenId, estado }),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (almacenId) params.set('almacenId', almacenId)
      if (estado)    params.set('estado', estado)
      const qs = params.toString() ? `?${params}` : ''
      const r = await api.get(`/inventario-fisico${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
  })
}

export function useInventarioFisico(id) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: async () => {
      const r = await api.get(`/inventario-fisico/${id}`)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    enabled: !!id,
  })
}

export function useCrearInventarioFisico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ almacenId, categoriaId, notas }) =>
      api.post('/inventario-fisico', {
        almacenId,
        categoriaId: categoriaId || undefined,
        notas:       notas       || undefined,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useActualizarLineaInventario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ inventarioId, productoId, stockFisico }) =>
      api.put(`/inventario-fisico/${inventarioId}/lineas/${productoId}`, { stockFisico }),
    onSuccess: (_, { inventarioId }) => qc.invalidateQueries({ queryKey: KEYS.one(inventarioId) }),
  })
}

export function useCerrarInventarioFisico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/inventario-fisico/${id}/cerrar`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all() })
      qc.invalidateQueries({ queryKey: ['inventario'] })
      qc.invalidateQueries({ queryKey: ['movimientos'] })
    },
  })
}
