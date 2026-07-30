import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['despachos'],
  list: (f) => ['despachos', 'list', f],
  one:  (id) => ['despachos', id],
}

export function useDespachosList({ clienteId, estado } = {}) {
  return useQuery({
    queryKey: KEYS.list({ clienteId, estado }),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (clienteId) params.set('clienteId', clienteId)
      if (estado)    params.set('estado', estado)
      const qs = params.toString() ? `?${params}` : ''
      const r = await api.get(`/despachos${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
  })
}

export function useDespacho(id) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: async () => {
      const r = await api.get(`/despachos/${id}`)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    enabled: !!id,
  })
}

function invalidar(qc) {
  qc.invalidateQueries({ queryKey: KEYS.all() })
}

export function useCrearDespacho() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto) => api.post('/despachos', dto),
    onSuccess: () => invalidar(qc),
  })
}

export function useActualizarDespacho() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...campos }) => api.put(`/despachos/${id}`, campos),
    onSuccess: () => invalidar(qc),
  })
}

export function useAprobarDespacho() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/despachos/${id}/aprobar`),
    onSuccess: () => invalidar(qc),
  })
}

export function useIniciarPicking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/despachos/${id}/picking`),
    onSuccess: () => invalidar(qc),
  })
}

export function useMarcarListo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/despachos/${id}/listo`),
    onSuccess: () => invalidar(qc),
  })
}

export function useDespachar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }) => api.post(`/despachos/${id}/despachar`, dto),
    onSuccess: () => {
      invalidar(qc)
      qc.invalidateQueries({ queryKey: ['inventario'] })
      qc.invalidateQueries({ queryKey: ['movimientos'] })
    },
  })
}

export function useEntregarDespacho() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }) => api.post(`/despachos/${id}/entregar`, dto),
    onSuccess: () => invalidar(qc),
  })
}

export function useCancelarDespacho() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/despachos/${id}/cancelar`),
    onSuccess: () => invalidar(qc),
  })
}

/** Asigna guiaNumero a un despacho que salió sin ella (p. ej. despachado vía Ruta). */
export function useAsignarGuia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, guiaNumero }) => api.put(`/despachos/${id}/guia`, { guiaNumero }),
    onSuccess: () => invalidar(qc),
  })
}
