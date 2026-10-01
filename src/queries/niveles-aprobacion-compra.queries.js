import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEY = 'niveles-aprobacion-compra'

/**
 * Niveles de aprobación de Orden de Compra por monto (#11c) — cadena
 * ACUMULATIVA: a mayor OrdenCompra.total, se suman más niveles, todos deben
 * aprobar en secuencia. `{ id, nivel, montoMinimo, rolesAprobadores[] }[]`,
 * ordenados por nivel. Tabla vacía = sin cadena, comportamiento de siempre.
 */
export function useNivelesAprobacionCompra({ enabled = true } = {}) {
  return useQuery({
    queryKey: [KEY],
    queryFn:  () => api.get('/niveles-aprobacion-compra').then(r => r.data ?? []),
    enabled,
  })
}

/** POST /niveles-aprobacion-compra — { montoMinimo, rolesAprobadores }. Nivel siguiente automático. */
export function useCrearNivelAprobacionCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto) => api.post('/niveles-aprobacion-compra', dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

/** PUT /niveles-aprobacion-compra/:id — { montoMinimo?, rolesAprobadores? }. */
export function useActualizarNivelAprobacionCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...campos }) => api.put(`/niveles-aprobacion-compra/${id}`, campos),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

/** DELETE /niveles-aprobacion-compra/:id — renumera los niveles siguientes. */
export function useEliminarNivelAprobacionCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/niveles-aprobacion-compra/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
