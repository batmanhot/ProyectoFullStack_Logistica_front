import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['cotizaciones'],
  list: (f) => ['cotizaciones', 'list', f],
  one:  (id) => ['cotizaciones', id],
}

export function useCotizacionesList({ estado } = {}) {
  return useQuery({
    queryKey: KEYS.list({ estado }),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (estado) params.set('estado', estado)
      const qs = params.toString() ? `?${params}` : ''
      const r = await api.get(`/cotizaciones${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
  })
}

export function useCotizacion(id) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: async () => {
      const r = await api.get(`/cotizaciones/${id}`)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    enabled: !!id,
  })
}

export function useCrearCotizacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fechaVencimiento, notas, items }) =>
      api.post('/cotizaciones', { fechaVencimiento, notas, items }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useActualizarCotizacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...campos }) => api.put(`/cotizaciones/${id}`, campos),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useEliminarCotizacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/cotizaciones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useAgregarRespuesta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cotizacionId, ...dto }) =>
      api.post(`/cotizaciones/${cotizacionId}/respuestas`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useMarcarGanadora() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cotizacionId, respuestaId }) =>
      api.put(`/cotizaciones/${cotizacionId}/respuestas/${respuestaId}/ganadora`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
