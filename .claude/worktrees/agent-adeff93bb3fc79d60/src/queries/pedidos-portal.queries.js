import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEY = 'pedidos-portal'

export function usePedidosPortalList(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.estado) params.set('estado', filtros.estado)
  const qs = params.toString()
  return useQuery({
    queryKey: [KEY, filtros],
    queryFn:  () => api.get(`/pedidos-portal${qs ? `?${qs}` : ''}`).then(r => r.data ?? []),
  })
}

export function useAprobarPedidoPortal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, almacenId }) => api.post(`/pedidos-portal/${id}/aprobar`, { almacenId }),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['despachos'] })
    },
  })
}

export function useRechazarPedidoPortal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }) => api.post(`/pedidos-portal/${id}/rechazar`, { motivo }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
