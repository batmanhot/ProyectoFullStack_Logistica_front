import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEY = 'auditoria'

const VACIO = { data: [], total: 0, page: 1, pageSize: 25, kpis: { total: 0, hoy: 0, errores: 0, usuarios: 0 } }

function buildParams(filtros) {
  const params = new URLSearchParams()
  if (filtros.busqueda)  params.set('busqueda',  filtros.busqueda)
  if (filtros.accion)    params.set('accion',    filtros.accion)
  if (filtros.modulo)    params.set('modulo',    filtros.modulo)
  if (filtros.usuarioId) params.set('usuarioId', filtros.usuarioId)
  if (filtros.desde)     params.set('desde',     filtros.desde)
  if (filtros.hasta)     params.set('hasta',     filtros.hasta)
  return params
}

/**
 * Paginación server-side — `paginacion` es opcional para no romper llamados
 * existentes (default page=1/pageSize=25 aplicado por el backend).
 */
export function useAuditoriaList(filtros = {}, paginacion = {}) {
  const params = buildParams(filtros)
  if (paginacion.page)     params.set('page',     paginacion.page)
  if (paginacion.pageSize) params.set('pageSize', paginacion.pageSize)

  const qs = params.toString()
  return useQuery({
    queryKey: [KEY, filtros, paginacion],
    queryFn:  () => api.get(`/auditoria${qs ? `?${qs}` : ''}`).then(r => r.data ?? VACIO),
  })
}

/**
 * Trae TODOS los eventos que coinciden con los filtros (hasta el tope de 1000
 * del backend) para exportar a Excel/PDF — la exportación no debe limitarse
 * a la página que se está viendo en pantalla.
 */
export async function fetchAuditoriaCompleta(filtros = {}) {
  const params = buildParams(filtros)
  params.set('pageSize', '1000')
  const r = await api.get(`/auditoria?${params.toString()}`)
  return r.data?.data ?? []
}

export function useLimpiarAuditoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete('/auditoria'),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
