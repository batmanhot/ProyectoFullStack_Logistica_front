import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEY = 'roles'

export function useRolesList() {
  return useQuery({
    queryKey: [KEY],
    queryFn:  () => api.get('/roles').then(r => r.data ?? []),
  })
}

export function useCrearRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto) => api.post('/roles', dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useActualizarRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }) => api.put(`/roles/${id}`, dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useEliminarRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/roles/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
