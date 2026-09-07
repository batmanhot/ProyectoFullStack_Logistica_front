import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

export function useUbicacionesList(almacenId, incluirInactivas = false) {
  return useQuery({
    queryKey: ['ubicaciones', almacenId, incluirInactivas],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (almacenId)        params.set('almacenId', almacenId)
      if (incluirInactivas) params.set('incluirInactivas', 'true')
      const qs = params.toString() ? `?${params}` : ''
      const r = await api.get(`/ubicaciones${qs}`)
      return r.data ?? []
    },
    enabled: !!almacenId,
  })
}

export function useUbicacionInventario(ubicacionId) {
  return useQuery({
    queryKey: ['ubicaciones', ubicacionId, 'inventario'],
    queryFn: async () => {
      const r = await api.get(`/ubicaciones/${ubicacionId}/inventario`)
      return r.data ?? []
    },
    enabled: !!ubicacionId,
  })
}

export function useCrearUbicacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto) => api.post('/ubicaciones', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ubicaciones'] }),
  })
}

export function useActualizarUbicacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }) => api.put(`/ubicaciones/${id}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ubicaciones'] }),
  })
}

export function useEliminarUbicacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/ubicaciones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ubicaciones'] }),
  })
}

export function useAsignarUbicacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ubicacionId, ...dto }) =>
      api.post(`/ubicaciones/${ubicacionId}/asignar`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ubicaciones'] })
      qc.invalidateQueries({ queryKey: ['inventario'] })
    },
  })
}

export function useLiberarUbicacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ubicacionId, ...dto }) =>
      api.post(`/ubicaciones/${ubicacionId}/liberar`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ubicaciones'] })
      qc.invalidateQueries({ queryKey: ['inventario'] })
    },
  })
}
