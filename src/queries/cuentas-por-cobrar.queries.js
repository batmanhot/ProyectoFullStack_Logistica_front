import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['cuentas-por-cobrar'],
  list: (f) => ['cuentas-por-cobrar', 'list', f],
  one:  (id) => ['cuentas-por-cobrar', id],
}

export function useCxCList({ clienteId, estado } = {}) {
  return useQuery({
    queryKey: KEYS.list({ clienteId, estado }),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (clienteId) params.set('clienteId', clienteId)
      if (estado)    params.set('estado', estado)
      const qs = params.toString() ? `?${params}` : ''
      const r = await api.get(`/cuentas-por-cobrar${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
  })
}

export function useCxC(id) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: async () => {
      const r = await api.get(`/cuentas-por-cobrar/${id}`)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    enabled: !!id,
  })
}

export function useCrearCxC() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clienteId, monto, diasCredito, fechaVencimiento, notas, despachoId }) =>
      api.post('/cuentas-por-cobrar', { clienteId, monto, diasCredito, fechaVencimiento, notas, despachoId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useActualizarCxC() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...campos }) => api.put(`/cuentas-por-cobrar/${id}`, campos),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useRegistrarPago() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, monto, metodo, fecha, notas }) =>
      api.post(`/cuentas-por-cobrar/${id}/pagos`, { monto, metodo, fecha, notas }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
