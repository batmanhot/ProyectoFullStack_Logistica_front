import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['proveedores'],
  list: (p) => ['proveedores', 'list', p],
}

export function useProveedoresList({ incluirInactivos = false, enabled = true } = {}) {
  return useQuery({
    queryKey: KEYS.list({ incluirInactivos }),
    queryFn: async () => {
      const qs = incluirInactivos ? '?incluirInactivos=true' : ''
      const r = await api.get(`/proveedores${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
    enabled,
  })
}

export function useCrearProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ razonSocial, ruc, telefono, email, direccion }) =>
      api.post('/proveedores', { razonSocial, ruc, telefono, email, direccion }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useActualizarProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, razonSocial, ruc, telefono, email, direccion, activo }) =>
      api.put(`/proveedores/${id}`, { razonSocial, ruc, telefono, email, direccion, activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useEliminarProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/proveedores/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

/** Genera el JWT firmado (PORTAL_JWT_SECRET, scope 'portal_proveedor') para el link externo del Portal B2B. */
export function useGenerarPortalLinkProveedor() {
  return useMutation({
    mutationFn: (id) => api.post(`/proveedores/${id}/portal-link`, {}),
  })
}
