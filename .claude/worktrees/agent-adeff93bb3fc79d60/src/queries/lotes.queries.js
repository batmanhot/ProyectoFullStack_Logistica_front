import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['lotes'],
  list: (f) => ['lotes', 'list', f],
  one:  (id) => ['lotes', id],
}

export function useLotesList(productoId, { enabled } = {}) {
  return useQuery({
    queryKey: KEYS.list({ productoId }),
    queryFn: async () => {
      const qs = productoId ? `?productoId=${productoId}` : ''
      const r = await api.get(`/lotes${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
    // Por defecto solo se activa con un productoId (uso en LotesSeries.jsx /
    // modal de Vencimientos.jsx) — pasar `{ enabled: true }` para traer TODOS
    // los lotes del tenant (uso en Vencimientos.jsx/Alertas.jsx a nivel página).
    enabled: enabled ?? !!productoId,
  })
}

export function useLote(id) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: async () => {
      const r = await api.get(`/lotes/${id}`)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    enabled: !!id,
  })
}

export function useCrearLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productoId, numero, fechaVencimiento, cantidadOriginal }) =>
      api.post('/lotes', { productoId, numero, fechaVencimiento, cantidadOriginal }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useActualizarLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...campos }) => api.put(`/lotes/${id}`, campos),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.all() })
      qc.invalidateQueries({ queryKey: KEYS.one(id) })
    },
  })
}

export function useEliminarLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/lotes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
