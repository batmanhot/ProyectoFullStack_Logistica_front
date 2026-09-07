import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEY = 'incidencias'

const VACIO = { data: [], total: 0, page: 1, pageSize: 25, kpis: { total: 0, criticos: 0, pendientes: 0, resueltos: 0 } }

/**
 * Paginación server-side — `paginacion` es opcional para no romper llamados
 * existentes (default page=1/pageSize=25 aplicado por el backend).
 */
export function useIncidenciasList(filtros = {}, paginacion = {}) {
  const params = new URLSearchParams()
  if (filtros.severidad)         params.set('severidad', filtros.severidad)
  if (filtros.modulo)            params.set('modulo',    filtros.modulo)
  if (filtros.resuelto !== '')   params.set('resuelto',  filtros.resuelto)
  if (filtros.busqueda)          params.set('busqueda',  filtros.busqueda)
  if (filtros.desde)             params.set('desde',     filtros.desde)
  if (filtros.hasta)             params.set('hasta',     filtros.hasta)
  if (paginacion.page)           params.set('page',      paginacion.page)
  if (paginacion.pageSize)       params.set('pageSize',  paginacion.pageSize)

  const qs = params.toString()
  return useQuery({
    queryKey: [KEY, filtros, paginacion],
    queryFn:  () => api.get(`/incidencias${qs ? `?${qs}` : ''}`).then(r => r.data ?? VACIO),
    // Auto-refresco — a diferencia de Auditoría, este panel se usa para
    // monitorear errores "en vivo" mientras se investiga un incidente.
    refetchInterval: 30_000,
  })
}

export function useMarcarResueltaIncidencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notaResolucion }) => api.patch(`/incidencias/${id}/resolver`, { notaResolucion }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
