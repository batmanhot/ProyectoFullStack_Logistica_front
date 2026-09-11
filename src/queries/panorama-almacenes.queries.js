import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

/**
 * Torre de Control de Almacenes — resumen de supervisión multi-locación.
 * Backend: GET /reportes/almacenes-resumen  (permiso 'panorama-almacenes').
 */
export function usePanoramaAlmacenes({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['panorama-almacenes'],
    queryFn: async () => {
      const r = await api.get('/reportes/almacenes-resumen')
      if (r.error) throw new Error(r.error)
      return r.data
    },
    enabled,
    staleTime: 60_000,
  })
}
