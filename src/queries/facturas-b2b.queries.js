import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

export function useFacturasB2BList({ proveedorId, estado } = {}) {
  return useQuery({
    queryKey: ['facturas-b2b', { proveedorId, estado }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (proveedorId) params.set('proveedorId', proveedorId)
      if (estado)      params.set('estado', estado)
      const qs = params.toString() ? `?${params}` : ''
      const r = await api.get(`/facturas-b2b${qs}`)
      return r.data ?? []
    },
  })
}

export function useCrearFacturaB2B() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto) => api.post('/facturas-b2b', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['facturas-b2b'] }),
  })
}

export function useRecibirFacturaB2B() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/facturas-b2b/${id}/recibir`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['facturas-b2b'] }),
  })
}

export function useRechazarFacturaB2B() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }) =>
      api.post(`/facturas-b2b/${id}/rechazar`, { motivo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['facturas-b2b'] }),
  })
}
