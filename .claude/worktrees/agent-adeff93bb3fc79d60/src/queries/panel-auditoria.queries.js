import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

const KEY = 'panel-auditoria'

/** Las 4 hooks son de solo lectura — el panel del rol Auditor no tiene mutaciones. */

export function useBitacoraAuditoria(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.busqueda)  params.set('busqueda',  filtros.busqueda)
  if (filtros.accion)    params.set('accion',    filtros.accion)
  if (filtros.modulo)    params.set('modulo',    filtros.modulo)
  if (filtros.desde)     params.set('desde',     filtros.desde)
  if (filtros.hasta)     params.set('hasta',     filtros.hasta)
  const qs = params.toString()
  return useQuery({
    queryKey: [KEY, 'bitacora', filtros],
    queryFn:  () => api.get(`/panel-auditoria/bitacora${qs ? `?${qs}` : ''}`).then(r => r.data ?? []),
  })
}

export function useDiscrepanciasAuditoria(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.almacenId) params.set('almacenId', filtros.almacenId)
  const qs = params.toString()
  return useQuery({
    queryKey: [KEY, 'discrepancias', filtros],
    queryFn:  () => api.get(`/panel-auditoria/discrepancias${qs ? `?${qs}` : ''}`).then(r => r.data ?? []),
  })
}

export function useMovimientosAuditoria(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.productoId) params.set('productoId', filtros.productoId)
  if (filtros.almacenId)  params.set('almacenId',  filtros.almacenId)
  if (filtros.tipo)       params.set('tipo',       filtros.tipo)
  if (filtros.desde)      params.set('desde',      filtros.desde)
  if (filtros.hasta)      params.set('hasta',      filtros.hasta)
  const qs = params.toString()
  return useQuery({
    queryKey: [KEY, 'movimientos', filtros],
    queryFn:  () => api.get(`/panel-auditoria/movimientos${qs ? `?${qs}` : ''}`).then(r => r.data ?? []),
  })
}

export function useCxcAuditoria(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.estado) params.set('estado', filtros.estado)
  const qs = params.toString()
  return useQuery({
    queryKey: [KEY, 'cxc', filtros],
    queryFn:  () => api.get(`/panel-auditoria/cxc${qs ? `?${qs}` : ''}`).then(r => r.data ?? []),
  })
}
