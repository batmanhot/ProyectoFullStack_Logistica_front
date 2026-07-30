import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEY = 'auditoria'

export function useAuditoriaList(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.busqueda)  params.set('busqueda',  filtros.busqueda)
  if (filtros.accion)    params.set('accion',    filtros.accion)
  if (filtros.modulo)    params.set('modulo',    filtros.modulo)
  if (filtros.usuarioId) params.set('usuarioId', filtros.usuarioId)
  if (filtros.desde)     params.set('desde',     filtros.desde)
  if (filtros.hasta)     params.set('hasta',     filtros.hasta)

  const qs = params.toString()
  return useQuery({
    queryKey: [KEY, filtros],
    queryFn:  () => api.get(`/auditoria${qs ? `?${qs}` : ''}`).then(r => r.data ?? []),
  })
}

export function useLimpiarAuditoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete('/auditoria'),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
