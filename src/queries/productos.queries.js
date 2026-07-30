import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['productos'],
  list: (f) => ['productos', 'list', f],
  one:  (id) => ['productos', id],
}

export function useProductosList({ busqueda, categoriaId, proveedorId, incluirInactivos = false } = {}) {
  return useQuery({
    queryKey: KEYS.list({ busqueda, categoriaId, proveedorId, incluirInactivos }),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (busqueda)       params.set('busqueda', busqueda)
      if (categoriaId)    params.set('categoriaId', categoriaId)
      if (proveedorId)    params.set('proveedorId', proveedorId)
      if (incluirInactivos) params.set('incluirInactivos', 'true')
      const qs = params.toString() ? `?${params}` : ''
      const r = await api.get(`/productos${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
  })
}

export function useProducto(id) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: async () => {
      const r = await api.get(`/productos/${id}`)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    enabled: !!id,
  })
}

export function useCrearProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sku, nombre, barcode, categoriaId, proveedorId, unidadMedida, esPerecedero, stockMinimo, stockMaximo, precioCompra, precioVenta }) =>
      api.post('/productos', { sku, nombre, barcode, categoriaId, proveedorId, unidadMedida, esPerecedero, stockMinimo, stockMaximo, precioCompra, precioVenta }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useActualizarProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...campos }) => api.put(`/productos/${id}`, campos),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.all() })
      qc.invalidateQueries({ queryKey: KEYS.one(id) })
    },
  })
}

export function useEliminarProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/productos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
