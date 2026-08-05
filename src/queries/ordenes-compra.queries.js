import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['ordenes-compra'],
  list: (f) => ['ordenes-compra', 'list', f],
  one:  (id) => ['ordenes-compra', id],
}

export function useOrdenesCompraList({ proveedorId, estado } = {}) {
  return useQuery({
    queryKey: KEYS.list({ proveedorId, estado }),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (proveedorId) params.set('proveedorId', proveedorId)
      if (estado)      params.set('estado', estado)
      const qs = params.toString() ? `?${params}` : ''
      const r = await api.get(`/ordenes-compra${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
  })
}

export function useOrdenCompra(id) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: async () => {
      const r = await api.get(`/ordenes-compra/${id}`)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    enabled: !!id,
  })
}

export function useCrearOrdenCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto) => api.post('/ordenes-compra', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useActualizarOrdenCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...campos }) => api.put(`/ordenes-compra/${id}`, campos),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useRecibirOrdenCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }) => api.post(`/ordenes-compra/${id}/recibir`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all() })
      qc.invalidateQueries({ queryKey: ['inventario'] })
      qc.invalidateQueries({ queryKey: ['movimientos'] })
      qc.invalidateQueries({ queryKey: ['lotes'] })
    },
  })
}

// ── Módulo de Importación ──────────────────────────────────────────
export function useAgregarGastoImportacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }) => api.post(`/ordenes-compra/${id}/gastos-importacion`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useEliminarGastoImportacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, gastoId }) => api.delete(`/ordenes-compra/${id}/gastos-importacion/${gastoId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useActualizarEstadoLogistico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }) => api.patch(`/ordenes-compra/${id}/estado-logistico`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
