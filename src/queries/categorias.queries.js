import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:  () => ['categorias'],
  list: (p) => ['categorias', 'list', p],
}

// El backend usa estado:'Activo'|'Inactivo'; el frontend usa activo:bool
function normalize(cat) {
  return { ...cat, activo: cat.estado === 'Activo' }
}
function toEstado(activo) {
  return activo ? 'Activo' : 'Inactivo'
}

export function useCategoriasList({ incluirInactivas = false } = {}) {
  return useQuery({
    queryKey: KEYS.list({ incluirInactivas }),
    queryFn: async () => {
      const qs = incluirInactivas ? '?incluirInactivas=true' : ''
      const r = await api.get(`/categorias${qs}`)
      if (r.error) throw new Error(r.error)
      return (r.data ?? []).map(normalize)
    },
  })
}

export function useCrearCategoria() {
  const qc = useQueryClient()
  return useMutation({
    // CreateCategoriaDto solo acepta nombre + descripcion; estado es siempre 'Activo' por defecto en DB
    mutationFn: ({ nombre, descripcion }) =>
      api.post('/categorias', { nombre, descripcion }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useActualizarCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre, descripcion, activo }) =>
      api.put(`/categorias/${id}`, { nombre, descripcion, estado: toEstado(activo) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useEliminarCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/categorias/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
