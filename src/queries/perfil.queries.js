import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

/**
 * Vista 360° del usuario autenticado (GET /auth/me) — identidad, perfil,
 * rol/permisos, contexto por rol, datos de la empresa y resumen de actividad.
 * Solo lectura. Se carga bajo demanda (al abrir el modal "Mi Perfil").
 */
export function usePerfil({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['perfil', 'me'],
    queryFn:  () => api.get('/auth/me').then(r => {
      if (r.error) throw new Error(r.error)
      return r.data
    }),
    enabled,
    staleTime: 60_000,
  })
}
