import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEY = 'atenciones-alerta'

/**
 * Registro de "atendida" del Centro de Alertas — las alertas en sí se
 * calculan en vivo (utils/alertas.js); esto es solo el historial de qué
 * instancias fueron atendidas, por quién, cuándo y con qué acción. El
 * frontend cruza cada alerta contra esta lista por `tipo`+`clave`.
 */
export function useAtencionesAlerta({ enabled = true } = {}) {
  return useQuery({
    queryKey: [KEY],
    queryFn:  () => api.get('/alertas/atenciones').then(r => r.data ?? []),
    enabled,
  })
}

/** POST /alertas/atenciones — upsert por [tipo, clave]: marca (o re-marca) atendida. */
export function useMarcarAtendida() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tipo, clave, notaAccion }) => api.post('/alertas/atenciones', { tipo, clave, notaAccion }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

/** DELETE /alertas/atenciones/:tipo/:clave — vuelve la alerta a "Pendiente". */
export function useReabrirAlerta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tipo, clave }) => api.delete(`/alertas/atenciones/${encodeURIComponent(tipo)}/${encodeURIComponent(clave)}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
