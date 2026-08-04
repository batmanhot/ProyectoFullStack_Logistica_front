import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['pedidos-internos'],
  list: (f) => ['pedidos-internos', 'list', f],
  one:  (id) => ['pedidos-internos', id],
}

export function usePedidosInternosList({ areaId, estado } = {}) {
  return useQuery({
    queryKey: KEYS.list({ areaId, estado }),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (areaId)  params.set('areaId', areaId)
      if (estado)  params.set('estado', estado)
      const qs = params.toString() ? `?${params}` : ''
      const r = await api.get(`/pedidos-internos${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
  })
}

/**
 * Catálogo mínimo de productos (sin costos ni stock) para el modal "Nuevo
 * pedido" — a diferencia de useProductosList(), no exige el permiso
 * 'inventario', así que el rol 'solicitante' también puede usarlo.
 */
export function usePedidosInternosProductos() {
  return useQuery({
    queryKey: [...KEYS.all(), 'productos-disponibles'],
    queryFn: async () => {
      const r = await api.get('/pedidos-internos/productos-disponibles')
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
  })
}

export function usePedidoInterno(id) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: async () => {
      const r = await api.get(`/pedidos-internos/${id}`)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    enabled: !!id,
  })
}

export function useCrearPedidoInterno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto) => api.post('/pedidos-internos', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useActualizarPedidoInterno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...campos }) => api.put(`/pedidos-internos/${id}`, campos),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useEnviarPedidoInterno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/pedidos-internos/${id}/enviar`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useAprobarPedidoInterno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notas }) =>
      api.post(`/pedidos-internos/${id}/aprobar`, { notas: notas || undefined }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useRechazarPedidoInterno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }) =>
      api.post(`/pedidos-internos/${id}/rechazar`, { motivo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useMarcarPickingPI() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/pedidos-internos/${id}/picking`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useEntregarPI() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/pedidos-internos/${id}/entregar`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all() })
      qc.invalidateQueries({ queryKey: ['inventario'] })
      qc.invalidateQueries({ queryKey: ['movimientos'] })
    },
  })
}

export function useConfirmarReciboPI() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/pedidos-internos/${id}/confirmar-recibo`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
