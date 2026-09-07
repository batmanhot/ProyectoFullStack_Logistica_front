import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEY = 'flota'

export function useFlotaVehiculos(incluirInactivos = false) {
  return useQuery({
    queryKey: [KEY, 'vehiculos', { incluirInactivos }],
    queryFn:  () => api.get(`/flota/vehiculos${incluirInactivos ? '?incluirInactivos=true' : ''}`).then(r => r.data ?? []),
  })
}

export function useCrearVehiculo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto) => api.post('/flota/vehiculos', dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useActualizarVehiculo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }) => api.put(`/flota/vehiculos/${id}`, dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useEliminarVehiculo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/flota/vehiculos/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useFlotaMantenimientos(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.vehiculoId) params.set('vehiculoId', filtros.vehiculoId)
  if (filtros.desde)      params.set('desde',      filtros.desde)
  if (filtros.hasta)      params.set('hasta',      filtros.hasta)
  const qs = params.toString()
  return useQuery({
    queryKey: [KEY, 'mantenimientos', filtros],
    queryFn:  () => api.get(`/flota/mantenimientos${qs ? `?${qs}` : ''}`).then(r => r.data ?? []),
  })
}

export function useRegistrarMantenimiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vehiculoId, ...dto }) => api.post(`/flota/vehiculos/${vehiculoId}/mantenimientos`, dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useActualizarMantenimiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }) => api.put(`/flota/mantenimientos/${id}`, dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useEliminarMantenimiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/flota/mantenimientos/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useFlotaCombustible(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.vehiculoId) params.set('vehiculoId', filtros.vehiculoId)
  if (filtros.desde)      params.set('desde',      filtros.desde)
  if (filtros.hasta)      params.set('hasta',      filtros.hasta)
  const qs = params.toString()
  return useQuery({
    queryKey: [KEY, 'combustible', filtros],
    queryFn:  () => api.get(`/flota/combustible${qs ? `?${qs}` : ''}`).then(r => r.data ?? []),
  })
}

export function useRegistrarCombustible() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto) => api.post('/flota/combustible', dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useFlotaAlertas() {
  return useQuery({
    queryKey: [KEY, 'alertas'],
    queryFn:  () => api.get('/flota/alertas').then(r => r.data ?? []),
  })
}
