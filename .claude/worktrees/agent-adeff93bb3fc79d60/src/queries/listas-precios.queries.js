import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export function normListaPrecio(l) {
  return {
    ...l,
    descuento: parseFloat(l.descuento) || 0,
    markup: parseFloat(l.markup) || 0,
    precios: l.precios ?? {},
  }
}

export function useListasPreciosList() {
  return useQuery({
    queryKey: ['listas-precios'],
    queryFn: () => api.get('/listas-precios').then(r => (r.data ?? []).map(normListaPrecio)),
  })
}

export function useCrearListaPrecios() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto) => api.post('/listas-precios', dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['listas-precios'] }),
  })
}

export function useActualizarListaPrecios() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }) => api.put(`/listas-precios/${id}`, dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['listas-precios'] }),
  })
}

export function useEliminarListaPrecios() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/listas-precios/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['listas-precios'] }),
  })
}

export function useSetPrecioProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ listaId, productoId, precio }) =>
      api.patch(`/listas-precios/${listaId}/precio/${productoId}`, { precio }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['listas-precios'] }),
  })
}

export function useDuplicarListaPrecios() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/listas-precios/${id}/duplicar`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['listas-precios'] }),
  })
}
