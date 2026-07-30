import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['inventario'],
  list: (f) => ['inventario', 'list', f],
}

export function useInventarioList({ productoId, almacenId } = {}) {
  return useQuery({
    queryKey: KEYS.list({ productoId, almacenId }),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (productoId) params.set('productoId', productoId)
      if (almacenId)  params.set('almacenId', almacenId)
      const qs = params.toString() ? `?${params}` : ''
      const r = await api.get(`/inventario${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
  })
}
