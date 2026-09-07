import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEY = 'pedidos-portal'

export function usePedidosPortalList({ estado, enabled = true } = {}) {
  const params = new URLSearchParams()
  if (estado) params.set('estado', estado)
  const qs = params.toString()
  return useQuery({
    queryKey: [KEY, { estado }],
    queryFn:  () => api.get(`/pedidos-portal${qs ? `?${qs}` : ''}`).then(r => r.data ?? []),
    enabled,
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
