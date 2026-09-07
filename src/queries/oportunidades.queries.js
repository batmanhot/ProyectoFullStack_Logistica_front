import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['oportunidades'],
  list: (f) => ['oportunidades', 'list', f],
  one:  (id) => ['oportunidades', id],
  responsables: () => ['oportunidades', 'responsables'],
  rendimiento: () => ['oportunidades', 'rendimiento'],
}

export function useResponsablesOportunidad({ enabled = true } = {}) {
  return useQuery({
    queryKey: KEYS.responsables(),
    queryFn: async () => {
      const r = await api.get('/oportunidades/responsables')
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
    enabled,
  })
}

/**
 * Rendimiento agregado por vendedor (conteos/montos, nunca detalle de un
 * trato ajeno) — endpoint separado de la lista de oportunidades a propósito,
 * ver oportunidades.service.ts#rendimientoPorVendedor. Accesible también
 * para un vendedor raso, que ya no puede pedir la lista de otro (findAll la
 * fuerza a su propio responsableId en el backend).
 */
export function useRendimientoPorVendedor({ enabled = true } = {}) {
  return useQuery({
    queryKey: KEYS.rendimiento(),
    queryFn: async () => {
      const r = await api.get('/oportunidades/rendimiento')
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
    enabled,
  })
}

export function useOportunidadesList({ estado, responsableId, clienteId, enabled = true } = {}) {
  return useQuery({
    queryKey: KEYS.list({ estado, responsableId, clienteId }),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (estado)        params.set('estado', estado)
      if (responsableId) params.set('responsableId', responsableId)
      if (clienteId)     params.set('clienteId', clienteId)
      const qs = params.toString() ? `?${params}` : ''
      const r = await api.get(`/oportunidades${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
    enabled,
  })
}

export function useOportunidad(id) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: async () => {
      const r = await api.get(`/oportunidades/${id}`)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    enabled: !!id,
  })
}

export function useCrearOportunidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos) => api.post('/oportunidades', datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all() })
      qc.invalidateQueries({ queryKey: KEYS.rendimiento() })
    },
  })
}

export function useActualizarOportunidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...campos }) => api.put(`/oportunidades/${id}`, campos),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.all() })
      qc.invalidateQueries({ queryKey: KEYS.one(id) })
      qc.invalidateQueries({ queryKey: KEYS.rendimiento() })
    },
  })
}

export function useCambiarEstadoOportunidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado, motivoPerdida }) =>
      api.patch(`/oportunidades/${id}/estado`, { estado, motivoPerdida }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.all() })
      qc.invalidateQueries({ queryKey: KEYS.one(id) })
      qc.invalidateQueries({ queryKey: KEYS.rendimiento() })
    },
  })
}

export function useRegistrarActividad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...datos }) => api.post(`/oportunidades/${id}/actividades`, datos),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.all() })
      qc.invalidateQueries({ queryKey: KEYS.one(id) })
    },
  })
}

export function useVincularProforma() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, proformaId }) => api.post(`/oportunidades/${id}/vincular-proforma`, { proformaId }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.all() })
      qc.invalidateQueries({ queryKey: KEYS.one(id) })
      qc.invalidateQueries({ queryKey: ['proformas'] })
    },
  })
}
