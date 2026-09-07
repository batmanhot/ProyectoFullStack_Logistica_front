import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['proyectos'],
  list: (f) => ['proyectos', 'list', f],
  one:  (id) => ['proyectos', id],
}

export function useProyectosList({ incluirInactivos = false, estado, clienteId, enabled = true } = {}) {
  return useQuery({
    queryKey: KEYS.list({ incluirInactivos, estado, clienteId }),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (incluirInactivos) params.set('incluirInactivos', 'true')
      if (estado)           params.set('estado', estado)
      if (clienteId)        params.set('clienteId', clienteId)
      const qs = params.toString() ? `?${params}` : ''
      const r = await api.get(`/proyectos${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
    enabled,
  })
}

export function useProyecto(id) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: async () => {
      const r = await api.get(`/proyectos/${id}`)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    enabled: !!id,
  })
}

export function useCrearProyecto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos) => api.post('/proyectos', datos),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useActualizarProyecto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...campos }) => api.put(`/proyectos/${id}`, campos),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useEliminarProyecto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/proyectos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

// ── Fase 4 — Reporte de consumo por proyecto ──────────────────────────────
export function useReporteConsumoProyecto(filtros = {}) {
  return useQuery({
    queryKey: ['proyectos', 'reporte-consumo', filtros],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filtros).forEach(([k, v]) => { if (v) params.set(k, v) })
      const qs = params.toString() ? `?${params}` : ''
      const r = await api.get(`/proyectos/reporte-consumo${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
  })
}

export function usePendientesPorDespacharProyecto(filtros = {}) {
  return useQuery({
    queryKey: ['proyectos', 'pendientes-por-despachar', filtros],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filtros).forEach(([k, v]) => { if (v) params.set(k, v) })
      const qs = params.toString() ? `?${params}` : ''
      const r = await api.get(`/proyectos/pendientes-por-despachar${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
  })
}
