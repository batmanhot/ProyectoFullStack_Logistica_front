import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['clientes'],
  list: (f) => ['clientes', 'list', f],
  one:  (id) => ['clientes', id],
}

export function useClientesList({ busqueda, incluirInactivos = false } = {}) {
  return useQuery({
    queryKey: KEYS.list({ busqueda, incluirInactivos }),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (busqueda)       params.set('busqueda', busqueda)
      if (incluirInactivos) params.set('incluirInactivos', 'true')
      const qs = params.toString() ? `?${params}` : ''
      const r = await api.get(`/clientes${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
  })
}

export function useCliente(id) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: async () => {
      const r = await api.get(`/clientes/${id}`)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    enabled: !!id,
  })
}

export function useCrearCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto) => api.post('/clientes', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useActualizarCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...campos }) => api.put(`/clientes/${id}`, campos),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.all() })
      qc.invalidateQueries({ queryKey: KEYS.one(id) })
    },
  })
}

export function useEliminarCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/clientes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

/** Genera el JWT firmado (PORTAL_JWT_SECRET, scope 'portal_cliente') para el link externo del Portal de Pedidos. */
export function useGenerarPortalLinkCliente() {
  return useMutation({
    mutationFn: (id) => api.post(`/clientes/${id}/portal-link`, {}),
  })
}
