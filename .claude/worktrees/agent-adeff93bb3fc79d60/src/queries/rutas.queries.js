import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['rutas'],
  list: (f) => ['rutas', 'list', f],
  one:  (id) => ['rutas', id],
}

export function useRutasList({ transportistaId, estado } = {}) {
  return useQuery({
    queryKey: KEYS.list({ transportistaId, estado }),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (transportistaId) params.set('transportistaId', transportistaId)
      if (estado)          params.set('estado', estado)
      const qs = params.toString() ? `?${params}` : ''
      const r = await api.get(`/rutas${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
  })
}

export function useRuta(id) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: async () => {
      const r = await api.get(`/rutas/${id}`)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    enabled: !!id,
  })
}

export function useCrearRuta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto) => api.post('/rutas', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useIniciarRuta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/rutas/${id}/iniciar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all() })
      qc.invalidateQueries({ queryKey: ['despachos'] })
      qc.invalidateQueries({ queryKey: ['movimientos'] })
      qc.invalidateQueries({ queryKey: ['inventario'] })
    },
  })
}

export function useMarcarParada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, despachoId, ...dto }) =>
      api.post(`/rutas/${id}/paradas/${despachoId}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useCompletarRuta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }) => api.post(`/rutas/${id}/completar`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useCancelarRuta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/rutas/${id}/cancelar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
