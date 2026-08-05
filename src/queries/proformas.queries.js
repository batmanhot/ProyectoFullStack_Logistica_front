import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['proformas'],
  list: (f) => ['proformas', 'list', f],
  one:  (id) => ['proformas', id],
}

export function useProformasList({ clienteId, estado } = {}) {
  return useQuery({
    queryKey: KEYS.list({ clienteId, estado }),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (clienteId) params.set('clienteId', clienteId)
      if (estado)    params.set('estado', estado)
      const qs = params.toString() ? `?${params}` : ''
      const r = await api.get(`/proformas${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
  })
}

export function useProforma(id) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: async () => {
      const r = await api.get(`/proformas/${id}`)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    enabled: !!id,
  })
}

export function useCrearProforma() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clienteId, fechaVencimiento, notas, formaPago, listaPrecioId, items }) =>
      api.post('/proformas', { clienteId, fechaVencimiento, notas, formaPago, listaPrecioId, items }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useConvertirProformaDespacho() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, almacenId, transportistaId, direccionEntrega }) =>
      api.post(`/proformas/${id}/convertir-despacho`, { almacenId, transportistaId, direccionEntrega }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all() })
      qc.invalidateQueries({ queryKey: ['despachos'] })
    },
  })
}

export function useActualizarProforma() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...campos }) => api.put(`/proformas/${id}`, campos),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.all() })
      qc.invalidateQueries({ queryKey: KEYS.one(id) })
    },
  })
}

export function useEliminarProforma() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/proformas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
